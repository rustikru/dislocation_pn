<?php

require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Logger.php';
require_once __DIR__ . '/controllers/CarNumberController.php';
require_once __DIR__ . '/controllers/RequestController.php';
require_once __DIR__ . '/controllers/SystemController.php';
require_once __DIR__ . '/core/OracleConnection.php';

$config = require __DIR__ . '/core/Config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . $config['cors']['origin']);
header('Access-Control-Allow-Methods: ' . $config['cors']['methods']);
header('Access-Control-Allow-Headers: ' . $config['cors']['headers']);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ========== Пути ========== */
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$base = 'api';

if (strpos($path, $base) !== 0) {
    Response::error('Неверный путь', 404);
}

$endpoint = substr($path, strlen($base) + 1);

/**
 * endpoint => [class, method]
 */
$routes = [
    // БД
    'TestDbConnection' => [SystemController::class, 'testDbConnection'],    // Проверка соед. с базой

    // car_number
    'GetWagonsToDestination' 	=> [CarNumberController::class, 'getToDestination'],        // Вагоны МД на подходе
    'GetWeighingData'        	=> [CarNumberController::class, 'getWeighingData'],         // Вес по вагону
    'CreateWagonLoading'    	=> [CarNumberController::class, 'createWagonLoading'],      // погрузка вагонов

    // request
    'CreateApplication'     	=> [RequestController::class, 'createRequests'],            // Создание заявок
    'GetApplicationStatus'  	=> [RequestController::class, 'getStatus'],                 // Статус заявки
];

try {

    // Подключение к БД
    $conn = OracleConnection::connect();

    // Проверка маршрута
    if (!isset($routes[$endpoint])) {
        throw new RuntimeException(" Метод '{$endpoint}' не найден");
    }

    [$controllerClass, $method] = $routes[$endpoint];

    // Проверка контроллера
    if (!class_exists($controllerClass)) {
        throw new RuntimeException("Контроллер '{$controllerClass}' не найден");
    }

    $controller = new $controllerClass($conn);

    // Проверка метода
    if (!method_exists($controller, $method)) {
        throw new RuntimeException(
            "Метод '{$method}' не найден в {$controllerClass}"
        );
    }

    // Вызов метода контроллера
    $controller->$method();

} catch (Throwable $e) {
	Logger::error(
        get_class($e) . ': ' . $e->getMessage()
    );

    Response::error( $e->getMessage(), 500);

} finally {

    // закрываем соединение
    OracleConnection::close();
}