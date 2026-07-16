<?php
/**
 * config.php — конфигурация модуля ГУ-23.
 */

return [
    // Режим рассылки писем согласования (определяется сервером, не клиентом):
    //   'send_mail' — реальная отправка через Oracle UTL_MAIL (прод)
    //   'send_file' — сохранять HTML письма в папку gu23/mail/ (для отладки)
    'mail_mode' => 'send_file',
    'mail_subject' => 'Дислокация. Уведомление "ГУ-23"',
    // Путь к исполняемому файлу LibreOffice (для конвертации Word в PDF):
    'soffice_path' => '/Users/ru.bekmansurov/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice',
    'base_url' => '',

];
