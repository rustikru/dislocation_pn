<?php
/**
 * GuActRepository.php
 *
 * Репозиторий модуля "ГУ-23 · Акты общей формы".
 */
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

    public function handle(string $action, array $post): void
    {
        ini_set('display_errors', '0');  // PHP-варнинги не должны попадать в JSON-ответ
        ob_start();
        try {
            switch ($action) {
                case 'gu23_get_refs':
                    $this->getRefs();
                    break;
                case 'gu23_get_acts':
                    $this->getActs();
                    break;
                case 'gu23_get_act':
                    $this->getActCard();
                    break;
                case 'gu23_get_open_starts':
                    $this->getOpenStarts();
                    break;
                case 'gu23_get_by_wagon':
                    $this->getByWagon();
                    break;
                case 'gu23_get_wagon_info':
                    $this->getWagonInfo();
                    break;
                case 'gu23_save_act':
                    $this->saveAct();
                    break;
                case 'gu23_del_act':
                    $this->delAct();
                    break;
                case 'gu23_annul_act':
                    $this->annulAct();
                    break;
                case 'gu23_upload_file':
                    $this->uploadFile();
                    break;
                case 'gu23_del_file':
                    $this->delFile();
                    break;
                case 'gu23_search_station':
                    $this->searchStation();
                    break;
                case 'gu23_send_approval':
                    $this->sendApproval();
                    break;
                case 'gu23_approve_in_app':
                    $this->approveInApp();
                    break;
                case 'gu23_close_act':
                    $this->closeAct();
                    break;
                default:
                    http_response_code(400);
                    echo json_encode(['ok' => false, 'msg' => 'Неизвестное действие: ' . $action]);
            }
            ob_end_flush();
        } catch (\Throwable $e) {
            ob_end_clean(); // сбрасываем любые PHP-предупреждения, не ломаем JSON
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
            throw new \RuntimeException('oci_parse: ' . ($e['message'] ?? '?') . ' | SQL: ' . $sql);
        }
        foreach ($binds as $name => $val) {
            oci_bind_by_name($st, $name, $binds[$name]);
        }
        if (!@oci_execute($st)) {
            $e = oci_error($st);
            throw new \RuntimeException('oci_execute: ' . ($e['message'] ?? '?') . ' | SQL: ' . $sql);
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
        $st  = @oci_parse($this->conn, $sql);
        if (!$st) {
            $e = oci_error($this->conn);
            throw new \RuntimeException('oci_parse: ' . ($e['message'] ?? '?'));
        }
        $ret = null;
        oci_bind_by_name($st, ':ret_val', $ret, $retLen);
        foreach ($binds as $name => $val) {
            oci_bind_by_name($st, $name, $binds[$name]);
        }
        if (!@oci_execute($st)) {
            $e = oci_error($st);
            throw new \RuntimeException('oci_execute: ' . ($e['message'] ?? '?'));
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
    private function getRefs(): void
    {
        echo json_encode([
            'cexes' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_cex())'),
            'reasons' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_reason(null))'),
            'stations' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_station_compile())'),
            'stations_from' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_st_from())'),
            /* 'owners'     => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_owner())'),
            'kinds'      => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_wagon_kind())'), */
            'cargos' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_cargo())'),
            'signersOwn' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer_own(null))'),
            'signersRzd' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer_rzd())'),
        ]);
    }

    /* ----------------------------------------------------------------- */
    /* акты — чтение                                                      */
    /* ----------------------------------------------------------------- */
    private function getActs(): void
    {
        $q = filter_input(INPUT_POST, 'q') ?: null;
        $type = filter_input(INPUT_POST, 'type') ?: null;
        $status = filter_input(INPUT_POST, 'status') ?: null;
        $dept = filter_input(INPUT_POST, 'dept') ?: null;

        $rows = $this->pipe(
            'select * from table(xx_disl_gu23_pkg.gu23_get_acts(:b1,:b2,:b3,:b4))',
            [':b1' => $q, ':b2' => $type, ':b3' => $status, ':b4' => $dept]
        );
        echo json_encode($rows);
    }

    private function getActCard(): void
    {
        $id = (int) filter_input(INPUT_POST, 'id');
        $act = $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_act(:b1))', [':b1' => $id]);
        if (!$act) {
            echo json_encode(['ok' => false, 'msg' => 'Акт не найден']);
            return;
        }
        $userId   = $this->auth->getUserId();
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
            'ok'            => true,
            'act'           => $act[0],
            'currentUserId' => (int) $userId,
            'myApproval'    => $myStatus ?: 'none',
            'isUserSigner'  => $isUserSignerCnt > 0,
            'isAdmin'       => $this->auth->isAuthAdmin() ? true : false,
            'wagons'        => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_rows(:b1))', [':b1' => $id]),
            'files'         => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_files(:b1))', [':b1' => $id]),
            'signers'       => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_signers(:b1))', [':b1' => $id]),
            'history'       => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_hist(:b1))', [':b1' => $id]),
            'approvals'     => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_approvals(:b1))', [':b1' => $id]),
        ]);
    }

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
    private function saveAct(): void
    {
        $userId = $this->auth->getUserId();
        $wagons = json_decode((string) filter_input(INPUT_POST, 'wagons'), true) ?: [];
        $signers = json_decode((string) filter_input(INPUT_POST, 'signers'), true) ?: [];

        $wagonClob = $this->packRows($wagons, ['n', 'owner', 'kind', 'from', 'to', 'cargo', 'weight']);
        $signerClob = $this->packRows($signers, ['id', 'fio', 'post', 'org', 'stype']); // field 5 = stype

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

    private function delAct(): void
    {
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

    private function annulAct(): void
    {
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
    private function uploadFile(): void
    {
        $actId = (int) filter_input(INPUT_POST, 'act_id');
        $userId = $this->auth->getUserId();

        // Сначала определяем тип акта для формирования корректного пути
        $actType = 'other'; // значение по умолчанию
        $stType = oci_parse($this->conn, 'select act_type from xx_disl_gu23_act where id = :b1');
        oci_bind_by_name($stType, ':b1', $actId);
        oci_execute($stType);
        if ($rType = oci_fetch_array($stType, OCI_ASSOC)) {
            $actType = strtolower($rType['ACT_TYPE']);
        }

        // Файлы хранятся в разрезе типа акта с ID записи из таблицы
        $baseDir = __DIR__ . '/request_data/' . $actType . '/' . $actId . '/';
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
                            v_d.p_user_id := :uid;
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
            oci_execute($st);

            if (strpos($res, 'done') === 0) {
                $saved[] = ['id' => $fileId, 'name' => $orig];
            } else {
                $errors[] = $orig;
            }
        }

        echo json_encode(['ok' => empty($errors), 'saved' => $saved, 'errors' => $errors]);
    }

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
    private function approveInApp(): void
    {
        $actId    = (int) filter_input(INPUT_POST, 'act_id');
        $decision = filter_input(INPUT_POST, 'decision') ?: '';
        $comment  = trim((string) filter_input(INPUT_POST, 'comment'));
        $userId   = $this->auth->getUserId();

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
            $label = $decision === 'approved' ? 'Акт согласован' : 'Акт отклонён';
            echo json_encode(['ok' => true, 'msg' => $label]);
        }
    }

    private function closeAct(): void
    {
        if (!$this->auth->isAuthAdmin()) {
            echo json_encode(['ok' => false, 'msg' => 'Недостаточно прав']);
            return;
        }
        $id     = (int) filter_input(INPUT_POST, 'id');
        $userId = $this->auth->getUserId();
        $result = $this->callFunc('xx_disl_gu23_pkg.gu23_close_act(:id, :uid)', [':id' => $id, ':uid' => $userId]);
        if (str_starts_with((string) $result, 'ERR')) {
            $parts = explode(self::US, $result, 2);
            echo json_encode(['ok' => false, 'msg' => $parts[1] ?? 'Ошибка']);
        } else {
            echo json_encode(['ok' => true, 'msg' => 'Акт закрыт']);
        }
    }

    /* отправка согласования подписантам                                  */
    /* ----------------------------------------------------------------- */
    private function sendApproval(): void
    {
        $actId  = (int) filter_input(INPUT_POST, 'act_id');
        $userId = $this->auth->getUserId();
        $mode   = filter_input(INPUT_POST, 'mode') ?: 'send_file'; // 'send_mail' | 'send_file'

        if (!$actId) {
            echo json_encode(['ok' => false, 'msg' => 'Не указан act_id']);
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
        require_once __DIR__ . '/../lib/HmacApproval.php';
        if (!defined('HMAC_SECRET')) {
            require_once file_exists(__DIR__ . '/../db_config.local.php')
                ? __DIR__ . '/../db_config.local.php'
                : __DIR__ . '/../db_config.php';
        }
        if (!defined('HMAC_SECRET')) {
            define('HMAC_SECRET', 'change-me-in-production');
        }

        $hmac     = new HmacApproval(HMAC_SECRET, ttlDays: 7);
        $signers  = $this->pipe(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_approval_get_signers(:act_id))',
            [':act_id' => $actId]
        );

        if (empty($signers)) {
            echo json_encode(['ok' => false, 'msg' => 'Нет подписантов с учётными записями для отправки']);
            return;
        }

        // Определяем базовый URL сайта
        $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
                 . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');

        $sent  = 0;
        $errors = [];

        foreach ($signers as $signer) {
            $approverId = (int) $signer['APPROVER_ID'];
            $email      = $signer['FAKE_EMAIL'];
            $fullName   = $signer['FULL_NAME'] ?? '';

            // Генерируем HMAC для approve и reject по отдельности
            parse_str(parse_url($hmac->generate($actId, $approverId, 'approve'), PHP_URL_QUERY), $approveParams);
            parse_str(parse_url($hmac->generate($actId, $approverId, 'reject'),  PHP_URL_QUERY), $rejectParams);

            $tokenSig    = $approveParams['sig'] ?? '';
            $approveLink = $baseUrl . '/gu23/approve.php?' . http_build_query($approveParams);
            $rejectLink  = $baseUrl . '/gu23/approve.php?' . http_build_query($rejectParams);

            // Сохраняем approve-подпись в pending-записи (используется для проверки одноразовости)
            $this->pipe(
                'UPDATE xx_disl_gu23_approval SET token_sig = :b1 WHERE act_id = :b2 AND approver_id = :b3',
                [':b1' => $tokenSig, ':b2' => $actId, ':b3' => $approverId]
            );
            oci_commit($this->conn);

            // Формируем HTML-письмо
            $htmlBody = $this->buildApprovalEmailHtml($fullName, $actId, $approveLink, $rejectLink);
            $subject  = 'Требуется согласование акта ГУ-23';

            if ($mode === 'send_mail') {
                $headers  = "MIME-Version: 1.0\r\nContent-type: text/html; charset=utf-8\r\nFrom: noreply@company.ru\r\n";
                $ok = mail($email, $subject, $htmlBody, $headers);
            } else {
                $ok = $this->saveMailToFile($email, $subject, $htmlBody);
            }

            if ($ok) {
                $sent++;
            } else {
                $errors[] = $email;
            }
        }

        if ($sent > 0) {
            echo json_encode(['ok' => true, 'sent' => $sent, 'errors' => $errors,
                'msg' => "Отправлено писем: {$sent}" . ($errors ? '. Ошибки: ' . implode(', ', $errors) : '')]);
        } else {
            echo json_encode(['ok' => false, 'msg' => 'Не удалось отправить ни одного письма: ' . implode(', ', $errors)]);
        }
    }

    /* ----------------------------------------------------------------- */
    /* сохранить письмо в папку mail/ (для тестирования без SMTP)        */
    /* ----------------------------------------------------------------- */
    private function saveMailToFile(string $to, string $subject, string $html): bool
    {
        $mailDir = __DIR__ . '/../mail';
        if (!is_dir($mailDir)) {
            mkdir($mailDir, 0755, true);
        }
        $ts       = date('Ymd_His');
        $safe     = preg_replace('/[^a-zA-Z0-9@._-]/', '_', $to);
        $filename = $mailDir . '/' . $ts . '_' . $safe . '.html';
        $content  = "<!-- To: {$to} | Subject: {$subject} | " . date('d.m.Y H:i:s') . " -->\n" . $html;
        return file_put_contents($filename, $content) !== false;
    }

    private function buildApprovalEmailHtml(string $name, int $actId, string $approveLink, string $rejectLink): string
    {
        $name = htmlspecialchars($name, ENT_QUOTES);
        return <<<HTML
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Согласование акта ГУ-23</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#222">
  <h2 style="color:#1a5fa8">Требуется согласование акта ГУ-23</h2>
  <p>Уважаемый(-ая) <b>{$name}</b>,</p>
  <p>Вас просят согласовать акт ГУ-23 № <b>{$actId}</b>.</p>
  <p>Пожалуйста, перейдите по одной из ссылок ниже:</p>
  <p style="margin:24px 0">
    <a href="{$approveLink}"
       style="background:#22863a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:16px;margin-right:12px">
      ✓ Согласовать
    </a>
    <a href="{$rejectLink}"
       style="background:#c0392b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:16px">
      ✗ Отклонить
    </a>
  </p>
  <p style="color:#888;font-size:13px">Ссылка действительна 7 дней.<br>Это автоматическое сообщение — не отвечайте на него.</p>
</body>
</html>
HTML;
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
}
