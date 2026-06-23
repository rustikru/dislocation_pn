-- install_gu23_all.sql — ТОЛЬКО обычные объекты ГУ-23
-- (drop + таблицы, последовательности, представление).
<<<<<<< HEAD
-- Пакет ставится отдельно:   compile_gu23_pkg.sql
=======
-- Пакет ставится отдельно:   XX_DISL_GU23_PKG.pks (спецификация) + XX_DISL_GU23_PKG.pkb (тело)
>>>>>>> claude/upbeat-archimedes-coto9e
-- Справочники/данные:         fill_gu23_data.sql
-- Запускать как скрипт под нужной схемой (локально — XX_ETW).

-- ---- безопасный сброс старых объектов (ошибки игнорируются) ----
<<<<<<< HEAD
BEGIN
  FOR x IN (
    SELECT 'DROP TABLE '||t||' CASCADE CONSTRAINTS PURGE' ddl FROM (
      SELECT column_value t FROM TABLE(sys.odcivarchar2list(
        'XX_DISL_GU23_HIST','XX_DISL_GU23_SIGNER','XX_DISL_GU23_FILE',
        'XX_DISL_GU23_ACT_ROW','XX_DISL_GU23_ACT','XX_DISL_GU23_COUNTER',
        'XX_DISL_GU23_REF_SIGNER','XX_DISL_GU23_REF_WAGON_KIND','XX_DISL_GU23_REF_OWNER',
        'XX_DISL_GU23_REF_STATION','XX_DISL_GU23_REF_REASON','XX_DISL_GU23_REF_CEX',
        'XX_DISL_GU23_USERS'))
    )
    UNION ALL
    SELECT 'DROP SEQUENCE '||s FROM (
      SELECT column_value s FROM TABLE(sys.odcivarchar2list(
        'XX_DISL_GU23_HIST_SEQ','XX_DISL_GU23_SIGNER_SEQ','XX_DISL_GU23_FILE_SEQ',
        'XX_DISL_GU23_ACT_ROW_SEQ','XX_DISL_GU23_ACT_SEQ','XX_DISL_GU23_COUNTER_SEQ','XX_DISL_GU23_REF_SIGNER_SEQ',
        'XX_DISL_GU23_REF_WAGON_KIND_SEQ','XX_DISL_GU23_REF_OWNER_SEQ','XX_DISL_GU23_REF_STATION_SEQ',
        'XX_DISL_GU23_REF_REASON_SEQ','XX_DISL_GU23_REF_CEX_SEQ','XX_DISL_GU23_USERS_SEQ'))
    )
    UNION ALL
    -- удаляем устаревшие SQL-объектные типы (заменены на RECORD внутри пакета)
    SELECT 'DROP TYPE '||tp||' FORCE' FROM (
      SELECT column_value tp FROM TABLE(sys.odcivarchar2list(
        'XX_DISL_GU23_WAGON_TAB','XX_DISL_GU23_WAGON_OBJ',
        'XX_DISL_GU23_HIST_TAB','XX_DISL_GU23_HIST_OBJ',
        'XX_DISL_GU23_FILE_TAB','XX_DISL_GU23_FILE_OBJ',
        'XX_DISL_GU23_ROW_TAB','XX_DISL_GU23_ROW_OBJ',
        'XX_DISL_GU23_ACT_TAB','XX_DISL_GU23_ACT_OBJ',
        'XX_DISL_GU23_SIGNER_TAB','XX_DISL_GU23_SIGNER_OBJ',
        'XX_DISL_GU23_REF_TAB','XX_DISL_GU23_REF_OBJ'))
    )
  ) LOOP
    BEGIN EXECUTE IMMEDIATE x.ddl; EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END;
=======
begin
   for x in (
      select 'DROP TABLE '
             || t
             || ' CASCADE CONSTRAINTS PURGE' ddl
        from (
         select column_value t
           from table ( sys.odcivarchar2list(
            'XX_DISL_GU23_HIST',
            'XX_DISL_GU23_SIGNER',
            'XX_DISL_GU23_FILE',
            'XX_DISL_GU23_ACT_ROW',
            'XX_DISL_GU23_ACT',
            'XX_DISL_GU23_COUNTER',
            'XX_DISL_GU23_REF_STATION',
            'XX_DISL_GU23_REF_REASON',
            'XX_DISL_GU23_REF_CEX'
         ) )
      )
      union all
      select 'DROP SEQUENCE ' || s
        from (
         select column_value s
           from table ( sys.odcivarchar2list(
            'XX_DISL_GU23_HIST_SEQ',
            'XX_DISL_GU23_SIGNER_SEQ',
            'XX_DISL_GU23_FILE_SEQ',
            'XX_DISL_GU23_ACT_ROW_SEQ',
            'XX_DISL_GU23_ACT_SEQ',
            'XX_DISL_GU23_COUNTER_SEQ',
            'XX_DISL_GU23_REF_REASON_SEQ',
            'XX_DISL_GU23_REF_CEX_SEQ'
         ) )
      )
   ) loop
      begin
         execute immediate x.ddl;
      exception
         when others then
            null;
      end;
   end loop;
