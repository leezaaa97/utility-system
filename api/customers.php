<<<<<<< HEAD
=======
<?php
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';

// Auth Check
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: List All, Search by ID, Search by Type (Tariff Group)
if ($method == 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $conn->prepare("
            SELECT c.*, tg.group_name as type, tg.group_id as type_id, m.meter_id 
            FROM customer c 
            LEFT JOIN meter m ON c.customer_id = m.customer_id AND m.status = 'Active' 
            LEFT JOIN tariff_group tg ON m.group_id = tg.group_id 
            WHERE c.customer_id = ?
        ");
        $stmt->execute([$_GET['id']]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    } elseif (isset($_GET['type_id'])) {
        // Search by Tariff Group
        $sql = "SELECT DISTINCT c.*, tg.group_name as type 
                FROM customer c 
                JOIN meter m ON c.customer_id = m.customer_id 
                JOIN tariff_group tg ON m.group_id = tg.group_id 
                WHERE m.group_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$_GET['type_id']]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        // Get Total Count or All Customers
        if (isset($_GET['count'])) {
            $stmt = $conn->query("SELECT COUNT(*) as total FROM customer");
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            $stmt = $conn->query("
                SELECT c.*, tg.group_name as type 
                FROM customer c 
                LEFT JOIN meter m ON c.customer_id = m.customer_id AND m.status = 'Active'
                LEFT JOIN tariff_group tg ON m.group_id = tg.group_id
            ");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
    }
}

// POST: Add Customer
if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    $sql = "INSERT INTO customer (first_name, last_name, address, email, phone, nic) VALUES (?, ?, ?, ?, ?, ?)";
    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute([$data->first_name, $data->last_name, $data->address, $data->email, $data->phone, $data->nic]);
        echo json_encode(["status" => "success", "message" => "Customer Added"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

// PUT: Update Customer
if ($method == 'PUT') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->customer_id)) {
        echo json_encode(["status" => "error", "message" => "Customer ID required"]);
        exit;
    }

    try {
        $conn->beginTransaction();

        $sql = "UPDATE customer SET first_name=?, last_name=?, address=?, email=?, phone=?, nic=? WHERE customer_id=?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data->first_name,
            $data->last_name,
            $data->address,
            $data->email,
            $data->phone,
            $data->nic,
            $data->customer_id
        ]);

        // Update Tariff Group (Type) via Meter
        if (isset($data->type_id) && !empty($data->type_id)) {
            // Find active meter for customer
            $stmtM = $conn->prepare("SELECT meter_id FROM meter WHERE customer_id = ? AND status = 'Active'");
            $stmtM->execute([$data->customer_id]);
            $meter = $stmtM->fetch(PDO::FETCH_ASSOC);

            if ($meter) {
                $stmtUpdateMeter = $conn->prepare("UPDATE meter SET group_id = ? WHERE meter_id = ?");
                $stmtUpdateMeter->execute([$data->type_id, $meter['meter_id']]);
            }
        }

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Customer Updated"]);
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

// DELETE: Delete Customer
if ($method == 'DELETE') {
    $id = $_GET['id'];
    try {
        $stmt = $conn->prepare("DELETE FROM customer WHERE customer_id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success", "message" => "Customer Deleted"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Cannot delete: Customer has active meters/bills."]);
    }
}
?>
>>>>>>> dev
