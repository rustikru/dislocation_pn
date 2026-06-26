-- Добавить поле IP адреса клиента в таблицу истории изменений актов
ALTER TABLE xx_disl_gu23_hist ADD (ip VARCHAR2(64));
