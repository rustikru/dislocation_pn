<?php
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Logger.php';
require_once __DIR__ . '/../models/CarNumberModel.php';

class CarNumberController
{
    private $model;
    private $fileName = 'CarNumberController';

    public function __construct($dbConn)
    {
        $this->model = new CarNumberModel($dbConn);
    }
    //Получить список вагонов к назначению МД
    public function getToDestination(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
            $message = "Метод ".$_SERVER['REQUEST_METHOD']." не разрешён для данной функции.";
            Logger::error("[" . __METHOD__ . "] ".$message, 405);
            Response::error( $message, 500);
        }
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // Данные из $_GET
            $typeCar = isset($_GET['type_car']) ? $_GET['type_car'] : [];
            $freightName = isset($_GET['freight_name']) ? $_GET['freight_name'] : [];

            // Формируем массив
            $data = [
                'type_car' => $typeCar,       // массив: ['ЦС'] или []
                'freight_name' => $freightName // массив: ['КФС'] или []
            ];
            // Преобразуем массив в JSON‑строку
            $raw = json_encode($data, JSON_UNESCAPED_UNICODE);
        } 
        // POST
        else {
            $raw = file_get_contents("php://input");
        }
        Logger::info($this->fileName, "[" . __METHOD__ . "] input: " . $raw);

        $result = $this->model->getToDestination($raw);

        //Logger::info($this->fileName, "[" . __METHOD__ . "] input: " . json_encode($result['data'], JSON_UNESCAPED_UNICODE));
        Response::json(
            Response::build(
                $result['status'],
                $result['error'],
                $result['data']
            )
        );
    }
    // Погрузка вагонов
    public function createWagonLoading(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $message = "Метод ".$_SERVER['REQUEST_METHOD']." не разрешён для данной функции.";
            Logger::error("[" . __METHOD__ . "] ".$message, 405);
            Response::error( $message, 500);
        }

        $raw = file_get_contents("php://input");
        $data = json_decode($raw, true);

        if ($data === null) {
            Logger::error("Некорректный JSON");
        }

        //$payload = json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
        $payload = json_encode($data, JSON_UNESCAPED_UNICODE);
        Logger::info($this->fileName, "[" . __METHOD__ . "] input: " . $raw);

        $result = $this->model->createWagonLoading($payload);
        Response::json(
            Response::build(
                $result['status'],
                $result['error'],
                $result['data']
            )
        );
    }
    // Данные по взвешиванию 
    public function GetWeighingData(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $message = "Метод ".$_SERVER['REQUEST_METHOD']." не разрешён для данной функции.";
            Logger::error("[" . __METHOD__ . "] ".$message, 405);
            Response::error( $message, 500);
        }

        //$carNumber = $_GET['car_number'];
        $raw = file_get_contents("php://input");

        Logger::info($this->fileName, "[" . __METHOD__ . "] input: " . $raw);

        $result = $this->model->getWeighingData($raw);
        Response::json(
            Response::build(
                $result['status'],
                $result['error'],
                $result['data']
            )
        );
    }
}
