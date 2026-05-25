<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Logger.php';
require_once __DIR__ . '/../models/SystemModel.php';

class SystemController
{
    private $model;
    private $fileName = 'SystemController';

    public function __construct($dbConn)
    {
        $this->model = new SystemModel($dbConn);
    }

    // Проверка подключения к БД
    public function testDbConnection(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $message = "Метод " . $_SERVER['REQUEST_METHOD'] . " не разрешён для данной функции.";
            Logger::error("[" . __METHOD__ . "] " . $message, 405);
            Response::error($message, 500);
        }

        try {
            $start = microtime(true);

            $result = $this->model->testConnection();

            $time = microtime(true) - $start;

            Response::json(
                Response::build(
                    'S',
                    'Connection successful!'
                )
            );

        } catch (Exception $e) {
            Logger::error(
                "[" . __METHOD__ . "] DB ERROR: " . $e->getMessage()
            );

            Response::json(
                Response::build(
                    'E',
                    'DB connection FAILED',
                    [
                        'error' => $e->getMessage()
                    ]
                ),
                500
            );
        }
    }
}