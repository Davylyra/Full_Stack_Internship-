<?php
// Start session before any output
session_start();


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}


require_once './db_config.php';


$data = json_decode(file_get_contents("php://input"), true);

// Handle JSON POST requests (for login/logout via fetch)
if ($_SERVER['REQUEST_METHOD'] == 'POST' && $data && isset($data['action'])) {
    if ($data['action'] == 'login') {
        $password = $data['password'] ?? '';
        
        $admin_password = 'admin123'; 

        if ($password === $admin_password) {
            $_SESSION['admin_authenticated'] = true;
            echo json_encode(['success' => true, 'message' => 'Authentication successful']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid password']);
        }
        exit;
    }

    if ($data['action'] == 'logout') {
        $_SESSION['admin_authenticated'] = false;
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logged out']);
        exit;
    }
}


if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (!isset($_SESSION['admin_authenticated']) || $_SESSION['admin_authenticated'] !== true) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Please login first.']);
        exit;
    }

    // Get feedback data
    try {
        // Get filter parameters
        $feedback_type = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : null;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
        $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;

        
        $checkColumn = $conn->query("SHOW COLUMNS FROM customer_feedback LIKE 'created_at'");
        $hasCreatedAt = $checkColumn->num_rows > 0;

        // Build query
        $query = "SELECT id, feedback_type, score, sentiment, comment, product_id";
        if ($hasCreatedAt) {
            $query .= ", created_at";
        }
        $query .= " FROM customer_feedback";

        if ($feedback_type) {
            $query .= " WHERE feedback_type = '$feedback_type'";
        }

        // Order by created_at if it exists, otherwise by id
        if ($hasCreatedAt) {
            $query .= " ORDER BY created_at DESC";
        } else {
            $query .= " ORDER BY id DESC";
        }

        $query .= " LIMIT $limit OFFSET $offset";

        $result = $conn->query($query);

        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }

        $feedback = [];
        while ($row = $result->fetch_assoc()) {
        
            if (!$hasCreatedAt || !isset($row['created_at'])) {
                $row['created_at'] = 'N/A';
            }
            $feedback[] = $row;
        }

        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM customer_feedback";
        if ($feedback_type) {
            $countQuery .= " WHERE feedback_type = '$feedback_type'";
        }
        $countResult = $conn->query($countQuery);
        $total = $countResult->fetch_assoc()['total'];

        // Get statistics
        $statsQuery = "SELECT 
                        feedback_type,
                        COUNT(*) as count,
                        AVG(score) as avg_score
                       FROM customer_feedback 
                       GROUP BY feedback_type";
        $statsResult = $conn->query($statsQuery);
        $stats = [];
        while ($row = $statsResult->fetch_assoc()) {
            $stats[$row['feedback_type']] = $row;
        }

        echo json_encode([
            'success' => true,
            'data' => $feedback,
            'total' => $total,
            'stats' => $stats
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }

    $conn->close();
    exit;
}


if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (!isset($_SESSION['admin_authenticated']) || $_SESSION['admin_authenticated'] !== true) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
}

?>