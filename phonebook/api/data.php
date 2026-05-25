<?php
require_once dirname(__DIR__) . '/core/Bootstrap.php';
Bootstrap::init();

require_once CONTROLLER_DIR.'/data.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

try {
    $data = get_phone_data();
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    error_log('[PhoneDirectory] API ошибка: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Не удалось загрузить данные'], JSON_UNESCAPED_UNICODE);
}