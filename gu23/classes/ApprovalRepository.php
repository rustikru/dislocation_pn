<?php
require_once __DIR__ . '/../lib/text_clean.php';
require_once __DIR__ . '/Gu23Db.php';

/**
 * ApprovalRepository — для подписания актов ГУ-23
 */
class ApprovalRepository
{
    const US = "\x1F"; // CHR(31) — разделитель полей в ответах

    private Gu23Db $db;

    public function __construct($conn)
    {
        $this->db = new Gu23Db($conn);
    }

    /** Получить данные акта для страницы согласования. */
    public function getAct(int $actId): ?array
    {
        return $this->db->row(
            'SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_get_act(:id)) WHERE ROWNUM = 1',
            [':id' => $actId]
        );
    }

    public function getByToken(string $token): ?array
    {
        $result = $this->db->value(
            'xx_disl_gu23_pkg.gu23_approval_by_token(:token)',
            [':token' => $token],
            256
        );
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
        $baseUrl = $this->baseUrl();
        return (string) $this->db->value(
            'xx_disl_gu23_pkg.gu23_approval_save_decision(:act, :uid, :s, :c, :sig, :ip, :base)',
            [
                ':act' => $actId,
                ':uid' => $approverId,
                ':s' => $status,
                ':c' => $comment,
                ':sig' => $token,
                ':ip' => $signerIp,
                ':base' => $baseUrl,
            ],
            64
        );
    }

    private function baseUrl(): string
    {
        $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    }
}
