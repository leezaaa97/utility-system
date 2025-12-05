<?php
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';



// Handle login
//start the api url with localhost:3000 in my case, may differ in your case
//api url for this file: api/auth.php?action=login and api/auth.php?action=logout
//Sessions are properly getting recorded

$action = $_GET['action'] ?? '';

if ($action == 'login' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$data->username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($data->password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['role'] = $user['role'];
        echo json_encode(["status" => "success", "role" => $user['role'], "redirect" => "public/dashboard_" . $user['role'] . ".html"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
    }
} elseif ($action == 'logout') {
    session_destroy();
    echo json_encode(["status" => "success"]);
}
?>