<?php
/**
 * approve.php — страница согласования акта ГУ-23 по ссылке из письма.
 * 
 */
ini_set('display_errors', '0');

require_once __DIR__ . '/../connection.php';
require_once __DIR__ . '/lib/client_ip.php';
require_once __DIR__ . '/lib/text_clean.php';
require_once __DIR__ . '/classes/ApprovalRepository.php';

$params = $_GET + $_POST;
$token = trim((string) ($params['token'] ?? ''));
$action = $params['action'] ?? '';
$signerIp = gu23_client_ip();

$repo = new ApprovalRepository($conn1);
$tokenInfo = $token !== '' ? $repo->getByToken($token) : null;

if (!$tokenInfo) {
    showPage('Ошибка', '<p class="err">Ссылка недействительна.</p>');
    exit;
}

$actId = (int) $tokenInfo['ACT_ID'];
$approverId = (int) $tokenInfo['APPROVER_ID'];
$act = $repo->getAct($actId);

if (!$act) {
    showPage('Акт не найден', '<p class="err">Акт ГУ-23 № ' . $actId . ' не найден.</p>');
    exit;
}

$actNumber = htmlspecialchars($act['ACT_NUMBER'] ?? '#' . $actId);

// Если статус акта аннулирован, мы его не подписываем
if ($act['STATUS'] === 'annulled'){
    showPage('Акт аннулирован', "
        <p>Акт уже аннулирован.</p>
    ");
    exit;
}

if ($act['STATUS'] === 'closed'){
    showPage('Акт закрыт', "
        <p>Акт уже закрыт.</p>
    ");
    exit;
}

// -------------------------------------------------------------------
// Проверяем: не было ли уже решения по этой ссылке
// -------------------------------------------------------------------
$existing = $tokenInfo;
if ($existing && $existing['STATUS'] !== 'pending') {
    $statusLabel = $existing['STATUS'] === 'approved'
        ? 'Подписано'
        : ($existing['STATUS'] === 'on_correction' ? 'На корректировке' : 'Отклонено');
    $decidedAt = $existing['DECIDED_AT'] ?? '';
    showPage('Уже обработано', "
        <p>Вы уже подписали акт ранее <b>{$actNumber}</b>.</p>
        <p style=\"margin-top: 12px;\">Статус: <span class=\"status-badge\">{$statusLabel}</span>" . ($decidedAt ? " <span class=\"muted\">({$decidedAt})</span>" : '') . "</p>
    ");
    exit;
}

// -------------------------------------------------------------------
// POST: подтверждение отклонения с причиной
// -------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reject') {
    $comment = trim(gu23_clean_text_for_oracle((string) ($_POST['comment'] ?? '')));
    if ($comment === '') {
        showRejectForm($actNumber, $token, 'Укажите причину отклонения');
        exit;
    }
    $result = $repo->saveDecisionResult($actId, $approverId, 'rejected', $comment, $token, $signerIp);
    if (str_starts_with($result, 'OK')) {
        showPage('Акт отклонён', "
            <p>Вы отклонили акт <b>{$actNumber}</b>.</p>
            <p class=\"muted\" style=\"margin: 12px 0; padding-left: 10px; border-left: 2px solid #dadce0;\">Причина: " . htmlspecialchars($comment) . "</p>
            <p class=\"ok\">Сохранено.</p>
        ");
    } else {
        showPage('Ошибка', '<p class="err">' . htmlspecialchars(approvalErrorText($result)) . '</p>');
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'correction') {
    $comment = trim(gu23_clean_text_for_oracle((string) ($_POST['comment'] ?? '')));
    if ($comment === '') {
        showCorrectionForm($actNumber, $token, 'Укажите причину корректировки');
        exit;
    }
    $result = $repo->saveDecisionResult($actId, $approverId, 'on_correction', $comment, $token, $signerIp);
    if (str_starts_with($result, 'OK')) {
        showPage('Акт отправлен на корректировку', "
            <p>Акт <b>{$actNumber}</b> отправлен на корректировку.</p>
            <p class=\"muted\" style=\"margin: 12px 0; padding-left: 10px; border-left: 2px solid #dadce0;\">Причина: " . htmlspecialchars($comment) . "</p>
            <p class=\"ok\">Сохранено.</p>
        ");
    } else {
        showPage('Ошибка', '<p class="err">' . htmlspecialchars(approvalErrorText($result)) . '</p>');
    }
    exit;
}

// -------------------------------------------------------------------
// GET: подписание
// -------------------------------------------------------------------
if ($action === 'approve') {
    $result = $repo->saveDecisionResult($actId, $approverId, 'approved', '', $token, $signerIp);
    if (str_starts_with($result, 'OK')) {
        approvalCall($conn1, 'xx_disl_gu23_pkg.gu23_send_next_approval_mail(:act, :base)', [
            ':act' => $actId,
            ':base' => approvalBaseUrl(),
        ]);
        showPage('Акт подписан', "
            <p>Вы подписали акт <b>{$actNumber}</b>.</p>
            <p class=\"ok\" style=\"margin-top: 15px;\">Спасибо!</p>
        ");
    } else {
        showPage('Ошибка', '<p class="err">' . htmlspecialchars(approvalErrorText($result)) . '</p>');
    }
    exit;
}

// -------------------------------------------------------------------
// GET: форма отклонения
// -------------------------------------------------------------------
if ($action === 'reject') {
    showRejectForm($actNumber, $token);
    exit;
}

if ($action === 'correction') {
    showCorrectionForm($actNumber, $token);
    exit;
}

showPage('Неизвестное действие', '<p class="err">Недопустимое действие.</p>');

// ===================================================================
// Доп функции
// ===================================================================

function approvalErrorText(string $result): string
{
    $parts = explode(ApprovalRepository::US, $result, 2);
    return $parts[1] ?? 'Не удалось сохранить. Попробуйте ещё раз.';
}

function approvalBaseUrl(): string
{
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

function approvalCall($conn, string $expr, array $binds): string
{
    $result = '';
    $st = oci_parse($conn, 'BEGIN :r := ' . $expr . '; END;');
    oci_bind_by_name($st, ':r', $result, 4000);
    foreach ($binds as $name => $value) {
        oci_bind_by_name($st, $name, $binds[$name]);
    }
    oci_execute($st);
    return (string) $result;
}

function showRejectForm(string $actNumber, string $token, string $error = ''): void
{
    $qs = http_build_query(['token' => $token, 'action' => 'reject']);
    $errorHtml = $error ? "<p class=\"err\" style=\"margin-bottom: 15px;\">{$error}</p>" : '';
    showPage('Отклонение акта', "
        {$errorHtml}
        <p style=\"margin-bottom: 20px;\">Отклонить акт <b>{$actNumber}</b></p>
        <form method=\"post\" action=\"/gu23/approve.php?{$qs}\">
            <label style=\"display:block; margin-bottom:8px; color:#5f6368; font-size:13px; font-weight:600;\">УКАЖИТЕ ПРИЧИНУ ОТКЛОНЕНИЯ:</label>
            <textarea name=\"comment\" rows=\"4\"
                style=\"width:100%; box-sizing:border-box; max-width:100%; padding:12px; border:1px solid #dadce0; border-radius:4px; font-size:14px; font-family:inherit; color:#202124; outline:none;\"
                placeholder=\"Причина отклонения...\"
                required></textarea>
            <br><br>
            <button type=\"submit\"
                style=\"background:#5f6368; color:#ffffff; padding:10px 24px; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; transition: background 0.2s;\">
                Отклонить
            </button>
        </form>
    ");
}

function showCorrectionForm(string $actNumber, string $token, string $error = ''): void
{
    $qs = http_build_query(['token' => $token, 'action' => 'correction']);
    $errorHtml = $error ? "<p class=\"err\" style=\"margin-bottom: 15px;\">{$error}</p>" : '';
    showPage('Корректировка акта', "
        {$errorHtml}
        <p style=\"margin-bottom: 20px;\">Отправить акт <b>{$actNumber}</b> на корректировку</p>
        <form method=\"post\" action=\"/gu23/approve.php?{$qs}\">
            <label style=\"display:block; margin-bottom:8px; color:#5f6368; font-size:13px; font-weight:600;\">УКАЖИТЕ ПРИЧИНУ КОРРЕКТИРОВКИ:</label>
            <textarea name=\"comment\" rows=\"4\"
                style=\"width:100%; box-sizing:border-box; max-width:100%; padding:12px; border:1px solid #dadce0; border-radius:4px; font-size:14px; font-family:inherit; color:#202124; outline:none;\"
                placeholder=\"Причина корректировки...\"
                required></textarea>
            <br><br>
            <button type=\"submit\"
                style=\"background:#5f6368; color:#ffffff; padding:10px 24px; border:none; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; transition: background 0.2s;\">
                Отправить
            </button>
        </form>
    ");
}

function showPage(string $title, string $body): void
{
    echo <<<HTML
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$title} — ГУ-23</title>
<style>
  body { 
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
    background-color: #f8f9fa; 
    margin: 0; 
    padding: 40px 20px; 
    color: #202124; 
    display: flex;
    justify-content: center;
  }
  .card {
    background-color: #ffffff;
    max-width: 550px;
    width: 100%;
    padding: 30px;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
    box-sizing: border-box;
  }
  .system-header {
    font-size: 11px;
    font-weight: 600;
    color: #80868b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 20px;
    border-bottom: 1px solid #dadce0;
    padding-bottom: 10px;
  }
  h3 { 
    font-size: 20px; 
    font-weight: 600; 
    color: #202124; 
    margin: 0 0 20px 0;
  }
  p {
    font-size: 14px;
    line-height: 1.6;
    color: #3c4043;
    margin: 0 0 10px 0;
  }
  .ok { 
    color: #137333; 
    background-color: #e6f4ea;
    padding: 10px 14px;
    border-radius: 4px;
    display: inline-block;
    font-weight: 500;
  }
  .err { 
    color: #c5221f; 
    background-color: #fce8e6;
    padding: 10px 14px;
    border-radius: 4px;
    display: inline-block;
    font-weight: 500;
  }
  .status-badge {
    background-color: #e8eaed;
    color: #3c4043;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 13px;
  }
  .muted { color: #80868b; font-size: 13px; }
</style>
</head>
<body>
  <div class="card">
    <div class="system-header">Подписание актов ГУ-23</div>
    <h3>{$title}</h3>
    {$body}
  </div>
</body>
</html>
HTML;
}
