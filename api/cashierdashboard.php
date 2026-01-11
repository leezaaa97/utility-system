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
$action = $_GET['action'] ?? '';

if ($action == 'get_utilities') {
    $stmt = $conn->prepare("SELECT utility_id, name FROM utility");
    $stmt->execute();
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// GET: Fetch History (Bills + Readings)
if ($method === 'GET' && isset($_GET['meter_no'])) {
    $meter_no = $_GET['meter_no'];

    // We need to join bill and meter_reading to get cost and consumption.
    // Filter by meter_no.

    $sql = "SELECT 
                mr.reading_date, 
                mr.consumption, 
                b.amount as cost, 
                b.status,
                b.generated_date
            FROM meter_reading mr
            LEFT JOIN bill b ON mr.reading_id = b.reading_id
            JOIN meter m ON mr.meter_id = m.meter_id
            WHERE m.meter_no = ?
            ORDER BY mr.reading_date DESC";

    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute([$meter_no]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>