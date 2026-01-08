<?php
session_start();
header("Content-Type: application/json");

require_once __DIR__ . '/config/db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!$data || !isset($data->username) || !isset($data->password)) {
        echo json_encode(["status" => "error", "message" => "Missing username or password"]);
        exit;
    }

    try {
        $stmt = $conn->prepare("SELECT user_id, role, password_hash FROM users WHERE username = ?");
        $stmt->execute([$data->username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($data->password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['role']   = $user['role'];
            
            echo json_encode([
                "status"   => "success",
                "role"     => $user['role'],
                "redirect" => "public/dashboard_" . $user['role'] . ".html"
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "An internal error occurred"]);
    }
} 

elseif ($action === 'logout') {
    session_destroy();
    echo json_encode(["status" => "success"]);
} 

else {
    echo json_encode(["status" => "error", "message" => "Invalid action specified"]);
}
?>