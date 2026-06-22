<?php

require_once __DIR__ . '/../core/OracleService.php';

class SystemModel
{
    private $oracle;

    public function __construct($dbConn)
    {
        $this->oracle = new OracleService($dbConn);
    }

    public function testConnection(): array
    {
        $sql = "
            SELECT 
                sysdate as current_date,
                user as current_user
            FROM dual
        ";

        return $this->oracle->fetchOne($sql);
    }
}