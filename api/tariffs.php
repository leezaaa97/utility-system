<?php
error_reporting(0); // Suppress warnings/notices to prevent JSON corruption
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? 'groups';

// SECURITY: Only Admin can modify
if (($method == 'POST' || $method == 'DELETE' || $method == 'PUT') && ($_SESSION['role'] !== 'admin')) {
    // Check if session role exists first to avoid notice (though suppressed)
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        die(json_encode(["status" => "error", "message" => "Admin access required"]));
    }
}

// --- GET ---
if ($method == 'GET') {
    if ($type == 'groups') {
        try {
            // Fetch Groups with Utility Info
            $stmt = $conn->query("
SELECT tg.*, u.name as utility_type
FROM tariff_group tg
LEFT JOIN utility u ON tg.utility_id = u.utility_id
ORDER BY tg.utility_id, tg.group_name
");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    } elseif ($type == 'utilities') {
        try {
            // Check if utilities exist, if not seed them
            $stmt = $conn->query("SELECT COUNT(*) FROM utility");
            if ($stmt->fetchColumn() == 0) {
                $conn->exec("INSERT INTO utility (name, unit_name) VALUES ('Electricity', 'kWh')");
                $conn->exec("INSERT INTO utility (name, unit_name) VALUES ('Water', 'Liters')");
            }

            // Fetch All Utilities
            $stmt = $conn->query("SELECT * FROM utility ORDER BY name");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    } else {
        try {
            // Fetch Slabs for specific group
            $group_id = $_GET['group_id'] ?? 0;
            $stmt = $conn->prepare("SELECT * FROM tariff_slab WHERE group_id = ? ORDER BY min_units ASC");
            $stmt->execute([$group_id]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }
}

// --- POST (Add) ---
if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if ($type == 'groups') {
        // Direct Utility ID from Form
        $utilityId = $data->utility_id ?? 1;

        $stmt = $conn->prepare("INSERT INTO tariff_group (group_name, fixed_charge, utility_id) VALUES (?, ?, ?)");
        if ($stmt->execute([$data->group_name, $data->fixed_charge, $utilityId])) {
            echo json_encode(["status" => "success", "message" => "Tariff Group Added"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to add group"]);
        }
    } elseif ($type == 'slabs') {
        $stmt = $conn->prepare("INSERT INTO tariff_slab (group_id, min_units, max_units, unit_price) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([$data->group_id, $data->min_units, $data->max_units, $data->unit_price])) {
            echo json_encode(["status" => "success", "message" => "Slab Added"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to add slab"]);
        }
    }
}

// --- PUT (Update) ---
if ($method == 'PUT') {
    $data = json_decode(file_get_contents("php://input"));

    if ($type == 'groups') {
        $stmt = $conn->prepare("UPDATE tariff_group SET group_name = ?, fixed_charge = ?, utility_id = ? WHERE group_id = ?");
        if ($stmt->execute([$data->group_name, $data->fixed_charge, $data->utility_id, $data->group_id])) {
            echo json_encode(["status" => "success", "message" => "Group Updated"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to update group"]);
        }
    } elseif ($type == 'slabs') {
        $stmt = $conn->prepare("UPDATE tariff_slab SET min_units = ?, max_units = ?, unit_price = ? WHERE slab_id = ?");
        if ($stmt->execute([$data->min_units, $data->max_units, $data->unit_price, $data->slab_id])) {
            echo json_encode(["status" => "success", "message" => "Slab Updated"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to update slab"]);
        }
    }
}

// --- DELETE ---
if ($method == 'DELETE') {
    $id = $_GET['id'] ?? 0;

    if ($type == 'groups') {
        // Cascade delete slabs first (if not handled by DB constraint)
        $conn->prepare("DELETE FROM tariff_slab WHERE group_id = ?")->execute([$id]);
        $stmt = $conn->prepare("DELETE FROM tariff_group WHERE group_id = ?");
        if ($stmt->execute([$id])) {
            echo json_encode(["status" => "success", "message" => "Group Deleted"]);
        }
    } elseif ($type == 'slabs') {
        $stmt = $conn->prepare("DELETE FROM tariff_slab WHERE slab_id = ?");
        if ($stmt->execute([$id]))
            echo json_encode(["status" => "success", "message" => "Slab Deleted"]);
    }
}
?>