<?php
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';

if ($_SESSION['role'] !== 'manager') { exit(); }

$type = $_GET['type'] ?? '';

if ($type == 'daily_revenue') {
    $sql = "SELECT payment_date, SUM(amount) as total, COUNT(*) as count FROM payment GROUP BY payment_date";
    echo json_encode($conn->query($sql)->fetchAll(PDO::FETCH_ASSOC));
}

if ($type == 'top_consumers') {
    $sql = "SELECT TOP 5 c.first_name, SUM(mr.consumption) as total_units 
            FROM customer c 
            JOIN meter m ON c.customer_id = m.customer_id 
            JOIN meter_reading mr ON m.meter_id = mr.meter_id 
            GROUP BY c.customer_id, c.first_name 
            ORDER BY total_units DESC";
    echo json_encode($conn->query($sql)->fetchAll(PDO::FETCH_ASSOC));
}
// Add Monthly/Yearly logic similarly
?>
