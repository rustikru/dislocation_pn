<?php

class OracleDB
{
    /** @var resource|null */
    private $conn = null;

    private string $host;
    private string $port;
    private string $sid;
    private string $user;
    private string $password;
    private string $charset;

    
    public function __construct(
        ?string $host = null,
        ?string $port = null,
        ?string $sid = null,
        ?string $user = null,
        ?string $password = null,
        ?string $charset = null
    ) {
        $this->host = $host ?? DB_HOST;
        $this->port = $port ?? DB_PORT;
        $this->sid = $sid ?? DB_SID;
        $this->user = $user ?? DB_USER;
        $this->password = $password ?? DB_PASSWORD;
        $this->charset = $charset ?? DB_CHARSET;
    }

    // ═════════════════════════════════════════════════════════════════════
    //  Подключение / отключение
    // ═════════════════════════════════════════════════════════════════════

    private function connect(): void
    {
        if ($this->conn !== null) {
            return;
        }

        $dsn = sprintf('//%s:%s/%s', $this->host, $this->port, $this->sid);

        $this->conn = oci_connect($this->user, $this->password, $dsn, $this->charset);

        if (!$this->conn) {
            $e = oci_error();
            throw new \RuntimeException(
                'Oracle: ошибка подключения — ' . ($e['message'] ?? 'неизвестная ошибка')
            );
        }
    }

    public function disconnect(): void
    {
        if ($this->conn !== null) {
            oci_close($this->conn);
            $this->conn = null;
        }
    }

    public function __destruct()
    {
        $this->disconnect();
    }


    /**
     * SELECT-запрос — возвращает все строки.
     *
     * @param  string               $sql    SQL с именованными плейсхолдерами :param
     * @param  array<string, mixed> $params [':param' => value, ...]
     * @return array
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        $this->connect();

        $stmt = oci_parse($this->conn, $sql);
        if (!$stmt) {
            throw new \RuntimeException('Oracle: ошибка разбора SQL — ' . $this->stmtError($this->conn));
        }

        $this->bindParams($stmt, $params);

        if (!oci_execute($stmt)) {
            throw new \RuntimeException('Oracle: ошибка выполнения — ' . $this->stmtError($stmt));
        }

        $rows = [];
        while ($row = oci_fetch_assoc($stmt)) {
            $rows[] = array_change_key_case($row, CASE_LOWER);
        }

        oci_free_statement($stmt);

        return $rows;
    }

    public function getDirectoryData(): array
    {  
        // ── SQL-запрос ─────────────────────────────────
        $rows = $this->fetchAll(
            "
                 select org_name as org,
                        department as div,
                        uchastok as dep,
                        sektor as sector,
                        nvl(place, '-') as corp,
                        short_name as full_name,
                        dol as pos,
                        nvl (int_number, '-')      as phone_inner,
                        nvl (city_number, '-')     as phone_city
                    from xx_prtl.xx_calls_numbers_disp_v
                order by org_name,
                        department,
                        uchastok,
                        sektor,
                        short_name,
                        dol,
                        place
            "
        );

        return $this->groupByEmployee($rows);
    }

    /**
     * Группируем
     * в массив сотрудников с массивами inner[] и city[].
     */
    private function groupByEmployee(array $rows): array
    {
        $result = [];
        $lastKey = null;
        $lastIdx = -1;

        foreach ($rows as $row) {
            $groupKey = implode('|', [
                $row['org'] ?? '',
                $row['div'] ?? '',
                $row['dep'] ?? '',
                $row['sector'] ?? '',
                $row['pos'] ?? '',
                $row['full_name'] ?? ''
            ]);

            if ($groupKey !== $lastKey) {
                $result[] = [
                    'org' => $row['org'] ?? '',
                    'div' => $row['div'] ?? '',
                    'dep' => $row['dep'] ?? '',
                    'sector' => $row['sector'] ?? '',
                    'pos' => $row['pos'] ?? '',
                    'name' => $row['full_name'] ?? '',
                    'inner' => [],
                    'city' => []
                ];
                $lastKey = $groupKey;
                $lastIdx++;
            }

            if (($row['phone_inner'] ?? '') !== '') {
                $result[$lastIdx]['inner'][] = $row['phone_inner'];
            }
            if (($row['phone_city'] ?? '') !== '') {
                $result[$lastIdx]['city'][] = $row['phone_city'];
            }
            if (($row['corp'] ?? '') !== '') {
                $result[$lastIdx]['corp'][] = $row['corp'];
            }
        }

        return $result;
    }

    /**
     * @param resource $stmt
     * @param array<string, mixed> $params
     */
    private function bindParams($stmt, array $params): void
    {
        foreach ($params as $placeholder => $bind) {
            if (is_array($bind)) {
                $type = $bind['type'] ?? SQLT_CHR;
                oci_bind_by_name($stmt, $placeholder, $bind['value'], -1, $type);
            } else {
                oci_bind_by_name($stmt, $placeholder, $params[$placeholder]);
            }
        }
    }

    /**
     * @param resource $stmtOrConn
     * @return string
     */
    private function stmtError($stmtOrConn): string
    {
        $e = oci_error($stmtOrConn);
        return $e['message'] ?? 'неизвестная ошибка';
    }
}