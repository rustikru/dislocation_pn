-- add 23.07.2026 BekmansurovRR
-- Избранное для уведомлений. Строка xx_disl_module_notif_read теперь может
-- существовать только ради отметки "избранное", поэтому read_at делаем
-- необязательным (null = не прочитано), а признак избранного храним в
-- отдельном поле is_favorite. Прочитанность определяется по read_at is not null.

-- Итоговая структура таблицы:
-- create table xx_disl_module_notif_read (
--    notification_id number not null,
--    user_id         number not null,
--    read_at         date,
--    is_favorite     varchar2(1) default 'N' not null,
--    constraint xx_disl_module_notif_read_pk primary key ( notification_id,
--                                                          user_id ),
--    constraint xx_disl_module_notif_read_fav_ck check ( is_favorite in ( 'Y',
--                                                                          'N' ) )
-- );

-- add 23.07.2026 BekmansurovRR
-- read_at больше не обязателен (избранное без прочтения)
alter table xx_disl_module_notif_read modify (
   read_at date null
);

-- add 23.07.2026 BekmansurovRR
-- признак "избранное" для пары (уведомление, пользователь)
alter table xx_disl_module_notif_read add (
   is_favorite varchar2(1) default 'N' not null
);

-- add 23.07.2026 BekmansurovRR
-- допустимые значения флага избранного
alter table xx_disl_module_notif_read
   add constraint xx_disl_module_notif_read_fav_ck
      check ( is_favorite in ( 'Y',
                               'N' ) );
