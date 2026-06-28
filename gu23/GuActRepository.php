<?php
/**
 * GuActRepository.php
 *
 * Репозиторий модуля "ГУ-23 · Акты общей формы".
 */

//  без mbstring
if (!function_exists('mb_strtoupper')) {
    function mb_strtoupper(string $s, ?string $enc = null): string
    {
        return strtoupper($s);
    }
}
if (!function_exists('mb_strlen')) {
    function mb_strlen(string $s, ?string $enc = null): int
    {
        return strlen($s);
    }
}

require_once __DIR__ . '/Gu23Logger.php';

class GuActRepository
{
    /** Разделители . */
    const RS = "\x1E";   // CHR(30) — между записями
    const US = "\x1F";   // CHR(31) — между полями

    private $conn;
    private AuthClass $auth;

    public function __construct($conn, AuthClass $auth)
    {
        $this->conn = $conn;
        $this->auth = $auth;
    }

    /** Есть ли у пользователя хотя бы одна роль в ГУ-23 (доступ к модулю). */
    public static function canAccess($conn, AuthClass $auth): bool
    {
        if ($auth->isAuthAdmin()) {
            return true;
        }
        // DEV: если есть локальный конфиг — пропускаем без Oracle
        if (file_exists(dirname(__DIR__) . '/db_config.local.php')) {
            return true;
        }
        $userId = $auth->getUserId();
        if (!$userId) {
            return false;
        }
        $st = oci_parse($conn, 'BEGIN :r := xx_disl_gu23_pkg.gu23_can_access(:uid); END;');
        if (!$st) {
            return false;
        }
        $result = null;
        oci_bind_by_name($st, ':r', $result, 2);
        oci_bind_by_name($st, ':uid', $userId);
        $ok = @oci_execute($st);
        if (!$ok) {
            return false;
        }
        return $result === 'Y';
    }

    /** Проверить: является ли текущий пользователь администратором ГУ-23. */
    private function isGu23Admin(): bool
    {
        if ($this->auth->isAuthAdmin()) {
            return true;
        }
        $userId = $this->auth->getUserId();
        if (!$userId) {
            return false;
        }
        try {
            $result = $this->callFunc('xx_disl_gu23_pkg.gu23_is_admin(:uid)', [':uid' => $userId], 2);
            return $result === 'Y';
        } catch (\RuntimeException $e) {
            return false;
        }
    }

    /** Проверить конкретное полномочие пользователя. */
    private function hasPerm(string $permCode): bool
    {
        if ($this->auth->isAuthAdmin()) {
            return true;
        }
        // DEV: локальный конфиг — все полномочия открыты
        if (file_exists(dirname(__DIR__) . '/db_config.local.php')) {
            return true;
        }
        $userId = $this->auth->getUserId();
        if (!$userId) {
            return false;
        }
        try {
            $result = $this->callFunc(
                'xx_disl_gu23_pkg.gu23_has_perm(:uid, :perm)',
                [':uid' => $userId, ':perm' => $permCode],
                2
            );
            return $result === 'Y';
        } catch (\RuntimeException $e) {
            return false;
        }
    }

    /**
     * Режим рассылки писем — определяется сервером, НЕ клиентом.
     *   GU23_MAIL_MODE (из db_config) — если задан;
     *   иначе: dev (есть db_config.local.php) → 'send_file' (письма в папку mail/),
     *          прод → 'send_mail' (реальная отправка через Oracle UTL_MAIL).
     */
    private function mailMode(): string
    {
        if (defined('GU23_MAIL_MODE')) {
            return GU23_MAIL_MODE;
        }
        if (file_exists(dirname(__DIR__) . '/db_config.local.php')) {
            return 'send_file';
        }
        return 'send_mail';
    }

