<?php
/**
 * config.php — конфигурация модуля ГУ-23.
 */

return [
    // Путь к исполняемому файлу LibreOffice (для конвертации Word в PDF):
    'soffice_path' => '/Users/ru.bekmansurov/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice',
    'base_url' => '',

    // Создание, редактирование, переключение статуса и импорт причин.
    // Для быстрого включения достаточно заменить false на true.
    'reason_editing_enabled' => false,

];
