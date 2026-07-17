<?php
/**
 * Gu23Logger
 *
 *  gu23/log/gu23-YYYY-MM-DD.log
 * 
 * ERROR, WARN, INFO, DEBUG
 */
class Gu23Logger
{
    private static string $logDir = '';

    private static function dir(): string
    {
        if (self::$logDir === '') {
            self::$logDir = dirname(__DIR__) . '/log';
            if (!is_dir(self::$logDir)) {
                @mkdir(self::$logDir, 0755, true);
            }
        }
        return self::$logDir;
    }

    private static function write(string $level, string $message, array $details = []): void
    {
        $dir = self::dir();

        $file = $dir . '/gu23-' . date('Y-m-d') . '.log';
        $ts = date('Y-m-d H:i:s');
        $user = $_SESSION['login'] ?? '-';
        $ip = $_SERVER['REMOTE_ADDR'] ?? '-';
        $uri = $_SERVER['REQUEST_URI'] ?? '-';

        $line = "[{$ts}] [{$level}] user={$user} ip={$ip} uri={$uri} | {$message}";

        if (!empty($details)) {
            $line .= ' | ' . json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $written = false;
        if (is_dir($dir)) {
            $written = @file_put_contents($file, $line . PHP_EOL, FILE_APPEND | LOCK_EX) !== false;
        }
        if (!$written) {
            error_log('[GU23] ' . $line);
        }
    }

    public static function error(string $message, array $details = []): void
    {
        self::write('ERROR', $message, $details);
    }

    public static function warn(string $message, array $details = []): void
    {
        self::write('WARN', $message, $details);
    }

    public static function info(string $message, array $details = []): void
    {
        self::write('INFO', $message, $details);
    }

    public static function debug(string $message, array $details = []): void
    {
        self::write('DEBUG', $message, $details);
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
        $traceRows = [];
        foreach ($e->getTrace() as $rowNumber => $traceRow) {
            if ($rowNumber >= 5)
                break;
            $place = ($traceRow['file'] ?? '') . ':' . ($traceRow['line'] ?? '');
            $funcName = ($traceRow['class'] ?? '') . ($traceRow['type'] ?? '') . ($traceRow['function'] ?? '');
            $traceRows[] = "{$place} {$funcName}()";
        }
        return $traceRows;
    }

    /** $_POST. */
    private static function safePost(): array
    {
        $hiddenFields = ['password', 'pwd', 'token', 'token_sig', 'secret'];
        $postValues = [];
        foreach ($_POST as $field => $value) {
            $postValues[$field] = in_array(strtolower($field), $hiddenFields, true)
                ? '***'
                : (is_string($value) ? self::shortText($value, 200) : $value);
        }
        return $postValues;
    }

    private static function shortText(string $value, int $length): string
    {
        if (function_exists('mb_substr')) {
            return mb_substr($value, 0, $length);
        }
        return substr($value, 0, $length);
    }
}
