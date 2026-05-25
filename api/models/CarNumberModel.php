<?php

require_once __DIR__ . '/../core/OracleService.php';

class CarNumberModel
{
    private $oracle;

    public function __construct($dbConn)
    {
        $this->oracle = new OracleService($dbConn);
    }

    public function getToDestination(string $json): array
    {
        return $this->oracle->call(
            'xx_etw.xx_disl_metadynea_pkg.getToDestination',
            $json
        );
    }

    public function createWagonLoading(string $json): array
    {
        return $this->oracle->call(
            'xx_etw.xx_disl_metadynea_pkg.CreateWagonLoading',
            $json
        );
    }

    public function getWeighingData(?string $json): array
    {
        //$json = json_encode(['car_number' => $carNumber]);
        return $this->oracle->call(
            'xx_etw.xx_disl_metadynea_pkg.get_weighing_data',
            $json
        );
    }
}
