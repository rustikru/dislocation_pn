-- ============================================================
-- Полномочия модуля ГУ-23
-- ============================================================

-- 1. Коды полномочий
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('CREATE_ACT',    'Создавать акты');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('EDIT_OWN_ACT',  'Редактировать черновики своих актов');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('SEND_APPROVAL', 'Отправлять акт на подписание');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('SIGN_ACT',      'Подписывать / отклонять акт');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('VIEW_ALL_ACTS', 'Просматривать весь архив без фильтра по цеху');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('MANAGE_REFS',   'Управлять справочниками');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('MANAGE_ROLES',  'Управлять ролями пользователей');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('CLOSE_ACT',     'Принудительно закрывать акт');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('DELETE_ACT',    'Удалять акты');
INSERT INTO xx_disl_gu23_permissions (perm_code, description) VALUES ('ANNUL_ACT',     'Аннулировать акты');
COMMIT;

-- ============================================================
-- 2. Матрица роль → полномочие
-- ============================================================

-- GU23_ADMIN — все полномочия
INSERT INTO xx_disl_gu23_role_permissions (role_id, perm_id)
   SELECT r.role_id, p.perm_id
     FROM xx_disl_gu23_roles r
          CROSS JOIN xx_disl_gu23_permissions p
    WHERE r.role_code = 'GU23_ADMIN';

-- GU23_USER — создание, редактирование, отправка на подписание
INSERT INTO xx_disl_gu23_role_permissions (role_id, perm_id)
   SELECT r.role_id, p.perm_id
     FROM xx_disl_gu23_roles r
          JOIN xx_disl_gu23_permissions p
            ON p.perm_code IN ('CREATE_ACT', 'EDIT_OWN_ACT', 'SEND_APPROVAL')
    WHERE r.role_code = 'GU23_USER';

-- GU23_SIGNER — подписание / отклонение
INSERT INTO xx_disl_gu23_role_permissions (role_id, perm_id)
   SELECT r.role_id, p.perm_id
     FROM xx_disl_gu23_roles r
          JOIN xx_disl_gu23_permissions p ON p.perm_code = 'SIGN_ACT'
    WHERE r.role_code = 'GU23_SIGNER';

-- GU23_VIEWER — только чтение всего архива
INSERT INTO xx_disl_gu23_role_permissions (role_id, perm_id)
   SELECT r.role_id, p.perm_id
     FROM xx_disl_gu23_roles r
          JOIN xx_disl_gu23_permissions p ON p.perm_code = 'VIEW_ALL_ACTS'
    WHERE r.role_code = 'GU23_VIEWER';

COMMIT;
