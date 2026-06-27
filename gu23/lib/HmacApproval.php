<?php
/**
 * HmacApproval — генерация и проверка HMAC-ссылок для согласования.
 */
class HmacApproval
{
    private string $secret;
    private int $ttl; // Срок действия ссылки на подписание

    public function __construct(string $secret, int $ttlDays = 1)
    {
        $this->secret = $secret;
        $this->ttl = $ttlDays * 86400; // Срок действия ссылки на подписание
    }

    /**
     * Сгенерировать ссылку для согласования.
     */
    public function generate(int $actId, int $approverId, string $action = 'approve'): string
    {
        $ts = time();
        $sig = $this->sign($actId, $approverId, $action, $ts);

        // Формируем штатными средствами массив в URL-кодированную строку запроса
        $params = http_build_query([
            'act' => $actId,
            'uid' => $approverId,
            'action' => $action,
            'ts' => $ts,
            'sig' => $sig,
        ]);

        return "https://system.company.local/approve?{$params}";
    }

    /**
     * Проверить параметры ссылки.
     * Возвращает ['ok' => bool, 'msg' => string, 'act_id' => int, 'approver_id' => int, 'action' => string].
     */
    public function verify(array $params): array
    {
        foreach (['act', 'uid', 'action', 'ts', 'sig'] as $key) {
            if (empty($params[$key])) {
                return ['ok' => false, 'msg' => 'Неверная ссылка: отсутствуют параметры'];
            }
        }

        // Проверяем TTL
        if (time() - (int) $params['ts'] > $this->ttl) {
            return ['ok' => false, 'msg' => 'Ссылка устарела'];
        }

        // Проверяем подпись
        $expected = $this->sign(
            (int) $params['act'],
            (int) $params['uid'],
            $params['action'],
            (int) $params['ts']
        );

        if (!hash_equals($expected, $params['sig'])) {
            return ['ok' => false, 'msg' => 'Недействительная подпись'];
        }

        return [
            'ok' => true,
            'act_id' => (int) $params['act'],
            'approver_id' => (int) $params['uid'],
            'action' => $params['action'],
            'msg' => '',
        ];
    }

    private function sign(int $actId, int $approverId, string $action, int $ts): string
    {
        // Генерируем хэш для конкретного человека на конкретное время (срок действия)
        return hash_hmac('sha256', "{$actId}|{$approverId}|{$action}|{$ts}", $this->secret);
    }
}
