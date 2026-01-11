<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config/db_connect.php';

// Session Check (Optional but recommended)
session_start();
// if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'manager') { ... }

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_init_data':
        getInitData($conn);
        break;
    case 'get_analytics':
        getAnalytics($conn);
        break;
    case 'get_logs':
        getSystemLogs($conn);
        break;
    case 'get_customers':
        getCustomers($conn);
        break;
    case 'generate_report':
        generateReport($conn);
        break;
    default:
        echo json_encode(["status" => "error", "message" => "Invalid action"]);
        break;
}

function getInitData($conn)
{
    $response = ['utilities' => [], 'years' => []];

    // Utilities
    try {
        $stmt = $conn->query("SELECT utility_id, name FROM utility");
        $response['utilities'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Years (from payments)
        $stmtYear = $conn->query("SELECT DISTINCT YEAR(payment_date) as y FROM payment ORDER BY y DESC");
        $response['years'] = $stmtYear->fetchAll(PDO::FETCH_COLUMN);

    } catch (PDOException $e) {
        // Silent fail or empty
    }

    echo json_encode(['status' => 'success', 'data' => $response]);
}

function getAnalytics($conn)
{
    $utility_id = $_GET['utility_id'] ?? null;
    $year = $_GET['year'] ?? date('Y');
    $response = ['kpi' => [], 'revenue_trend' => [], 'usage_trend' => [], 'top_consumers' => []];

    try {
        // KPI: Revenue
        // Daily
        $sqlD = "SELECT SUM(p.amount) FROM payment p 
                 JOIN bill b ON p.bill_id = b.bill_id
                 JOIN meter m ON b.meter_id = m.meter_id
                 JOIN tariff_group tg ON m.group_id = tg.group_id
                 WHERE CAST(p.payment_date AS DATE) = CAST(GETDATE() AS DATE)";
        if ($utility_id)
            $sqlD .= " AND tg.utility_id = ?";

        $stmt = $conn->prepare($sqlD);
        $stmt->execute($utility_id ? [$utility_id] : []);
        $response['kpi']['daily'] = $stmt->fetchColumn() ?: 0;

        // Monthly
        $sqlM = "SELECT SUM(p.amount) FROM payment p 
                 JOIN bill b ON p.bill_id = b.bill_id
                 JOIN meter m ON b.meter_id = m.meter_id
                 JOIN tariff_group tg ON m.group_id = tg.group_id
                 WHERE MONTH(p.payment_date) = MONTH(GETDATE()) AND YEAR(p.payment_date) = YEAR(GETDATE())";
        if ($utility_id)
            $sqlM .= " AND tg.utility_id = ?";

        $stmt = $conn->prepare($sqlM);
        $stmt->execute($utility_id ? [$utility_id] : []);
        $response['kpi']['monthly'] = $stmt->fetchColumn() ?: 0;

        // KPI: Active Meters
        $sqlActive = "SELECT COUNT(DISTINCT m.meter_id) 
                      FROM meter m
                      JOIN tariff_group tg ON m.group_id = tg.group_id
                      WHERE m.status = 'Active'";
        if ($utility_id)
            $sqlActive .= " AND tg.utility_id = ?";

        $stmt = $conn->prepare($sqlActive);
        $stmt->execute($utility_id ? [$utility_id] : []);
        $response['kpi']['active'] = $stmt->fetchColumn() ?: 0;

        // Revenue Trend (Chart)
        $sqlTrend = "SELECT MONTH(p.payment_date) as m, SUM(p.amount) as total
                     FROM payment p
                     JOIN bill b ON p.bill_id = b.bill_id
                     JOIN meter m ON b.meter_id = m.meter_id
                     JOIN tariff_group tg ON m.group_id = tg.group_id
                     WHERE YEAR(p.payment_date) = ?";
        if ($utility_id)
            $sqlTrend .= " AND tg.utility_id = ?";
        $sqlTrend .= " GROUP BY MONTH(p.payment_date) ORDER BY m";

        $params = $utility_id ? [$year, $utility_id] : [$year];
        $stmt = $conn->prepare($sqlTrend);
        $stmt->execute($params);
        $response['revenue_trend'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Top Consumers
        $sqlTop = "SELECT TOP 5 c.first_name, c.last_name, m.meter_no, SUM(p.amount) as total_paid
                   FROM payment p
                   JOIN bill b ON p.bill_id = b.bill_id
                   JOIN meter m ON b.meter_id = m.meter_id
                   JOIN customer c ON m.customer_id = c.customer_id
                   JOIN tariff_group tg ON m.group_id = tg.group_id
                   WHERE YEAR(p.payment_date) = ?";
        if ($utility_id)
            $sqlTop .= " AND tg.utility_id = ?";
        $sqlTop .= " GROUP BY c.first_name, c.last_name, m.meter_no ORDER BY total_paid DESC";

        $stmt = $conn->prepare($sqlTop);
        $stmt->execute($params);
        $response['top_consumers'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'data' => $response]);

    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

function getSystemLogs($conn)
{
    $utility_id = $_GET['utility_id'] ?? null;
    // 1. Fault Reports
    // 2. Recent Payments (as logs)
    $response = ['faults' => [], 'payments' => []];

    try {
        $sqlFaults = "SELECT TOP 10 f.report_date, m.meter_no, f.description, f.status 
                      FROM fault_report f 
                      JOIN meter m ON f.meter_id = m.meter_id 
                      JOIN tariff_group tg ON m.group_id = tg.group_id";
        if ($utility_id) {
            $sqlFaults .= " WHERE tg.utility_id = " . intval($utility_id);
        }
        $sqlFaults .= " ORDER BY f.report_date DESC";

        $stmt = $conn->query($sqlFaults);
        $response['faults'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sqlPayments = "SELECT TOP 10 p.payment_date, p.amount, m.meter_no 
                        FROM payment p 
                        JOIN bill b ON p.bill_id = b.bill_id 
                        JOIN meter m ON b.meter_id = m.meter_id 
                        JOIN tariff_group tg ON m.group_id = tg.group_id";
        if ($utility_id) {
            $sqlPayments .= " WHERE tg.utility_id = " . intval($utility_id);
        }
        $sqlPayments .= " ORDER BY p.payment_date DESC";

        $stmt = $conn->query($sqlPayments);
        $response['payments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'data' => $response]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

function getCustomers($conn)
{
    $utility_id = $_GET['utility_id'] ?? null;
    try {
        $sql = "SELECT c.customer_id, c.first_name, c.last_name, c.nic, m.meter_no, m.status, u.name as utility
                FROM customer c
                LEFT JOIN meter m ON c.customer_id = m.customer_id
                LEFT JOIN tariff_group tg ON m.group_id = tg.group_id
                LEFT JOIN utility u ON tg.utility_id = u.utility_id";

        if ($utility_id) {
            $sql .= " WHERE tg.utility_id = " . intval($utility_id);
        }

        $stmt = $conn->query($sql);
        echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

function generateReport($conn)
{
    // UPDATE: Verified Path
    require_once('libs/TCPDF-6.6.2/tcpdf.php');

    $type = $_GET['type'] ?? 'General';
    $utility_id = $_GET['utility_id'] ?? null;

    // Create new PDF document
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    $pdf->SetCreator('Antigravity Manager');
    $pdf->SetTitle($type . ' Report');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->AddPage();

    // Header
    $pdf->SetFont('helvetica', 'B', 20);
    $pdf->Cell(0, 10, 'Utility Intelligence Hub', 0, 1, 'C');
    $pdf->SetFont('helvetica', '', 14);
    $pdf->Cell(0, 10, $type . ' Report', 0, 1, 'C');
    $pdf->Ln(10);

    $pdf->SetFont('helvetica', '', 10);
    $html = "";

    if ($type === 'Revenue') {
        $html .= "<h3>Recent Revenue Stream</h3><table border='1' cellpadding='5'>
                  <tr style='background-color:#eee;'><th>Date</th><th>Amount (LKR)</th><th>Meter No</th></tr>";

        $sql = "SELECT TOP 50 p.payment_date, p.amount, m.meter_no 
                FROM payment p 
                JOIN bill b ON p.bill_id = b.bill_id 
                JOIN meter m ON b.meter_id = m.meter_id ";
        if ($utility_id) {
            $sql .= " JOIN tariff_group tg ON m.group_id = tg.group_id WHERE tg.utility_id = " . intval($utility_id);
        }
        $sql .= " ORDER BY p.payment_date DESC";

        $stmt = $conn->query($sql);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $amount = number_format($row['amount'], 2);
            $html .= "<tr><td>{$row['payment_date']}</td><td>{$amount}</td><td>{$row['meter_no']}</td></tr>";
        }
        $html .= "</table>";
    } else if ($type === 'Customers') {
        $html .= "<h3>Customer Database status</h3><table border='1' cellpadding='5'>
                  <tr style='background-color:#eee;'><th>NIC</th><th>Name</th><th>Meter</th><th>Status</th></tr>";

        $sql = "SELECT TOP 100 c.nic, c.first_name, c.last_name, m.meter_no, m.status 
                 FROM customer c LEFT JOIN meter m ON c.customer_id = m.customer_id";
        if ($utility_id) {
            $sql .= " LEFT JOIN tariff_group tg ON m.group_id = tg.group_id WHERE tg.utility_id = " . intval($utility_id);
        }

        $stmt = $conn->query($sql);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $html .= "<tr><td>{$row['nic']}</td><td>{$row['first_name']} {$row['last_name']}</td><td>{$row['meter_no']}</td><td>{$row['status']}</td></tr>";
        }
        $html .= "</table>";
    }

    $pdf->writeHTML($html, true, false, true, false, '');
    $pdf->Output('report.pdf', 'I');
}
?>