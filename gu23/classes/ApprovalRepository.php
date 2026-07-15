<?php
require_once __DIR__ . '/../lib/text_clean.php';

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

    public function getByToken(string $token): ?array
    {
        $result = null;
        $st = oci_parse($this->conn, 'BEGIN :r := xx_disl_gu23_pkg.gu23_approval_by_token(:token); END;');
        oci_bind_by_name($st, ':r', $result, 256);
        oci_bind_by_name($st, ':token', $token, 256);
        oci_execute($st);
        if ($result === null) {
            return null;
        }

        [$actId, $approverId, $status, $decidedAt] = explode(self::US, $result, 4) + [3 => ''];
        return [
            'ACT_ID' => (int) $actId,
            'APPROVER_ID' => (int) $approverId,
            'STATUS' => $status,
            'DECIDED_AT' => $decidedAt ?: null,
        ];
    }

    public function saveDecisionResult(
        int $actId,
        int $approverId,
        string $status,
        string $comment,
        string $token,
        string $signerIp = ''
    ): string {
        $comment = gu23_clean_text_for_oracle($comment);
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
        oci_bind_by_name($st, ':sig', $token);
        oci_bind_by_name($st, ':ip', $signerIp, 64);
        oci_execute($st);
        return (string) $result;
    }
}
