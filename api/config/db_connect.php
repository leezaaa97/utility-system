<?php
try {
    $conn = new PDO(
        "sqlsrv:Server=DESKTOP-PFVFP04\\SQLEXPRESS;Database=utility_db",
        "sa",
        "root"
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
    exit;
}
?>