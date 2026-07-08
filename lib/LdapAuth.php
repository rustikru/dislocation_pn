<?php
/**
 * Минимальная LDAP/AD-проверка логина и пароля.
 *
 * Класс ничего не знает о сессиях и правах приложения: он только подтверждает
 * пароль в LDAP. Данные пользователя приложение по-прежнему берет из Oracle.
 */
class LdapAuth
{
    private $cfg;
    private $ldap;

    public function __construct(array $cfg)
    {
        $this->cfg = array_merge(array(
            'enabled' => false,
            'hosts' => array(),
            'host' => '',
            'port' => 389,
            'use_ssl' => false,
            'start_tls' => false,
            'network_timeout' => 3,
            'base_dn' => '',
            'bind_dn' => '',
            'bind_password' => '',
            'admin_dn' => '',
            'admin_pw' => '',
            'user_filter' => '(sAMAccountName={login})',
            'attributes' => array('dn', 'cn', 'mail', 'displayName'),
            'bind_format' => '',
            'bind_formats' => array(),
        ), $cfg);
    }

    /**
     * Проверить логин/пароль.
     * Возвращает ['ok' => bool, 'dn' => string, 'name' => string, 'mail' => string, 'msg' => string].
     */
    public function verify($login, $password)
    {
        $login = trim((string)$login);
        $password = (string)$password;

        if (empty($this->cfg['enabled'])) {
            return $this->fail('LDAP отключен');
        }

        if ($login === '' || $password === '') {
            return $this->fail('Логин и пароль обязательны');
        }

        if (!function_exists('ldap_connect')) {
            return $this->fail('PHP LDAP extension не установлен');
        }

        $ldap = $this->connect();
        if (!$ldap) {
            return $this->fail('Не удалось подключиться к LDAP');
        }

        if (!$this->hasSearchBind()) {
            foreach ($this->bindNames($login) as $bindName) {
                if (@ldap_bind($ldap, $bindName, $password)) {
                    ldap_unbind($ldap);

                    return array(
                        'ok' => true,
                        'dn' => $bindName,
                        'name' => $login,
                        'mail' => '',
                        'msg' => '',
                    );
                }
            }

            ldap_unbind($ldap);
            return $this->fail('Неверный пароль или не настроен способ LDAP bind');
        }

        $user = $this->findUser($ldap, $login);
        if (!$user['ok']) {
            ldap_unbind($ldap);
            return $user;
        }

        if (!@ldap_bind($ldap, $user['dn'], $password)) {
            ldap_unbind($ldap);
            return $this->fail('Неверный пароль');
        }

        ldap_unbind($ldap);

        return array(
            'ok' => true,
            'dn' => $user['dn'],
            'name' => $user['name'],
            'mail' => $user['mail'],
            'msg' => '',
        );
    }

    private function connect()
    {
        foreach ($this->hosts() as $host) {
            $ldap = @ldap_connect($host);
            if (!$ldap) {
                continue;
            }

            ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);
            ldap_set_option($ldap, LDAP_OPT_NETWORK_TIMEOUT, (int)$this->cfg['network_timeout']);

            if (!empty($this->cfg['start_tls']) && !@ldap_start_tls($ldap)) {
                ldap_unbind($ldap);
                continue;
            }

            $this->ldap = $ldap;
            return $ldap;
        }

        return false;
    }

    private function findUser($ldap, $login)
    {
        $bindDn = $this->cfg['bind_dn'] ?: $this->cfg['admin_dn'];
        $bindPassword = $this->cfg['bind_password'] ?: $this->cfg['admin_pw'];

        if (!@ldap_bind($ldap, $bindDn, $bindPassword)) {
            return $this->fail('Ошибка подключения к LDAP');
        }

        if (trim($this->cfg['base_dn']) === '') {
            return $this->fail('Не указан base_dn для поиска LDAP-пользователя');
        }

        $filter = str_replace(
            array('{login}', '{login_escaped}'),
            array($this->escapeFilter($login), $this->escapeFilter($login)),
            $this->cfg['user_filter']
        );

        $search = @ldap_search($ldap, $this->cfg['base_dn'], $filter, $this->cfg['attributes']);
        if (!$search) {
            return $this->fail('Ошибка поиска в LDAP');
        }

        $entries = ldap_get_entries($ldap, $search);
        if (empty($entries['count'])) {
            return $this->fail('Пользователь не найден в LDAP');
        }

        return array(
            'ok' => true,
            'dn' => $entries[0]['dn'],
            'name' => $this->entryValue($entries[0], 'displayname', $this->entryValue($entries[0], 'cn', $login)),
            'mail' => $this->entryValue($entries[0], 'mail', ''),
            'msg' => '',
        );
    }

    private function hosts()
    {
        $hosts = $this->cfg['hosts'];
        if (!is_array($hosts)) {
            $hosts = array($hosts);
        }

        if (!empty($this->cfg['host'])) {
            array_unshift($hosts, $this->cfg['host']);
        }

        $result = array();
        foreach ($hosts as $host) {
            $host = trim((string)$host);
            if ($host === '') {
                continue;
            }

            if (strpos($host, 'ldap://') !== 0 && strpos($host, 'ldaps://') !== 0) {
                $host = (!empty($this->cfg['use_ssl']) ? 'ldaps://' : 'ldap://') . $host;
            }

            if (!preg_match('/:[0-9]+$/', $host)) {
                $host .= ':' . (int)$this->cfg['port'];
            }

            $result[] = $host;
        }

        return array_unique($result);
    }

    private function hasSearchBind()
    {
        return ($this->cfg['bind_dn'] !== '' && $this->cfg['bind_password'] !== '')
            || ($this->cfg['admin_dn'] !== '' && $this->cfg['admin_pw'] !== '');
    }

    private function bindNames($login)
    {
        $formats = $this->cfg['bind_formats'];
        if (!is_array($formats)) {
            $formats = array($formats);
        }

        if ($this->cfg['bind_format'] !== '') {
            array_unshift($formats, $this->cfg['bind_format']);
        }

        $result = array();
        foreach ($formats as $format) {
            $format = trim((string)$format);
            if ($format !== '') {
                $result[] = str_replace('{login}', $login, $format);
            }
        }

        return array_unique($result);
    }

    private function entryValue($entry, $key, $default)
    {
        return isset($entry[$key][0]) ? $entry[$key][0] : $default;
    }

    private function escapeFilter($value)
    {
        if (function_exists('ldap_escape')) {
            return ldap_escape($value, '', LDAP_ESCAPE_FILTER);
        }

        return str_replace(
            array('\\', '*', '(', ')', "\x00"),
            array('\\5c', '\\2a', '\\28', '\\29', '\\00'),
            $value
        );
    }

    private function fail($message)
    {
        return array('ok' => false, 'msg' => $message, 'dn' => '', 'name' => '', 'mail' => '');
    }
}
