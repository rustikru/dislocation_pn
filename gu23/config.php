<?php
/**
 * config.php — конфигурация ГУ-23.
 */

return [
    // Режим рассылки писем согласования:
    //   'send_mail' — реальная отправка через Oracle
    //   'send_file' — для теста - сохранять HTML письма в папку gu23/mail/ 
    'mail_mode' => 'send_file',
];
