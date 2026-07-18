<?php

class OracleDatabase
{
    private $connection = null;
    private string $user;
    private string $password;
    private string $connectionString;
    private string $charset;

    public function __construct(
        string $user,
        string $password,
        string $connectionString,
        string $charset = 'AL32UTF8'
    ) {
        $this->user = $user;
        $this->password = $password;
        $this->connectionString = $connectionString;
        $this->charset = $charset;
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        $statement = null;
        $descriptors = [];

        try {
            $statement = $this->prepare($sql);
            $this->bindParams($statement, $params, $descriptors);
            $this->executeStatement($statement);

            $rows = [];
            while (($row = oci_fetch_array($statement, OCI_ASSOC | OCI_RETURN_NULLS)) !== false) {
                $rows[] = $this->convertLobs($row);
            }

            return $rows;
        } finally {
            $this->freeResources($statement, $descriptors);
        }
    }

    public function fetchOne(string $sql, array $params = []): ?array
    {
        $rows = $this->fetchAll($sql, $params);
        return $rows[0] ?? null;
    }

    public function fetchValue(string $sql, array $params = [])
    {
        $row = $this->fetchOne($sql, $params);
        return $row === null ? null : reset($row);
    }

    public function execute(string $sql, array $params = [], bool $commit = true): array
    {
        $statement = null;
        $descriptors = [];

        try {
            $statement = $this->prepare($sql);
            $bindings = $this->bindParams($statement, $params, $descriptors);
            $this->executeStatement($statement, $commit ? OCI_COMMIT_ON_SUCCESS : OCI_NO_AUTO_COMMIT);

            return $this->collectOutputValues($bindings);
        } catch (Throwable $exception) {
            if (!$commit && $this->connection !== null) {
                oci_rollback($this->connection);
            }
            throw $exception;
        } finally {
            $this->freeResources($statement, $descriptors);
        }
    }

    public function callFunction(string $sql, array $params = [], array $result = [])
    {
        $params['result'] = array_merge([
            'direction' => 'out',
            'type' => 'string',
            'length' => 1000000,
        ], $result);

        $output = $this->execute($sql, $params);
        return $output['result'] ?? null;
    }

    public function callProcedure(string $sql, array $params = []): array
    {
        return $this->execute($sql, $params);
    }

    public function commit(): void
    {
        if (!oci_commit($this->connect())) {
            $this->throwOciError($this->connection, 'Не удалось зафиксировать транзакцию Oracle');
        }
    }

    public function rollback(): void
    {
        if ($this->connection !== null && !oci_rollback($this->connection)) {
            $this->throwOciError($this->connection, 'Не удалось откатить транзакцию Oracle');
        }
    }

    public function close(): void
    {
        if ($this->connection) {
            oci_close($this->connection);
        }
        $this->connection = null;
    }

    public function __destruct()
    {
        $this->close();
    }

    private function connect()
    {
        if ($this->connection !== null) {
            return $this->connection;
        }

        $connection = @oci_connect(
            $this->user,
            $this->password,
            $this->connectionString,
            $this->charset
        );

        if (!$connection) {
            $this->throwOciError(null, 'Не удалось подключиться к Oracle');
        }

        $this->connection = $connection;
        return $this->connection;
    }

    private function prepare(string $sql)
    {
        $statement = @oci_parse($this->connect(), $sql);
        if (!$statement) {
            $this->throwOciError($this->connection, 'Не удалось подготовить запрос Oracle');
        }
        return $statement;
    }

    private function bindParams($statement, array $params, array &$descriptors): array
    {
        $bindings = [];

        foreach ($params as $name => $definition) {
            $parameter = is_array($definition) && array_key_exists('direction', $definition)
                ? $definition
                : ['value' => $definition, 'direction' => 'in', 'type' => 'string'];

            $direction = strtolower($parameter['direction'] ?? 'in');
            $type = strtolower($parameter['type'] ?? 'string');
            $bindName = ':' . ltrim((string) $name, ':');

            if ($type === 'clob') {
                $descriptor = oci_new_descriptor($this->connect(), OCI_D_LOB);
                if (!$descriptor) {
                    throw new RuntimeException('Не удалось создать CLOB-дескриптор Oracle');
                }

                if (($direction === 'in' || $direction === 'inout') && array_key_exists('value', $parameter)) {
                    if (!$descriptor->writeTemporary((string) $parameter['value'], OCI_TEMP_CLOB)) {
                        $descriptor->free();
                        throw new RuntimeException('Не удалось записать входной CLOB Oracle');
                    }
                }

                $bindings[$name] = ['value' => $descriptor, 'direction' => $direction, 'type' => $type];
                $descriptors[] = $descriptor;
                $ok = @oci_bind_by_name($statement, $bindName, $bindings[$name]['value'], -1, OCI_B_CLOB);
            } else {
                $bindings[$name] = [
                    'value' => $parameter['value'] ?? null,
                    'direction' => $direction,
                    'type' => $type,
                ];
                $length = (int) ($parameter['length'] ?? ($direction === 'in' ? -1 : 4000));
                $ociType = $type === 'integer' ? SQLT_INT : SQLT_CHR;
                $ok = @oci_bind_by_name(
                    $statement,
                    $bindName,
                    $bindings[$name]['value'],
                    $length,
                    $ociType
                );
            }

            if (!$ok) {
                $this->throwOciError($statement, 'Не удалось привязать параметр ' . $bindName);
            }
        }

        return $bindings;
    }

    private function executeStatement($statement, int $mode = OCI_COMMIT_ON_SUCCESS): void
    {
        if (!@oci_execute($statement, $mode)) {
            $this->throwOciError($statement, 'Не удалось выполнить запрос Oracle');
        }
    }

    private function collectOutputValues(array $bindings): array
    {
        $output = [];
        foreach ($bindings as $name => $binding) {
            if ($binding['direction'] !== 'out' && $binding['direction'] !== 'inout') {
                continue;
            }

            $output[$name] = $binding['type'] === 'clob'
                ? $binding['value']->load()
                : $binding['value'];
        }
        return $output;
    }

    private function convertLobs(array $row): array
    {
        foreach ($row as $column => $value) {
            if (is_object($value) && method_exists($value, 'load')) {
                $row[$column] = $value->load();
                if (method_exists($value, 'free')) {
                    $value->free();
                }
            }
        }
        return $row;
    }

    private function freeResources($statement, array $descriptors): void
    {
        foreach ($descriptors as $descriptor) {
            if (is_object($descriptor) && method_exists($descriptor, 'free')) {
                $descriptor->free();
            }
        }

        if ($statement) {
            oci_free_statement($statement);
        }
    }

    private function throwOciError($resource, string $prefix): void
    {
        $error = $resource ? oci_error($resource) : oci_error();
        $code = (int) ($error['code'] ?? 0);
        $message = trim((string) ($error['message'] ?? 'Неизвестная ошибка Oracle'));
        throw new RuntimeException($prefix . ': ' . $message, $code);
    }
}
