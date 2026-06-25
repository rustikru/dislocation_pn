<?php
/**
 * approve.php — страница согласования акта ГУ-23 по HMAC-ссылке из письма.
 * Не требует авторизации — доступ защищён одноразовой подписью.
 */
ini_set('display_errors', '0');

require_once __DIR__ . '/../connection.php';
require_once __DIR__ . '/../lib/HmacApproval.php';
require_once __DIR__ . '/ApprovalRepository.php';

if (!defined('HMAC_SECRET')) {
    require_once file_exists(__DIR__ . '/../db_config.local.php')
        ? __DIR__ . '/../db_config.local.php'
        : __DIR__ . '/../db_config.php';
}
if (!defined('HMAC_SECRET')) {
    define('HMAC_SECRET', 'change-me-in-production');
}

$hmac   = new HmacApproval(HMAC_SECRET, ttlDays: 7);
$params = $_GET + $_POST;
$verify = $hmac->verify($params);

$actId      = (int)($params['act']    ?? 0);
$approverId = (int)($params['uid']    ?? 0);
$action     = $params['action']       ?? '';
$sig        = $params['sig']          ?? '';
$signerIp   = $_SERVER['HTTP_X_FORWARDED_FOR']
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
$act  = $repo->getAct($actId);
$name = $repo->getApproverName($approverId);

if (!$act) {
    renderPage('Акт не найден', '<p class="err">Акт ГУ-23 № ' . $actId . ' не найден.</p>');
    exit;
}

$actNumber = htmlspecialchars($act['ACT_NUMBER'] ?? '#' . $actId);

// -------------------------------------------------------------------
// Проверяем: не было ли уже решения по этой ссылке
// -------------------------------------------------------------------
$existing = $repo->getStatusByIds($actId, $approverId);
if ($existing && $existing['STATUS'] !== 'pending') {
    $statusLabel = $existing['STATUS'] === 'approved' ? 'Подписано' : 'Отклонено';
    $decidedAt   = $existing['DECIDED_AT'] ?? '';
    renderPage('Уже обработано', "
        <p>Вы уже дали решение по акту <b>{$actNumber}</b>.</p>
        <p>Статус: <b>{$statusLabel}</b>" . ($decidedAt ? " ({$decidedAt})" : '') . "</p>
    ");
    exit;
}

// -------------------------------------------------------------------
// POST: подтверждение отклонения с причиной
// -------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reject') {
    $comment = trim((string)($_POST['comment'] ?? ''));
    if ($comment === '') {
        showRejectForm($actNumber, $name, $actId, $approverId, $sig, 'Укажите причину отклонения');
        exit;
    }
    $ok = $repo->saveDecision($actId, $approverId, 'rejected', $comment, $sig, $signerIp);
    if ($ok) {
        renderPage('Акт отклонён', "
            <p>Вы отклонили акт <b>{$actNumber}</b>.</p>
            <p class=\"muted\">Причина: " . htmlspecialchars($comment) . "</p>
            <p class=\"ok\">Решение записано.</p>
        ");
    } else {
        renderPage('Ошибка', '<p class="err">Не удалось сохранить решение. Попробуйте ещё раз.</p>');
    }
    exit;
}

// -------------------------------------------------------------------
// GET: согласование
// -------------------------------------------------------------------
if ($action === 'approve') {
    $ok = $repo->saveDecision($actId, $approverId, 'approved', '', $sig, $signerIp);
    if ($ok) {
        renderPage('Акт согласован', "
            <p>Вы согласовали акт <b>{$actNumber}</b>.</p>
            <p class=\"ok\">✓ Решение записано. Спасибо!</p>
        ");
    } else {
        renderPage('Ошибка', '<p class="err">Не удалось сохранить решение. Попробуйте ещё раз.</p>');
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
// Вспомогательные функции
// ===================================================================

function showRejectForm(string $actNumber, string $name, int $actId, int $approverId, string $sig, string $error = ''): void
{
    // Передаём все оригинальные GET-параметры чтобы сохранить ts и sig для проверки HMAC при POST
    $qs        = http_build_query(array_filter($_GET, fn($k) => in_array($k, ['act','uid','action','ts','sig']), ARRAY_FILTER_USE_KEY));
    $errorHtml = $error ? "<p class=\"err\">{$error}</p>" : '';
    renderPage('Отклонение акта', "
        {$errorHtml}
        <p>Акт <b>{$actNumber}</b></p>
        <form method=\"post\" action=\"/gu23/approve.php?{$qs}\">
            <label style=\"display:block;margin-bottom:6px\">Укажите причину отклонения:</label>
            <textarea name=\"comment\" rows=\"4\"
                style=\"width:100%;max-width:500px;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;font-family:inherit\"
                required></textarea>
            <br><br>
            <button type=\"submit\"
                style=\"background:#c0392b;color:#fff;padding:10px 28px;border:none;border-radius:6px;font-size:15px;cursor:pointer\">
                ✗ Подтвердить отклонение
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
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; color: #222; }
  h2   { color: #1a5fa8; }
  .ok  { color: #22863a; font-weight: 600; }
  .err { color: #c0392b; font-weight: 600; }
  .muted { color: #666; font-size: 13px; }
</style>
</head>
<body>
  <h2>ГУ-23 · Акты общей формы</h2>
  <h3>{$title}</h3>
  {$body}
</body>
</html>
HTML;
}
