<?php

require_once __DIR__ . '/../../db_config.php'; // Файл с настройками для подключения
require_once __DIR__ . '/Logger.php';

class OracleConnection
{
    private static $conn = null;
    

    public static function connect()
    {
        if (self::$conn !== null) {
            return self::$conn;
        }

        global $user, $pwd, $db;

        $conn = oci_connect($user, $pwd, $db, "AL32UTF8");

        if (!$conn) {
            $e = oci_error();
            $error_message = "Ошибка подключения к Oracle: " . $e['message'];
            Logger::error($error_message);
            throw new Exception($error_message);
        }

        self::$conn = $conn;
        return self::$conn;
    }

    public static function close(): void
    {
        if (self::$conn !== null) {
            oci_close(self::$conn);
            self::$conn = null;
        }
    }
}
