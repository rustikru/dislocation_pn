<?php
/**
 * Минимальная LDAP/AD-проверка логина и пароля.
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
            'debug' => false, // add 08.07.2026 Bekmansurovrr
            'log_file' => '/tmp/ldap_debug.log', // add 08.07.2026 Bekmansurovrr
        ), $cfg);
    }

    /**
     * Проверить логин/пароль.
     * Возвращает ['ok' => bool, 'dn' => string, 'name' => string, 'mail' => string, 'msg' => string].
     */
    public function verify($login, $password)
    {
        $login = trim((string) $login);
        $password = (string) $password;

        if (empty($this->cfg['enabled'])) {
            $this->log('LDAP disabled'); // add 08.07.2026 Bekmansurovrr
            return $this->fail('LDAP отключен');
        }

        if ($login === '' || $password === '') {
            $this->log('Empty login or password'); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Логин и пароль обязательны');
        }

        if (!function_exists('ldap_connect')) {
            $this->log('PHP LDAP extension not installed'); // add 08.07.2026 Bekmansurovrr
            return $this->fail('PHP LDAP extension не установлен');
        }

        $ldap = $this->connect();
        if (!$ldap) {
            $this->log('LDAP connect failed'); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Не удалось подключиться к LDAP');
        }

        if (!$this->hasSearchBind()) {
            foreach ($this->bindNames($login) as $bindName) {
                $this->log('Trying user bind: ' . $bindName); // add 08.07.2026 Bekmansurovrr
                if (@ldap_bind($ldap, $bindName, $password)) {
                    $this->log('User bind success: ' . $bindName); // add 08.07.2026 Bekmansurovrr
                    $user = $this->findBoundUser($ldap, $login); // add 08.07.2026 Bekmansurovrr
                    ldap_unbind($ldap);

                    return array(
                        'ok' => true,
                        'dn' => !empty($user['dn']) ? $user['dn'] : $bindName,
                        'name' => !empty($user['name']) ? $user['name'] : $login,
                        'mail' => !empty($user['mail']) ? $user['mail'] : '',
                        'msg' => '',
                    );
                }
            }

            ldap_unbind($ldap);
            $this->log('User bind failed for login: ' . $login); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Неверный пароль или не настроен способ LDAP bind');
        }

        $user = $this->findUser($ldap, $login);
        if (!$user['ok']) {
            ldap_unbind($ldap);
            return $user;
        }

        if (!@ldap_bind($ldap, $user['dn'], $password)) {
            ldap_unbind($ldap);
            $this->log('Re-bind failed for DN: ' . $user['dn']); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Неверный пароль');
        }

        ldap_unbind($ldap);
        $this->log('LDAP verify success for login: ' . $login); // add 08.07.2026 Bekmansurovrr

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
            $this->log('Connecting to LDAP host: ' . $host); // add 08.07.2026 Bekmansurovrr
            $ldap = @ldap_connect($host);
            if (!$ldap) {
                $this->log('ldap_connect returned false: ' . $host); // add 08.07.2026 Bekmansurovrr
                continue;
            }

            ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);
            ldap_set_option($ldap, LDAP_OPT_NETWORK_TIMEOUT, (int) $this->cfg['network_timeout']);

            if (!empty($this->cfg['start_tls']) && !@ldap_start_tls($ldap)) {
                $this->log('ldap_start_tls failed: ' . $host); // add 08.07.2026 Bekmansurovrr
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
            $this->log('Service bind failed: ' . $bindDn); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Ошибка подключения к LDAP');
        }

        if (trim($this->cfg['base_dn']) === '') {
            $this->log('LDAP base_dn is empty'); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Не указан base_dn для поиска LDAP-пользователя');
        }

        $filter = str_replace(
            array('{login}', '{login_escaped}'),
            array($this->escapeFilter($login), $this->escapeFilter($login)),
            $this->cfg['user_filter']
        );

        $search = @ldap_search($ldap, $this->cfg['base_dn'], $filter, $this->cfg['attributes']);
        if (!$search) {
            $this->log('LDAP search failed. base_dn=' . $this->cfg['base_dn'] . ' filter=' . $filter); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Ошибка поиска в LDAP');
        }

        $entries = ldap_get_entries($ldap, $search);
        if (empty($entries['count'])) {
            $this->log('LDAP user not found. filter=' . $filter); // add 08.07.2026 Bekmansurovrr
            return $this->fail('Пользователь не найден в LDAP');
        }

        $this->log('LDAP user found. dn=' . $entries[0]['dn']); // add 08.07.2026 Bekmansurovrr

        return array(
            'ok' => true,
            'dn' => $entries[0]['dn'],
            'name' => $this->entryValue($entries[0], 'displayname', $this->entryValue($entries[0], 'cn', $login)),
            'mail' => $this->entryValue($entries[0], 'mail', ''),
            'msg' => '',
        );
    }

    // add 08.07.2026 Bekmansurovrr
    private function findBoundUser($ldap, $login)
    {
        if (trim($this->cfg['base_dn']) === '') {
            $this->log('Skip bound user search: base_dn is empty');
            return array('ok' => false);
        }

        $filter = str_replace(
            array('{login}', '{login_escaped}'),
            array($this->escapeFilter($login), $this->escapeFilter($login)),
            $this->cfg['user_filter']
        );

        $search = @ldap_search($ldap, $this->cfg['base_dn'], $filter, $this->cfg['attributes']);
        if (!$search) {
            $this->log('Bound user search failed. base_dn=' . $this->cfg['base_dn'] . ' filter=' . $filter);
            return array('ok' => false);
        }

        $entries = ldap_get_entries($ldap, $search);
        if (empty($entries['count'])) {
            $this->log('Bound user search returned 0 rows. filter=' . $filter);
            return array('ok' => false);
        }

        $this->log('Bound user found. dn=' . $entries[0]['dn']);

        return array(
            'ok' => true,
            'dn' => $entries[0]['dn'],
            'name' => $this->entryValue($entries[0], 'displayname', $this->entryValue($entries[0], 'cn', $login)),
            'mail' => $this->entryValue($entries[0], 'mail', ''),
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
            $host = trim((string) $host);
            if ($host === '') {
                continue;
            }

            if (strpos($host, 'ldap://') !== 0 && strpos($host, 'ldaps://') !== 0) {
                $host = (!empty($this->cfg['use_ssl']) ? 'ldaps://' : 'ldap://') . $host;
            }

            if (!preg_match('/:[0-9]+$/', $host)) {
                $host .= ':' . (int) $this->cfg['port'];
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
            $format = trim((string) $format);
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

    // add 08.07.2026 Bekmansurovrr
    private function log($message)
    {
        if (empty($this->cfg['debug'])) {
            return;
        }

        $file = !empty($this->cfg['log_file']) ? $this->cfg['log_file'] : '/tmp/ldap_debug.log';
        @file_put_contents($file, '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL, FILE_APPEND);
    }
}
