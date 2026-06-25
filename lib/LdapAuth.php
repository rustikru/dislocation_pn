<?php
/**
 * LdapAuth — проверка пароля пользователя через LDAP re-bind.
 * Используется при подписании акта (ПЭП).
 */
class LdapAuth
{
    private array $cfg;

    public function __construct(array $cfg)
    {
        $this->cfg = $cfg;
    }

    /**
     * Проверить логин/пароль пользователя.
     * Возвращает массив ['ok' => bool, 'name' => string, 'mail' => string, 'msg' => string].
     */
    public function verify(string $uid, string $password): array
    {
        if (trim($uid) === '' || trim($password) === '') {
            return ['ok' => false, 'msg' => 'Логин и пароль обязательны'];
        }

        $host = rtrim($this->cfg['host'], '/') . ':' . ($this->cfg['port'] ?? 389);
        $ldap = ldap_connect($host);
        if (!$ldap) {
            return ['ok' => false, 'msg' => 'Не удалось подключиться к LDAP'];
        }

        ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
        ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);
        ldap_set_option($ldap, LDAP_OPT_NETWORK_TIMEOUT, 3);

        // Bind от имени admin-а чтобы найти DN пользователя
        if (!@ldap_bind($ldap, $this->cfg['admin_dn'], $this->cfg['admin_pw'])) {
            return ['ok' => false, 'msg' => 'Ошибка подключения к LDAP (admin bind)'];
        }

        $search = ldap_search(
            $ldap,
            $this->cfg['base_dn'],
            "(uid={$uid})",
            ['dn', 'cn', 'mail']
        );

        if (!$search) {
            return ['ok' => false, 'msg' => 'Ошибка поиска в LDAP'];
        }

        $entries = ldap_get_entries($ldap, $search);

        if ($entries['count'] === 0) {
            return ['ok' => false, 'msg' => 'Пользователь не найден'];
        }

        $userDn   = $entries[0]['dn'];
        $fullName = $entries[0]['cn'][0]   ?? $uid;
        $mail     = $entries[0]['mail'][0] ?? '';

        // Re-bind под пользователем — это и есть проверка пароля (ПЭП)
        if (!@ldap_bind($ldap, $userDn, $password)) {
            return ['ok' => false, 'msg' => 'Неверный пароль'];
        }

        ldap_unbind($ldap);

        return [
            'ok'   => true,
            'dn'   => $userDn,
            'name' => $fullName,
            'mail' => $mail,
            'msg'  => '',
        ];
    }
}
