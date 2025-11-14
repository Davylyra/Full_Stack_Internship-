<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}


require_once './db_config.php';

// Get the posted data
$data = json_decode(file_get_contents("php://input"));

// Check if data is valid
if (!$data || !isset($data->feedback_type)) {
    echo json_encode(['success' => false, 'message' => 'Invalid input.']);
    exit;
}

// Sanitize and prepare data
$feedback_type = $conn->real_escape_string($data->feedback_type);
$score = isset($data->score) ? (int) $data->score : NULL;
$sentiment = isset($data->sentiment) ? $conn->real_escape_string($data->sentiment) : NULL;
$comment = isset($data->comment) ? $conn->real_escape_string($data->comment) : NULL;
$product_id = isset($data->product_id) ? $conn->real_escape_string($data->product_id) : NULL;

// Use prepared statements to prevent SQL injection
$stmt = $conn->prepare("INSERT INTO customer_feedback (feedback_type, score, sentiment, comment, product_id) VALUES (?, ?, ?, ?, ?)");

// Bind parameters
// "issss" means Integer, String, String, String, String
$stmt->bind_param("sisss", $feedback_type, $score, $sentiment, $comment, $product_id);

// Execute the statement
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Feedback submitted successfully!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $stmt->error]);
}

// Close connection
$stmt->close();
$conn->close();

?>