end;
>>>>>>> claude/upbeat-archimedes-coto9e
/

create table xx_disl_gu23_ref_cex (
   id     number primary key,
   code   varchar2(32) not null,
   name   varchar2(256) not null,
   active char(1) default 'Y'
);
create sequence xx_disl_gu23_ref_cex_seq start with 1 increment by 1 nocache;

create table xx_disl_gu23_ref_reason (
   id       number primary key,
   name     varchar2(512) not null,
   act_kind varchar2(16) default 'any',   -- start/end/other/any
   active   char(1) default 'Y'
);
create sequence xx_disl_gu23_ref_reason_seq start with 1 increment by 1 nocache;

create table xx_disl_gu23_counter (
   id     number primary key,
   cex_id number not null,
   yr     number not null,
   cnt    number default 0,
   constraint xx_disl_gu23_counter_uk unique ( cex_id,
                                               yr ),
   constraint xx_disl_gu23_counter_fk foreign key ( cex_id )
      references xx_disl_gu23_ref_cex ( id )
         on delete cascade
);
create sequence xx_disl_gu23_counter_seq start with 1 increment by 1 nocache;

create table xx_disl_gu23_act (
   id              number primary key,
   act_number      varchar2(64),
   act_type        varchar2(16) not null,    -- start / end / other
   status          varchar2(16) not null,    -- draft / active / closed / annulled
   cex_id          number,                   -- ID цеха -> xx_disl_gu23_ref_cex.id
   station_id      varchar2(50),                   -- ID ст. составления -> xx_disl_stations (STATION_ID)
   st_from_id      varchar2(50),                   -- code ст. отправления -> xx_etw_station_bi_v (code)
   st_to_id        varchar2(50),                   -- code ст. назначения -> xx_etw_station_bi_v (code)
   cargo_ref       varchar2(256),            -- груз (из справочника)
   reason          varchar2(512),
   circumstances   varchar2(4000),
   start_at        date,
   end_at          date,
   dur_days        number,
   dur_hours       number,
   dur_total_h     number,
   cal_days        number,
   linked_start_id number,
   annul_reason    varchar2(1000),
   created_at      date,
   created_by      number,
   modified_at     date,
   modified_by     number
);
create sequence xx_disl_gu23_act_seq start with 1 increment by 1 nocache;

create table xx_disl_gu23_act_row (
   id       number primary key,
   act_id   number not null,
   wagon_no varchar2(16) not null,
   owner    varchar2(128),
   kind     varchar2(128),
   st_from  varchar2(128),
   st_to    varchar2(128),
   cargo    varchar2(256),
   weight   varchar2(32),
   constraint xx_disl_gu23_row_fk foreign key ( act_id )
      references xx_disl_gu23_act ( id )
         on delete cascade
);
create sequence xx_disl_gu23_act_row_seq start with 1 increment by 1 nocache;
create index xx_disl_gu23_row_act_i on
   xx_disl_gu23_act_row (
      act_id
   );
create index xx_disl_gu23_row_wgn_i on
   xx_disl_gu23_act_row (
      wagon_no
   );

create table xx_disl_gu23_file (
   id         number primary key,
   act_id     number not null,
   file_name  varchar2(512),   -- оригинальное имя
   file_ext   varchar2(32),    -- расширение
   mime_type  varchar2(128),
   real_path  varchar2(1024),  -- физический путь (имя на диске = id)
   created_at date,
   created_by number,
   constraint xx_disl_gu23_file_fk foreign key ( act_id )
      references xx_disl_gu23_act ( id )
         on delete cascade
);
create sequence xx_disl_gu23_file_seq start with 1 increment by 1 nocache;
create index xx_disl_gu23_file_act_i on
   xx_disl_gu23_file (
      act_id
   );