    public function handle(string $action, array $post): void
    {
        ini_set('display_errors', '0');  // PHP-warning не должны попадать в JSON-ответ
        ob_start();
        //Gu23Logger::info('action', ['action' => $action]);
        try {
            // Передаём IP клиента в пакет в log_act_history
            $clientIp = !empty($_SERVER['HTTP_X_FORWARDED_FOR'])
                ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]
                : ($_SERVER['REMOTE_ADDR'] ?? '');
            $clientIp = trim($clientIp);
            $st = oci_parse($this->conn, 'BEGIN xx_disl_gu23_pkg.gu23_set_client_ip(:ip); END;');
            if ($st) {
                oci_bind_by_name($st, ':ip', $clientIp, 64);
                @oci_execute($st);
            }

            switch ($action) {

                // --- чтение: форма создания акта ---
                case 'gu23_get_refs':           // справочники для формы (цеха, станции, подписанты, причины)
                    $this->getRefs();
                    break;
                case 'gu23_get_acts':           // реестр актов с фильтрами
                    $this->getActs();
                    break;
                case 'gu23_get_act':            // карточка одного акта
                    $this->getActCard();
                    break;
                case 'gu23_get_open_starts':    // открытые акты начала (для выбора в акте окончания)
                    $this->getOpenStarts();
                    break;
                case 'gu23_get_by_wagon':       // акты по номеру вагона
                    $this->getByWagon();
                    break;
                case 'gu23_get_wagon_info':     // данные вагонов из внешней дислокации
                    $this->getWagonInfo();
                    break;
                case 'gu23_search_station':     // поиск станции (autocomplete, мин. 3 символа)
                    $this->searchStation();
                    break;

                // --- запись: акты ---
                case 'gu23_save_act':           // создание / правка акта (вместе с вагонами и подписантами)
                    $this->saveAct();
                    break;
                case 'gu23_del_act':            // удаление черновика
                    $this->delAct();
                    break;
                case 'gu23_annul_act':          // аннулирование акта (с каскадом на связанный)
                    $this->annulAct();
                    break;
                case 'gu23_close_act':          // закрытие акта типа 'end'
                    $this->closeAct();
                    break;

                // --- файлы ---
                case 'gu23_upload_file':        // загрузка вложения к акту
                    $this->uploadFile();
                    break;
                case 'gu23_del_file':           // удаление вложения
                    $this->delFile();
                    break;

                // --- согласование ---
                case 'gu23_send_approval':      // отправка запросов на согласование всем подписантам
                    $this->sendApproval();
                    break;
                case 'gu23_resend_approval':    // переотправка ссылки одному подписанту
                    $this->resendApproval();
                    break;
                case 'gu23_approve_in_app':     // подписание/отклонение прямо из интерфейса
                    $this->approveInApp();
                    break;

                // --- справочники (администрирование) ---
                case 'gu23_refs_get_all':       // список подписантов РЖД или причин с поиском и пагинацией
                    $this->refsGetAll();
                    break;
                case 'gu23_ref_signer_save':    // создать / обновить подписанта РЖД
                    $this->refSignerSave();
                    break;
                case 'gu23_ref_signer_toggle':  // включить / отключить подписанта РЖД
                    $this->refSignerToggle();
                    break;
                case 'gu23_ref_reason_save':    // создать / обновить причину
                    $this->refReasonSave();
                    break;
                case 'gu23_ref_reason_toggle':  // включить / отключить причину
                    $this->refReasonToggle();
                    break;

                // --- роли и полномочия ---
                case 'gu23_roles_users':        // пользователи с назначенными ролями (пагинация)
                    $this->rolesUsers();
                    break;
                case 'gu23_role_assign':        // назначить роль пользователю
                    $this->roleAssign();
                    break;
                case 'gu23_role_revoke':        // отозвать роль у пользователя
                    $this->roleRevoke();
                    break;
                case 'gu23_role_perms':         // матрица полномочий всех ролей
                    $this->rolePerms();
                    break;
                case 'gu23_perm_assign':        // добавить полномочие роли
                    $this->permAssign();
                    break;
                case 'gu23_perm_revoke':        // убрать полномочие у роли
                    $this->permRevoke();
                    break;

                default:
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'msg' => 'Неизвестное действие: ' . $action]);
            }
            ob_end_flush();
        } catch (\Throwable $e) {
            ob_end_clean(); // сбрасываем любые PHP-предупреждения, не ломаем JSON
            Gu23Logger::exception($e, $action);
            http_response_code(500);
            echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
        }
    }

    /* ----------------------------------------------------------------- */
    /* helpers                                                            */
    /* ----------------------------------------------------------------- */

    /** Выполнить конвейерную функцию и вернуть массив строк. */
    private function pipe(string $sql, array $binds = []): array
    {
        $st = @oci_parse($this->conn, $sql);
        if (!$st) {
            $e = oci_error($this->conn);
            $msg = 'oci_parse: ' . ($e['message'] ?? '?') . ' | SQL: ' . $sql;
            Gu23Logger::error($msg, ['binds' => array_keys($binds)]);
            throw new \RuntimeException($msg);
        }
        foreach ($binds as $name => $val) {
            oci_bind_by_name($st, $name, $binds[$name]);
        }
        if (!@oci_execute($st)) {
            $e = oci_error($st);
            $msg = 'oci_execute: ' . ($e['message'] ?? '?') . ' | SQL: ' . $sql;
            Gu23Logger::error($msg, ['binds' => array_keys($binds), 'offset' => $e['offset'] ?? null]);
            throw new \RuntimeException($msg);
        }
        $rows = [];
        while ($r = oci_fetch_array($st, OCI_ASSOC + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) {
            $rows[] = $r;
        }
        return $rows;
    }

    /** Склеить массив записей в CLOB-строку с разделителями RS/US. */
    private function packRows(array $rows, array $fields): string
    {
        $out = [];
        foreach ($rows as $row) {
            $vals = [];
            foreach ($fields as $f) {
                $v = isset($row[$f]) ? (string) $row[$f] : '';
                // подстрахуемся: вычистим управляющие разделители из данных
                $v = str_replace([self::RS, self::US], ' ', $v);
                $vals[] = $v;
            }
            $out[] = implode(self::US, $vals);
        }
        return implode(self::RS, $out);
    }

    /** Вызвать функцию пакета, вернуть скалярный результат. */
    private function callFunc(string $expr, array $binds, int $retLen = 256): ?string
    {
        $sql = 'BEGIN :ret_val := ' . $expr . '; END;';
        $st = @oci_parse($this->conn, $sql);
        if (!$st) {
            $e = oci_error($this->conn);
            $msg = 'oci_parse: ' . ($e['message'] ?? '?') . ' | expr: ' . $expr;
            Gu23Logger::error($msg);
            throw new \RuntimeException($msg);
        }
        $ret = null;
        oci_bind_by_name($st, ':ret_val', $ret, $retLen);
        foreach ($binds as $name => $val) {
            oci_bind_by_name($st, $name, $binds[$name]);
        }
        if (!@oci_execute($st)) {
            $e = oci_error($st);
            $msg = 'oci_execute: ' . ($e['message'] ?? '?') . ' | expr: ' . $expr;
            Gu23Logger::error($msg, ['binds' => array_keys($binds), 'offset' => $e['offset'] ?? null]);
            throw new \RuntimeException($msg);
        }
        return $ret;
    }

    /** Привязать строку как временный CLOB. */
    private function bindClob($st, string $name, string $value)
    {
        $lob = oci_new_descriptor($this->conn, OCI_DTYPE_LOB);
        $lob->writeTemporary($value === '' ? ' ' : $value);
        oci_bind_by_name($st, $name, $lob, -1, OCI_B_CLOB);
        return $lob;
    }

    /* ----------------------------------------------------------------- */
    /* справочники                                                        */
    /* ----------------------------------------------------------------- */

    /** Все справочники для формы: цеха, станции, причины, подписанты, права пользователя. */
    private function getRefs(): void
    {
        $userId = $this->auth->getUserId();
        $permRows = $this->pipe(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_user_perms_get(:b1))',
            [':b1' => $userId]
        );
        // pipe возвращает однострочные строки — extracting значение из первого поля
        $perms = array_values(array_map(fn($r) => array_values($r)[0], $permRows));

        echo json_encode([
            'cexes' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_cex())'),
            'reasons' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_reason(null))'),
            'stations' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_station_compile())'),
            'stations_from' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_st_from())'),
            'cargos' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_cargo())'),
            'signersOwn' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer_own(null))'),
            'signersRzd' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer_rzd())'),
            'perms' => $perms,
            'isAdmin' => $this->isGu23Admin() ? true : false, // оставляем для обратной совместимости
        ]);
    }

    /* ----------------------------------------------------------------- */
    /* акты — чтение                                                      */
    /* ----------------------------------------------------------------- */

    /** Реестр актов с фильтрами*/
    private function getActs(): void
    {
        $q = filter_input(INPUT_POST, 'q') ?: null;
        $type = filter_input(INPUT_POST, 'type') ?: null;
        $status = filter_input(INPUT_POST, 'status') ?: null;
        $dept = filter_input(INPUT_POST, 'dept') ?: null;
        $dateFrom = filter_input(INPUT_POST, 'date_from') ?: null;
        $dateTo = filter_input(INPUT_POST, 'date_to') ?: null;
        $hasSigned = filter_input(INPUT_POST, 'has_signed') ?: null; // 'Y' = есть подписанный файл
        $page = max(1, (int) (filter_input(INPUT_POST, 'page') ?? 1));
        $limit = 50;

        // Общее количество под фильтры (для пагинации)
        $total = (int) $this->callFunc(
            'xx_disl_gu23_pkg.gu23_count_acts(:b1,:b2,:b3,:b4,:b5,:b6,:b7)',
            [
                ':b1' => $q,
                ':b2' => $type,
                ':b3' => $status,
                ':b4' => $dept,
                ':b5' => $dateFrom,
                ':b6' => $dateTo,
                ':b7' => $hasSigned
            ],
            40
        );

        // Только нужная страница — пагинация на стороне БД
        $acts = $this->pipe(
            'select * from table(xx_disl_gu23_pkg.gu23_get_acts(:b1,:b2,:b3,:b4,:b5,:b6,:b7,:b8,:b9))',
            [
                ':b1' => $q,
                ':b2' => $type,
                ':b3' => $status,
                ':b4' => $dept,
                ':b5' => $dateFrom,
                ':b6' => $dateTo,
                ':b7' => $hasSigned,
                ':b8' => $page,
                ':b9' => $limit
            ]
        );

        echo json_encode(['acts' => $acts, 'total' => $total, 'page' => $page, 'page_size' => $limit]);
    }

    /** Карточка одного акта: реквизиты, вагоны, файлы, подписанты, история, статус согласования. */
    private function getActCard(): void
    {
        $id = (int) filter_input(INPUT_POST, 'id');
        $act = $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_act(:b1))', [':b1' => $id]);
        if (!$act) {
            echo json_encode(['ok' => false, 'msg' => 'Акт не найден']);
            return;
        }
        $userId = $this->auth->getUserId();
        $myStatus = $this->callFunc(
            'xx_disl_gu23_pkg.gu23_approval_my_status(:act, :uid)',
            [':act' => $id, ':uid' => $userId],
            16
        );

        // Является ли текущий пользователь подписантом-предприятием этого акта
        // (signer_ref_id для сотрудников предприятия = user_id; исключаем РЖД-подписантов)
        $signerCheck = $this->pipe(
            "SELECT COUNT(*) AS CNT FROM xx_disl_gu23_signer s
              WHERE s.act_id = :b1
                AND s.signer_ref_id = :b2
                AND s.stype = 'own'",
            [':b1' => $id, ':b2' => $userId]
        );
        $isUserSignerCnt = (int) ($signerCheck[0]['CNT'] ?? 0);

        echo json_encode([
            'ok' => true,
            'act' => $act[0],
            'currentUserId' => (int) $userId,
            'myApproval' => $myStatus ?: 'none',
            'isUserSigner' => $isUserSignerCnt > 0,
            'isAdmin' => $this->isGu23Admin() ? true : false,
            'wagons' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_rows(:b1))', [':b1' => $id]),
            'files' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_files(:b1))', [':b1' => $id]),
            'signers' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_signers(:b1))', [':b1' => $id]),
            'history' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_hist(:b1))', [':b1' => $id]),
            'approvals' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_approvals(:b1))', [':b1' => $id]),
        ]);
    }

    /** Открытые акты начала простоя с ещё не закрытыми вагонами. */
    private function getOpenStarts(): void
    {
        $acts = $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_open_starts())');
        // подтянем ТОЛЬКО ещё открытые вагоны (для выбора в акте окончания)
        foreach ($acts as &$a) {
            $a['WAGONS'] = $this->pipe(
                'select * from table(xx_disl_gu23_pkg.gu23_get_open_rows(:b1))',
                [':b1' => $a['ID']]
            );
        }
        echo json_encode($acts);
    }

    /** Все акты по номеру вагона. */
    private function getByWagon(): void
    {
        $wagon = trim((string) filter_input(INPUT_POST, 'wagon'));
        echo json_encode($this->pipe(
            'select * from table(xx_disl_gu23_pkg.gu23_get_by_wagon(:b1))',
            [':b1' => $wagon]
        ));
    }

    /* ----------------------------------------------------------------- */
    /* Грузим данные из внешней дислокации в таблицу                     */
    /* ----------------------------------------------------------------- */

    /** Данные вагонов из внешней дислокации (номер, собственник, маршрут, груз, вес). */
    private function getWagonInfo(): void
    {
        $wagonsJson = filter_input(INPUT_POST, 'wagons');
        $waybillNo = filter_input(INPUT_POST, 'waybill_no') ?: '';
        $destStation = filter_input(INPUT_POST, 'dest_station') ?: '';
        $cardoName = filter_input(INPUT_POST, 'cardo_name') ?: '';

        $list = json_decode((string) $wagonsJson, true) ?: [];
        $clob = implode(self::RS, array_map('strval', $list));

        $st = oci_parse(
            $this->conn,
            'select * from table(xx_disl_gu23_pkg.gu23_get_wagon_info(:b1,:b2,:b3,:b4))'
        );
        $lob = $this->bindClob($st, ':b1', $clob);
        oci_bind_by_name($st, ':b2', $waybillNo);
        oci_bind_by_name($st, ':b3', $destStation);
        oci_bind_by_name($st, ':b4', $cardoName);
        oci_execute($st);
        $rows = [];
        while ($r = oci_fetch_array($st, OCI_ASSOC + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) {
            $rows[] = $r;
        }
        $lob->free();
        echo json_encode($rows);
    }

    /** Поиск станции по вхождению подстроки (autocomplete, мин. 3 символа). */
    private function searchStation(): void
    {
        $q = (string) filter_input(INPUT_POST, 'q');
        if (mb_strlen(trim($q)) < 3) {
            echo json_encode([]);
            return;
        }
        echo json_encode($this->pipe(
            'select * from table(xx_disl_gu23_pkg.gu23_search_station(:b1))',
            [':b1' => $q]
        ));
    }

    /* ----------------------------------------------------------------- */
    /* акты — запись                                                      */
    /* ----------------------------------------------------------------- */

    /** Создание или обновление акта. Вагоны и подписанты передаются CLOB-ом через packRows. */
    private function saveAct(): void
    {
        if (!$this->hasPerm('CREATE_ACT')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $userId = $this->auth->getUserId();
        $wagons = json_decode((string) filter_input(INPUT_POST, 'wagons'), true) ?: [];
        $signers = json_decode((string) filter_input(INPUT_POST, 'signers'), true) ?: [];

        $wagonClob = $this->packRows($wagons, ['n', 'owner', 'kind', 'from', 'to', 'cargo', 'weight', 'waybill']);
        $signerClob = $this->packRows($signers, ['id', 'fio', 'post', 'org', 'stype']); // field 5 = stype
        /*Gu23Logger::debug('signer_clob', [
            'count' => count($signers),
            'stypes' => array_map(fn($s) => $s['stype'] ?? '(no stype)', $signers),
            'clob' => substr($signerClob, 0, 400),
        ]);*/

        $id = (int) filter_input(INPUT_POST, 'id');
        $type = filter_input(INPUT_POST, 'type');
        $status = filter_input(INPUT_POST, 'status');
        $dept = filter_input(INPUT_POST, 'dept');           // CODE цеха
        $station = filter_input(INPUT_POST, 'station') ?: null; // station_id as string
        $stFrom = filter_input(INPUT_POST, 'st_from') ?: null; // st_from_id as string
        $stTo = filter_input(INPUT_POST, 'st_to') ?: null; // st_to_id as string
        $waybillNo = filter_input(INPUT_POST, 'waybill_no') ?: null;
        $cargoRef = filter_input(INPUT_POST, 'cargo_ref') ?: null;
        $reason = filter_input(INPUT_POST, 'reason');
        $circ = filter_input(INPUT_POST, 'circumstances');
        $startAt = filter_input(INPUT_POST, 'start_at') ?: null;
        $endAt = filter_input(INPUT_POST, 'end_at') ?: null;
        $linkedRaw = filter_input(INPUT_POST, 'linked_start_id');
        $linked = ($linkedRaw === null || $linkedRaw === '') ? null : (int) $linkedRaw;
        $force = filter_input(INPUT_POST, 'force') === 'Y' ? 'Y' : 'N';

        $sql = 'declare
                    v_d xx_etw.xx_disl_gu23_pkg.t_gu23_save_act;
                begin
                    v_d.p_user_id         := :user_id;
                    v_d.p_id              := :id;
                    v_d.p_type            := :type;
                    v_d.p_status          := :status;
                    v_d.p_dept             := :dept;
                    v_d.p_station         := :station;
                    v_d.p_st_from         := :st_from;
                    v_d.p_st_to           := :st_to;
                    v_d.p_waybill_no      := :waybill_no;
                    v_d.p_cargo_ref       := :cargo_ref;
                    v_d.p_reason          := :reason;
                    v_d.p_circumstances   := :circ;
                    v_d.p_start_at        := :start_at;
                    v_d.p_end_at          := :end_at;
                    v_d.p_linked_start_id := :linked;
                    v_d.p_wagons          := :wagons;
                    v_d.p_signers         := :signers;
                    v_d.p_force           := :force;
                    :res := xx_etw.xx_disl_gu23_pkg.gu23_save_act(v_d);
                end;';

        $st = oci_parse($this->conn, $sql);
        $res = '';
        oci_bind_by_name($st, ':res', $res, 4000);
        oci_bind_by_name($st, ':user_id', $userId);
        oci_bind_by_name($st, ':id', $id);
        oci_bind_by_name($st, ':type', $type);
        oci_bind_by_name($st, ':status', $status);
        oci_bind_by_name($st, ':dept', $dept);
        oci_bind_by_name($st, ':station', $station);
        oci_bind_by_name($st, ':st_from', $stFrom);
        oci_bind_by_name($st, ':st_to', $stTo);
        oci_bind_by_name($st, ':waybill_no', $waybillNo);
        oci_bind_by_name($st, ':cargo_ref', $cargoRef);
        oci_bind_by_name($st, ':reason', $reason);
        oci_bind_by_name($st, ':circ', $circ, 4000);
        oci_bind_by_name($st, ':start_at', $startAt);
        oci_bind_by_name($st, ':end_at', $endAt);
        oci_bind_by_name($st, ':linked', $linked);
        $lob1 = $this->bindClob($st, ':wagons', $wagonClob);
        $lob2 = $this->bindClob($st, ':signers', $signerClob);
        oci_bind_by_name($st, ':force', $force);
        oci_execute($st);
        $lob1->free();
        $lob2->free();

        $this->emitResult($res);
    }

    /** Удаление черновика. Зарегистрированные акты удалить нельзя. */
    private function delAct(): void
    {
        if (!$this->hasPerm('DELETE_ACT')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $uid = $this->auth->getUserId();
        $sql = 'declare
                    v_d xx_etw.xx_disl_gu23_pkg.t_gu23_del_act;
                begin
                    v_d.p_id      := :id;
                    v_d.p_user_id := :uid;
                    :res := xx_etw.xx_disl_gu23_pkg.gu23_del_act(v_d);
                end;';
        $st = oci_parse($this->conn, $sql);
        $res = '';
        oci_bind_by_name($st, ':res', $res, 4000);
        oci_bind_by_name($st, ':id', $id);
        oci_bind_by_name($st, ':uid', $uid);
        oci_execute($st);
        $this->emitResult($res);
    }

    /** Аннулирование с каскадом: если тип 'end' — аннулируется связанный 'start', и наоборот. */
    private function annulAct(): void
    {
        if (!$this->hasPerm('ANNUL_ACT')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $reason = filter_input(INPUT_POST, 'reason');
        $uid = $this->auth->getUserId();
        $sql = 'declare
                    v_d xx_etw.xx_disl_gu23_pkg.t_gu23_annul_act;
                    begin
                    v_d.p_id      := :id;
                    v_d.p_user_id := :uid;
                    v_d.p_reason  := :reason;
                    :res := xx_etw.xx_disl_gu23_pkg.gu23_annul_act(v_d);
                    end;';
        $st = oci_parse($this->conn, $sql);
        $res = '';
        oci_bind_by_name($st, ':res', $res, 4000);
        oci_bind_by_name($st, ':id', $id);
        oci_bind_by_name($st, ':uid', $uid);
        oci_bind_by_name($st, ':reason', $reason);
        oci_execute($st);
        $this->emitResult($res);
    }

    /* ----------------------------------------------------------------- */
    /* файлы                                                              */
    /* ----------------------------------------------------------------- */

    /** Загрузка файлов-вложений в act_data/{type}/{act_id}/ */
    private function uploadFile(): void
    {
        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $userId = $this->auth->getUserId();
        $category = filter_input(INPUT_POST, 'file_category') ?: 'general';
        if (!in_array($category, ['general', 'signed'], true))
            $category = 'general';

        // Сначала определяем тип акта для формирования корректного пути
        $actType = 'other'; // значение по умолчанию
        $stType = oci_parse($this->conn, 'select act_type from xx_disl_gu23_act where id = :b1');
        oci_bind_by_name($stType, ':b1', $actId);
        oci_execute($stType);
        if ($rType = oci_fetch_array($stType, OCI_ASSOC)) {
            $actType = strtolower($rType['ACT_TYPE']);
        }

        // Файлы хранятся в разрезе типа акта с ID записи из таблицы
        $baseDir = __DIR__ . '/act_data/' . $actType . '/' . $actId . '/';
        if (!is_dir($baseDir)) {
            mkdir($baseDir, 0777, true);
        }

        $saved = [];
        $errors = [];
        foreach ($_FILES as $file) {
            if (($file['error'] ?? 1) !== UPLOAD_ERR_OK) {
                $errors[] = $file['name'] ?? 'файл';
                continue;
            }

            $stId = oci_parse($this->conn, 'begin :id := xx_disl_gu23_pkg.gu23_new_file_id; end;');
            $fileId = 0;
            oci_bind_by_name($stId, ':id', $fileId, 32);
            oci_execute($stId);

            $orig = $file['name'];
            $ext = pathinfo($orig, PATHINFO_EXTENSION);
            $mime = $file['type'] ?? '';
            $disk = $baseDir . $fileId . ($ext ? '.' . $ext : '');

            if (!move_uploaded_file($file['tmp_name'], $disk)) {
                $errors[] = $orig;
                continue;
            }

            $addSql = 'declare
                            v_d xx_etw.xx_disl_gu23_pkg.t_gu23_add_file;
                        begin
                            v_d.p_act_id  := :act;
                            v_d.p_file_id := :fid;
                            v_d.p_name    := :name;
                            v_d.p_ext     := :ext;
                            v_d.p_mime    := :mime;
                            v_d.p_path    := :path;
                            v_d.p_user_id  := :uid;
                            v_d.p_category := :cat;
                            :res := xx_etw.xx_disl_gu23_pkg.gu23_add_file(v_d);
                        end;';
            $st = oci_parse($this->conn, $addSql);
            $res = '';
            oci_bind_by_name($st, ':res', $res, 4000);
            oci_bind_by_name($st, ':act', $actId);
            oci_bind_by_name($st, ':fid', $fileId);
            oci_bind_by_name($st, ':name', $orig);
            oci_bind_by_name($st, ':ext', $ext);
            oci_bind_by_name($st, ':mime', $mime);
            oci_bind_by_name($st, ':path', $disk);
            oci_bind_by_name($st, ':uid', $userId);
            oci_bind_by_name($st, ':cat', $category);
            oci_execute($st);

            if (strpos($res, 'done') === 0) {
                $saved[] = ['id' => $fileId, 'name' => $orig];
            } else {
                $errors[] = $orig;
            }
        }

        echo json_encode(['ok' => empty($errors), 'saved' => $saved, 'errors' => $errors]);
    }

    /** Удаление вложения: сначала физический файл, потом запись в БД через пакет. */
    private function delFile(): void
    {
        $fileId = (int) filter_input(INPUT_POST, 'file_id');
        // удалим физический файл
        $path = '';
        $stP = oci_parse(
            $this->conn,
            'select real_path from xx_disl_gu23_file where id = :b1'
        );
        oci_bind_by_name($stP, ':b1', $fileId);
        oci_execute($stP);
        if ($row = oci_fetch_array($stP, OCI_ASSOC + OCI_RETURN_NULLS)) {
            $path = $row['REAL_PATH'];
        }

        $uid = $this->auth->getUserId();
        $delSql = 'declare
                        v_d xx_etw.xx_disl_gu23_pkg.t_gu23_del_file;
                    begin
                        v_d.p_file_id := :fid;
                        v_d.p_user_id := :uid;
                        :res := xx_etw.xx_disl_gu23_pkg.gu23_del_file(v_d);
                    end;';
        $st = oci_parse($this->conn, $delSql);
        $res = '';
        oci_bind_by_name($st, ':res', $res, 4000);
        oci_bind_by_name($st, ':fid', $fileId);
        oci_bind_by_name($st, ':uid', $uid);
        oci_execute($st);

        if (strpos($res, 'done') === 0 && $path && is_file($path)) {
            @unlink($path);
        }
        $this->emitResult($res);
    }

    /* ----------------------------------------------------------------- */
    /* подписание акта прямо из интерфейса (без email-ссылки)             */
    /* ----------------------------------------------------------------- */

    /** Подписание или отклонение акта прямо из интерфейса  */
    private function approveInApp(): void
    {
        if (!$this->hasPerm('SIGN_ACT')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $decision = filter_input(INPUT_POST, 'decision') ?: '';
        $comment = trim((string) filter_input(INPUT_POST, 'comment'));
        $userId = $this->auth->getUserId();

        if (!$actId || !in_array($decision, ['approved', 'rejected'], true)) {
            echo json_encode(['ok' => false, 'msg' => 'Некорректные параметры']);
            return;
        }
        if ($decision === 'rejected' && $comment === '') {
            echo json_encode(['ok' => false, 'msg' => 'При отклонении укажите причину']);
            return;
        }

        $result = $this->callFunc(
            'xx_disl_gu23_pkg.gu23_direct_decision(:act, :uid, :status, :comment)',
            [':act' => $actId, ':uid' => $userId, ':status' => $decision, ':comment' => $comment]
        );

        if (str_starts_with((string) $result, 'ERR')) {
            $parts = explode(self::US, $result, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            $label = $decision === 'approved' ? 'Акт подписан' : 'Акт отклонён';
            echo json_encode(['ok' => true, 'msg' => $label]);
        }
    }

    /** Закрытие акта типа 'end' (active → closed). Только администратор. */
    private function closeAct(): void
    {
        if (!$this->hasPerm('CLOSE_ACT')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $userId = $this->auth->getUserId();
        $result = $this->callFunc('xx_disl_gu23_pkg.gu23_close_act(:id, :uid)', [':id' => $id, ':uid' => $userId]);
        if (str_starts_with((string) $result, 'ERR')) {
            $parts = explode(self::US, $result, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            echo json_encode(['ok' => true, 'msg' => 'Акт закрыт']);
        }
    }

    /* ----------------------------------------------------------------- */
    /* согласование актов                                                 */
    /* ----------------------------------------------------------------- */

    /** Инициализация согласования: создаёт pending-записи и рассылает HMAC-ссылки подписантам. */
    private function sendApproval(): void
    {
        if (!$this->hasPerm('SEND_APPROVAL')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $userId = $this->auth->getUserId();
        $mode = $this->mailMode(); // режим определяется сервером, не клиентом

        if (!$actId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указан act_id']);
            return;
        }

        // Проверяем, что в акте есть вагоны
        $actRows = $this->pipe(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_act(:id))',
            [':id' => $actId]
        );
        if (empty($actRows) || (int) ($actRows[0]['WAGON_CNT'] ?? 0) === 0) {
            echo json_encode(['ok' => false, 'msg' => 'Нельзя отправить на подписание: в акте нет вагонов']);
            return;
        }

        // 1. Создаём pending-записи в xx_disl_gu23_approval (через пакет)
        $initResult = $this->callFunc(
            'xx_disl_gu23_pkg.gu23_approval_init(:act, :by)',
            [':act' => $actId, ':by' => $userId],
            64
        );

        if (str_starts_with((string) $initResult, 'ERR')) {
            $parts = explode(self::US, $initResult, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка инициализации согласования']);
            return;
        }

        // 2. Получаем список подписантов с email
        $signers = $this->pipe(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_approval_get_signers(:act_id))',
            [':act_id' => $actId]
        );

        if (empty($signers)) {
            echo json_encode(['ok' => false, 'msg' => 'Нет подписантов с учётными записями для отправки']);
            return;
        }

        // 3. Полный список подписантов и текущих статусов согласования — для тела письма
        $allSigners = $this->pipe('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_signers(:id))', [':id' => $actId]);
        $approvalRows = $this->pipe('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_approvals(:id))', [':id' => $actId]);

        $mailer = $this->loadMailer();
        $sent = 0;
        $errors = [];

        foreach ($signers as $signer) {
            $approverId = (int) $signer['APPROVER_ID'];
            $email = $signer['EMAIL'];
            $fullName = $signer['FULL_NAME'] ?? '';

            $links = $mailer->generateLinks($actId, $approverId);

            $this->pipe(
                'UPDATE xx_disl_gu23_approval SET token_sig = :b1 WHERE act_id = :b2 AND approver_id = :b3',
                [':b1' => $links['token_sig'], ':b2' => $actId, ':b3' => $approverId]
            );
            oci_commit($this->conn);

            $html = $mailer->buildHtml(
                $fullName,
                $actId,
                $links['approve_link'],
                $links['reject_link'],
                $actRows[0] ?? [],
                $allSigners,
                $approvalRows
            );
            $subject = 'Требуется подписание акта ГУ-23 ' . ($actRows[0]['ACT_NUMBER'] ?? '');
            // Если режим у нас отправка писем - отправляем письмо 
            $ok = $mode === 'send_mail'
                ? $this->sendMailViaOracle($email, $subject, $html)
                : $mailer->send($email, $subject, $html, $mode);

            if ($ok) {
                $sent++;
            } else {
                $errors[] = $email;
            }
        }

        if ($sent > 0) {
            echo json_encode([
                'ok' => true,
                'sent' => $sent,
                'errors' => $errors,
                'msg' => "Отправлено писем: {$sent}" . ($errors ? '. Ошибки: ' . implode(', ', $errors) : '')
            ]);
        } else {
            echo json_encode(['ok' => false, 'msg' => 'Не удалось отправить ни одного письма: ' . implode(', ', $errors)]);
        }
    }

    /** Переотправка ссылки одному конкретному подписанту (обновляет token_sig). */
    private function resendApproval(): void
    {
        if (!$this->hasPerm('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }

        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $userId = (int) filter_input(INPUT_POST, 'user_id');
        $mode = $this->mailMode(); // режим определяется сервером, не клиентом

        if (!$actId || !$userId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны act_id или user_id']);
            return;
        }

        $signers = $this->pipe(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_approval_get_signers(:act_id)) WHERE APPROVER_ID = :user_id',
            [':act_id' => $actId, ':user_id' => $userId]
        );

        if (empty($signers)) {
            echo json_encode(['ok' => false, 'msg' => 'Подписант не найден']);
            return;
        }

        $mailer = $this->loadMailer();
        $signer = $signers[0];
        $approverId = (int) $signer['APPROVER_ID'];
        $email = $signer['EMAIL'];
        $fullName = $signer['FULL_NAME'] ?? '';

        $links = $mailer->generateLinks($actId, $approverId);

        $this->pipe(
            'UPDATE xx_disl_gu23_approval SET token_sig = :b1 WHERE act_id = :b2 AND approver_id = :b3',
            [':b1' => $links['token_sig'], ':b2' => $actId, ':b3' => $approverId]
        );
        oci_commit($this->conn);

        $actRows = $this->pipe('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_act(:id))', [':id' => $actId]);
        $allSigners = $this->pipe('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_signers(:id))', [':id' => $actId]);
        $approvalRows = $this->pipe('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_approvals(:id))', [':id' => $actId]);

        $html = $mailer->buildHtml(
            $fullName,
            $actId,
            $links['approve_link'],
            $links['reject_link'],
            $actRows[0] ?? [],
            $allSigners,
            $approvalRows
        );
        $subject = 'Требуется подписание акта ГУ-23 ' . ($actRows[0]['ACT_NUMBER'] ?? '');
        $ok = $mode === 'send_mail'
            ? $this->sendMailViaOracle($email, $subject, $html)
            : $mailer->send($email, $subject, $html, $mode);

        echo json_encode($ok
            ? ['ok' => true, 'msg' => "Ссылка отправлена: {$email}"]
            : ['ok' => false, 'msg' => "Не удалось отправить письмо на {$email}"]);
    }

    /* ----------------------------------------------------------------- */
    /* отправка письма через Oracle UTL_MAIL                             */
    /* ----------------------------------------------------------------- */
    private function sendMailViaOracle(string $to, string $subject, string $html): bool
    {
        $st = @oci_parse(
            $this->conn,
            'BEGIN xx_disl_gu23_pkg.gu23_send_mail(:to, :subj, :body); END;'
        );
        if (!$st) {
            Gu23Logger::error('sendMailViaOracle: oci_parse failed', ['to' => $to]);
            return false;
        }

        $clob = oci_new_descriptor($this->conn, OCI_DTYPE_LOB);
        if (!$clob) {
            Gu23Logger::error('sendMailViaOracle: oci_new_descriptor failed', ['to' => $to]);
            return false;
        }

        oci_bind_by_name($st, ':to', $to, 256);
        oci_bind_by_name($st, ':subj', $subject, 512);
        oci_bind_by_name($st, ':body', $clob, -1, OCI_B_CLOB);
        $clob->writeTemporary($html, OCI_TEMP_CLOB);

        $ok = @oci_execute($st);
        $clob->free();

        if (!$ok) {
            $e = oci_error($st);
            Gu23Logger::error('sendMailViaOracle: execute failed', ['to' => $to, 'err' => $e['message'] ?? '?']);
        }
        return (bool) $ok;
    }

    /* ----------------------------------------------------------------- */
    /* создать ApprovalMailer с нужными настройками                      */
    /* ----------------------------------------------------------------- */
    private function loadMailer(): ApprovalMailer
    {
        require_once __DIR__ . '/lib/HmacApproval.php';
        require_once __DIR__ . '/lib/ApprovalMailer.php';

        $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
            . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');

        return new ApprovalMailer($this->getHmacSecret(), $baseUrl);
    }

    private function getHmacSecret(): string
    {
        $st = @oci_parse($this->conn, 'BEGIN :r := xx_disl_gu23_pkg.gu23_get_hmac_secret(); END;');
        if ($st) {
            $secret = '';
            oci_bind_by_name($st, ':r', $secret, 128);
            if (@oci_execute($st) && $secret !== '') {
                return $secret;
            }
        }
        return '';
    }

    /* ----------------------------------------------------------------- */
    /* разбор ответа пакета 'OK|id|number' / 'done' / 'ERR|текст'         */
    /* ----------------------------------------------------------------- */
    private function emitResult(string $res): void
    {
        $parts = explode(self::US, $res);
        $head = $parts[0] ?? '';
        if ($head === 'OK') {
            echo json_encode(['ok' => true, 'id' => (int) ($parts[1] ?? 0), 'number' => $parts[2] ?? '']);
        } elseif (strpos($head, 'done') === 0) {
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка операции']);
        }
    }

    /* ----------------------------------------------------------------- */
    /* Справочники (администрирование)                                    */
    /* ----------------------------------------------------------------- */

    /** Список подписантов РЖД или причин для страницы администрирования справочников. */
    private function refsGetAll(): void
    {
        if (!$this->hasPerm('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $tab = filter_input(INPUT_POST, 'tab') ?: 'signers';
        $search = trim((string) (filter_input(INPUT_POST, 'search') ?? ''));
        $page = max(1, (int) (filter_input(INPUT_POST, 'page') ?? 1));
        $limit = 20;

        if ($tab === 'signers') {
            $all = $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_ref_signers_all())');
            if ($search !== '') {
                $s = mb_strtoupper($search);
                $all = array_values(array_filter(
                    $all,
                    fn($r) =>
                    str_contains(mb_strtoupper((string) ($r['FIO'] ?? '')), $s) ||
                    str_contains(mb_strtoupper((string) ($r['POST'] ?? '')), $s) ||
                    str_contains(mb_strtoupper((string) ($r['ORG'] ?? '')), $s) ||
                    str_contains(mb_strtoupper((string) ($r['UNIT'] ?? '')), $s)
                ));
            }
        } else {
            $all = $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_ref_reasons_all())');
            if ($search !== '') {
                $s = mb_strtoupper($search);
                $all = array_values(array_filter(
                    $all,
                    fn($r) =>
                    str_contains(mb_strtoupper((string) ($r['NAME'] ?? '')), $s)
                ));
            }
        }

        echo json_encode([
            'ok' => true,
            'tab' => $tab,
            'items' => array_slice($all, ($page - 1) * $limit, $limit),
            'total' => count($all),
            'page' => $page,
            'page_size' => $limit,
        ]);
    }

    /** Создать нового или обновить существующего подписанта РЖД (id=0 — новый). */
    private function refSignerSave(): void
    {
        if (!$this->hasPerm('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $fio = (string) filter_input(INPUT_POST, 'fio');
        $post = (string) filter_input(INPUT_POST, 'post');
        $org = (string) filter_input(INPUT_POST, 'org');
        $unit = (string) filter_input(INPUT_POST, 'unit');
        $res = $this->callFunc(
            'xx_disl_gu23_pkg.gu23_ref_signer_save(:id,:fio,:post,:org,:unit)',
            [':id' => $id, ':fio' => $fio, ':post' => $post, ':org' => $org, ':unit' => $unit]
        );
        echo json_encode(str_starts_with((string) $res, 'OK')
            ? ['ok' => true]
            : ['ok' => false, 'msg' => explode(self::US, (string) $res)[1] ?? 'Ошибка']);
    }

    /** Переключить флаг active у подписанта РЖД (Y → N или N → Y). */
    private function refSignerToggle(): void
    {
        if (!$this->hasPerm('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $res = $this->callFunc('xx_disl_gu23_pkg.gu23_ref_signer_toggle(:id)', [':id' => $id]);
        echo json_encode(str_starts_with((string) $res, 'OK')
            ? ['ok' => true]
            : ['ok' => false, 'msg' => explode(self::US, (string) $res)[1] ?? 'Ошибка']);
    }

    /** Создать новую или обновить существующую причину (id=0 — новая). */
    private function refReasonSave(): void
    {
        if (!$this->hasPerm('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $name = (string) filter_input(INPUT_POST, 'name');
        $actKind = (string) filter_input(INPUT_POST, 'act_kind');
        $res = $this->callFunc(
            'xx_disl_gu23_pkg.gu23_ref_reason_save(:id,:name,:kind)',
            [':id' => $id, ':name' => $name, ':kind' => $actKind]
        );
        echo json_encode(str_starts_with((string) $res, 'OK')
            ? ['ok' => true]
            : ['ok' => false, 'msg' => explode(self::US, (string) $res)[1] ?? 'Ошибка']);
    }

    /** Переключить флаг active у причины. */
    private function refReasonToggle(): void
    {
        if (!$this->hasPerm('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $res = $this->callFunc('xx_disl_gu23_pkg.gu23_ref_reason_toggle(:id)', [':id' => $id]);
        echo json_encode(str_starts_with((string) $res, 'OK')
            ? ['ok' => true]
            : ['ok' => false, 'msg' => explode(self::US, (string) $res)[1] ?? 'Ошибка']);
    }

    /* ----------------------------------------------------------------- */
    /* Управление ролями                                                   */
    /* ----------------------------------------------------------------- */

    /** Список пользователей с их ролями; группировка на PHP, пагинация тоже на PHP. */
    private function rolesUsers(): void
    {
        if (!$this->hasPerm('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }

        $search = trim((string) (filter_input(INPUT_POST, 'search') ?? '')) ?: null;
        $page = max(1, (int) (filter_input(INPUT_POST, 'page') ?? 1));
        $limit = 20;

        $rows = $this->pipe(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_users_roles_get(:b1))',
            [':b1' => $search]
        );

        // Группируем по пользователю
        $usersMap = [];
        foreach ($rows as $row) {
            $uid = $row['USER_ID'];
            if (!isset($usersMap[$uid])) {
                $usersMap[$uid] = [
                    'id' => $uid,
                    'login' => $row['LOGIN'],
                    'full_name' => $row['FULL_NAME'],
                    'roles' => [],
                ];
            }
            if ($row['ROLE_ID']) {
                $usersMap[$uid]['roles'][] = [
                    'role_id' => $row['ROLE_ID'],
                    'role_code' => $row['ROLE_CODE'],
                    'role_name' => $row['ROLE_NAME'],
                ];
            }
        }

        $all = array_values($usersMap);
        $total = count($all);
        $users = array_slice($all, ($page - 1) * $limit, $limit);
        $roles = $this->pipe('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_roles_get_all())');

        echo json_encode([
            'ok' => true,
            'users' => $users,
            'roles' => $roles,
            'total' => $total,
            'page' => $page,
            'page_size' => $limit,
        ]);
    }

    /** Матрица полномочий: все пары роль × полномочие с флагом has_perm. */
    private function rolePerms(): void
    {
        if (!$this->hasPerm('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $rows = $this->pipe('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_role_perms_get())');
        echo json_encode(['ok' => true, 'rows' => $rows]);
    }

    /** Добавить полномочие роли. */
    private function permAssign(): void
    {
        if (!$this->hasPerm('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $roleId = (int) filter_input(INPUT_POST, 'role_id');
        $permId = (int) filter_input(INPUT_POST, 'perm_id');
        if (!$roleId || !$permId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны role_id или perm_id']);
            return;
        }
        $res = $this->callFunc('xx_disl_gu23_pkg.gu23_perm_assign(:rid, :pid)', [':rid' => $roleId, ':pid' => $permId]);
        if (str_starts_with((string) $res, 'ERR')) {
            $parts = explode(self::US, (string) $res, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            echo json_encode(['ok' => true]);
        }
    }

    /** Убрать полномочие у роли. */
    private function permRevoke(): void
    {
        if (!$this->hasPerm('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $roleId = (int) filter_input(INPUT_POST, 'role_id');
        $permId = (int) filter_input(INPUT_POST, 'perm_id');
        if (!$roleId || !$permId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны role_id или perm_id']);
            return;
        }
        $res = $this->callFunc('xx_disl_gu23_pkg.gu23_perm_revoke(:rid, :pid)', [':rid' => $roleId, ':pid' => $permId]);
        if (str_starts_with((string) $res, 'ERR')) {
            $parts = explode(self::US, (string) $res, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            echo json_encode(['ok' => true]);
        }
    }

    /** Назначить роль пользователю. */
    private function roleAssign(): void
    {
        if (!$this->hasPerm('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $userId = (int) filter_input(INPUT_POST, 'user_id');
        $roleId = (int) filter_input(INPUT_POST, 'role_id');

        if (!$userId || !$roleId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны user_id или role_id']);
            return;
        }
        $res = $this->callFunc('xx_disl_gu23_pkg.gu23_role_assign(:uid, :rid)', [':uid' => $userId, ':rid' => $roleId]);
        if (str_starts_with((string) $res, 'ERR')) {
            $parts = explode(self::US, (string) $res, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            echo json_encode(['ok' => true]);
        }
    }

    /** Отозвать роль у пользователя. */
    private function roleRevoke(): void
    {
        if (!$this->hasPerm('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $userId = (int) filter_input(INPUT_POST, 'user_id');
        $roleId = (int) filter_input(INPUT_POST, 'role_id');

        if (!$userId || !$roleId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны user_id или role_id']);
            return;
        }
        $res = $this->callFunc('xx_disl_gu23_pkg.gu23_role_revoke(:uid, :rid)', [':uid' => $userId, ':rid' => $roleId]);
        if (str_starts_with((string) $res, 'ERR')) {
            $parts = explode(self::US, (string) $res, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            echo json_encode(['ok' => true]);
        }
    }
}
