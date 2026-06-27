<?php
/**
 * Gu23Logger
 *
 * Пишет в gu23/log/gu23-YYYY-MM-DD.log
 * 
 * Уровни: ERROR, WARN, INFO, DEBUG
 */
class Gu23Logger
{
    private static string $logDir = '';

    private static function dir(): string
    {
        if (self::$logDir === '') {
            self::$logDir = __DIR__ . '/log';
            if (!is_dir(self::$logDir)) {
                @mkdir(self::$logDir, 0755, true);
            }
        }
        return self::$logDir;
    }

    private static function write(string $level, string $message, array $context = []): void
    {
        $dir = self::dir();
        if (!is_dir($dir)) {
            return; //
        }

        $file = $dir . '/gu23-' . date('Y-m-d') . '.log';
        $ts = date('Y-m-d H:i:s');
        $user = $_SESSION['login'] ?? '-';
        $ip = $_SERVER['REMOTE_ADDR'] ?? '-';
        $uri = $_SERVER['REQUEST_URI'] ?? '-';

        $line = "[{$ts}] [{$level}] user={$user} ip={$ip} uri={$uri} | {$message}";

        if (!empty($context)) {
            $line .= ' | ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        @file_put_contents($file, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    public static function error(string $message, array $context = []): void
    {
        self::write('ERROR', $message, $context);
    }

    public static function warn(string $message, array $context = []): void
    {
        self::write('WARN', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    public static function debug(string $message, array $context = []): void
    {
        self::write('DEBUG', $message, $context);
    }

    /** Логировать исключение с трейсом. */
    public static function exception(\Throwable $e, string $action = ''): void
    {
        self::write('ERROR', get_class($e) . ': ' . $e->getMessage(), [
            'action' => $action,
            'file' => $e->getFile() . ':' . $e->getLine(),
            'trace' => self::shortTrace($e),
            'post' => self::safePost(),
        ]);
    }


    private static function shortTrace(\Throwable $e): array
    {
        $frames = [];
        foreach ($e->getTrace() as $i => $f) {
            if ($i >= 5)
                break;
            $loc = ($f['file'] ?? '') . ':' . ($f['line'] ?? '');
            $fn = ($f['class'] ?? '') . ($f['type'] ?? '') . ($f['function'] ?? '');
            $frames[] = "{$loc} {$fn}()";
        }
        return $frames;
    }

    /** $_POST. */
    private static function safePost(): array
    {
        $skip = ['password', 'pwd', 'token', 'token_sig', 'secret'];
        $out = [];
        foreach ($_POST as $k => $v) {
            $out[$k] = in_array(strtolower($k), $skip, true) ? '***' : (is_string($v) ? mb_substr($v, 0, 200) : $v);
        }
        return $out;
    }
}
