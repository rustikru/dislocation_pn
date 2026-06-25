<?php
/**
 * Тест LDAP re-bind.
 * Запуск: php test/test_ldap.php
 */
require_once __DIR__ . '/LdapAuth.php';
$cfg  = require __DIR__ . '/ldap_config.php';
$auth = new LdapAuth($cfg);

$tests = [
    ['uid' => 'ivanov',  'pwd' => 'password123', 'expect' => true,  'desc' => 'верный пароль'],
    ['uid' => 'ivanov',  'pwd' => 'wrongpass',   'expect' => false, 'desc' => 'неверный пароль'],
    ['uid' => 'petrov',  'pwd' => 'qwerty456',   'expect' => true,  'desc' => 'второй пользователь'],
    ['uid' => 'sidorov', 'pwd' => 'anypass',     'expect' => false, 'desc' => 'несуществующий пользователь'],
    ['uid' => '',        'pwd' => '',             'expect' => false, 'desc' => 'пустые данные'],
];

$pass = 0;
$fail = 0;

echo str_repeat('-', 60) . "\n";
echo "LDAP re-bind тесты\n";
echo str_repeat('-', 60) . "\n";

foreach ($tests as $t) {
    $result = $auth->verify($t['uid'], $t['pwd']);
    $ok     = $result['ok'] === $t['expect'];

    if ($ok) {
        $pass++;
        $status = "\033[32m PASS\033[0m";
    } else {
        $fail++;
        $status = "\033[31m FAIL\033[0m";
    }

    printf(
        "%s [%-35s] ok=%-5s msg=%s\n",
        $status,
        $t['desc'],
        $result['ok'] ? 'true' : 'false',
        $result['ok'] ? "name={$result['name']}" : $result['msg']
    );
}

echo str_repeat('-', 60) . "\n";
echo "Итог: {$pass} passed, {$fail} failed\n";
echo str_repeat('-', 60) . "\n";
