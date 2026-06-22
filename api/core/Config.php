<?php

return [
    'cors' => [
        'origin' => '*',
        'methods' => 'GET, POST, PUT, DELETE, OPTIONS',
        'headers' => 'Content-Type'
    ],
    'logging' => [
       'enabled'    => false,    // вкл или откл логирование
       'error_log'  => true,    // для ошибок
       'info_log'   => true    // для общего лога 
    ]
];
