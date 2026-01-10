<?php
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';

// Check role
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'cashier') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: Search Customer for Payment
if ($method == 'GET' && isset($_GET['search'])) {
    $search = trim($_GET['search']);
    // Get Customer + Pending Bills (or just Customer if no pending bill)
    // Queries customer table and joins meter, filtered by NIC/MeterNo. 
    // Left Join bill on "Pending" status to get only pending bills if they exist.
    $sql = "SELECT c.customer_id, c.first_name, c.last_name, c.outstanding_balance, c.address, 
            b.bill_id, b.amount, b.status as bill_status, b.generated_date, 
            m.meter_no, m.meter_id, m.status as meter_status, tg.utility_id,
            (SELECT TOP 1 amount FROM bill b2 WHERE b2.meter_id = m.meter_id ORDER BY generated_date DESC) as last_bill_amount
            FROM customer c 
            JOIN meter m ON c.customer_id = m.customer_id 
            JOIN tariff_group tg ON m.group_id = tg.group_id
            LEFT JOIN bill b ON m.meter_id = b.meter_id AND b.status = 'Pending' 
            WHERE (c.nic LIKE ? OR m.meter_no = ?)";

    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute(["%$search%", $search]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

// POST: Make Payment
if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->bill_id) || !isset($data->amount)) {
        echo json_encode(["status" => "error", "message" => "Missing bill_id or amount"]);
        exit;
    }

    try {
        $conn->beginTransaction();

        // 1. Insert Payment
        $sql = "INSERT INTO payment (bill_id, amount) VALUES (?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$data->bill_id, $data->amount]);

        // 2. Update Bill Status
        $sqlBill = "UPDATE bill SET status = 'Paid' WHERE bill_id = ?";
        $stmtBill = $conn->prepare($sqlBill);
        $stmtBill->execute([$data->bill_id]);

        // 3. Update Customer Outstanding Balance & Get Customer ID for verification
        $sqlCust = "UPDATE c
                    SET c.outstanding_balance = c.outstanding_balance - ?
                    FROM customer c
                    JOIN meter m ON c.customer_id = m.customer_id
                    JOIN bill b ON m.meter_id = b.meter_id
                    WHERE b.bill_id = ?";

        $stmtCust = $conn->prepare($sqlCust);
        $stmtCust->execute([$data->amount, $data->bill_id]);

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Payment Success"]);
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>