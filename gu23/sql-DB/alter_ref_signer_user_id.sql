-- Привязать подписанта из справочника к учётной записи xx_disl_users.
-- Если user_id IS NOT NULL — HMAC-ссылка будет отправлена ему на email.
alter table xx_disl_gu23_ref_signer add (user_id number);
comment on column xx_disl_gu23_ref_signer.user_id is 'ID пользователя xx_disl_users для отправки HMAC-ссылки согласования';
