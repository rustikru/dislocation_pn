<?php
/**
 * approve.php — страница согласования акта ГУ-23 по HMAC-ссылке.
 * Открывается без авторизации; сам токен в URL является доказательством личности.
 */

// Секрет должен совпадать с тем, которым генерировалась ссылка.
// В проде вынести в db_config.local.php как константу HMAC_SECRET.
if (!defined('HMAC_SECRET')) {
    if (file_exists(__DIR__ . '/db_config.local.php')) {
        require_once __DIR__ . '/db_config.local.php';
    } else {
        require_once __DIR__ . '/db_config.php';
    }
}
if (!defined('HMAC_SECRET')) {
    define('HMAC_SECRET', 'change-me-in-production');
}

require_once __DIR__ . '/lib/HmacApproval.php';
require_once __DIR__ . '/gu23/ApprovalRepository.php';

$hmac   = new HmacApproval(HMAC_SECRET, ttlDays: 7);
$params = $_GET;
$error  = null;
$done   = false;

/* ── 1. Верификация HMAC ── */
$check = $hmac->verify($params);
if (!$check['ok']) {
    renderPage(null, null, null, $check['msg'], false);
    exit;
}

$actId      = $check['act_id'];
$approverId = $check['approver_id'];
$sig        = $params['sig'];

/* ── 2. Подключение к БД ── */
$conn = oci_connect($user, $pwd, $db, 'AL32UTF8');
if (!$conn) {
    renderPage(null, null, null, 'Ошибка подключения к базе данных', false);
    exit;
}

$repo = new ApprovalRepository($conn);

/* ── 3. Проверка одноразовости токена ── */
$existing = $repo->getByTokenSig($sig);
if ($existing && $existing['STATUS'] !== 'pending') {
    $label = $existing['STATUS'] === 'approved' ? 'согласован' : 'отклонён';
    renderPage(null, null, null,
        "Этот акт уже был {$label} {$existing['DECIDED_AT']}.",
        true
    );
    exit;
}

/* ── 4. Загрузка данных ── */
$act      = $repo->getAct($actId);
$approver = $repo->getApproverName($approverId);

if (!$act) {
    renderPage(null, null, null, 'Акт не найден в базе данных', false);
    exit;
}

/* ── 5. Обработка POST (нажатие кнопки) ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $decision = $_POST['decision'] ?? '';
    $comment  = trim($_POST['comment'] ?? '');

    if (!in_array($decision, ['approved', 'rejected'], true)) {
        $error = 'Некорректное действие';
    } elseif ($decision === 'rejected' && $comment === '') {
        $error = 'При отклонении укажите причину';
    } else {
        $repo->saveDecision($actId, $approverId, $decision, $comment, $sig);
        $done = true;
    }
}

renderPage($act, $approver, $params, $error, $done);

/* ════════════════════════════════════════════════════════════
   Вспомогательные функции рендера
   ════════════════════════════════════════════════════════════ */

function actTypeLabel(string $t): string
{
    return match($t) {
        'start' => 'Начало простоя',
        'end'   => 'Окончание простоя',
        default => 'Прочий',
    };
}