create table xx_disl_gu23_signer (
   id            number primary key,
   act_id        number not null,
   signer_ref_id number,                -- ref ID из справочника подписантов (для предвыбора при правке)
   fio           varchar2(256),
   post          varchar2(256),
   org           varchar2(256),
   ord_no        number,
   constraint xx_disl_gu23_signer_fk foreign key ( act_id )
      references xx_disl_gu23_act ( id )
         on delete cascade
);
create sequence xx_disl_gu23_signer_seq start with 1 increment by 1 nocache;
create index xx_disl_gu23_signer_act_i on
   xx_disl_gu23_signer (
      act_id
   );

create table xx_disl_gu23_hist (
   id     number primary key,
   act_id number not null,
   ts     date,
   usr    number,
   txt    varchar2(1000),
   constraint xx_disl_gu23_hist_fk foreign key ( act_id )
      references xx_disl_gu23_act ( id )
         on delete cascade
);
create sequence xx_disl_gu23_hist_seq start with 1 increment by 1 nocache;
create index xx_disl_gu23_hist_act_i on
   xx_disl_gu23_hist (
      act_id
   );

-- Все вычисляемые поля (номер связанного акта, кол-во вагонов/файлов) собраны
-- здесь один раз. Пакет читает акты только через это представление.
<<<<<<< HEAD
CREATE OR REPLACE VIEW xx_disl_gu23_act_v AS
SELECT a.id, a.act_number, a.act_type, a.status, a.cex_code, a.station,
       a.reason, a.circumstances, a.start_at, a.end_at,
       a.dur_days, a.dur_hours, a.dur_total_h, a.cal_days,
       a.linked_start_id,
       (SELECT s.act_number FROM xx_disl_gu23_act s WHERE s.id = a.linked_start_id) AS linked_start_number,
       (SELECT COUNT(*) FROM xx_disl_gu23_act_row r WHERE r.act_id = a.id)           AS wagon_cnt,
       (SELECT COUNT(*) FROM xx_disl_gu23_file  f WHERE f.act_id = a.id)             AS file_cnt,
       a.annul_reason, a.created_at, a.created_by, a.modified_at, a.modified_by
  FROM xx_disl_gu23_act a;
=======
create or replace force editionable view "XX_ETW"."XX_DISL_GU23_ACT_V" (
   "ID",
   "ACT_NUMBER",
   "ACT_TYPE",
   "STATUS",
   "CEX_ID",
   "CEX_CODE",
   "CEX_NAME",
   "STATION_ID",
   "STATION",
   "ST_FROM_ID",
   "ST_FROM",
   "ST_TO_ID",
   "ST_TO",
   "CARGO_REF",
   "REASON",
   "CIRCUMSTANCES",
   "START_AT",
   "END_AT",
   "DUR_DAYS",
   "DUR_HOURS",
   "DUR_TOTAL_H",
   "CAL_DAYS",
   "LINKED_START_ID",
   "LINKED_START_NUMBER",
   "WAGON_CNT",
   "FILE_CNT",
   "ANNUL_REASON",
   "CREATED_AT",
   "CREATED_BY",
   "MODIFIED_AT",
   "MODIFIED_BY"
) as
   select a.id,
          a.act_number,
          a.act_type,
          a.status,
          a.cex_id,
          rc.code as cex_code,
          rc.name as cex_name,
          a.station_id,
          ss.name as station,
          a.st_from_id,
          ssf.st_name as st_from,
          a.st_to_id,
          sst.st_name as st_to,
          a.cargo_ref,
          a.reason,
          a.circumstances,
          a.start_at,
          a.end_at,
          a.dur_days,
          a.dur_hours,
          a.dur_total_h,
          a.cal_days,
          a.linked_start_id,
          (
             select la.act_number
               from xx_disl_gu23_act la
              where la.id = a.linked_start_id
          ) as linked_start_number,
          (
             select count(*)
               from xx_disl_gu23_act_row r
              where r.act_id = a.id
          ) as wagon_cnt,
          (
             select count(*)
               from xx_disl_gu23_file f
              where f.act_id = a.id
          ) as file_cnt,
          a.annul_reason,
          a.created_at,
          a.created_by,
          a.modified_at,
          a.modified_by
     from xx_disl_gu23_act a
     left join xx_disl_gu23_ref_cex rc
   on rc.id = a.cex_id
     left join xx_disl_stations ss
   on to_char(ss.station_id) = a.station_id
     left join xx_etw_station_bi_v ssf
   on ssf.st_code = a.st_from_id
     left join xx_etw_station_bi_v sst
   on sst.st_code = a.st_to_id;
>>>>>>> claude/upbeat-archimedes-coto9e

