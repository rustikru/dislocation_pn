<?php
require_once dirname(__DIR__) . '/session_bootstrap.php';

$sessionParameterDescriptions = [
  'session.name' => 'Имя cookie с идентификатором сессии',
  'session.save_handler' => 'Механизм хранения данных сессии',
  'session.save_path' => 'Каталог или адрес хранилища сессий',
  'session.gc_maxlifetime' => 'Срок хранения неактивной сессии на сервере, секунд',
  'session.gc_probability' => 'Вероятность запуска очистки: числитель',
  'session.gc_divisor' => 'Вероятность запуска очистки: знаменатель',
  'session.cookie_lifetime' => 'Срок жизни cookie, секунд; 0 — до закрытия браузера',
  'session.cookie_path' => 'Путь действия cookie',
  'session.cookie_domain' => 'Домен действия cookie',
  'session.cookie_secure' => 'Передавать cookie только через HTTPS',
  'session.cookie_httponly' => 'Запретить доступ к cookie из JavaScript',
  'session.cookie_samesite' => 'Политика SameSite для cookie',
  'session.use_cookies' => 'Использовать cookie для идентификатора сессии',
  'session.use_only_cookies' => 'Не передавать идентификатор сессии через URL',
  'session.use_strict_mode' => 'Не принимать неизвестные идентификаторы сессий',
  'session.use_trans_sid' => 'Добавлять идентификатор сессии в URL',
  'session.lazy_write' => 'Записывать сессию только при изменении данных',
  'session.cache_limiter' => 'Управление HTTP-кешированием страниц',
  'session.cache_expire' => 'Срок кеширования страниц, минут',
  'session.sid_length' => 'Длина идентификатора сессии',
];

$sessionParameters = [];
foreach ($sessionParameterDescriptions as $parameter => $description) {
  $sessionParameters[$parameter] = [
    'value' => ini_get($parameter),
    'description' => $description,
  ];
}

$sessionLifetime = (int) ini_get('session.gc_maxlifetime');
$sessionLifetimeText = $sessionLifetime . ' сек. (' .
  round($sessionLifetime / 60, 1) . ' мин. / ' .
  round($sessionLifetime / 3600, 2) . ' ч.)';
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

  <h2>Параметры PHP-сессии</h2>
  <table>
    <tr>
      <th>Параметр</th>
      <th>Текущее значение</th>
      <th>Назначение</th>
    </tr>
    <?php foreach ($sessionParameters as $parameter => $data): ?>
      <tr>
        <td><?= htmlspecialchars($parameter) ?></td>
        <td>
          <pre><?= htmlspecialchars((string) $data['value']) ?></pre>
        </td>
        <td><?= htmlspecialchars($data['description']) ?></td>
      </tr>
    <?php endforeach; ?>
    <tr>
      <td>Расчётное время хранения</td>
      <td colspan="2"><strong><?= htmlspecialchars($sessionLifetimeText) ?></strong></td>
    </tr>
  </table>

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
    <a href="?destroy=1" onclick="return confirm('Уничтожить сессию?')"> Уничтожить сессию</a>
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