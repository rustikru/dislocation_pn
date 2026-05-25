<?php

// ── Функция env 
function env(string $key, string $default = ''): string
{
    // файл .env
    $value = getenv($key);
    return ($value !== false) ? $value : $default;
}

// Oracle DB
define('DB_HOST', env('DB_HOST', ''));
define('DB_PORT', env('DB_PORT', ''));
define('DB_SID', env('DB_SID', ''));
define('DB_USER', env('DB_USER', ''));
define('DB_PASSWORD', env('DB_PASSWORD', ''));  
define('DB_CHARSET', env('DB_CHARSET', 'UTF8'));

// MSSQL DB 
define('MSSQL_HOST', env('MSSQL_HOST', ''));
define('MSSQL_USER', env('MSSQL_USER', ''));
define('MSSQL_PASSWORD', env('MSSQL_PASSWORD', '')); 
define('MSSQL_DBNAME', env('MSSQL_DBNAME', ''));
define('MSSQL_CHARSET', env('MSSQL_CHARSET', 'UTF-8'));

// БД по умолчанию для справочника: 'mssql' или 'oracle' 
define('DB_DRIVER', env('DB_DRIVER', 'mssql'));

// Кэш 
if (!defined('CACHE_DIR')) {
    define('CACHE_DIR', dirname(__DIR__) . '/cache');
}
define('CACHE_DATA_FILE', CACHE_DIR . '/data.json');
define('CACHE_TTL', 5 * 60);   // секунды; 5 мин

