<?php

require_once __DIR__ . '/../core/OracleService.php';

class RequestModel
{
    private $oracle;

    public function __construct($dbConn)
    {
        $this->oracle = new OracleService($dbConn);
    }
    
    // Создание заявки
    public function createRequests(string $json): array
    {
        return $this->oracle->call(
            'xx_etw.xx_disl_metadynea_pkg.create_requests',
            $json
        );
    }
    
    // Статус заявки
    public function getStatus(?string $json): array
    {
        //$json = json_encode(['request_id' => $id]); -- rem 25.05.2026 Передается массив
        return $this->oracle->call(
            'xx_etw.xx_disl_metadynea_pkg.get_status_requests',
            $json
        );
    }
}
