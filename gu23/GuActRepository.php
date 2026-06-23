<?php
/**
 * GuActRepository.php
 *
 * Репозиторий модуля "ГУ-23 · Акты общей формы".
 * Вся работа с БД — только через конвейерные функции / процедуры
 * пакета xx_disl_gu23_pkg (gu23_*). PHP лишь маршалит данные.
 *
 * Подключается из data.php через router.php:
 *   'gu23_*' => ['gu23/GuActRepository.php', 'GuActRepository']
 */
class GuActRepository
{
    /** Разделители коллекций (синхронно с пакетом). */
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
            default:
                http_response_code(400);
                echo json_encode(['ok' => false, 'msg' => 'Неизвестное действие: ' . $action]);
        }
    }

    /* ----------------------------------------------------------------- */
    /* helpers                                                            */
    /* ----------------------------------------------------------------- */

    /** Выполнить конвейерную функцию и вернуть массив строк. */
    private function pipe(string $sql, array $binds = []): array
    {
        $st = oci_parse($this->conn, $sql);
        foreach ($binds as $name => $val) {
            oci_bind_by_name($st, $name, $binds[$name]);
        }
        oci_execute($st);
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
            'stations' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_station())'),
            'owners' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_owner())'),
            'kinds' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_wagon_kind())'),
            'signers' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_ref_signer())'),
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
        $cex = filter_input(INPUT_POST, 'cex') ?: null;

        $rows = $this->pipe(
            'select * from table(xx_disl_gu23_pkg.gu23_get_acts(:b1,:b2,:b3,:b4))',
            [':b1' => $q, ':b2' => $type, ':b3' => $status, ':b4' => $cex]
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
        echo json_encode([
            'ok' => true,
            'act' => $act[0],
            'wagons' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_rows(:b1))', [':b1' => $id]),
            'files' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_files(:b1))', [':b1' => $id]),
            'signers' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_signers(:b1))', [':b1' => $id]),
            'history' => $this->pipe('select * from table(xx_disl_gu23_pkg.gu23_get_hist(:b1))', [':b1' => $id]),
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
    /* Oracle BI / Дислокация (подтягивание данных по вагонам)            */
    /* ----------------------------------------------------------------- */
    private function getWagonInfo(): void
    {
        $wagonsJson = filter_input(INPUT_POST, 'wagons');
        $station = filter_input(INPUT_POST, 'station') ?: null;
        $list = json_decode((string) $wagonsJson, true) ?: [];
        $clob = implode(self::RS, array_map('strval', $list));

        $st = oci_parse(
            $this->conn,
            'select * from table(xx_disl_gu23_pkg.gu23_get_wagon_info(:b1,:b2))'
        );
        $lob = $this->bindClob($st, ':b1', $clob);
        oci_bind_by_name($st, ':b2', $station);
        oci_execute($st);
        $rows = [];
        while ($r = oci_fetch_array($st, OCI_ASSOC + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) {
            $rows[] = $r;
        }
        $lob->free();
        echo json_encode($rows);
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
        $signerClob = $this->packRows($signers, ['fio', 'post', 'org']);

        $st = oci_parse(
            $this->conn,
            'begin :res := xx_disl_gu23_pkg.gu23_save_act(
                :user_id, :id, :type, :status, :cex, :station, :reason,
                :circ, :start_at, :end_at, :linked, :wagons, :signers, :force); end;'
        );

        $res = '';
        $id = (int) filter_input(INPUT_POST, 'id');
        $type = filter_input(INPUT_POST, 'type');
        $status = filter_input(INPUT_POST, 'status');
        $cex = filter_input(INPUT_POST, 'cex');
        $station = filter_input(INPUT_POST, 'station');
        $reason = filter_input(INPUT_POST, 'reason');
        $circ = filter_input(INPUT_POST, 'circumstances');
        $startAt = filter_input(INPUT_POST, 'start_at') ?: null;
        $endAt = filter_input(INPUT_POST, 'end_at') ?: null;
        $linkedRaw = filter_input(INPUT_POST, 'linked_start_id');
        $linked = ($linkedRaw === null || $linkedRaw === '') ? null : (int) $linkedRaw;
        $force = filter_input(INPUT_POST, 'force') === 'Y' ? 'Y' : 'N';

        oci_bind_by_name($st, ':res', $res, 4000);
        oci_bind_by_name($st, ':user_id', $userId);
        oci_bind_by_name($st, ':id', $id);
        oci_bind_by_name($st, ':type', $type);
        oci_bind_by_name($st, ':status', $status);
        oci_bind_by_name($st, ':cex', $cex);
        oci_bind_by_name($st, ':station', $station);
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
        $st = oci_parse(
            $this->conn,
            'begin :res := xx_disl_gu23_pkg.gu23_del_act(:id, :uid); end;'
        );
        $res = '';
        $uid = $this->auth->getUserId();
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
        $st = oci_parse(
            $this->conn,
            'begin :res := xx_disl_gu23_pkg.gu23_annul_act(:id, :uid, :reason); end;'
        );
        $res = '';
        $uid = $this->auth->getUserId();
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

        // [Исправление] Сначала определяем тип акта для формирования корректного пути
        $actType = 'other'; // значение по умолчанию
        $stType = oci_parse($this->conn, 'select act_type from xx_disl_gu23_act where id = :b1');
        oci_bind_by_name($stType, ':b1', $actId);
        oci_execute($stType);
        if ($rType = oci_fetch_array($stType, OCI_ASSOC)) {
            $actType = strtolower($rType['ACT_TYPE']);
        }

        // Физически храним в папке в разрезе типа акта
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

            $st = oci_parse(
                $this->conn,
                'begin :res := xx_disl_gu23_pkg.gu23_add_file(:act,:fid,:name,:ext,:mime,:path,:uid); end;'
            );
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

        $st = oci_parse(
            $this->conn,
            'begin :res := xx_disl_gu23_pkg.gu23_del_file(:fid, :uid); end;'
        );
        $res = '';
        $uid = $this->auth->getUserId();
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
