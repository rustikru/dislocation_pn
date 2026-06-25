<?php
/**
 * Тест HMAC-ссылок согласования.
 * Запуск: php test/test_hmac.php
 */
require_once __DIR__ . '/HmacApproval.php';

$hmac = new HmacApproval('my-secret-key-change-in-prod', ttlDays: 7);

$pass = 0;
$fail = 0;

function check(string $desc, bool $condition, string $detail = ''): void
{
    global $pass, $fail;
    if ($condition) {
        $pass++;
        $status = "\033[32m PASS\033[0m";
    } else {
        $fail++;
        $status = "\033[31m FAIL\033[0m";
    }
    printf("%s [%-40s] %s\n", $status, $desc, $detail);
}

echo str_repeat('-', 65) . "\n";
echo "HMAC согласование тесты\n";
echo str_repeat('-', 65) . "\n";

// Тест 1: генерация + верификация
$url = $hmac->generate(actId: 42, approverId: 7, action: 'approve');
parse_str(parse_url($url, PHP_URL_QUERY), $params);
$r = $hmac->verify($params);
check('Свежая ссылка валидна', $r['ok'] === true, "act={$r['act_id']} uid={$r['approver_id']}");

// Тест 2: подпись изменена
$params['sig'] = 'tampered_signature';
$r = $hmac->verify($params);
check('Изменённая подпись отклоняется', $r['ok'] === false, $r['msg']);

// Тест 3: подмена act_id
parse_str(parse_url($hmac->generate(42, 7, 'approve'), PHP_URL_QUERY), $params);
$params['act'] = 99;
$r = $hmac->verify($params);
check('Подмена act_id отклоняется', $r['ok'] === false, $r['msg']);

// Тест 4: подмена uid
parse_str(parse_url($hmac->generate(42, 7, 'approve'), PHP_URL_QUERY), $params);
$params['uid'] = 999;
$r = $hmac->verify($params);
check('Подмена uid отклоняется', $r['ok'] === false, $r['msg']);

// Тест 5: устаревшая ссылка (ts в прошлом за пределами TTL)
parse_str(parse_url($hmac->generate(42, 7, 'approve'), PHP_URL_QUERY), $params);
$params['ts']  = time() - (8 * 86400); // 8 дней назад
$params['sig'] = (new ReflectionClass($hmac))
    ->getMethod('sign')
    ->invoke($hmac, 42, 7, 'approve', (int)$params['ts']);
$r = $hmac->verify($params);
check('Устаревшая ссылка отклоняется', $r['ok'] === false, $r['msg']);

// Тест 6: action=reject
$url = $hmac->generate(actId: 15, approverId: 3, action: 'reject');
parse_str(parse_url($url, PHP_URL_QUERY), $params);
$r = $hmac->verify($params);
check('Ссылка на отклонение валидна', $r['ok'] && $r['action'] === 'reject', "action={$r['action']}");

// Тест 7: отсутствуют параметры
$r = $hmac->verify(['act' => 1]);
check('Неполные параметры отклоняются', $r['ok'] === false, $r['msg']);

echo str_repeat('-', 65) . "\n";
echo "Итог: {$pass} passed, {$fail} failed\n";
echo str_repeat('-', 65) . "\n";

// Показываем пример сгенерированной ссылки
echo "\nПример ссылки:\n";
echo $hmac->generate(42, 7, 'approve') . "\n\n";
