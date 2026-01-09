<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config/db_connect.php';

try {
    // 1. Total Customers
    $stmt = $conn->query("SELECT COUNT(*) as count FROM customer");
    $customers = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // 2. Active Meters
    $stmt = $conn->query("SELECT COUNT(*) as count FROM meter WHERE status = 'Active'");
    $meters = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    // 3. active Tariff Plans (Groups)
    // Assuming all groups in the table are "active" unless there's a status column. 
    // If no status column, just count all.
    $stmt = $conn->query("SELECT COUNT(*) as count FROM tariff_group");
    $tariffs = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    echo json_encode([
        "status" => "success",
        "data" => [
            "customers" => $customers,
            "meters" => $meters,
            "tariffs" => $tariffs
        ]
    ]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>