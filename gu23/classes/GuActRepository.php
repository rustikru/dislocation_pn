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
require_once __DIR__ . '/../lib/client_ip.php';
require_once __DIR__ . '/../lib/text_clean.php';
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

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
            $result = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_is_admin(:uid)', [':uid' => $userId], 2);
            return $result === 'Y';
        } catch (\RuntimeException $e) {
            return false;
        }
    }

    /** Проверить конкретное полномочие пользователя. */
    private function permGranted(string $permCode): bool
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
            $result = $this->callPackageFunction(
                'xx_disl_gu23_pkg.gu23_has_perm(:uid, :perm)',
                [':uid' => $userId, ':perm' => $permCode],
                2
            );
            return $result === 'Y';
        } catch (\RuntimeException $e) {
            return false;
        }
    }

    private function canSendApprovalLinks(): bool
    {
        $login = strtoupper((string) $this->auth->getLogin());
        return $this->isGu23Admin() || $login === 'USER1';
    }

    public function runAction(string $action, array $post): void
    {
        ini_set('display_errors', '0');  // PHP-warning не должны попадать в JSON-ответ
        ob_start();
        //Gu23Logger::info('action', ['action' => $action]);
        try {
            // Передаём IP клиента в log_act_history
            $clientIp = $this->clientIp();
            $st = oci_parse($this->conn, 'BEGIN xx_disl_gu23_pkg.gu23_set_client_ip(:ip); END;');
            if ($st) {
                oci_bind_by_name($st, ':ip', $clientIp, 64);
                @oci_execute($st);
            }

            switch ($action) {

                // : форма создания акта ---
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
                case 'gu23_send_approval':      // отправка запроса текущему подписанту по очереди
                    $this->sendApproval();
                    break;
                case 'gu23_resend_approval':    // переотправка ссылки одному подписанту
                    $this->resendApproval();
                    break;
                case 'gu23_approve_in_app':     // подписание/отклонение прямо со странички
                    $this->approveInApp();
                    break;

                // --- справочники (администрирование) ---
                case 'gu23_refs_get_all':       // список подписантов РЖД или причин с поиском 
                    $this->refsGetAll();
                    break;
                case 'gu23_reasons_excel':      // выгрузка причин в Excel
                    $this->downloadReasonsExcel();
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
                case 'gu23_roles_users':        // пользователи с назначенными ролями 
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
            // Логируем неуспешные ответы (ok:false) — в gu23/log/
            $out = ob_get_clean();
            $decoded = json_decode($out, true);
            if (is_array($decoded) && array_key_exists('ok', $decoded) && $decoded['ok'] === false) {
                Gu23Logger::error('action_failed', [
                    'action' => $action,
                    'msg' => $decoded['msg'] ?? '',
                ]);
            }
            echo $out;
        } catch (\Throwable $e) {
            ob_end_clean(); // сбрасываем PHP-предупреждения
            Gu23Logger::exception($e, $action);
            http_response_code(500);
            echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
        }
    }

    /* ----------------------------------------------------------------- */
    /* Всякое                                                            */
    /* ----------------------------------------------------------------- */

    /** вернуть массив строк. */
    private function selectRows(string $sql, array $params = []): array
    {
        $statement = @oci_parse($this->conn, $sql);
        if (!$statement) {
            $error = oci_error($this->conn);
            $message = 'oci_parse: ' . ($error['message'] ?? '?') . ' | SQL: ' . $sql;
            Gu23Logger::error($message, ['params' => array_keys($params)]);
            throw new \RuntimeException($message);
        }
        foreach ($params as $name => $value) {
            oci_bind_by_name($statement, $name, $params[$name]);
        }
        if (!@oci_execute($statement)) {
            $error = oci_error($statement);
            $message = 'oci_execute: ' . ($error['message'] ?? '?') . ' | SQL: ' . $sql;
            Gu23Logger::error($message, ['params' => array_keys($params), 'offset' => $error['offset'] ?? null]);
            throw new \RuntimeException($message);
        }
        $rows = [];
        while ($row = oci_fetch_array($statement, OCI_ASSOC + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) {
            $rows[] = $row;
        }
        return $rows;
    }

    /** Склеить массив записей в CLOB-строку с разделителями  */
    private function packRows(array $rows, array $fields): string
    {
        $out = [];
        foreach ($rows as $row) {
            $vals = [];
            foreach ($fields as $f) {
                $v = isset($row[$f]) ? $this->cleanTextForOracle((string) $row[$f]) : '';
                $v = str_replace([self::RS, self::US], ' ', $v);
                $vals[] = $v;
            }
            $out[] = implode(self::US, $vals);
        }
        return implode(self::RS, $out);
    }
    // Очистим текст от всяких символов
    private function cleanTextForOracle(string $text): string
    {
        return gu23_clean_text_for_oracle($text);
    }

    private function clientIp(): string
    {
        return gu23_client_ip();
    }

    private function getFileDiskPath(string $path): string
    {
        if ($path === '') {
            return '';
        }

        if ($path[0] === '/' || preg_match('/^[A-Za-z]:[\/\\\\]/', $path)) {
            return $path;
        }

        return dirname(__DIR__) . '/' . ltrim($path, '/\\');
    }

    /** Файлы прикреплять к любому акту, кроме аннулированного. */
    private function canChangeFiles(int $actId, int $userId): bool
    {
        if ($actId <= 0 || $userId <= 0) {
            return false;
        }

        $result = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_can_change_files(:act, :uid)',
            [':act' => $actId, ':uid' => $userId],
            2
        );

        return $result === 'Y';
    }

    /** В закрытых актах удалять файлы может только администратор. */
    private function canDeleteFiles(int $actId, int $userId): bool
    {
        if ($actId <= 0 || $userId <= 0) {
            return false;
        }

        $result = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_can_delete_files(:act, :uid)',
            [':act' => $actId, ':uid' => $userId],
            2
        );

        return $result === 'Y';
    }

    /** Вызвать функцию пакета. */
    private function callPackageFunction(string $packageFunction, array $params, int $resultLength = 256): ?string
    {
        $sql = 'BEGIN :ret_val := ' . $packageFunction . '; END;';
        $statement = @oci_parse($this->conn, $sql);
        if (!$statement) {
            $error = oci_error($this->conn);
            $message = 'oci_parse: ' . ($error['message'] ?? '?') . ' | expr: ' . $packageFunction;
            Gu23Logger::error($message);
            throw new \RuntimeException($message);
        }
        $result = null;
        oci_bind_by_name($statement, ':ret_val', $result, $resultLength);
        foreach ($params as $name => $value) {
            oci_bind_by_name($statement, $name, $params[$name]);
        }
        if (!@oci_execute($statement)) {
            $error = oci_error($statement);
            $message = 'oci_execute: ' . ($error['message'] ?? '?') . ' | expr: ' . $packageFunction;
            Gu23Logger::error($message, ['params' => array_keys($params), 'offset' => $error['offset'] ?? null]);
            throw new \RuntimeException($message);
        }
        return $result;
    }

    private function baseUrl(): string
    {
        $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    }

    /** Привязать строку как  CLOB. */
    private function putClobParam($statement, string $name, string $value)
    {
        $lob = oci_new_descriptor($this->conn, OCI_DTYPE_LOB);
        $lob->writeTemporary($value === '' ? ' ' : $value);
        oci_bind_by_name($statement, $name, $lob, -1, OCI_B_CLOB);
        return $lob;
    }

    /* ----------------------------------------------------------------- */
    /* справочники                                                        */
    /* ----------------------------------------------------------------- */

    /** Все справочники для формы: цеха, станции, причины, подписанты, права пользователя. */
    private function getRefs(): void
    {
        $userId = $this->auth->getUserId();
        $permRows = $this->selectRows(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_user_perms_get(:b1))',
            [':b1' => $userId]
        );

        $perms = array_values(array_map(fn($r) => array_values($r)[0], $permRows));

        echo json_encode([
            'cexes' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_cex())'),
            'reasons' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_reason(null))'),
            'stations' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_station_compile())'),
            'stations_from' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_st_from())'),
            'cargos' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_cargo())'),
            'signersOwn' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer_own(null))'),
            'signersRzd' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer_rzd())'),
            'signersManual' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer_manual())'),
            'perms' => $perms,
            'isAdmin' => $this->isGu23Admin() ? true : false,
        ]);
    }

    /* ----------------------------------------------------------------- */
    /* акты — чтение                                                      */
    /* ----------------------------------------------------------------- */

    /** Реестр актов */
    private function getActs(): void
    {
        $q = filter_input(INPUT_POST, 'q') ?: null;
        $type = filter_input(INPUT_POST, 'type') ?: null;
        $status = filter_input(INPUT_POST, 'status') ?: null;
        $dept = filter_input(INPUT_POST, 'dept') ?: null;
        $dateFrom = filter_input(INPUT_POST, 'date_from') ?: null;
        $dateTo = filter_input(INPUT_POST, 'date_to') ?: null;
        $signedFile = filter_input(INPUT_POST, 'has_signed') ?: null; // 'Y' = есть подписанный файл
        $page = max(1, (int) (filter_input(INPUT_POST, 'page') ?? 1));
        $limit = 20;

        // Общее количество 
        $total = (int) $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_count_acts(:b1,:b2,:b3,:b4,:b5,:b6,:b7)',
            [
                ':b1' => $q,
                ':b2' => $type,
                ':b3' => $status,
                ':b4' => $dept,
                ':b5' => $dateFrom,
                ':b6' => $dateTo,
                ':b7' => $signedFile
            ],
            40
        );

        $acts = $this->selectRows(
            'select * from table(xx_disl_gu23_pkg.gu23_get_acts(:b1,:b2,:b3,:b4,:b5,:b6,:b7,:b8,:b9))',
            [
                ':b1' => $q,
                ':b2' => $type,
                ':b3' => $status,
                ':b4' => $dept,
                ':b5' => $dateFrom,
                ':b6' => $dateTo,
                ':b7' => $signedFile,
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
        $act = $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_act(:b1))', [':b1' => $id]);
        if (!$act) {
            echo json_encode(['ok' => false, 'msg' => 'Акт не найден']);
            return;
        }
        $userId = $this->auth->getUserId();
        $myStatus = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_approval_my_status(:act, :uid)',
            [':act' => $id, ':uid' => $userId],
            16
        );

        $isUserSigner = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_is_act_signer(:act, :uid)',
            [':act' => $id, ':uid' => $userId],
            2
        );
        $isAdmin = $this->isGu23Admin();
        $canEditDraft = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_can_edit_draft(:act, :uid)',
            [':act' => $id, ':uid' => $userId],
            2
        );
        $canChangeFiles = $this->canChangeFiles($id, (int) $userId);
        $canDeleteFiles = $this->canDeleteFiles($id, (int) $userId);

        echo json_encode([
            'ok' => true,
            'act' => $act[0],
            'currentUserId' => (int) $userId,
            'myApproval' => $myStatus ?: 'none',
            'isUserSigner' => $isUserSigner === 'Y',
            'isAdmin' => $isAdmin,
            'canEditDraft' => $canEditDraft === 'Y',
            'canChangeFiles' => $canChangeFiles,
            'canDeleteFiles' => $canDeleteFiles,
            'canSendApprovalLinks' => $this->canSendApprovalLinks(),
            'wagons' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_rows(:b1))', [':b1' => $id]),
            'files' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_files(:b1))', [':b1' => $id]),
            'signers' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_signers(:b1))', [':b1' => $id]),
            'history' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_hist(:b1))', [':b1' => $id]),
            'approvals' => $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_approvals(:b1))', [':b1' => $id]),
        ]);
    }

    /** Открытые акты начала простоя с ещё не закрытыми вагонами. */
    private function getOpenStarts(): void
    {
        $acts = $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_get_open_starts())');
        // подтянем ТОЛЬКО ещё открытые вагоны (для выбора в акте окончания)
        foreach ($acts as &$a) {
            $a['WAGONS'] = $this->selectRows(
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
        echo json_encode($this->selectRows(
            'select * from table(xx_disl_gu23_pkg.gu23_get_by_wagon(:b1))',
            [':b1' => $wagon]
        ));
    }

    /* ----------------------------------------------------------------- */
    /* Грузим данные из внешней дислокации в таблицу                     */
    /* ----------------------------------------------------------------- */

    /** Данные вагонов из внешней дислокации (номер, накладная, собственник, маршрут, груз, вес). */
    private function getWagonInfo(): void
    {
        $wagonsJson = filter_input(INPUT_POST, 'wagons'); // Список вагонов
        $waybillNo = $this->cleanTextForOracle((string) (filter_input(INPUT_POST, 'waybill_no') ?: '')); // Накладаная
        $destStation = filter_input(INPUT_POST, 'dest_station') ?: ''; // Станция назначения
        $cardoName = $this->cleanTextForOracle((string) (filter_input(INPUT_POST, 'cardo_name') ?: '')); // Название груза
        $wagonsJson = filter_input(INPUT_POST, 'wagons'); // add 29.06.2026 Тип акта

        $list = json_decode((string) $wagonsJson, true) ?: [];
        $clob = implode(self::RS, array_map('strval', $list));

        $st = oci_parse(
            $this->conn,
            'select * from table(xx_disl_gu23_pkg.gu23_get_wagon_info(:b1,:b2,:b3,:b4))'
        );
        $lob = $this->putClobParam($st, ':b1', $clob);
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
        echo json_encode($this->selectRows(
            'select * from table(xx_disl_gu23_pkg.gu23_search_station(:b1))',
            [':b1' => $q]
        ));
    }

    /* ----------------------------------------------------------------- */
    /* акты — запись                                                      */
    /* ----------------------------------------------------------------- */

    /** Создание или обновление акта. */
    private function saveAct(): void
    {
        $id = (int) filter_input(INPUT_POST, 'id');
        $needPerm = $id > 0 ? 'EDIT_OWN_ACT' : 'CREATE_ACT';
        if (!$this->permGranted($needPerm)) {
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

        $type = filter_input(INPUT_POST, 'type');
        $status = filter_input(INPUT_POST, 'status');
        $dept = filter_input(INPUT_POST, 'dept');           // CODE цеха
        $station = filter_input(INPUT_POST, 'station') ?: null; // station_id as string
        $stFrom = filter_input(INPUT_POST, 'st_from') ?: null; // st_from_id as string
        $stTo = filter_input(INPUT_POST, 'st_to') ?: null; // st_to_id as string
        $waybillNoRaw = filter_input(INPUT_POST, 'waybill_no');
        $cargoRefRaw = filter_input(INPUT_POST, 'cargo_ref');
        $waybillNo = $waybillNoRaw === null || $waybillNoRaw === ''
            ? null
            : $this->cleanTextForOracle((string) $waybillNoRaw);
        $cargoRef = $cargoRefRaw === null || $cargoRefRaw === ''
            ? null
            : $this->cleanTextForOracle((string) $cargoRefRaw);
        $reason = filter_input(INPUT_POST, 'reason');
        $circ = $this->cleanTextForOracle((string) filter_input(INPUT_POST, 'circumstances'));
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
        $lob1 = $this->putClobParam($st, ':wagons', $wagonClob);
        $lob2 = $this->putClobParam($st, ':signers', $signerClob);
        oci_bind_by_name($st, ':force', $force);
        oci_execute($st);
        $lob1->free();
        $lob2->free();

        $this->printPackageResult($res);
    }

    /** Удаление черновика. */
    private function delAct(): void
    {
        if (!$this->permGranted('DELETE_ACT')) {
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
        $this->printPackageResult($res);
    }

    /** Аннулирование каскадом: если тип 'end' — аннулируется связанный 'start', и наоборот. */
    private function annulAct(): void
    {
        if (!$this->permGranted('ANNUL_ACT')) {
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
        $this->printPackageResult($res);
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

        if (!$this->canChangeFiles($actId, (int) $userId)) {
            echo json_encode(['ok' => false, 'msg' => 'Нет прав на прикрепление файлов']);
            return;
        }

        $actType = strtolower((string) $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_act_type(:act)',
            [':act' => $actId],
            16
        ));
        if ($actType === '') {
            $actType = 'other';
        }

        // Файлы хранятся в разрезе типа акта с ID записи из таблицы
        $basePath = 'act_data/' . $actType . '/' . $actId . '/';
        $baseDir = dirname(__DIR__) . '/' . $basePath;
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
            $savePath = $basePath . $fileId . ($ext ? '.' . $ext : '');

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
            oci_bind_by_name($st, ':path', $savePath);
            oci_bind_by_name($st, ':uid', $userId);
            oci_bind_by_name($st, ':cat', $category);
            $ok = @oci_execute($st);

            if ($ok && strpos($res, 'done') === 0) {
                $saved[] = ['id' => $fileId, 'name' => $orig];
            } else {
                @unlink($disk);
                $errors[] = $orig;
            }
        }

        echo json_encode(['ok' => empty($errors), 'saved' => $saved, 'errors' => $errors]);
    }

    /** Удаление вложения. */
    private function delFile(): void
    {
        $fileId = (int) filter_input(INPUT_POST, 'file_id');
        $info = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_file_info(:fid)',
            [':fid' => $fileId],
            4000
        );
        if (!$info) {
            echo json_encode(['ok' => false, 'msg' => 'Файл не найден']);
            return;
        }
        $fileInfo = explode(self::US, $info);
        $actId = (int) ($fileInfo[0] ?? 0);
        $path = $this->getFileDiskPath((string) ($fileInfo[1] ?? ''));
        $category = (string) ($fileInfo[2] ?? 'general');

        $uid = $this->auth->getUserId();
        $isAdmin = $this->isGu23Admin();
        if (!$this->canDeleteFiles($actId, (int) $uid)) {
            echo json_encode(['ok' => false, 'msg' => 'Нет прав на удаление файлов']);
            return;
        }
        if ($category === 'signed' && !$isAdmin) {
            echo json_encode(['ok' => false, 'msg' => 'Подписанные файлы может удалять только администратор']);
            return;
        }

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
        $this->printPackageResult($res);
    }

    /* ----------------------------------------------------------------- */
    /* подписание акта            */
    /* ----------------------------------------------------------------- */

    /** Подписание или отклонение акта */
    private function approveInApp(): void
    {
        if (!$this->permGranted('SIGN_ACT')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $decision = filter_input(INPUT_POST, 'decision') ?: '';
        $comment = trim($this->cleanTextForOracle((string) filter_input(INPUT_POST, 'comment')));
        $userId = $this->auth->getUserId();

        if (!$actId || !in_array($decision, ['approved', 'rejected'], true)) {
            echo json_encode(['ok' => false, 'msg' => 'Некорректные параметры']);
            return;
        }
        if ($decision === 'rejected' && $comment === '') {
            echo json_encode(['ok' => false, 'msg' => 'При отклонении укажите причину']);
            return;
        }

        $result = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_direct_decision(:act, :uid, :status, :comment, :ip)',
            [
                ':act' => $actId,
                ':uid' => $userId,
                ':status' => $decision,
                ':comment' => $comment,
                ':ip' => $this->clientIp(),
            ]
        );

        if (str_starts_with((string) $result, 'ERR')) {
            $parts = explode(self::US, $result, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            $label = $decision === 'approved' ? 'Акт подписан' : 'Акт отклонён';
            if ($decision === 'approved') {
                $sent = $this->callPackageFunction(
                    'xx_disl_gu23_pkg.gu23_send_next_approval_mail(:act, :base)',
                    [':act' => $actId, ':base' => $this->baseUrl()],
                    4000
                );
                if (str_starts_with((string) $sent, 'OK')) {
                    $parts = explode(self::US, (string) $sent, 2);
                    if (!empty($parts[1]) && $parts[1] !== 'Следующих подписантов нет') {
                        $label .= '. ' . $parts[1];
                    }
                }
            }
            echo json_encode(['ok' => true, 'msg' => $label]);
        }
    }

    /** Закрытие акта типа 'end' (active → closed). Только администратор. */
    private function closeAct(): void
    {
        if (!$this->permGranted('CLOSE_ACT')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $userId = $this->auth->getUserId();
        $result = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_close_act(:id, :uid)', [':id' => $id, ':uid' => $userId]);
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

    /** Инициализация согласования: создаёт записи и отправляет письмо первому подписанту. */
    private function sendApproval(): void
    {
        if (!$this->permGranted('SEND_APPROVAL')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $userId = $this->auth->getUserId();
        if (!$actId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указан act_id']);
            return;
        }

        // Проверяем, что в акте есть вагоны
        $actRows = $this->selectRows(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_act(:id))',
            [':id' => $actId]
        );
        if (empty($actRows) || (int) ($actRows[0]['WAGON_CNT'] ?? 0) === 0) {
            echo json_encode(['ok' => false, 'msg' => 'Нельзя отправить на подписание: в акте нет вагонов']);
            return;
        }

        // 1. Создаём pending-записи согласования
        $initResult = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_approval_init(:act, :by)',
            [':act' => $actId, ':by' => $userId],
            64
        );

        if (str_starts_with((string) $initResult, 'ERR')) {
            $parts = explode(self::US, $initResult, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка инициализации согласования']);
            return;
        }

        $sent = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_send_next_approval_mail(:act, :base)',
            [':act' => $actId, ':base' => $this->baseUrl()],
            4000
        );
        $parts = explode(self::US, (string) $sent, 2);

        echo json_encode(str_starts_with((string) $sent, 'OK')
            ? ['ok' => true, 'sent' => 1, 'msg' => $parts[1] ?? 'Ссылка отправлена']
            : ['ok' => false, 'sent' => 0, 'msg' => $parts[1] ?? 'Не удалось отправить ссылку']);
    }

    /** Переотправка ссылки конкретному подписанту */
    private function resendApproval(): void
    {
        if (!$this->permGranted('SEND_APPROVAL')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        if (!$this->canSendApprovalLinks()) {
            echo json_encode(['ok' => false, 'msg' => 'Рассылка доступна только администратору или USER1']);
            return;
        }

        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $userId = (int) filter_input(INPUT_POST, 'user_id');

        if (!$actId || !$userId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны act_id или user_id']);
            return;
        }

        $nextRows = $this->selectRows(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_approval_next_signer(:act_id))',
            [':act_id' => $actId]
        );

        if (empty($nextRows)) {
            echo json_encode(['ok' => false, 'msg' => 'Следующих подписантов нет']);
            return;
        }

        if ((int) $nextRows[0]['APPROVER_ID'] !== $userId) {
            echo json_encode(['ok' => false, 'msg' => 'Ожидается другой подписант']);
            return;
        }

        $sent = $this->callPackageFunction(
            'xx_disl_gu23_pkg.gu23_send_approval_mail(:act, :uid, :base)',
            [':act' => $actId, ':uid' => $userId, ':base' => $this->baseUrl()],
            4000
        );
        $parts = explode(self::US, (string) $sent, 2);

        echo json_encode(str_starts_with((string) $sent, 'OK')
            //? ['ok' => true, 'sent' => 1, 'msg' => $parts[1] ?? 'Ссылка отправлена']
            ? ['ok' => true]
            : ['ok' => false, 'sent' => 0, 'msg' => $parts[1] ?? 'Не удалось отправить письмо']);
    }

    /* ----------------------------------------------------------------- */
    /* разбор ответа  'OK|id|number' / 'done' / 'ERR|текст'         */
    /* ----------------------------------------------------------------- */
    private function printPackageResult(string $packageAnswer): void
    {
        $parts = explode(self::US, $packageAnswer);
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
        $tab = filter_input(INPUT_POST, 'tab') ?: 'signers';
        $search = trim((string) (filter_input(INPUT_POST, 'search') ?? ''));
        $page = max(1, (int) (filter_input(INPUT_POST, 'page') ?? 1));
        $limit = 20;

        if ($tab === 'signers') {
            $all = $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_ref_signers_all())');
            if ($search !== '') {
                $pattern = '/' . preg_quote($search, '/') . '/iu';
                $all = array_values(array_filter($all, function ($r) use ($pattern) {
                    $fields = ['FIO', 'POST', 'ORG', 'UNIT'];
                    foreach ($fields as $field) {
                        if (preg_match($pattern, (string) ($r[$field] ?? ''))) {
                            return true;
                        }
                    }
                    return false;
                }));
            }
        } else {
            $all = $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_ref_reasons_all())');
            if ($search !== '') {
                $pattern = '/' . preg_quote($search, '/') . '/iu';
                $all = array_values(array_filter($all, function ($r) use ($pattern) {
                    return preg_match($pattern, (string) ($r['NAME'] ?? ''));
                }));
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

    /** Выгрузка всех причин в Excel. */
    private function downloadReasonsExcel(): void
    {
        $rows = $this->selectRows('select * from table(xx_disl_gu23_pkg.gu23_ref_reasons_all())');
        $kindNames = [
            'start' => 'Начало',
            'end' => 'Окончание',
            'other' => 'Прочий',
            'any' => 'Любой',
        ];

        if (ob_get_level() > 0) {
            ob_end_clean();
        }

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Причины');

        $sheet->fromArray(['Название', 'Тип акта', 'Статус'], null, 'A1');

        $rowNumber = 2;
        foreach ($rows as $row) {
            $kindCode = (string) ($row['ACT_KIND'] ?? '');
            $active = (string) ($row['ACTIVE'] ?? '') === 'Y' ? 'Активен' : 'Неактивен';

            $sheet->setCellValue('A' . $rowNumber, (string) ($row['NAME'] ?? ''));
            $sheet->setCellValue('B' . $rowNumber, $kindNames[$kindCode] ?? $kindCode);
            $sheet->setCellValue('C' . $rowNumber, $active);
            $rowNumber++;
        }

        $sheet->getStyle('A1:C1')->getFont()->setBold(true);
        $sheet->getStyle('A1:C' . max(1, $rowNumber - 1))->getBorders()->getAllBorders()->setBorderStyle(
            \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN
        );
        $sheet->getColumnDimension('A')->setWidth(80);
        $sheet->getColumnDimension('B')->setAutoSize(true);
        $sheet->getColumnDimension('C')->setAutoSize(true);
        $sheet->getStyle('A:A')->getAlignment()->setWrapText(true);

        $fileName = 'gu23_reasons_' . date('Ymd_His') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save('php://output');
        $spreadsheet->disconnectWorksheets();
        exit;
    }

    /** Создать нового или обновить существующего подписанта РЖД (id=0 — новый). */
    private function refSignerSave(): void
    {
        if (!$this->permGranted('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $fio = $this->cleanTextForOracle((string) filter_input(INPUT_POST, 'fio'));
        $post = $this->cleanTextForOracle((string) filter_input(INPUT_POST, 'post'));
        $org = $this->cleanTextForOracle((string) filter_input(INPUT_POST, 'org'));
        $unit = $this->cleanTextForOracle((string) filter_input(INPUT_POST, 'unit'));
        $res = $this->callPackageFunction(
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
        if (!$this->permGranted('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $res = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_ref_signer_toggle(:id)', [':id' => $id]);
        echo json_encode(str_starts_with((string) $res, 'OK')
            ? ['ok' => true]
            : ['ok' => false, 'msg' => explode(self::US, (string) $res)[1] ?? 'Ошибка']);
    }

    /** Создать новую или обновить существующую причину (id=0 — новая). */
    private function refReasonSave(): void
    {
        if (!$this->permGranted('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $name = $this->cleanTextForOracle((string) filter_input(INPUT_POST, 'name'));
        $actKind = (string) filter_input(INPUT_POST, 'act_kind');
        $res = $this->callPackageFunction(
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
        if (!$this->permGranted('MANAGE_REFS')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id = (int) filter_input(INPUT_POST, 'id');
        $res = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_ref_reason_toggle(:id)', [':id' => $id]);
        echo json_encode(str_starts_with((string) $res, 'OK')
            ? ['ok' => true]
            : ['ok' => false, 'msg' => explode(self::US, (string) $res)[1] ?? 'Ошибка']);
    }

    /* ----------------------------------------------------------------- */
    /* Управление ролями                                                   */
    /* ----------------------------------------------------------------- */

    /** Список пользователей с их ролями */
    private function rolesUsers(): void
    {
        if (!$this->permGranted('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }

        $search = trim((string) (filter_input(INPUT_POST, 'search') ?? '')) ?: null;
        $page = max(1, (int) (filter_input(INPUT_POST, 'page') ?? 1));
        $limit = 20;

        $rows = $this->selectRows(
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
        $roles = $this->selectRows('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_roles_get_all())');

        echo json_encode([
            'ok' => true,
            'users' => $users,
            'roles' => $roles,
            'total' => $total,
            'page' => $page,
            'page_size' => $limit,
        ]);
    }

    /** Матрица полномочий: все пары роль × полномочие с отметкой доступа. */
    private function rolePerms(): void
    {
        if (!$this->permGranted('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $rows = $this->selectRows('SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_role_perms_get())');
        echo json_encode(['ok' => true, 'rows' => $rows]);
    }

    /** Добавить полномочие роли. */
    private function permAssign(): void
    {
        if (!$this->permGranted('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $roleId = (int) filter_input(INPUT_POST, 'role_id');
        $permId = (int) filter_input(INPUT_POST, 'perm_id');
        if (!$roleId || !$permId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны role_id или perm_id']);
            return;
        }
        $res = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_perm_assign(:rid, :pid)', [':rid' => $roleId, ':pid' => $permId]);
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
        if (!$this->permGranted('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $roleId = (int) filter_input(INPUT_POST, 'role_id');
        $permId = (int) filter_input(INPUT_POST, 'perm_id');
        if (!$roleId || !$permId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны role_id или perm_id']);
            return;
        }
        $res = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_perm_revoke(:rid, :pid)', [':rid' => $roleId, ':pid' => $permId]);
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
        if (!$this->permGranted('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $userId = (int) filter_input(INPUT_POST, 'user_id');
        $roleId = (int) filter_input(INPUT_POST, 'role_id');

        if (!$userId || !$roleId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны user_id или role_id']);
            return;
        }
        $res = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_role_assign(:uid, :rid)', [':uid' => $userId, ':rid' => $roleId]);
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
        if (!$this->permGranted('MANAGE_ROLES')) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $userId = (int) filter_input(INPUT_POST, 'user_id');
        $roleId = (int) filter_input(INPUT_POST, 'role_id');

        if (!$userId || !$roleId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указаны user_id или role_id']);
            return;
        }
        $res = $this->callPackageFunction('xx_disl_gu23_pkg.gu23_role_revoke(:uid, :rid)', [':uid' => $userId, ':rid' => $roleId]);
        if (str_starts_with((string) $res, 'ERR')) {
            $parts = explode(self::US, (string) $res, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            echo json_encode(['ok' => true]);
        }
    }
}
