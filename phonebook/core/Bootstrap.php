<?php

final class Bootstrap
{
    private static bool $initialized = false;

    public static function init(): void
    {
        if (self::$initialized) {
            return;
        }

        self::definePaths();
        self::loadEnvFile();      
        self::loadConfig();       
        self::ensureDirs();
        self::registerAutoload();

        self::$initialized = true;
    }

    private static function definePaths(): void
    {
        // Путь главный
        if (!defined('ROOT_DIR')) {
            define('ROOT_DIR', dirname(__DIR__));
        }
        // Путь до папки /controller
        if (!defined('CONTROLLER_DIR')) {
            define('CONTROLLER_DIR', ROOT_DIR . '/controller');
        }
        // Путь до папки /cache
        if (!defined('CACHE_DIR')) {
            define('CACHE_DIR', ROOT_DIR . '/cache');
        }
    }

    /**
     * Загрузка переменных из .env файла
     */
    private static function loadEnvFile(): void
    {
        $envFile = ROOT_DIR . '/.env';
        if (!is_file($envFile)) {
            return;
        }
        
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }
        
        foreach ($lines as $line) {
            $line = trim($line);
            // Пропускаем пустые строки и комментарии
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $value = trim($parts[1]);
                putenv($key . '=' . $value);
            }
        }
    }

    private static function loadConfig(): void
    {
        $configPath = CONTROLLER_DIR . '/config.php';
        if (!is_file($configPath)) {
            throw new RuntimeException("Config not found: {$configPath}");
        }
        require_once $configPath;
    }

    private static function ensureDirs(): void
    {
        if (!is_dir(CACHE_DIR)) {
            mkdir(CACHE_DIR, 0755, true);
        }
    }

    private static function registerAutoload(): void
    {
        spl_autoload_register(static function (string $class): void {
            $file = CONTROLLER_DIR . '/' . $class . '.php';
            if (is_file($file)) {
                require_once $file;
            }
        });
    }
}