<?php

class Logger
{
    private static string $baseDir;

    /**
     *  корневая директории логов
     */
    private static function init(): void
    {
        if (!isset(self::$baseDir)) {
            self::$baseDir = dirname(__DIR__) . '/logs';

            if (!is_dir(self::$baseDir)) {
                mkdir(self::$baseDir, 0777, true);
            }
        }
    }

    /**
     * Лог ошибок (отдельный модуль)
     */
    public static function error(string $message): void
    {
        self::write('error', $message);
    }

    /**
     * Лог по модулю / классу
     */
    public static function info(string $module, string $message): void
    {
        self::write($module, $message);
    }

    /**
     *  запись
     */
    private static function write(string $module, string $message): void
    {
        self::init();

        // папка модуля
        $moduleDir = self::$baseDir . '/' . $module;

        if (!is_dir($moduleDir)) {
            mkdir($moduleDir, 0777, true);
        }

        // файл по дате
        $file = $moduleDir . '/' . date('Y-m-d') . '.log';
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $clientHost = $ip ? gethostbyaddr($ip) : 'unknown';
        $entry =
            '[' . date('Y-m-d H:i:s') . '] ' .
            '[IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '] ' .
            '[CLIENT_HOST: ' . $clientHost . '] ' .
            $message . PHP_EOL;

        file_put_contents($file, $entry, FILE_APPEND | LOCK_EX);
    }
}
