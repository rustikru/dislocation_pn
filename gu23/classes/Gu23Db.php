<?php

require_once __DIR__ . '/Gu23Logger.php';

class Gu23Db
{
    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    public function conn()
    {
        return $this->conn;
    }

    public function rows(string $sql, array $params = []): array
    {
        $statement = $this->parse($sql);
        $this->setValues($statement, $params);
        $this->execute($statement, $sql, $params);

        $rows = [];
        while ($row = oci_fetch_array($statement, OCI_ASSOC + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) {
            $rows[] = $row;
        }
        return $rows;
    }

    public function row(string $sql, array $params = []): ?array
    {
        $rows = $this->rows($sql, $params);
        return $rows[0] ?? null;
    }

    public function value(string $packageFunction, array $params = [], int $resultLength = 256): ?string
    {
        $sql = 'BEGIN :ret_val := ' . $packageFunction . '; END;';
        $statement = $this->parse($sql, $packageFunction);
        $result = null;
        oci_bind_by_name($statement, ':ret_val', $result, $resultLength);
        $this->setValues($statement, $params);
        $this->execute($statement, $packageFunction, $params);
        return $result;
    }

    public function clob($statement, string $name, string $value)
    {
        $lob = oci_new_descriptor($this->conn, OCI_DTYPE_LOB);
        $lob->writeTemporary($value === '' ? ' ' : $value);
        oci_bind_by_name($statement, $name, $lob, -1, OCI_B_CLOB);
        return $lob;
    }

    public function parse(string $sql, string $textForLog = '')
    {
        $statement = @oci_parse($this->conn, $sql);
        if (!$statement) {
            $error = oci_error($this->conn);
            $message = 'oci_parse: ' . ($error['message'] ?? '?') . ' | SQL: ' . ($textForLog !== '' ? $textForLog : $sql);
            Gu23Logger::error($message);
            throw new \RuntimeException($message);
        }
        return $statement;
    }

    private function setValues($statement, array &$params): void
    {
        foreach ($params as $name => $value) {
            oci_bind_by_name($statement, $name, $params[$name]);
        }
    }

    private function execute($statement, string $sql, array $params = []): void
    {
        if (!@oci_execute($statement)) {
            $error = oci_error($statement);
            $message = 'oci_execute: ' . ($error['message'] ?? '?') . ' | SQL: ' . $sql;
            Gu23Logger::error($message, ['params' => array_keys($params), 'offset' => $error['offset'] ?? null]);
            throw new \RuntimeException($message);
        }
    }
}
