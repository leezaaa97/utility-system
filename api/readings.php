<<<<<<< HEAD
=======
<?php
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");



require_once __DIR__ . '/config/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function sendJson($status, $message = null, $data = [])
{
    $response = ['status' => $status];
    if ($message)
        $response['message'] = $message;
    if (!empty($data))
        $response = array_merge($response, $data);

    echo json_encode($response);
    exit;
}

// SEARCH METERS
if ($action === 'search') {
    $query = $_GET['query'] ?? '';
    $searchTerm = "%" . $query . "%";

    $sql = "SELECT m.meter_id, m.meter_no, c.first_name, c.last_name, c.nic, 
            (SELECT MAX(reading_date) FROM meter_reading mr WHERE mr.meter_id = m.meter_id) as last_read_date,
            u.name as utility_type, m.status
            FROM meter m
            LEFT JOIN customer c ON m.customer_id = c.customer_id
            LEFT JOIN tariff_group tg ON m.group_id = tg.group_id
            LEFT JOIN utility u ON tg.utility_id = u.utility_id
            WHERE m.meter_no LIKE ? OR c.nic LIKE ?";

    $stmt = $conn->prepare($sql);
    $stmt->execute([$searchTerm, $searchTerm]);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// ASSIGN METER
elseif ($action === 'assign' && $method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!$data->nic || !$data->meter_no || !$data->utility) {
        sendJson("error", "NIC, Meter No, and Utility Type are required");
    }

    try {
        // 1. Find Customer
        $stmt = $conn->prepare("SELECT customer_id FROM customer WHERE nic = ?");
        $stmt->execute([$data->nic]);
        $cust = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cust)
            sendJson("error", "Customer not found");
        $customer_id = $cust['customer_id'];

        // 2. Find/Resolve Tariff Group (Pick first group for this utility)
        $stmt = $conn->prepare("SELECT TOP 1 tg.group_id FROM tariff_group tg JOIN utility u ON tg.utility_id = u.utility_id WHERE u.name = ?");
        $stmt->execute([$data->utility]);
        $group = $stmt->fetch(PDO::FETCH_ASSOC);

        // If no logic for utility, fallback or error. Assuming 'Electricity'/'Water' maps to DB utility names.
        $group_id = $group ? $group['group_id'] : 1; // Default to 1 if not found

        // 3. Insert Meter
        // Check if meter exists
        $stmt = $conn->prepare("SELECT meter_id FROM meter WHERE meter_no = ?");
        $stmt->execute([$data->meter_no]);
        if ($stmt->fetch()) {
            sendJson("error", "Meter number already exists");
        }

        $sql = "INSERT INTO meter (meter_no, customer_id, group_id, status) VALUES (?, ?, ?, 'Active')";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$data->meter_no, $customer_id, $group_id]);

        sendJson("success", "Meter assigned successfully");

    } catch (Exception $e) {
        sendJson("error", $e->getMessage());
    }

}
// UPDATE METER STATUS
elseif ($action === 'update_meter' && $method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->meter_id) || !isset($data->status)) {
        sendJson("error", "Meter ID and Status required");
    }

    try {
        $stmt = $conn->prepare("UPDATE meter SET status = ? WHERE meter_id = ?");
        $stmt->execute([$data->status, $data->meter_id]);
        sendJson("success", "Meter updated");
    } catch (Exception $e) {
        sendJson("error", $e->getMessage());
    }
}

// GET UNIQUE METER STATUSES
elseif ($action === 'get_statuses') {
    $stmt = $conn->query("SELECT DISTINCT status FROM meter");
    $statuses = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode($statuses);
    exit;
}

// GET METER DETAILS
elseif ($action === 'get_details') {
    $meter_id = $_GET['meter_id'] ?? 0;

    $sqlInfo = "SELECT c.nic, c.first_name, c.last_name, m.status, u.name as utility_name 
                FROM meter m
                LEFT JOIN customer c ON m.customer_id = c.customer_id
                LEFT JOIN tariff_group tg ON m.group_id = tg.group_id
                LEFT JOIN utility u ON tg.utility_id = u.utility_id
                WHERE m.meter_id = ?";
    $stmt = $conn->prepare($sqlInfo);
    $stmt->execute([$meter_id]);
    $info = $stmt->fetch(PDO::FETCH_ASSOC);

    $sqlRead = "SELECT TOP 1 current_reading 
                FROM meter_reading 
                WHERE meter_id = ? 
                ORDER BY reading_date DESC";
    $stmtRead = $conn->prepare($sqlRead);
    $stmtRead->execute([$meter_id]);
    $reading = $stmtRead->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "details" => $info,
        "prev_reading" => $reading ? $reading['current_reading'] : 0
    ]);
    exit;
}

// SUBMIT READING & GENERATE BILL
elseif (($action === 'submit' || $action === 'submit_reading') && $method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!$data || !$data->meter_id || !isset($data->current_reading) || !$data->date) {
        sendJson("error", "Missing required fields");
    }

    $consumption = $data->current_reading - $data->prev_reading;

    if ($consumption < 0) {
        sendJson("error", "Current reading cannot be lower than previous reading");
    }

    try {
        $conn->beginTransaction();

        $sql = "INSERT INTO meter_reading (meter_id, reading_date, previous_reading, current_reading, consumption) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data->meter_id,
            $data->date,
            $data->prev_reading,
            $data->current_reading,
            $consumption
        ]);

        $reading_id = $conn->lastInsertId();

        $billAmt = $consumption * 10;

        $billSql = "INSERT INTO bill (meter_id, reading_id, amount, generated_date, status) 
                    VALUES (?, ?, ?, GETDATE(), 'Pending')";
        $conn->prepare($billSql)->execute([$data->meter_id, $reading_id, $billAmt]);

        $conn->commit();
        sendJson("success", "Reading Added & Bill Generated");

    } catch (Exception $e) {
        $conn->rollBack();
        sendJson("error", "Database Error: " . $e->getMessage());
    }
}

// REPORT FAULT
elseif ($action === 'report_fault' && $method === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"));

        if (!$data || !isset($data->meter_id) || !isset($data->description)) {
            throw new Exception("Missing meter_id or description");
        }

        $sql = "INSERT INTO fault_report (meter_id, description, report_date) 
                VALUES (?, ?, GETDATE())";

        $stmt = $conn->prepare($sql);
        $stmt->execute([$data->meter_id, $data->description]);

        sendJson("success", "Fault Reported");

    } catch (Exception $e) {
        http_response_code(500);
        sendJson("error", "Database Error: " . $e->getMessage());
    }
}

// ADMIN VIEW (GET ALL READINGS)
elseif ($method === 'GET') {
    if (isset($_GET['meter_no'])) {
        $sql = "SELECT mr.* FROM meter_reading mr 
                JOIN meter m ON mr.meter_id = m.meter_id 
                WHERE m.meter_no = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$_GET['meter_no']]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        $stmt = $conn->query("SELECT * FROM meter_reading ORDER BY reading_date DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    exit;
} else {
    sendJson("error", "Invalid Action or Method");
}
?>
>>>>>>> dev
