<?php


$conn = new mysqli('localhost', 'root', '', 'feedback_db');

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
?>