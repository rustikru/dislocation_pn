<?php

// ── Функция env ─────────────────────────────────────────────────────────────────
function env(string $key, string $default = ''): string
{
    $value = getenv($key);
    return ($value !== false) ? $value : $default;
}

// ── Oracle DB ─────────────────────────────────────────────────────────────────
define('DB_HOST', env('DB_HOST', '10.0.0.173'));
define('DB_PORT', env('DB_PORT', '51521'));
define('DB_SID', env('DB_SID', 'PROD'));
define('DB_USER', env('DB_USER', 'xx_prtl'));
define('DB_PASSWORD', env('DB_PASSWORD', ''));  
define('DB_CHARSET', env('DB_CHARSET', 'UTF8'));

// ── MSSQL DB ─────────────────────────────────────────────────────────────────
define('MSSQL_HOST', env('MSSQL_HOST', '172.16.0.180'));
define('MSSQL_USER', env('MSSQL_USER', 'hrsync'));
define('MSSQL_PASSWORD', env('MSSQL_PASSWORD', '')); 
define('MSSQL_DBNAME', env('MSSQL_DBNAME', 'MGHR'));
define('MSSQL_CHARSET', env('MSSQL_CHARSET', 'UTF-8'));

// ── Активный драйвер : 'mssql' | 'oracle' ─────────────────────────────────────
define('DB_DRIVER', env('DB_DRIVER', 'mssql'));

// ── Кэш ───────────────────────────────────────────────────────────────────────
// Проверяем, определён ли CACHE_DIR (если нет - определяем)
if (!defined('CACHE_DIR')) {
    define('CACHE_DIR', dirname(__DIR__) . '/cache');
}
define('CACHE_DATA_FILE', CACHE_DIR . '/data.json');
define('CACHE_TTL', 10 * 60);   // секунды; 10 мин

