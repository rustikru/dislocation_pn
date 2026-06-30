<?php
/**
 * approve.php — страница согласования акта ГУ-23 по HMAC-ссылке из письма.
 * 
 */
ini_set('display_errors', '0');

require_once __DIR__ . '/../connection.php';
require_once __DIR__ . '/lib/HmacApproval.php';
require_once __DIR__ . '/ApprovalRepository.php';

$hmacSecret = '';
$_st = @oci_parse($conn1, 'BEGIN :r := xx_disl_gu23_pkg.gu23_get_hmac_secret(); END;');
if ($_st) {
    oci_bind_by_name($_st, ':r', $hmacSecret, 128);
    @oci_execute($_st);
}

$hmac = new HmacApproval($hmacSecret, ttlDays: 1);
$params = $_GET + $_POST;
$verify = $hmac->verify($params);

$actId = (int) ($params['act'] ?? 0);
$approverId = (int) ($params['uid'] ?? 0);
$action = $params['action'] ?? '';
$sig = $params['sig'] ?? '';
$signerIp = !empty($_SERVER['HTTP_X_FORWARDED_FOR'])
    ? trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0])
    : ($_SERVER['REMOTE_ADDR'] ?? '');

// -------------------------------------------------------------------
// Если ссылка невалидна — показываем ошибку и выходим
// -------------------------------------------------------------------
if (!$verify['ok']) {
    renderPage('Ошибка', '<p class="err">' . htmlspecialchars($verify['msg']) . '</p>');
    exit;
}

$repo = new ApprovalRepository($conn1);
$act = $repo->getAct($actId);
$name = $repo->getApproverName($approverId);

if (!$act) {
    renderPage('Акт не найден', '<p class="err">Акт ГУ-23 № ' . $actId . ' не найден.</p>');
    exit;
}

$actNumber = htmlspecialchars($act['ACT_NUMBER'] ?? '#' . $actId);

// Если статус акта аннулирован, мы его не подписываем
if ($act['STATUS'] === 'annulled') {
    renderPage('Акт аннулирован', "
        <p>Акт уже аннулирован.</p>
    ");
    exit;
}

if ($act['STATUS'] === 'closed') {
    renderPage('Акт закрыт', "
        <p>Акт уже закрыт.</p>
    ");
    exit;
}

// -------------------------------------------------------------------
// Проверяем: не было ли уже решения по этой ссылке
// -------------------------------------------------------------------
$existing = $repo->getStatusByIds($actId, $approverId);
if ($existing && $existing['STATUS'] !== 'pending') {
    $statusLabel = $existing['STATUS'] === 'approved' ? 'Подписано' : 'Отклонено';
    $decidedAt = $existing['DECIDED_AT'] ?? '';
    renderPage('Уже обработано', "
        <p>Вы уже подписали акт ранее <b>{$actNumber}</b>.</p>
        <p style=\"margin-top: 12px;\">Статус: <span class=\"status-badge\">{$statusLabel}</span>" . ($decidedAt ? " <span class=\"muted\">({$decidedAt})</span>" : '') . "</p>
    ");
    exit;
}

// -------------------------------------------------------------------
// POST: подтверждение отклонения с причиной
// -------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reject') {
    $comment = trim((string) ($_POST['comment'] ?? ''));
    if ($comment === '') {
        showRejectForm($actNumber, $name, $actId, $approverId, $sig, 'Укажите причину отклонения');
        exit;
    }
    $ok = $repo->saveDecision($actId, $approverId, 'rejected', $comment, $sig, $signerIp);
    if ($ok) {
        renderPage('Акт отклонён', "
            <p>Вы отклонили акт <b>{$actNumber}</b>.</p>
            <p class=\"muted\" style=\"margin: 12px 0; padding-left: 10px; border-left: 2px solid #dadce0;\">Причина: " . htmlspecialchars($comment) . "</p>
            <p class=\"ok\">Сохранено.</p>
        ");
    } else {
        renderPage('Ошибка', '<p class="err">Не удалось сохранить. Попробуйте ещё раз.</p>');
    }
    exit;
}

// -------------------------------------------------------------------
// GET: подписание
// -------------------------------------------------------------------
if ($action === 'approve') {
    $ok = $repo->saveDecision($actId, $approverId, 'approved', '', $sig, $signerIp);
    if ($ok) {
        renderPage('Акт подписан', "
            <p>Вы подписали акт <b>{$actNumber}</b>.</p>
            <p class=\"ok\" style=\"margin-top: 15px;\">Спасибо!</p>
        ");
    } else {
        renderPage('Ошибка', '<p class="err">Не удалось сохранить. Попробуйте ещё раз.</p>');
    }
    exit;
}

// -------------------------------------------------------------------
// GET: форма отклонения
// -------------------------------------------------------------------
if ($action === 'reject') {
    showRejectForm($actNumber, $name, $actId, $approverId, $sig);
    exit;
}

renderPage('Неизвестное действие', '<p class="err">Недопустимое действие.</p>');

// ===================================================================
// Доп функции
// ===================================================================

function showRejectForm(string $actNumber, string $name, int $actId, int $approverId, string $sig, string $error = ''): void
{
    // Передаём все оригинальные GET-параметры чтобы сохранить ts и sig для проверки HMAC при POST
    $qs = http_build_query(array_filter($_GET, fn($k) => in_array($k, ['act', 'uid', 'action', 'ts', 'sig']), ARRAY_FILTER_USE_KEY));
    $errorHtml = $error ? "<p class=\"err\" style=\"margin-bottom: 15px;\">{$error}</p>" : '';
    renderPage('Отклонение акта', "
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

function renderPage(string $title, string $body): void
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