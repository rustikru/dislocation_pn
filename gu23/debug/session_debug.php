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

function formatDuration(int $seconds): string
{
  $seconds = max(0, $seconds);
  $hours = (int) floor($seconds / 3600);
  $minutes = (int) floor(($seconds % 3600) / 60);
  return $seconds . ' сек. (' . $hours . ' ч. ' . $minutes . ' мин.)';
}

// get_cfg_var читает исходное значение php.ini, тогда как ini_get ниже
// возвращает локальное значение, установленное session_bootstrap.php.
$configuredLifetime = function_exists('get_cfg_var')
  ? get_cfg_var('session.gc_maxlifetime')
  : false;
$globalSessionLifetime = is_numeric($configuredLifetime)
  ? (int) $configuredLifetime
  : 0;
$localSessionLifetime = $sessionLifetime;
$saveHandler = (string) ini_get('session.save_handler');
$configuredSavePath = (string) session_save_path();
$resolvedSavePath = $configuredSavePath;

// Для файлового обработчика путь может иметь формат "N;/path/to/sessions".
if ($saveHandler === 'files') {
  if ($resolvedSavePath === '') {
    $resolvedSavePath = sys_get_temp_dir();
  } elseif (strpos($resolvedSavePath, ';') !== false) {
    $pathParts = explode(';', $resolvedSavePath);
    $resolvedSavePath = (string) end($pathParts);
  }
}

$sessionFile = null;
$sessionFileExists = null;
$sessionFileModifiedAt = null;
$sessionIdleSeconds = null;
$sessionRemainingSeconds = null;

if ($saveHandler === 'files' && $resolvedSavePath !== '') {
  $sessionFile = rtrim($resolvedSavePath, DIRECTORY_SEPARATOR) .
    DIRECTORY_SEPARATOR . 'sess_' . session_id();
  clearstatcache(true, $sessionFile);
  $sessionFileExists = is_file($sessionFile);

  if ($sessionFileExists) {
    $modifiedAt = filemtime($sessionFile);
    if ($modifiedAt !== false) {
      $sessionFileModifiedAt = $modifiedAt;
      $sessionIdleSeconds = max(0, time() - $modifiedAt);
      $sessionRemainingSeconds = max(0, $localSessionLifetime - $sessionIdleSeconds);
    }
  }
}

$lifetimeMismatch = $globalSessionLifetime > 0 &&
  $globalSessionLifetime < $localSessionLifetime;
$loadedIniFile = function_exists('php_ini_loaded_file')
  ? php_ini_loaded_file()
  : false;
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

    .warning {
      padding: 12px 14px;
      margin-bottom: 16px;
      border: 1px solid #e4b04a;
      border-radius: 6px;
      background: #fff8e7;
      color: #704b00;
    }

    .ok {
      color: #237a3b;
      font-weight: bold;
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

  <h2>Диагностика срока жизни сессии</h2>

  <?php if ($lifetimeMismatch): ?>
    <div class="warning">
      Глобальное значение PHP меньше значения ГУ-23. Внешняя серверная очистка
      может удалить сессию раньше установленных в модуле <?= htmlspecialchars(formatDuration($localSessionLifetime)) ?>.
    </div>
  <?php endif; ?>

  <table>
    <tr>
      <th>Проверка</th>
      <th>Значение</th>
      <th>Комментарий</th>
    </tr>
    <tr>
      <td>Время сервера PHP</td>
      <td><?= htmlspecialchars(date('d.m.Y H:i:s P')) ?></td>
      <td>Часовой пояс: <?= htmlspecialchars(date_default_timezone_get()) ?></td>
    </tr>
    <tr>
      <td>PHP SAPI</td>
      <td><?= htmlspecialchars(PHP_SAPI) ?></td>
      <td>Для сайта обычно используется FPM/FastCGI или Apache, а не CLI</td>
    </tr>
    <tr>
      <td>Загруженный php.ini</td>
      <td><?= htmlspecialchars($loadedIniFile ?: 'не определён') ?></td>
      <td>Именно конфигурацию этого веб-процесса нужно проверять на сервере</td>
    </tr>
    <tr>
      <td>gc_maxlifetime из php.ini</td>
      <td><?= htmlspecialchars(formatDuration($globalSessionLifetime)) ?></td>
      <td>Глобальное значение, которое может использовать серверная очистка</td>
    </tr>
    <tr>
      <td>gc_maxlifetime в ГУ-23</td>
      <td><?= htmlspecialchars(formatDuration($localSessionLifetime)) ?></td>
      <td>Локальное значение после выполнения session_bootstrap.php</td>
    </tr>
    <tr>
      <td>Обработчик сессии</td>
      <td><?= htmlspecialchars($saveHandler) ?></td>
      <td>Для Redis/БД остаток по файлу ниже определить нельзя</td>
    </tr>
    <tr>
      <td>Настроенный save_path</td>
      <td><?= htmlspecialchars($configuredSavePath !== '' ? $configuredSavePath : '(пусто)') ?></td>
      <td>Исходное значение session.save_path</td>
    </tr>
    <tr>
      <td>Фактический путь</td>
      <td><?= htmlspecialchars($resolvedSavePath !== '' ? $resolvedSavePath : 'не определён') ?></td>
      <td>Путь после разбора настроек файлового обработчика</td>
    </tr>
    <tr>
      <td>Файл текущей сессии</td>
      <td><?= htmlspecialchars($sessionFile ?? 'не применяется') ?></td>
      <td><?= $sessionFileExists === null ? 'Не файловое хранилище' : ($sessionFileExists ? '<span class="ok">Файл существует</span>' : 'Файл не найден или недоступен') ?></td>
    </tr>
    <tr>
      <td>Предыдущая активность</td>
      <td><?= $sessionFileModifiedAt !== null ? htmlspecialchars(date('d.m.Y H:i:s P', $sessionFileModifiedAt)) : 'не определена' ?></td>
      <td>Время изменения файла до завершения текущего запроса</td>
    </tr>
    <tr>
      <td>Время неактивности</td>
      <td><?= $sessionIdleSeconds !== null ? htmlspecialchars(formatDuration($sessionIdleSeconds)) : 'не определено' ?></td>
      <td>Возраст файла текущей сессии</td>
    </tr>
    <tr>
      <td>Расчётный остаток</td>
      <td><?= $sessionRemainingSeconds !== null ? htmlspecialchars(formatDuration($sessionRemainingSeconds)) : 'не определён' ?></td>
      <td>Оценка по локальному gc_maxlifetime; внешняя очистка может сработать раньше</td>
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
