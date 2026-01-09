<?php
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';

if ($_SESSION['role'] !== 'cashier') { /* Error */ }

$method = $_SERVER['REQUEST_METHOD'];

// GET: Search Customer for Payment
if ($method == 'GET' && isset($_GET['search'])) {
    $search = $_GET['search'];
    // Get Customer + Pending Bills
    $sql = "SELECT c.customer_id, c.first_name, c.last_name, c.outstanding_balance, 
            b.bill_id, b.amount, b.status, b.generated_date, m.meter_no 
            FROM customer c 
            JOIN meter m ON c.customer_id = m.customer_id 
            LEFT JOIN bill b ON m.meter_id = b.meter_id 
            WHERE (c.first_name LIKE ? OR m.meter_no = ?) AND b.status = 'Pending'";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute(["%$search%", $search]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// POST: Make Payment
if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    // Insert Payment (Trigger will update Balance & Bill Status)
    $sql = "INSERT INTO payment (bill_id, amount) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    try {
        $stmt->execute([$data->bill_id, $data->amount]);
        echo json_encode(["status" => "success", "message" => "Payment Success"]);
    } catch(Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>
