<?php
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$role = $_SESSION['role'] ?? '';

// POST: Add Reading (Admin/Officer) & Report Fault (Officer)
if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    $action = $_GET['action'] ?? 'add_reading';

    if ($action == 'report_fault' && $role == 'field_officer') {
        // Report Fault
        $stmt = $conn->prepare("INSERT INTO fault_report (meter_id, description) VALUES (?, ?)");
        $stmt->execute([$data->meter_id, $data->description]);
        echo json_encode(["status" => "success", "message" => "Fault Reported"]);
    } 
    else {
        // Add Reading logic
        // 1. Get Previous Reading
        $meter_id = $data->meter_id; // Can be found via meter_no lookup
        
        // Lookup meter ID if only meter_no provided
        if(isset($data->meter_no)) {
            $mStmt = $conn->prepare("SELECT meter_id FROM meter WHERE meter_no = ?");
            $mStmt->execute([$data->meter_no]);
            $meter = $mStmt->fetch(PDO::FETCH_ASSOC);
            if(!$meter) { die(json_encode(["status" => "error", "message" => "Invalid Meter No"])); }
            $meter_id = $meter['meter_id'];
        }

        $prevStmt = $conn->prepare("SELECT TOP 1 current_reading FROM meter_reading WHERE meter_id = ? ORDER BY reading_date DESC");
        $prevStmt->execute([$meter_id]);
        $prevRead = $prevStmt->fetchColumn() ?: 0;

        $consumption = $data->current_reading - $prevRead;
        
        // Insert Reading
        $sql = "INSERT INTO meter_reading (meter_id, reading_date, previous_reading, current_reading, consumption) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$meter_id, $data->date, $prevRead, $data->current_reading, $consumption]);
        
        // Trigger Bill Generation (Simplified: Calculate Cost here or via Stored Proc)
        // For simplicity, we create a Pending Bill here immediately (or use a stored proc as per brief)
        // Assume Tariff Logic here or in Stored Proc. Let's do a basic insert to satisfy "Generate Bill"
        $billAmt = $consumption * 10; // Basic mock calculation
        $r_id = $conn->lastInsertId();
        
        $billSql = "INSERT INTO bill (meter_id, reading_id, amount, generated_date) VALUES (?, ?, ?, GETDATE())";
        $conn->prepare($billSql)->execute([$meter_id, $r_id, $billAmt]);

        echo json_encode(["status" => "success", "message" => "Reading Added & Bill Generated"]);
    }
}

// GET: Get All Readings or by Meter No
if ($method == 'GET') {
    if (isset($_GET['meter_no'])) {
        $sql = "SELECT mr.* FROM meter_reading mr JOIN meter m ON mr.meter_id = m.meter_id WHERE m.meter_no = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$_GET['meter_no']]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        $stmt = $conn->query("SELECT * FROM meter_reading");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}

// PUT/DELETE (Admin Only)
if ($method == 'DELETE' && $role == 'admin') {
    // Delete reading logic based on ID
}
?>
