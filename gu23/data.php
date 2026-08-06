<?php

require_once __DIR__ . '/session_bootstrap.php';

$action = $_POST['ajax_action'] ?? '';

include __DIR__ . '/../login.php';
require_once __DIR__ . '/classes/GuActRepository.php';

$auth = new AuthClass();

header('Content-Type: application/json; charset=utf-8');

// Истёкшая сессия не должна выглядеть как отсутствие полномочий.
// Проверяем авторизацию до обращения к репозиторию и проверки ролей.
if (!$auth->isAuth()) {
    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'code' => 'SESSION_EXPIRED',
        'msg' => 'Ваша сессия закончилась. Войдите в систему повторно.',
    ]);
    exit;
}

$conn = $conn1 ?? null;
if (!$conn) {
    echo json_encode(['ok' => false, 'msg' => 'Ошибка подключения к БД']);
    exit;
}

$repo = new GuActRepository($conn, $auth);
$repo->runAction($action, $_POST);
