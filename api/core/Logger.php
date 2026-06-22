<?php

class Logger
{
    private static string $baseDir;
    private static ?array $config = null;

    private static function isLoggingEnabled(string $module): bool
    {
        self::loadConfig();
        
        if ($module === 'error') {
            return self::$config['error_log'] ?? self::$config['enabled'] ?? true;
        }
        
        return self::$config['enabled'] ?? self::$config['info_log'] ?? true;
    }
    
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
     * Загрузка конфигурации
     */
    private static function loadConfig(): void
    {
        if (self::$config === null) {
            $configPath = __DIR__ . '/Config.php';
            if (file_exists($configPath)) {
                $config = require $configPath;
                self::$config = $config['logging'] ?? [];
            } else {
                self::$config = [];
            }
            
            if (!isset(self::$config['enabled'])) {
                self::$config['enabled'] = true;
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
        if (!self::isLoggingEnabled($module)) {
            return;
        }
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
