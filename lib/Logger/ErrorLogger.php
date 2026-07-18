<?php

class ErrorLogger
{
    private string $logDirectory;

    public function __construct(?string $logDirectory = null)
    {
        $this->logDirectory = $logDirectory ?? dirname(__DIR__, 2) . '/log';
    }

    public function error(string $action, string $message, int $code = 0, array $context = []): void
    {
        if (!$this->ensureLogDirectory()) {
            return;
        }

        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        $calledFrom = $trace[1]['file'] ?? 'unknown';

        $data = [
            'time' => date('Y-m-d H:i:s'),
            'level' => 'ERROR',
            'file' => $calledFrom,
            'action' => $action !== '' ? $action : 'unknown',
            'message' => $this->oneLine($message),
            'user_id' => $_SESSION['user_id'] ?? null,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        ];

        if ($code !== 0) {
            $data['code'] = $code;
        }

        foreach ($context as $key => $value) {
            $data[$key] = is_string($value) ? $this->oneLine($value) : $value;
        }

        $line = json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );
        if ($line !== false) {
            file_put_contents(
                $this->logDirectory . '/' . date('Y-m-d') . '.log',
                $line . PHP_EOL,
                FILE_APPEND | LOCK_EX
            );
        }
    }

    private function ensureLogDirectory(): bool
    {
        if (is_dir($this->logDirectory)) {
            return is_writable($this->logDirectory);
        }

        return @mkdir($this->logDirectory, 0750, true);
    }

    private function oneLine(string $value): string
    {
        return trim(str_replace(["\r", "\n"], ' ', $value));
    }
}
