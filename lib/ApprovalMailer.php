<?php
/**
 * ApprovalMailer — генерация HMAC-ссылок и отправка писем согласования ГУ-23.
 */
class ApprovalMailer
{
    private HmacApproval $hmac;
    private string       $baseUrl;
    private string       $from;
    private string       $mailDir;

    public function __construct(
        string $secret,
        string $baseUrl,
        string $from    = 'noreply@company.ru',
        int    $ttlDays = 7,
        string $mailDir = ''
    ) {
        $this->hmac    = new HmacApproval($secret, $ttlDays);
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->from    = $from;
        $this->mailDir = $mailDir ?: dirname(__DIR__) . '/mail';
    }

    /**
     * Сгенерировать ссылки подтверждения и отклонения + sig для сохранения в БД.
     *
     * @return array{token_sig: string, approve_link: string, reject_link: string}
     */
    public function generateLinks(int $actId, int $approverId): array
    {
        parse_str(
            parse_url($this->hmac->generate($actId, $approverId, 'approve'), PHP_URL_QUERY),
            $ap
        );
        parse_str(
            parse_url($this->hmac->generate($actId, $approverId, 'reject'), PHP_URL_QUERY),
            $rp
        );

        return [
            'token_sig'    => $ap['sig'] ?? '',
            'approve_link' => $this->baseUrl . '/gu23/approve.php?' . http_build_query($ap),
            'reject_link'  => $this->baseUrl . '/gu23/approve.php?' . http_build_query($rp),
        ];
    }

    /**
     * Собрать HTML-тело письма согласования.
     */
    public function buildHtml(string $recipientName, int $actId, string $approveLink, string $rejectLink): string
    {
        $name = htmlspecialchars($recipientName, ENT_QUOTES);
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

    /**
     * Отправить письмо: 'send_mail' — через mail(), иначе — сохранить в файл.
     */
    public function send(string $to, string $subject, string $html, string $mode): bool
    {
        if ($mode === 'send_mail') {
            $headers = implode("\r\n", [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=utf-8',
                "From: {$this->from}",
            ]);
            return mail($to, $subject, $html, $headers);
        }

        return $this->saveToFile($to, $subject, $html);
    }

    private function saveToFile(string $to, string $subject, string $html): bool
    {
        if (!is_dir($this->mailDir)) {
            mkdir($this->mailDir, 0755, true);
        }
        $ts      = date('Ymd_His');
        $safe    = preg_replace('/[^a-zA-Z0-9@._-]/', '_', $to);
        $file    = $this->mailDir . '/' . $ts . '_' . $safe . '.html';
        $content = "<!-- To: {$to} | Subject: {$subject} | " . date('d.m.Y H:i:s') . " -->\n" . $html;
        return file_put_contents($file, $content) !== false;
    }
}
