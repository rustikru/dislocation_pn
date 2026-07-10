<?php
session_start();
?>
<!DOCTYPE html>
<html lang="ru">

<head>
  <meta charset="utf-8">
  <title>Session & Server Debug</title>
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
      margin-bottom: 30px;
    }

    th {
      background: #3b4a5c;
      color: #fff;
      padding: 8px 14px;
      text-align: left;
    }

    .server-table th {
      background: #2c3e50;
      /* Чуть другой оттенок для сервера */
    }

    td {
      padding: 8px 14px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }

    td:first-child {
      color: #666;
      white-space: nowrap;
      width: 250px;
      font-weight: bold;
    }

    td:last-child {
      color: #1a1a2e;
      word-break: break-all;
    }

    pre {
      margin: 0;
      font-family: inherit;
      white-space: pre-wrap;
    }

    .empty {
      color: #aaa;
      font-style: italic;
      margin-bottom: 30px;
    }

    h2 {
      color: #3b4a5c;
      margin: 0 0 14px;
    }

    .destroy {
      margin-bottom: 30px;
    }

    .destroy a {
      color: #c0392b;
      font-size: 12px;
      text-decoration: none;
    }

    .destroy a:hover {
      text-decoration: underline;
    }
  </style>
</head>

<body>

  <h2>$_SESSION · <?= htmlspecialchars(session_id()) ?></h2>

  <?php if (isset($_GET['destroy'])):
    session_destroy();
    echo '<p>Сессия уничтожена. <a href="' . htmlspecialchars($_SERVER['PHP_SELF']) . '">Обновить</a></p>';
    exit;
  endif; ?>

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
          <td>
            <pre><?= htmlspecialchars(is_bool($value) ? ($value ? 'true' : 'false') : (is_scalar($value) ? $value : print_r($value, true))) ?></pre>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>

  <div class="destroy">
    <a href="?destroy=1" onclick="return confirm('Уничтожить сессию?')">🗑 Уничтожить сессию</a>
  </div>


  <h2>$_SERVER</h2>

  <?php if (empty($_SERVER)): ?>
    <p class="empty">Массив $_SERVER пуст.</p>
  <?php else: ?>
    <table class="server-table">
      <tr>
        <th>Переменная</th>
        <th>Значение</th>
      </tr>
      <?php foreach ($_SERVER as $key => $value): ?>
        <tr>
          <td><?= htmlspecialchars($key) ?></td>
          <td>
            <pre><?= htmlspecialchars(is_bool($value) ? ($value ? 'true' : 'false') : (is_scalar($value) ? $value : print_r($value, true))) ?></pre>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>
  <?php endif; ?>

</body>

</html>