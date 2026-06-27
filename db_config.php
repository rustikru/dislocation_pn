<?php
    $user = 'xx_etw';
    $pwd = 'xx_etw';
    $host = '10.0.0.173'; // (HOST=10.0.0.173,) TEST-1, (HOST=10.0.0.172,) TEST-0
    $port = '51521';
    $serviceName = 'PROD';
    $db = '(DESCRIPTION =
                    (ADDRESS = (PROTOCOL = TCP)(HOST = '.$host.')(PORT = '.$port.'))
                    (CONNECT_DATA =
                      (SERVICE_NAME = '.$serviceName.')
                    )
              )';

// Секретный ключ для HMAC-ссылок согласования ГУ-23.
// Замените на длинную случайную строку (минимум 32 символа), например:
//   php -r "echo bin2hex(random_bytes(32));"
define('HMAC_SECRET', 'change-me-in-production');
	
