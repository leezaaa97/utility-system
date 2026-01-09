<?php
session_start();
header("Content-Type: application/json");
require_once 'config/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? 'groups';

// SECURITY: Only Admin can modify (POST/DELETE). Manager/Others can only GET.
if (($method == 'POST' || $method == 'DELETE') && $_SESSION['role'] !== 'admin') {
    die(json_encode(["status" => "error", "message" => "Admin access required"]));
}

// --- 1 & 3: GET ENDPOINTS ---
//---(List Groups	GET	tariffs.php?type=groups	Fetches all from tariff_group.)---
//---(List Slabs	GET	tariffs.php?type=slabs&group_id=1	Fetches from tariff_slab where group_id matches.)---
if ($method == 'GET') {
    if ($type == 'groups') {
        $stmt = $conn->query("SELECT * FROM tariff_group");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        $group_id = $_GET['group_id'];
        $stmt = $conn->prepare("SELECT * FROM tariff_slab WHERE group_id = ? ORDER BY min_units ASC");
        $stmt->execute([$group_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}

// --- 2 & 4: POST ENDPOINTS ---
//---(Add Group POST	tariffs.php?type=groups	Inserts into tariff_group) ---
//---(Add Slab	POST	tariffs.php?type=slabs	Inserts into tariff_slab.)---
if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if ($type == 'groups') {
        $stmt = $conn->prepare("INSERT INTO tariff_group (group_name, fixed_charge) VALUES (?, ?)");
        $stmt->execute([$data->group_name, $data->fixed_charge]);
    } else {
        $stmt = $conn->prepare("INSERT INTO tariff_slab (group_id, min_units, max_units, unit_price) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data->group_id, $data->min_units, $data->max_units, $data->unit_price]);
    }
    echo json_encode(["status" => "success", "message" => "Entry Added"]);
}

// --- 5: DELETE ENDPOINT ---
//---(Delete Slab/Group	DELETE	tariffs.php?type=slabs&id=5	Deletes based on the provided ID.)
if ($method == 'DELETE') {
    $id = $_GET['id'];
    $table = ($type == 'groups') ? "tariff_group" : "tariff_slab";
    $col = ($type == 'groups') ? "group_id" : "slab_id";

    $stmt = $conn->prepare("DELETE FROM $table WHERE $col = ?");
    $stmt->execute([$id]);
    echo json_encode(["status" => "success", "message" => "Deleted"]);
}
?>