<?php
/**
 * Конфиг LDAP для тестовой среды (локальный Docker OpenLDAP).
 * В проде заменить на параметры реального AD.
 */
return [
    'host'     => 'ldap://127.0.0.1',
    'port'     => 389,
    'base_dn'  => 'ou=users,dc=company,dc=local',
    'admin_dn' => 'cn=admin,dc=company,dc=local',
    'admin_pw' => 'admin123',

    // В реальном AD:
    // 'host'    => 'ldap://dc.company.local',
    // 'base_dn' => 'ou=Users,dc=company,dc=local',
    // Bind пользователя: 'COMPANY\login' или 'login@company.local'
];
