<?php
/**
 * config.php — конфигурация модуля ГУ-23.
 */

return [
    // Режим рассылки писем согласования:
    //   'send_mail' — реальная отправка через Oracle
    //   'send_file' — сохранять HTML письма в папку gu23/mail/ (для отладки)
    'mail_mode' => 'send_file',
];