function renderPage(?array $act, ?string $approver, ?array $params, ?string $msg, bool $done): void
{
    ?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Согласование акта ГУ-23</title>
    <style>
        :root {
            --bg: #f3f3f1; --surface: #fff; --line: #e9e9e4; --line2: #dcdcd5;
            --ink: #2b2d31; --ink2: #5d6168; --muted: #9b9da2;
            --primary: #2563eb; --primary-dark: #1d4ed8;
            --green: #5a7a60; --greenbg: #eaefe9;
            --red: #9e5b52; --redbg: #f2e9e6;
            --r: 8px; --sans: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--ink); font-family: var(--sans);
               font-size: 14px; line-height: 1.5; min-height: 100vh;
               display: flex; align-items: flex-start; justify-content: center;
               padding: 32px 16px 64px; }
        .card { background: var(--surface); border-radius: var(--r);
                border: 1px solid var(--line); max-width: 560px; width: 100%; }
        .card-head { padding: 20px 24px 16px; border-bottom: 1px solid var(--line); }
        .card-head h1 { font-size: 17px; font-weight: 600; }
        .card-head .sub { color: var(--ink2); font-size: 13px; margin-top: 3px; }
        .card-body { padding: 20px 24px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 11px; font-weight: 600;
                       text-transform: uppercase; letter-spacing: .05em;
                       color: var(--muted); margin-bottom: 3px; }
        .field .val { font-size: 14px; color: var(--ink); }
        .field .val.big { font-size: 16px; font-weight: 600; }
        .sep { border: none; border-top: 1px solid var(--line); margin: 16px 0; }
        .greet { background: #f0f4ff; border-radius: var(--r); padding: 12px 16px;
                 font-size: 13px; color: #1d4ed8; margin-bottom: 20px; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
        .btn { padding: 10px 22px; border-radius: var(--r); border: none;
               font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
        .btn:hover { opacity: .85; }
        .btn-approve { background: var(--green); color: #fff; }
        .btn-reject  { background: var(--red);   color: #fff; }
        .btn-reject.hidden { display: none; }
        .reject-box { margin-top: 14px; display: none; }
        .reject-box.show { display: block; }
        .reject-box textarea { width: 100%; min-height: 80px; padding: 10px 12px;
                               border: 1px solid var(--line2); border-radius: var(--r);
                               font-family: var(--sans); font-size: 13px;
                               resize: vertical; outline: none; }
        .reject-box textarea:focus { border-color: var(--primary); }
        .reject-box .confirm-btn { margin-top: 8px; padding: 8px 18px;
                                   background: var(--red); color: #fff;
                                   border: none; border-radius: var(--r);
                                   font-size: 13px; font-weight: 600; cursor: pointer; }
        .alert { padding: 14px 18px; border-radius: var(--r); font-size: 14px; }
        .alert-err  { background: var(--redbg);   color: var(--red); }
        .alert-ok   { background: var(--greenbg); color: var(--green); }
        .alert-info { background: #f0f4ff; color: #1d4ed8; }
        .ttl { font-size: 12px; color: var(--muted); margin-top: 18px; }
    </style>
</head>
<body>
<div class="card">
    <div class="card-head">
        <h1>Согласование акта ГУ-23</h1>
        <?php if ($act): ?>
        <div class="sub"><?= htmlspecialchars(actTypeLabel($act['ACT_TYPE'])) ?></div>
        <?php endif; ?>
    </div>
    <div class="card-body">

    <?php if ($msg): ?>
        <div class="alert <?= $done ? 'alert-ok' : 'alert-info' ?>"><?= htmlspecialchars($msg) ?></div>

    <?php elseif ($done): ?>
        <?php $decision = $_POST['decision'] ?? ''; ?>
        <div class="alert alert-ok">
            <?= $decision === 'approved' ? '✓ Акт согласован.' : '✕ Акт отклонён.' ?>
            Спасибо, ваше решение зафиксировано.
        </div>

    <?php else: ?>
        <div class="greet">
            Уважаемый(-ая) <strong><?= htmlspecialchars($approver) ?></strong>,<br>
            вас просят согласовать следующий акт.
        </div>

        <?php if ($error): ?>
            <div class="alert alert-err" style="margin-bottom:14px"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <div class="field">
            <label>Номер акта</label>
            <div class="val big"><?= htmlspecialchars($act['ACT_NUMBER'] ?? '—') ?></div>
        </div>
        <div class="field">
            <label>Тип</label>
            <div class="val"><?= htmlspecialchars(actTypeLabel($act['ACT_TYPE'])) ?></div>
        </div>
        <?php if ($act['DEPT']): ?>
        <div class="field">
            <label>Цех</label>
            <div class="val"><?= htmlspecialchars($act['DEPT']) ?></div>
        </div>
        <?php endif; ?>
        <?php if ($act['START_AT']): ?>
        <div class="field">
            <label>Начало простоя</label>
            <div class="val"><?= htmlspecialchars($act['START_AT']) ?></div>
        </div>
        <?php endif; ?>
        <?php if ($act['END_AT']): ?>
        <div class="field">
            <label>Окончание простоя</label>
            <div class="val"><?= htmlspecialchars($act['END_AT']) ?></div>
        </div>
        <?php endif; ?>
        <?php if ($act['REASON_NAME']): ?>
        <div class="field">
            <label>Причина</label>
            <div class="val"><?= htmlspecialchars($act['REASON_NAME']) ?></div>
        </div>
        <?php endif; ?>
        <?php if ($act['WAGON_CNT']): ?>
        <div class="field">
            <label>Вагонов</label>
            <div class="val"><?= (int)$act['WAGON_CNT'] ?></div>
        </div>
        <?php endif; ?>
        <?php if ($act['CREATED_BY']): ?>
        <div class="field">
            <label>Инициатор</label>
            <div class="val"><?= htmlspecialchars($act['CREATED_BY']) ?></div>
        </div>
        <?php endif; ?>

        <hr class="sep">

        <form method="POST">
            <?php foreach ($params as $k => $v): ?>
            <input type="hidden" name="<?= htmlspecialchars($k) ?>"
                   value="<?= htmlspecialchars($v) ?>">
            <?php endforeach; ?>

            <div class="actions">
                <button type="submit" name="decision" value="approved" class="btn btn-approve">
                    ✓ Согласовать
                </button>
                <button type="button" class="btn btn-reject" id="rejectToggle">
                    ✕ Отклонить
                </button>
            </div>

            <div class="reject-box" id="rejectBox">
                <textarea name="comment" id="rejectComment"
                          placeholder="Укажите причину отклонения…"><?= htmlspecialchars($_POST['comment'] ?? '') ?></textarea>
                <button type="submit" name="decision" value="rejected" class="confirm-btn">
                    Подтвердить отклонение
                </button>
            </div>
        </form>

        <div class="ttl">Ссылка действительна 7 дней с момента отправки.</div>
    <?php endif; ?>

    </div>
</div>

<script>
document.getElementById('rejectToggle')?.addEventListener('click', function () {
    var box = document.getElementById('rejectBox');
    box.classList.toggle('show');
    this.textContent = box.classList.contains('show') ? '↑ Отмена' : '✕ Отклонить';
    if (box.classList.contains('show')) {
        document.getElementById('rejectComment').focus();
    }
});
</script>
</body>
</html>
    <?php
}
