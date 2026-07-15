<?php

session_start();

$action = $_POST['ajax_action'] ?? '';

include __DIR__ . '/../login.php';
require_once __DIR__ . '/classes/GuActRepository.php';

$auth = new AuthClass();

$conn = $conn1 ?? null;
if (!$conn) {
    echo json_encode(['ok' => false, 'msg' => 'Ошибка подключения к БД']);
    exit;
}

$repo = new GuActRepository($conn, $auth);
$repo->runAction($action, $_POST);
