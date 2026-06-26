<?php
/**
 * db_config.local.php.example  —  ШАБЛОН локального конфига для запуска
 *                                  модуля ГУ-23 на локальном Oracle (Docker).
 *
 * КАК ПОЛЬЗОВАТЬСЯ:
 *   1. Скопируйте этот файл в db_config.local.php (без .example):
 *        cp db_config.local.php.example db_config.local.php
 *   2. Впишите свой пароль ($pwd).
 *   3. connection.php автоматически подхватит db_config.local.php, если он есть.
 *
 * ВАЖНО: db_config.local.php в .gitignore и НА ПРОД НЕ ПОПАДАЕТ.
 *        На проде используется обычный db_config.php (PROD).
 */

// ---- параметры подключения к локальному Oracle в Docker ----
$user = 'xx_etw';
$pwd = 'xx_etw123';          // <-- укажите свой пароль
$host = '127.0.0.1';
$port = '1521';
$serviceName = 'FREEPDB1';
$db = '(DESCRIPTION =
            (ADDRESS = (PROTOCOL = TCP)(HOST = ' . $host . ')(PORT = ' . $port . '))
            (CONNECT_DATA =
              (SERVICE_NAME = ' . $serviceName . ')
            )
       )';
// =====================================================================
//  DEV-ОБХОД АВТОРИЗАЦИИ (только локально!)
//  Подставляет фейкового авторизованного пользователя, чтобы можно было
//  открыть страницу ГУ-23 без полной таблицы пользователей и пакета.
//  user_id = 1 должен совпадать с dev-пользователем из seed_gu23.sql.
// =====================================================================
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}
if (empty($_SESSION['is_auth'])) {
    $_SESSION['is_auth'] = true;
    $_SESSION['is_auth_admin'] = true;
    $_SESSION['login'] = 'BEKMANSUROVRR';
    $_SESSION['user_id'] = 1;
    $_SESSION['full_name'] = 'Локальный разработчик';
    $_SESSION['enterprise'] = 'DEV';
    $_SESSION['flag_change_pwd'] = 'N';
    $_SESSION['administrator'] = 'Y';
    $_SESSION['gu23_add'] = 'Y';
    $_SESSION['gu23_view'] = 'Y';
    $_SESSION['station_id'] = 1;
    $_SESSION['station'] = 'DEV';
}
