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
        $stmt = $conn->prepare("SELECT * FROM customer WHERE customer_id = ?");
        $stmt->execute([$_GET['id']]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    } elseif (isset($_GET['type_id'])) {
        // Search by Tariff Group (joined via meter)
        $sql = "SELECT DISTINCT c.* FROM customer c JOIN meter m ON c.customer_id = m.customer_id WHERE m.group_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$_GET['type_id']]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        // Get Total Count or All Customers
        if (isset($_GET['count'])) {
            $stmt = $conn->query("SELECT COUNT(*) as total FROM customer");
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            $stmt = $conn->query("SELECT * FROM customer");
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