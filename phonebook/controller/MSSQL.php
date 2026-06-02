<?php

class MSSQL
{
    /** @var resource|null */
    private $conn = null;

    private string $host;
    private string $database;
    private string $user;
    private string $password;
    private string $charset;



    public function __construct(
        ?string $host = null,
        ?string $database = null,
        ?string $user = null,
        ?string $password = null,
        ?string $charset = null
    ) {
        if (!function_exists('sqlsrv_connect')) {
            throw new Exception("MSSQL driver (sqlsrv) is not installed.");
        }
        $this->host = $host ?? MSSQL_HOST;
        $this->database = $database ?? MSSQL_DBNAME;
        $this->user = $user ?? MSSQL_USER;
        $this->password = $password ?? MSSQL_PASSWORD;
        $this->charset = $charset ?? MSSQL_CHARSET;
    }

    // ═════════════════════════════════════════════════════════════════════
    //  Подключение / отключение
    // ═════════════════════════════════════════════════════════════════════

    private function connect(): void
    {
        if (is_resource($this->conn)) {
            return;
        }

        $connectionInfo = [
            'Database'               => $this->database,
            'UID'                    => $this->user,
            'PWD'                    => $this->password,
            'CharacterSet'           => $this->charset,
            'TrustServerCertificate' => true,
            'ReturnDatesAsStrings'   => true,
        ];

        $conn = sqlsrv_connect($this->host, $connectionInfo);

        if ($conn === false) {
            $errors = sqlsrv_errors();
            error_log('[PhoneDirectory] sqlsrv_connect failed: ' . print_r($errors, true));
            $this->conn = null;
            $errorMsg = $errors[0]['message'] ?? 'неизвестная ошибка';
            throw new \RuntimeException('MSSQL: ошибка подключения — ' . $errorMsg);
        }

        $this->conn = $conn;
    }