-- =====================================================================
--  КОММЕНТАРИИ К ТАБЛИЦАМ И ПОЛЯМ
-- =====================================================================

-- пользователи (локальный аналог справочника пользователей)
comment on table xx_disl_gu23_users is
   'Пользователи модуля ГУ-23 (id, логин, ФИО)';
comment on column xx_disl_gu23_users.user_id is
   'ID пользователя (первичный ключ)';
comment on column xx_disl_gu23_users.login is
   'Логин';
comment on column xx_disl_gu23_users.full_name is
   'ФИО';

-- справочник: цеха
comment on table xx_disl_gu23_ref_cex is
   'Справочник цехов';
comment on column xx_disl_gu23_ref_cex.id is
   'ID цеха (первичный ключ)';
comment on column xx_disl_gu23_ref_cex.code is
   'Код цеха (входит в номер акта, напр. ЖДЦ)';
comment on column xx_disl_gu23_ref_cex.name is
   'Наименование цеха';
comment on column xx_disl_gu23_ref_cex.active is
   'Признак активности: Y/N';

-- справочник: причины
comment on table xx_disl_gu23_ref_reason is
   'Справочник причин составления акта';
comment on column xx_disl_gu23_ref_reason.id is
   'ID причины (первичный ключ)';
comment on column xx_disl_gu23_ref_reason.name is
   'Текст причины';
comment on column xx_disl_gu23_ref_reason.act_kind is
   'Для какого типа акта: start/end/other/any';
comment on column xx_disl_gu23_ref_reason.active is
   'Признак активности: Y/N';


-- справочник: подписанты
comment on table xx_disl_gu23_ref_signer is
   'Справочник возможных подписантов акта';
comment on column xx_disl_gu23_ref_signer.id is
   'ID подписанта (первичный ключ)';
comment on column xx_disl_gu23_ref_signer.fio is
   'ФИО подписанта';
comment on column xx_disl_gu23_ref_signer.post is
   'Должность';
comment on column xx_disl_gu23_ref_signer.org is
   'Организация';
comment on column xx_disl_gu23_ref_signer.unit is
   'Подразделение';
comment on column xx_disl_gu23_ref_signer.stype is
   'Тип подписанта (работник предприятия / станции ОАО РЖД)';
comment on column xx_disl_gu23_ref_signer.active is
   'Признак активности: Y/N';

-- счётчик нумерации актов (по цеху и году)
comment on table xx_disl_gu23_counter is
   'Счётчик номеров актов: своё значение на каждый цех и год';
comment on column xx_disl_gu23_counter.id is
   'ID строки счётчика (первичный ключ)';
comment on column xx_disl_gu23_counter.cex_id is
   'ID цеха -> xx_disl_gu23_ref_cex.id';
comment on column xx_disl_gu23_counter.yr is
   'Год нумерации';
comment on column xx_disl_gu23_counter.cnt is
   'Текущий (последний выданный) номер за цех/год';

-- акты (шапка)
comment on table xx_disl_gu23_act is
   'Акты общей формы ГУ-23 (шапка)';
comment on column xx_disl_gu23_act.id is
   'ID акта (первичный ключ)';
comment on column xx_disl_gu23_act.act_number is
   'Номер акта (ГУ23-ЦЕХ-ГОД-NNNNNN)';
comment on column xx_disl_gu23_act.act_type is
   'Тип акта: start (начало) / end (окончание) / other (прочий)';
comment on column xx_disl_gu23_act.status is
   'Статус: draft / active / closed / annulled';
comment on column xx_disl_gu23_act.cex_id is
   'ID цеха -> xx_disl_gu23_ref_cex.id';
comment on column xx_disl_gu23_act.station_id is
   'ID станции составления -> xx_disl_stations.station_id';
comment on column xx_disl_gu23_act.st_from_id is
   'ID станции отправления -> xx_disl_stations.station_id';
comment on column xx_disl_gu23_act.st_to_id is
   'ID станции назначения -> xx_disl_stations.station_id';
comment on column xx_disl_gu23_act.cargo_ref is
   'Груз (из справочника грузов)';
comment on column xx_disl_gu23_act.reason is
   'Причина составления';
comment on column xx_disl_gu23_act.circumstances is
   'Обстоятельства, вызвавшие составление акта';
comment on column xx_disl_gu23_act.start_at is
   'Дата и время начала простоя';
comment on column xx_disl_gu23_act.end_at is
   'Дата и время окончания простоя';
comment on column xx_disl_gu23_act.dur_days is
   'Длительность простоя: полных дней';
