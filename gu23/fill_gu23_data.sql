-- fill_gu23_data.sql — заполнение справочников ГУ-23.
-- БЕЗОПАСНО: таблицы не дропаются; акты/строки/файлы/история НЕ трогаются.
-- Идемпотентно: справочники очищаются и заливаются заново (без дублей).
-- Запускать как скрипт под нужной схемой (локально — XX_ETW),
-- после того как таблицы уже созданы (install_gu23_all.sql / install_gu23.sql).
   SET DEFINE OFF

-- очистка справочников перед повторным наполнением (FK на акты нет — безопасно)
delete from xx_disl_gu23_ref_reason;
delete from xx_disl_gu23_ref_cex;


-- цеха
insert into xx_disl_gu23_ref_cex (
   id,
   code,
   name
) values ( xx_disl_gu23_ref_cex_seq.nextval,
           'ЖДЦ',
           'Железнодорожный цех' );
insert into xx_disl_gu23_ref_cex (
   id,
   code,
   name
) values ( xx_disl_gu23_ref_cex_seq.nextval,
           'АКМ',
           'АКМ' );

-- причины
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Простой под выгрузкой' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Простой под погрузкой' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Неприём вагонов станцией' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Ожидание подачи/уборки' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Неудовлетворительное состояние вагона' );

commit;