<?php
require_once dirname(__DIR__) . '/core/Bootstrap.php';
Bootstrap::init();

require_once CONTROLLER_DIR . '/config.php';
require_once CONTROLLER_DIR . '/DataCache.php';
require_once CONTROLLER_DIR . '/OracleDB.php';
require_once CONTROLLER_DIR . '/MSSQL.php';

function get_phone_data()
{
    $cache = new DataCache(CACHE_DATA_FILE, CACHE_TTL);

    return $cache->remember(function () {

        // активная БД, по умолчанию MSSQL
        // Если вдруг БД не доступна, данные берутся с файла cache/data.json
        $driver = defined('DB_DRIVER') ? DB_DRIVER : 'mssql';

        if ($driver === 'oracle') {
            $db = new OracleDB();
        } else {
            $db = new MSSQL();
        }

        return $db->getDirectoryData();
    });
}