comment on column xx_disl_gu23_act.dur_hours is
   'Длительность простоя: остаток часов';
comment on column xx_disl_gu23_act.dur_total_h is
   'Длительность простоя: всего часов';
comment on column xx_disl_gu23_act.cal_days is
   'Календарных дней (для претензий)';
comment on column xx_disl_gu23_act.linked_start_id is
   'Связанный акт начала (для окончания) -> xx_disl_gu23_act.id';
comment on column xx_disl_gu23_act.annul_reason is
   'Причина аннулирования';
comment on column xx_disl_gu23_act.created_at is
   'Дата создания';
comment on column xx_disl_gu23_act.created_by is
   'Кто создал -> xx_disl_gu23_users.user_id';
comment on column xx_disl_gu23_act.modified_at is
   'Дата последнего изменения';
comment on column xx_disl_gu23_act.modified_by is
   'Кто изменил -> xx_disl_gu23_users.user_id';

-- строки актов (вагоны)
comment on table xx_disl_gu23_act_row is
   'Вагоны акта (строки)';
comment on column xx_disl_gu23_act_row.id is
   'ID строки (первичный ключ)';
comment on column xx_disl_gu23_act_row.act_id is
   'Акт -> xx_disl_gu23_act.id';
comment on column xx_disl_gu23_act_row.wagon_no is
   'Номер вагона';
comment on column xx_disl_gu23_act_row.owner is
   'Собственник';
comment on column xx_disl_gu23_act_row.kind is
   'Род вагона';
comment on column xx_disl_gu23_act_row.st_from is
   'Станция отправления';
comment on column xx_disl_gu23_act_row.st_to is
   'Станция назначения';
comment on column xx_disl_gu23_act_row.cargo is
   'Груз';
comment on column xx_disl_gu23_act_row.weight is
   'Вес';

-- приложения (файлы)
comment on table xx_disl_gu23_file is
   'Приложения к акту (файлы/фото)';
comment on column xx_disl_gu23_file.id is
   'ID файла (первичный ключ); имя на диске = id';
comment on column xx_disl_gu23_file.act_id is
   'Акт -> xx_disl_gu23_act.id';
comment on column xx_disl_gu23_file.file_name is
   'Оригинальное имя файла';
comment on column xx_disl_gu23_file.file_ext is
   'Расширение';
comment on column xx_disl_gu23_file.mime_type is
   'MIME-тип';
comment on column xx_disl_gu23_file.real_path is
   'Физический путь к файлу на диске';
comment on column xx_disl_gu23_file.created_at is
   'Дата загрузки';
comment on column xx_disl_gu23_file.created_by is
   'Кто загрузил -> xx_disl_gu23_users.user_id';

-- подписанты акта (хранение, без процесса подписания)
comment on table xx_disl_gu23_signer is
   'Подписанты конкретного акта';
comment on column xx_disl_gu23_signer.id is
   'ID строки (первичный ключ)';
comment on column xx_disl_gu23_signer.act_id is
   'Акт -> xx_disl_gu23_act.id';
comment on column xx_disl_gu23_signer.signer_ref_id is
   'ID подписанта из справочника (для предвыбора при редактировании)';
comment on column xx_disl_gu23_signer.fio is
   'ФИО подписанта';
comment on column xx_disl_gu23_signer.post is
   'Должность';
comment on column xx_disl_gu23_signer.org is
   'Организация';
comment on column xx_disl_gu23_signer.ord_no is
   'Порядковый номер подписанта в акте';

-- история изменений
comment on table xx_disl_gu23_hist is
   'История изменений акта';
comment on column xx_disl_gu23_hist.id is
   'ID записи (первичный ключ)';
comment on column xx_disl_gu23_hist.act_id is
   'Акт -> xx_disl_gu23_act.id';
comment on column xx_disl_gu23_hist.ts is
   'Дата и время события';
comment on column xx_disl_gu23_hist.usr is
   'Кто выполнил -> xx_disl_gu23_users.user_id';
comment on column xx_disl_gu23_hist.txt is
   'Текст события';

-- представление акта (шапка + вычисляемые поля)
comment on table xx_disl_gu23_act_v is
   'Акты + вычисляемые поля (номер связанного акта, кол-во вагонов/файлов)';
comment on column xx_disl_gu23_act_v.linked_start_number is
   'Номер связанного акта начала';
comment on column xx_disl_gu23_act_v.wagon_cnt is
   'Кол-во вагонов в акте';
comment on column xx_disl_gu23_act_v.file_cnt is
   'Кол-во приложений в акте';