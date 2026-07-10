<?php
/**
 * ApprovalMailer — генерация HMAC-ссылок (html страничка) и отправка писем на подписание ГУ-23.
 */
class ApprovalMailer
{
  private HmacApproval $hmac;
  private string $baseUrl;
  private string $from;
  private string $mailDir;

  public function __construct(
    string $secret,
    string $baseUrl,
    string $from = 'noreply@company.ru',
    int $ttlDays = 1,
    string $mailDir = ''
  ) {
    $this->hmac = new HmacApproval($secret, $ttlDays);
    $this->baseUrl = rtrim($baseUrl, '/');
    $this->from = $from;
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
      'token_sig' => $ap['sig'] ?? '',
      'approve_link' => $this->baseUrl . '/gu23/approve.php?' . http_build_query($ap),
      'reject_link' => $this->baseUrl . '/gu23/approve.php?' . http_build_query($rp),
    ];
  }

  /**
   * Собрать HTML-тело письма подписания.
   *
   * @param string $recipientName  ФИО получателя
   * @param int    $actId          ID акта
   * @param string $approveLink    Ссылка «Подписать»
   * @param string $rejectLink     Ссылка «Отклонить»
   * @param array  $act            Строка из gu23_get_act (ACT_NUMBER, ACT_TYPE, DEPT, STATION, …)
   * @param array  $signers        Строки из gu23_get_signers (FIO, POST, ORG, STYPE, SIGNER_REF_ID)
   * @param array  $approvals      Строки из gu23_get_approvals (APPROVER_ID, FULL_NAME, STATUS, DECIDED_AT, COMMENT_TXT)
   */
  public function makeHtml(
    string $recipientName,
    int $actId,
    string $approveLink,
    string $rejectLink,
    array $act = [],
    array $signers = [],
    array $approvals = []
  ): string {
    $name = htmlspecialchars($recipientName, ENT_QUOTES);
    $actNumber = htmlspecialchars($act['ACT_NUMBER'] ?? "№ {$actId}", ENT_QUOTES);

    $actDetailsHtml = $this->makeActDetails($act);
    $signersHtml = $this->makeSignersTable($signers, $approvals);

    return <<<HTML
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Подписание акта ГУ-23</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#222">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <!-- Шапка -->
        <tr>
          <td style="background:#471364;padding:24px 32px">
            <!-- <div style="color:#fff;font-size:13px;letter-spacing:.5px;opacity:.8;margin-bottom:4px">АО «МЕТАФРАКС КЕМИКАЛС»</div> -->
            <div style="color:#fff;font-size:20px;font-weight:700">Акт общей формы ГУ-23</div>
            <div style="color:#fff;font-size:14px;margin-top:4px">{$actNumber}</div>
          </td>
        </tr>

        <!-- Тело -->
        <tr>
          <td style="padding:28px 32px">

            <p style="margin:0 0 18px;font-size:13px">
              Уважаемый(-ая) <b>{$name}</b>,<br>
              Требуется подписание акта общей формы ГУ-23.
            </p>

            <!-- Реквизиты акта -->
            {$actDetailsHtml}

            <!-- Кнопки -->
            <table cellpadding="0" cellspacing="0" style="margin:20px 0">
              <tr>
                <td style="padding-right:8px">
                  <a href="{$approveLink}"
                     style="display:inline-block;background:#22863a;color:#fff;padding:9px 20px;border-radius:5px;text-decoration:none;font-size:13px;font-weight:600">
                    Подписать
                  </a>
                </td>
                <td>
                  <a href="{$rejectLink}"
                     style="display:inline-block;background:#c0392b;color:#fff;padding:9px 20px;border-radius:5px;text-decoration:none;font-size:13px;font-weight:600">
                    Отклонить
                  </a>
                </td>
              </tr>
            </table>

            <!-- Подписанты -->
            {$signersHtml}

          </td>
        </tr>

        <!-- Подвал -->
        <tr>
          <td style="background:#f4f5f7;padding:16px 32px;border-top:1px solid #e0e0e0">
            <p style="margin:0;color:#888;font-size:12px;line-height:1.6">
              Ссылка действительна <b>1 день</b>.<br>
              Это автоматическое сообщение — не отвечайте на него.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
  }

  /**
   * HTML-блок с реквизитами акта.
   */
  private function makeActDetails(array $act): string
  {
    if (empty($act)) {
      return '';
    }

    $typeNames = [
      'start' => 'Начало простоя',
      'end' => 'Окончание простоя',
      'other' => 'Прочий акт',
    ];
    $type = $typeNames[$act['ACT_TYPE'] ?? ''] ?? ($act['ACT_TYPE'] ?? '—');

    $rows = [
      ['Тип акта', $type],
      ['Цех', $act['DEPT'] ?? ''],
      ['Ст. составления', $act['STATION'] ?? ''],
      ['Ст. отправления', $act['ST_FROM'] ?? ''],
      ['Ст. назначения', $act['ST_TO'] ?? ''],
      ['Груз', $act['CARGO_REF'] ?? ''],
      ['Причина', $act['REASON_NAME'] ?? ''],
      ['Начало простоя', $this->fmtDate($act['START_AT'] ?? '')],
      ['Окончание', $this->fmtDate($act['END_AT'] ?? '')],
      ['Вагонов', $act['WAGON_CNT'] > 0 ? (string) (int) $act['WAGON_CNT'] : ''],
      ['Обстоятельства', $act['CIRCUMSTANCES'] ?? ''],
    ];

    $rowsHtml = '';
    foreach ($rows as [$label, $value]) {
      if ((string) $value === '') {
        continue;
      }
      $l = htmlspecialchars($label, ENT_QUOTES);
      $v = nl2br(htmlspecialchars($value, ENT_QUOTES));
      $rowsHtml .= <<<ROW
              <tr>
                <td style="padding:7px 12px 7px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top">{$l}</td>
                <td style="padding:7px 0;font-size:13px;vertical-align:top"><b>{$v}</b></td>
              </tr>
ROW;
    }

    return <<<HTML
        <div style="background:#f8f9fb;border:1px solid #e0e4ea;border-radius:6px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:12px;font-weight:700;color:#666;letter-spacing:.4px;margin-bottom:10px">РЕКВИЗИТЫ АКТА</div>
          <table cellpadding="0" cellspacing="0" width="100%">
            {$rowsHtml}
          </table>
        </div>
HTML;
  }

  /**
   * HTML-таблица подписантов со статусом согласования.
   */
  private function makeSignersTable(array $signers, array $approvals): string
  {
    if (empty($signers)) {
      return '';
    }

    // Индекс статусов: approver_id → approval row
    $approvalMap = [];
    foreach ($approvals as $a) {
      $approvalMap[(int) ($a['APPROVER_ID'] ?? 0)] = $a;
    }

    $rows = '';
    foreach ($signers as $i => $s) {
      $no = $i + 1;
      $fio = htmlspecialchars($s['FIO'] ?? '—', ENT_QUOTES);
      $post = htmlspecialchars($s['POST'] ?? '', ENT_QUOTES);
      $org = htmlspecialchars($s['ORG'] ?? '', ENT_QUOTES);
      $stype = $s['STYPE'] ?? null;
      $refId = (int) ($s['SIGNER_REF_ID'] ?? 0);

      if ($stype === 'own' && $refId) {
        $appr = $approvalMap[$refId] ?? null;
        $status = $appr['STATUS'] ?? 'pending';
        [$pill, $note] = $this->statusPill($status, $appr);
      } elseif ($stype === 'rzd') {
        $pill = '';
        $note = '';
      } else {
        $pill = '<span style="background:#e8eaed;color:#5f6368;padding:2px 8px;border-radius:4px;font-size:11px">Вручную</span>';
        $note = '';
      }

      $bg = $i % 2 === 0 ? '#ffffff' : '#f8f9fb';
      $rows .= <<<ROW
              <tr style="background:{$bg}">
                <td style="padding:8px 10px;font-size:13px;color:#888;text-align:center">{$no}</td>
                <td style="padding:8px 10px;font-size:13px">
                  <b>{$fio}</b><br>
                  <span style="color:#666;font-size:12px">{$post}</span>
                  {$org}
                </td>
                <td style="padding:8px 10px;font-size:13px;text-align:center">{$pill}{$note}</td>
              </tr>
ROW;
    }

    return <<<HTML
        <div style="margin-top:8px">
          <div style="font-size:12px;font-weight:700;color:#666;letter-spacing:.4px;margin-bottom:10px">ПОДПИСАНТЫ</div>
          <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e0e4ea;border-radius:6px;overflow:hidden;border-collapse:collapse">
            <thead>
              <tr style="background:#f0f4f8">
                <th style="padding:8px 10px;font-size:12px;color:#666;font-weight:600;text-align:center;width:32px">#</th>
                <th style="padding:8px 10px;font-size:12px;color:#666;font-weight:600;text-align:left">ФИО / Должность</th>
                <th style="padding:8px 10px;font-size:12px;color:#666;font-weight:600;text-align:center;width:140px">Статус</th>
              </tr>
            </thead>
            <tbody>
              {$rows}
            </tbody>
          </table>
        </div>
HTML;
  }

  /**
   * HTML-пилюля статуса и дополнительная строка (дата / причина отклонения).
   */
  private function statusPill(string $status, ?array $appr): array
  {
    switch ($status) {
      case 'approved':
        $date = $appr ? htmlspecialchars($this->fmtDate($appr['DECIDED_AT'] ?? ''), ENT_QUOTES) : '';
        $pill = '<span style="background:#e6f4ea;color:#137333;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">Подписано</span>';
        $note = $date ? "<br><span style=\"color:#888;font-size:11px\">{$date}</span>" : '';
        return [$pill, $note];

      case 'rejected':
        $date = $appr ? htmlspecialchars($this->fmtDate($appr['DECIDED_AT'] ?? ''), ENT_QUOTES) : '';
        $comment = $appr ? htmlspecialchars($appr['COMMENT_TXT'] ?? '', ENT_QUOTES) : '';
        $pill = '<span style="background:#fce8e6;color:#c5221f;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">Отклонено</span>';
        $note = ($date || $comment)
          ? "<br><span style=\"color:#888;font-size:11px\">" . implode(' · ', array_filter([$date, $comment])) . '</span>'
          : '';
        return [$pill, $note];

      default: // pending
        $pill = '<span style="background:#fef9e7;color:#b7770a;padding:2px 8px;border-radius:4px;font-size:11px">В процессе</span>';
        return [$pill, ''];
    }
  }

  /**
   * Форматировать дату «YYYY-MM-DD HH:MM:SS» → «DD.MM.YYYY HH:MM».
   */
  private function fmtDate(string $dt): string
  {
    if (!$dt) {
      return '';
    }
    $t = strtotime($dt);
    return $t ? date('d.m.Y H:i', $t) : $dt;
  }

  /**
   * Сохранить письмо в файл 
   * Отправка через Oracle: GuActRepository::sendMailViaOracle().
   */
  public function send(string $to, string $subject, string $html, string $mode): bool
  {
    return $this->saveToFile($to, $subject, $html);
  }

  // СОхраняем html страничку письма в папку gu23/mail/....
  private function saveToFile(string $to, string $subject, string $html): bool
  {
    if (!is_dir($this->mailDir) && !@mkdir($this->mailDir, 0755, true) && !is_dir($this->mailDir)) {
      if (class_exists('Gu23Logger')) {
        Gu23Logger::error('mail saveToFile: не удалось создать папку', ['dir' => $this->mailDir]);
      }
      return false;
    }
    $ts = date('Ymd_His');
    $safe = preg_replace('/[^a-zA-Z0-9@._-]/', '_', $to);
    $file = $this->mailDir . '/' . $ts . '_' . $safe . '.html';
    $content = "<!-- To: {$to} | Subject: {$subject} | " . date('d.m.Y H:i:s') . " -->\n" . $html;
    $res = @file_put_contents($file, $content);
    if ($res === false) {
      $err = error_get_last();
      if (class_exists('Gu23Logger')) {
        Gu23Logger::error('mail saveToFile: ошибка записи', [
          'file' => $file,
          'error' => $err['message'] ?? '',
        ]);
      }
      return false;
    }
    return true;
  }
}
