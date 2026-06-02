<?php

class DataCache
{
    /** @var string */
    private $file;
    /** @var int */
    private $ttl;

    public function __construct(string $file, int $ttl = 900)
    {
        $this->file = $file;
        $this->ttl = $ttl;
    }

    public function remember(callable $loader): array
    {
        try {
            // Попытка получить свежие данные
            $data = $loader();

            if (!empty($data)) {
                $this->write($data);
                return $data;
            }
        } catch (Exception $e) {

        }

        // Пытаемся отдать кэш, даже если он просрочен (stale cache)
        if (file_exists($this->file)) {
            return $this->read();
        }

        return [];
    }

    private function isValid(): bool
    {
        if (!file_exists($this->file)) {
            return false;
        }
        return (time() - filemtime($this->file)) < $this->ttl;
    }

    private function read(): array
    {
        if (!file_exists($this->file)) {
            return [];
        }
        return json_decode(file_get_contents($this->file), true) ?? [];
    }

    private function write(array $data): void
    {
        $dir = dirname($this->file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($this->file, json_encode($data, JSON_UNESCAPED_UNICODE));
    }
    //Удаляем файл
    public function flush(): void
    {
        if (file_exists($this->file)) {
            unlink($this->file);
        }
    }
}