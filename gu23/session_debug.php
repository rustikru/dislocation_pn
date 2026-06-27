<?php
/**
 * ТОЛЬКО ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ — не деплоить на прод!
 */
if (!file_exists(dirname(__DIR__) . '/db_config.local.php')) {
  http_response_code(404);
  exit('Not found');
}
session_start();
?>
<!DOCTYPE html>
<html lang="ru">

<head>
  <meta charset="utf-8">
  <title>Session Debug</title>
  <style>
    body {
      font-family: monospace;
      font-size: 13px;
      padding: 24px;
      background: #f5f5f5;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      background: #fff;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px #0002;
    }

    th {
      background: #3b4a5c;
      color: #fff;
      padding: 8px 14px;
      text-align: left;
    }

    td {
      padding: 8px 14px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }

    td:first-child {
      color: #666;
      white-space: nowrap;
      width: 200px;
    }

    td:last-child {
      color: #1a1a2e;
      word-break: break-all;
    }

    .empty {
      color: #aaa;
      font-style: italic;
    }

    h2 {
      color: #3b4a5c;
      margin: 0 0 14px;
    }

    .destroy {
      margin-top: 16px;
    }

    .destroy a {
      color: #c0392b;
      font-size: 12px;
    }
  </style>
</head>

<body>
  <h2>$_SESSION · <?= htmlspecialchars(session_id()) ?></h2>

  <?php if (isset($_GET['destroy'])):
    session_destroy();
    echo '<p>Сессия уничтожена. <a href="session_debug.php">Обновить</a></p>';
    exit; endif; ?>

  <?php if (empty($_SESSION)): ?>
    <p class="empty">Сессия пуста.</p>
  <?php else: ?>
    <table>
      <tr>
        <th>Ключ</th>
        <th>Значение</th>
      </tr>
      <?php foreach ($_SESSION as $key => $value): ?>
        <tr>
          <td><?= htmlspecialchars($key) ?></td>
          <td><?= htmlspecialchars(is_bool($value) ? ($value ? 'true' : 'false') : print_r($value, true)) ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>

  <div class="destroy"><a href="?destroy=1" onclick="return confirm('Уничтожить сессию?')">🗑 Уничтожить сессию</a>
  </div>
</body>

</html>