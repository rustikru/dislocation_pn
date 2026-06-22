<?php

class OracleService
{
    private $dbConn;
    private $fileName = 'OracleService';

    public function __construct($dbConn)
    {
        $this->dbConn = $dbConn;
    }
    
    public function fetchOne(string $sql, array $params = []): array
    {
        $stid = oci_parse($this->dbConn, $sql);

        foreach ($params as $key => $value) {
            oci_bind_by_name($stid, $key, $params[$key]);
        }

        oci_execute($stid);

        $row = oci_fetch_assoc($stid);

        return $row ?: [];
    }

    /**
     *  вызов Oracle-процедуры
     */
    public function call(
        string $procedure,
        string $inputJson
    ): array {
        //Logger::info($this->fileName, "[call] {$procedure}");

        $out    = oci_new_descriptor($this->dbConn, OCI_D_LOB);
        $error  = oci_new_descriptor($this->dbConn, OCI_D_LOB);
        $status = null;

        $sql = "begin {$procedure}(:p_in,:p_out,:p_status,:p_error); end;";
        $stid = oci_parse($this->dbConn, $sql);

        oci_bind_by_name($stid, ":p_in", $inputJson);
        oci_bind_by_name($stid, ":p_out", $out, -1, OCI_B_CLOB);
        oci_bind_by_name($stid, ":p_status", $status, 10000);
        oci_bind_by_name($stid, ":p_error", $error, -1, OCI_B_CLOB);

        oci_execute($stid);

        return [
            'status' => $status,
            'error'  => $error ? $error->load() : null,
            'data'   => $out ? json_decode($out->load(), true) : null
        ];
    }
}