    public function disconnect(): void
    {
        if ($this->conn !== null) {
            sqlsrv_close($this->conn);
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
     * @param  string               $sql    SQL с именованными плейсхолдерами ? или :param
     * @param  array<string, mixed> $params [':param' => value, ...]
     * @return array
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        $this->connect();
        // Преобразуем именованные плейсхолдеры :param в позиционные ?
        $sqlConverted = preg_replace('/:([a-zA-Z0-9_]+)/', '?', $sql);

        // Упорядочиваем параметры
        $orderedParams = [];
        if (!empty($params)) {
            $orderedParams = $this->orderParams($sql, $params);
        }

        // Выполняем запрос с параметрами
        $stmt = sqlsrv_query($this->conn, $sqlConverted, $orderedParams);

        if (!$stmt) {
            throw new \RuntimeException('MSSQL: ошибка выполнения — ' . $this->stmtError());
        }

        // Собираем результаты
        $rows = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {

            $lowerRow = [];
            foreach ($row as $key => $value) {
                $lowerRow[strtolower($key)] = $value;
            }
            $rows[] = $lowerRow;
        }

        sqlsrv_free_stmt($stmt);

        return $rows;
    }

    /**
     * Возвращает данные справочника, сгруппированные по сотрудникам.
     * Несколько номеров одного сотрудника объединяются в массивы phone_inner[], phone_city[], phone_mobile[] и place[].
     */
    public function getDirectoryData(): array
    {
        $rows = $this->fetchAll(
            "
        		WITH 
            -- уникальные подраздления, могут быть с одним и тем же DEPT_ID , но с разным manager, лень огрниивать
			Dept_uniq AS (
				SELECT DISTINCT 
						 p.Organisation_ID,
						 p.Dept_ID,
						 p.Parent_ID,
						 p.Dept_Name,
						 p.Is_Organisation
						FROM dbo.Departments_v2 p
			),
			DeptHierarchy AS (
                    SELECT 
                        d.Organisation_ID,
                        d.Dept_ID,
                        d.Parent_ID,
                        d.Dept_Name,
                        d.Is_Organisation,
                        d.Dept_ID         AS start_dept_id,
                        d.Organisation_ID AS start_org_id,
                        0                 AS lvl_from_self
                    FROM dbo.Departments_v2 d
                    WHERE d.Is_Organisation = 0

                    UNION ALL

                    SELECT 
                        p.Organisation_ID,
                        p.Dept_ID,
                        p.Parent_ID,
                        p.Dept_Name,
                        p.Is_Organisation,
                        h.start_dept_id,
                        h.start_org_id,
                        h.lvl_from_self + 1
                    FROM DeptHierarchy h
                    JOIN Dept_uniq p 
                        ON p.Dept_ID         = h.Parent_ID
                    		AND p.Organisation_ID = h.Organisation_ID
                    WHERE h.lvl_from_self < 10
                    AND h.Is_Organisation  = 0
                ),
                Numbered AS (
                    SELECT 
                        start_org_id,
                        start_dept_id,
                        Dept_Name,
                        lvl_from_self,
                        ROW_NUMBER() OVER (
                            PARTITION BY start_org_id, start_dept_id 
                            ORDER BY lvl_from_self DESC
                        ) AS lvl_from_top,
                        COUNT(*) OVER (
                            PARTITION BY start_org_id, start_dept_id
                        ) AS total_levels,

                        -- флаг: есть ли Сектор...
                        MAX(CASE WHEN Dept_Name LIKE 'Сектор%' THEN 1 ELSE 0 END) 
                            OVER (PARTITION BY start_org_id, start_dept_id) AS has_sector,

                        -- сколько в цепочке  Обособленное...
                        SUM(CASE WHEN Dept_Name LIKE 'Обособленное%' THEN 1 ELSE 0 END) 
                            OVER (PARTITION BY start_org_id, start_dept_id) AS oboso_count,
                        -- самый нижний уровень Обособленное...
                        MIN(CASE WHEN Dept_Name LIKE 'Обособленное%' THEN lvl_from_self END) 
                            OVER (PARTITION BY start_org_id, start_dept_id) AS oboso_min_lvl,

                        -- уровень  Отдел
                        MAX(CASE 
                                WHEN Dept_Name LIKE 'Отдел %' 
                                OR Dept_Name LIKE 'Отдел[ _-]%' 
                                OR Dept_Name = 'Отдел'
                                OR Dept_Name LIKE 'Отдел по%' 
                                OR Dept_Name LIKE 'Отдел №%'
                                THEN lvl_from_self 
                            END) OVER (PARTITION BY start_org_id, start_dept_id) AS otdel_lvl
                    FROM DeptHierarchy
                ),
                DeptLevels AS (
                    SELECT 
                        n.start_org_id,
                        n.start_dept_id,
                        -- Сектор: если начинается с Сектор%, или находится внутри отедла
                        MAX(CASE 
                                WHEN n.lvl_from_self = 0 
                                AND ( n.Dept_Name LIKE 'Сектор%'
                                    OR (n.otdel_lvl IS NOT NULL AND n.otdel_lvl > 0) )
                                THEN n.Dept_Name 
                            END) AS Seсtor,

                        MAX(CASE 
                                -- Если есть точно отдел
										  WHEN n.otdel_lvl IS NOT NULL 
                                AND n.lvl_from_self = n.otdel_lvl 
                                    THEN n.Dept_Name
                                -- Нет отдела, но есть сектор, значит это отдел
										  WHEN n.otdel_lvl IS NULL 
                                AND n.has_sector = 1 
                                AND n.lvl_from_self = 1
                                    THEN n.Dept_Name
                                -- иначе самый верняя запись
										  WHEN n.otdel_lvl IS NULL 
                                AND n.has_sector = 0 
                                AND n.lvl_from_self = 0 
                                    THEN n.Dept_Name
                            END) AS Otdel,

                        MAX(CASE 
                        		-- Если есть Обособенное на 2м уровне
                                WHEN n.oboso_count >= 1 
                                AND n.Dept_Name LIKE 'Обособленное%' 
                                AND n.lvl_from_self = n.oboso_min_lvl 
                                    THEN n.Dept_Name
                                WHEN n.oboso_count = 0 
                                AND n.lvl_from_top = 2 --Считаем, чтоб 2й по списку это всегда подразделение (Орг - подраз - отдел...)
                                AND n.total_levels >= 2 
                                    THEN n.Dept_Name
                            END) AS Podrazdelenie,

                        -- FULL_PATH: полный путь сверху вниз
                        STUFF((
                            SELECT ' / ' + n2.Dept_Name
                            FROM Numbered n2
                            WHERE n2.start_org_id  = n.start_org_id
                            AND n2.start_dept_id = n.start_dept_id
                            ORDER BY n2.lvl_from_self DESC
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'), 1, 3, '') AS Full_Path
                    FROM Numbered n
                    GROUP BY n.start_org_id, n.start_dept_id
                )
                SELECT 
                    ISNULL(org.Organisation_Name,'<Нет организации>')                                        AS org,
                    lv.Podrazdelenie                                             AS [DIV],
                    CASE WHEN lv.Otdel <> lv.Podrazdelenie OR lv.Podrazdelenie IS NULL 
                        THEN lv.Otdel END                                       AS dep,
                    lv.Seсtor                                                    AS sector,
                    lv.Full_Path                                                 AS full_path,
                    mghr.Lastname + ' ' + mghr.Firstname + ' ' + mghr.Patronymic AS full_name,
                    mghr.Position                                                AS pos,
                    replace(mghr.Telephone_Number,' ','')                        AS phone_inner,
                    replace(mghr.TelephonenumberFull,' ','')                     AS phone_city,
                    mghr.FMCphone                                                AS phone_fmc,
                    
                    mghr.MobileCorp                                              AS phone_mobile,
                    lco.Worklocation                                             AS place
                    
                FROM dbo.MGHRv2 mghr
                LEFT JOIN dbo.Meta_Organisation org 
                    ON org.Organisation_ID = mghr.Organisation_ID
                LEFT JOIN DeptLevels lv 
                    ON lv.start_dept_id = mghr.Department_ID 
                    AND lv.start_org_id  = mghr.Organisation_ID
            	 LEFT JOIN dbo.location_service_object lco
            	 	ON mghr.SNN = lco.SNN
            	 		-- and replace(mghr.TelephonenumberFull,' ','') = lco.Service_object  
                WHERE 1=1
					 and mghr.uvolen = 'False' 
					 and (mghr.VidPriema = 1 OR len(mghr.Firstname) = 0)
                
                
                -- AND mghr.Lastname + ' ' + mghr.Firstname + ' ' + mghr.Patronymic  LIKE '%Бекмансуров Рус%'
                ORDER BY org, [DIV], dep, sector, full_name, pos
"
        );

        return $this->groupByEmployee($rows);
    }

    /**
     * Группируем в массив сотрудников с массивами phone_inner[], phone_city[], phone_mobile[] и place[].
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
                    'phone_inner' => [],
                    'phone_city' => [],
                    'phone_mobile' => [],
                    'phone_fmc' => [],
                    
                    'place' => []
                ];
                $lastKey = $groupKey;
                $lastIdx++;
            }

            if (($row['phone_inner'] ?? '') !== '' && ($row['phone_inner'] ?? '') !== '-') {
                $result[$lastIdx]['phone_inner'][] = $row['phone_inner'];
            }
            if (($row['phone_city'] ?? '') !== '' && ($row['phone_city'] ?? '') !== '-') {
                $result[$lastIdx]['phone_city'][] = $row['phone_city'];
            }
            if (($row['phone_mobile'] ?? '') !== '') {
                $result[$lastIdx]['phone_mobile'][] = $row['phone_mobile'];
            }
            if (($row['phone_fmc'] ?? '') !== '') {
                $result[$lastIdx]['phone_fmc'][] = $row['phone_fmc'];
            }
            if (($row['place'] ?? '') !== '') {
                $result[$lastIdx]['place'][] = $row['place'];
            }
        }

        return $result;
    }

    
    /**
     * Упорядочивает параметры в SQL-запросе
     */
    private function orderParams(string $sql, array $params): array
    {
        // Находим все именованные плейсхолдеры 
        preg_match_all('/:([a-zA-Z0-9_]+)/', $sql, $matches);

        $ordered = [];
        foreach ($matches[1] as $placeholder) {
            if (isset($params[':' . $placeholder])) {
                $ordered[] = $params[':' . $placeholder];
            } elseif (isset($params[$placeholder])) {
                $ordered[] = $params[$placeholder];
            }
        }

        return $ordered;
    }

    /**
     * Возвращает последнюю ошибку MSSQL
     */
    private function stmtError(): string
    {
        $errors = sqlsrv_errors();
        if ($errors) {
            return $errors[0]['message'] ?? 'неизвестная ошибка';
        }
        return 'неизвестная ошибка';
    }
}
