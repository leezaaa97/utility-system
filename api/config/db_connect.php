<?php
<<<<<<< HEAD

try {
    $conn = new PDO(
        // Changed to 'localhost' so it works on everyone's computer.
        //(Original was "sqlsrv:Server=DESKTOP-PFVFP04\\SQLEXPRESS;Database=utility_db",)
        // Added 'TrustServerCertificate' to fix SSL connection errors.
        "sqlsrv:Server=localhost;Database=utility_db;TrustServerCertificate=true",
=======
try {
    $conn = new PDO(
        "sqlsrv:Server=DESKTOP-PFVFP04\\SQLEXPRESS;Database=utility_db",
>>>>>>> backend-dev
        "sa",
        "root"
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
<<<<<<< HEAD
        "message" => "Database Connection Failed: " . $e->getMessage()
=======
        "message" => $e->getMessage()
>>>>>>> backend-dev
    ]);
    exit;
}
?>