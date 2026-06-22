<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Logger.php';
require_once __DIR__ . '/../models/RequestModel.php';

class RequestController
{
    private $model;
    private $fileName = 'RequestController';

    public function __construct($dbConn)
    {
        $this->model = new RequestModel($dbConn);
    }
    // Создание заявки на увод/взвешивание
    public function createRequests(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $message = "Метод ".$_SERVER['REQUEST_METHOD']." не разрешён для данной функции.";
            Logger::error("[" . __METHOD__ . "] ".$message, 405);
            Response::error( $message, 500);
        }

        $raw = file_get_contents("php://input");
        Logger::info($this->fileName, "[" . __METHOD__ . "] input: " . $raw);

        $result = $this->model->createRequests($raw);
        Response::json(
            Response::build(
                $result['status'],
                $result['error'],
                $result['data']
            )
        );
    }
    // Статус заявки
    public function getStatus(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $message = "Метод ".$_SERVER['REQUEST_METHOD']." не разрешён для данной функции.";
            Logger::error("[" . __METHOD__ . "] ".$message, 405);
            Response::error( $message, 500);
        }

        //$id = $_GET['request_id'] ?? $_GET['REQUEST_ID'] ?? null;
        //Logger::info($this->fileName, "[" . __METHOD__ . "] input: " . $id);
        $raw = file_get_contents("php://input");
        Logger::info($this->fileName, "[" . __METHOD__ . "] input: " . $raw);
        
        $result = $this->model->getStatus($raw);
        Response::json(
            Response::build(
                $result['status'],
                $result['error'],
                $result['data']
            )
        );
    }
}
