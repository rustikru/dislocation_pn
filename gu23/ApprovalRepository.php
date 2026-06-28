<?php
/**
 * ApprovalRepository — для подписания актов ГУ-23
 */
class ApprovalRepository
{
    const US = "\x1F"; // CHR(31) — разделитель полей в ответах пакета

    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    /** Получить данные акта для страницы согласования. */
    public function getAct(int $actId): ?array
    {
        $st = oci_parse(
            $this->conn,
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_act(:id)) WHERE ROWNUM = 1'
        );
        oci_bind_by_name($st, ':id', $actId);
        oci_execute($st);
        $row = oci_fetch_array($st, OCI_ASSOC + OCI_RETURN_NULLS);
        return $row ?: null;
    }

    /** Получить ФИО согласующего. */
    public function getApproverName(int $approverId): string
    {
        $result = null;
        $st = oci_parse($this->conn, 'BEGIN :r := xx_disl_gu23_pkg.gu23_approval_get_name(:id); END;');
        oci_bind_by_name($st, ':r', $result, 256);
        oci_bind_by_name($st, ':id', $approverId);
        oci_execute($st);
        return $result ?? 'Пользователь #' . $approverId;
    }

    /**
     * Проверить, было ли согласование уже выполнено (по HMAC-подписи).
     * Возвращает ['STATUS' => ..., 'DECIDED_AT' => ...] или null.
     */
    public function getByTokenSig(string $sig): ?array
    {
        $result = null;
        $st = oci_parse($this->conn, 'BEGIN :r := xx_disl_gu23_pkg.gu23_approval_by_sig(:sig); END;');
        oci_bind_by_name($st, ':r', $result, 64);
        oci_bind_by_name($st, ':sig', $sig);
        oci_execute($st);
        if ($result === null) {
            return null;
        }
        [$status, $decidedAt] = explode(self::US, $result, 2) + [1 => ''];
        return ['STATUS' => $status, 'DECIDED_AT' => $decidedAt ?: null];
    }

    /**
     * Получить текущий статус согласования по act_id + approver_id.
     */
    public function getStatusByIds(int $actId, int $approverId): ?array
    {
        $result = null;
        $st = oci_parse($this->conn, 'BEGIN :r := xx_disl_gu23_pkg.gu23_approval_get_status(:act, :uid); END;');
        oci_bind_by_name($st, ':r', $result, 64);
        oci_bind_by_name($st, ':act', $actId);
        oci_bind_by_name($st, ':uid', $approverId);
        oci_execute($st);
        if ($result === null) {
            return null;
        }
        [$status, $decidedAt] = explode(self::US, $result, 2) + [1 => ''];
        return ['STATUS' => $status, 'DECIDED_AT' => $decidedAt ?: null];
    }

    /**
     * Создать запрос на согласование (вызывается инициатором).
     * Возвращает true при успехе.
     */
    public function requestApproval(int $actId, int $approverId, int $requestedBy, string $tokenSig): bool
    {
        $result = null;
        $st = oci_parse(
            $this->conn,
            'BEGIN :r := xx_disl_gu23_pkg.gu23_approval_request(:act, :uid, :by, :sig); END;'
        );
        oci_bind_by_name($st, ':r', $result, 64);
        oci_bind_by_name($st, ':act', $actId);
        oci_bind_by_name($st, ':uid', $approverId);
        oci_bind_by_name($st, ':by', $requestedBy);
        oci_bind_by_name($st, ':sig', $tokenSig);
        oci_execute($st);
        return str_starts_with((string) $result, 'OK');
    }

    /**
     * Сохранить решение согласующего (approved / rejected).
     */
    public function saveDecision(
        int $actId,
        int $approverId,
        string $status,
        string $comment,
        string $tokenSig,
        string $signerIp = ''
    ): bool {
        $result = null;
        $st = oci_parse(
            $this->conn,
            'BEGIN :r := xx_disl_gu23_pkg.gu23_approval_save_decision(:act, :uid, :s, :c, :sig, :ip); END;'
        );
        oci_bind_by_name($st, ':r', $result, 64);
        oci_bind_by_name($st, ':act', $actId);
        oci_bind_by_name($st, ':uid', $approverId);
        oci_bind_by_name($st, ':s', $status);
        oci_bind_by_name($st, ':c', $comment, 1000);
        oci_bind_by_name($st, ':sig', $tokenSig);
        oci_bind_by_name($st, ':ip', $signerIp, 64);
        oci_execute($st);
        return str_starts_with((string) $result, 'OK');
    }
}
