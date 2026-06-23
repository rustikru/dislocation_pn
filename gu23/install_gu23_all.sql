-- =====================================================================
--  install_gu23_all.sql  —  САМОДОСТАТОЧНЫЙ инсталл (без sqlplus/@@).
--  Запускать одним файлом в SQL Developer / VS Code Oracle / SQLcl
--  под пользователем XX_ETW в локальной БД (FREEPDB1).
--  Можно перезапускать повторно — старые объекты дропаются безопасно.
-- =====================================================================

-- ---- безопасный сброс старых объектов (ошибки игнорируются) ----
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
        'XX_DISL_GU23_ACT_ROW_SEQ','XX_DISL_GU23_ACT_SEQ','XX_DISL_GU23_REF_SIGNER_SEQ',
        'XX_DISL_GU23_REF_WAGON_KIND_SEQ','XX_DISL_GU23_REF_OWNER_SEQ','XX_DISL_GU23_REF_STATION_SEQ',
        'XX_DISL_GU23_REF_REASON_SEQ','XX_DISL_GU23_REF_CEX_SEQ','XX_DISL_GU23_USERS_SEQ'))
    )
  ) LOOP
    BEGIN EXECUTE IMMEDIATE x.ddl; EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END;
/

CREATE TABLE xx_disl_gu23_users (
    user_id    NUMBER        PRIMARY KEY,
    login      VARCHAR2(64)  NOT NULL,
    full_name  VARCHAR2(256) NOT NULL
);
CREATE SEQUENCE xx_disl_gu23_users_seq START WITH 100 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_ref_cex (
    id      NUMBER PRIMARY KEY,
    code    VARCHAR2(32)  NOT NULL,
    name    VARCHAR2(256) NOT NULL,
    active  CHAR(1) DEFAULT 'Y'
);
CREATE SEQUENCE xx_disl_gu23_ref_cex_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_ref_reason (
    id        NUMBER PRIMARY KEY,
    name      VARCHAR2(512) NOT NULL,
    act_kind  VARCHAR2(16) DEFAULT 'any',   -- start/end/other/any
    active    CHAR(1) DEFAULT 'Y'
);
CREATE SEQUENCE xx_disl_gu23_ref_reason_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_ref_station (
    id      NUMBER PRIMARY KEY,
    name    VARCHAR2(128) NOT NULL,
    active  CHAR(1) DEFAULT 'Y'
);
CREATE SEQUENCE xx_disl_gu23_ref_station_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_ref_owner (
    id      NUMBER PRIMARY KEY,
    name    VARCHAR2(128) NOT NULL,
    active  CHAR(1) DEFAULT 'Y'
);
CREATE SEQUENCE xx_disl_gu23_ref_owner_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_ref_wagon_kind (
    id      NUMBER PRIMARY KEY,
    name    VARCHAR2(128) NOT NULL,
    active  CHAR(1) DEFAULT 'Y'
);
CREATE SEQUENCE xx_disl_gu23_ref_wagon_kind_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_ref_signer (
    id      NUMBER PRIMARY KEY,
    fio     VARCHAR2(256) NOT NULL,
    post    VARCHAR2(256),
    org     VARCHAR2(256),
    unit    VARCHAR2(256),
    stype   VARCHAR2(128),                 -- тип подписанта
    active  CHAR(1) DEFAULT 'Y'
);
CREATE SEQUENCE xx_disl_gu23_ref_signer_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_counter (
    cex_code  VARCHAR2(32),
    yr        NUMBER,
    cnt       NUMBER DEFAULT 0,
    CONSTRAINT xx_disl_gu23_counter_pk PRIMARY KEY (cex_code, yr)
);

CREATE TABLE xx_disl_gu23_act (
    id                  NUMBER PRIMARY KEY,
    act_number          VARCHAR2(64),
    act_type            VARCHAR2(16)  NOT NULL,    -- start / end / other
    status              VARCHAR2(16)  NOT NULL,    -- draft / active / closed / annulled
    cex_code            VARCHAR2(32),
    station             VARCHAR2(128),
    reason              VARCHAR2(512),
    circumstances       VARCHAR2(4000),
    start_at            DATE,
    end_at              DATE,
    dur_days            NUMBER,
    dur_hours           NUMBER,
    dur_total_h         NUMBER,
    cal_days            NUMBER,
    linked_start_id     NUMBER,
    annul_reason        VARCHAR2(1000),
    created_at          DATE,
    created_by          NUMBER,
    modified_at         DATE,
    modified_by         NUMBER
);
CREATE SEQUENCE xx_disl_gu23_act_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE xx_disl_gu23_act_row (
    id        NUMBER PRIMARY KEY,
    act_id    NUMBER NOT NULL,
    wagon_no  VARCHAR2(16) NOT NULL,
    owner     VARCHAR2(128),
    kind      VARCHAR2(128),
    st_from   VARCHAR2(128),
    st_to     VARCHAR2(128),
    cargo     VARCHAR2(256),
    weight    VARCHAR2(32),
    CONSTRAINT xx_disl_gu23_row_fk FOREIGN KEY (act_id)
        REFERENCES xx_disl_gu23_act (id) ON DELETE CASCADE
);
CREATE SEQUENCE xx_disl_gu23_act_row_seq START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE INDEX xx_disl_gu23_row_act_i  ON xx_disl_gu23_act_row (act_id);
CREATE INDEX xx_disl_gu23_row_wgn_i  ON xx_disl_gu23_act_row (wagon_no);

CREATE TABLE xx_disl_gu23_file (
    id          NUMBER PRIMARY KEY,
    act_id      NUMBER NOT NULL,
    file_name   VARCHAR2(512),   -- оригинальное имя
    file_ext    VARCHAR2(32),    -- расширение
    mime_type   VARCHAR2(128),
    real_path   VARCHAR2(1024),  -- физический путь (имя на диске = id)
    created_at  DATE,
    created_by  NUMBER,
    CONSTRAINT xx_disl_gu23_file_fk FOREIGN KEY (act_id)
        REFERENCES xx_disl_gu23_act (id) ON DELETE CASCADE
);
CREATE SEQUENCE xx_disl_gu23_file_seq START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE INDEX xx_disl_gu23_file_act_i ON xx_disl_gu23_file (act_id);

CREATE TABLE xx_disl_gu23_signer (
    id      NUMBER PRIMARY KEY,
    act_id  NUMBER NOT NULL,
    fio     VARCHAR2(256),
    post    VARCHAR2(256),
    org     VARCHAR2(256),
    ord_no  NUMBER,
    CONSTRAINT xx_disl_gu23_signer_fk FOREIGN KEY (act_id)
        REFERENCES xx_disl_gu23_act (id) ON DELETE CASCADE
);
CREATE SEQUENCE xx_disl_gu23_signer_seq START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE INDEX xx_disl_gu23_signer_act_i ON xx_disl_gu23_signer (act_id);

CREATE TABLE xx_disl_gu23_hist (
    id      NUMBER PRIMARY KEY,
    act_id  NUMBER NOT NULL,
    ts      DATE,
    usr     NUMBER,
    txt     VARCHAR2(1000),
    CONSTRAINT xx_disl_gu23_hist_fk FOREIGN KEY (act_id)
        REFERENCES xx_disl_gu23_act (id) ON DELETE CASCADE
);
CREATE SEQUENCE xx_disl_gu23_hist_seq START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE INDEX xx_disl_gu23_hist_act_i ON xx_disl_gu23_hist (act_id);

-- Все вычисляемые поля (номер связанного акта, кол-во вагонов/файлов) собраны
-- здесь один раз. Пакет читает акты только через это представление.
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

-- =====================================================================
--  ОБЪЕКТНЫЕ ТИПЫ ДЛЯ КОНВЕЙЕРНЫХ ФУНКЦИЙ
-- =====================================================================

CREATE OR REPLACE TYPE xx_disl_gu23_ref_obj AS OBJECT (
    code  VARCHAR2(512),
    name  VARCHAR2(512)
);
/
CREATE OR REPLACE TYPE xx_disl_gu23_ref_tab AS TABLE OF xx_disl_gu23_ref_obj;
/

CREATE OR REPLACE TYPE xx_disl_gu23_signer_obj AS OBJECT (
    id      NUMBER,
    fio     VARCHAR2(256),
    post    VARCHAR2(256),
    org     VARCHAR2(256),
    unit    VARCHAR2(256),
    stype   VARCHAR2(128),
    ord_no  NUMBER
);
/
CREATE OR REPLACE TYPE xx_disl_gu23_signer_tab AS TABLE OF xx_disl_gu23_signer_obj;
/

CREATE OR REPLACE TYPE xx_disl_gu23_act_obj AS OBJECT (
    id                   NUMBER,
    act_number           VARCHAR2(64),
    act_type             VARCHAR2(16),
    status               VARCHAR2(16),
    cex                  VARCHAR2(32),
    station              VARCHAR2(128),
    reason               VARCHAR2(512),
    circumstances        VARCHAR2(4000),
    start_at             VARCHAR2(20),
    end_at               VARCHAR2(20),
    dur_days             NUMBER,
    dur_hours            NUMBER,
    dur_total_h          NUMBER,
    cal_days             NUMBER,
    linked_start_id      NUMBER,
    linked_start_number  VARCHAR2(64),
    wagon_cnt            NUMBER,
    file_cnt             NUMBER,
    annul_reason         VARCHAR2(1000),
    created_at           VARCHAR2(20),
    created_by           VARCHAR2(256),
    modified_at          VARCHAR2(20)
);
/
CREATE OR REPLACE TYPE xx_disl_gu23_act_tab AS TABLE OF xx_disl_gu23_act_obj;
/

CREATE OR REPLACE TYPE xx_disl_gu23_row_obj AS OBJECT (
    id        NUMBER,
    act_id    NUMBER,
    wagon_no  VARCHAR2(16),
    owner     VARCHAR2(128),
    kind      VARCHAR2(128),
    st_from   VARCHAR2(128),
    st_to     VARCHAR2(128),
    cargo     VARCHAR2(256),
    weight    VARCHAR2(32)
);
/
CREATE OR REPLACE TYPE xx_disl_gu23_row_tab AS TABLE OF xx_disl_gu23_row_obj;
/

CREATE OR REPLACE TYPE xx_disl_gu23_file_obj AS OBJECT (
    id          NUMBER,
    act_id      NUMBER,
    file_name   VARCHAR2(512),
    file_ext    VARCHAR2(32),
    mime_type   VARCHAR2(128),
    real_path   VARCHAR2(1024),
    created_at  VARCHAR2(20),
    created_by  VARCHAR2(256)
);
/
CREATE OR REPLACE TYPE xx_disl_gu23_file_tab AS TABLE OF xx_disl_gu23_file_obj;
/

CREATE OR REPLACE TYPE xx_disl_gu23_hist_obj AS OBJECT (
    id      NUMBER,
    act_id  NUMBER,
    ts      VARCHAR2(20),
    usr     VARCHAR2(256),
    txt     VARCHAR2(1000)
);
/
CREATE OR REPLACE TYPE xx_disl_gu23_hist_tab AS TABLE OF xx_disl_gu23_hist_obj;
/

CREATE OR REPLACE TYPE xx_disl_gu23_wagon_obj AS OBJECT (
    wagon_no  VARCHAR2(16),
    owner     VARCHAR2(128),
    kind      VARCHAR2(128),
    st_from   VARCHAR2(128),
    st_to     VARCHAR2(128),
    cargo     VARCHAR2(256),
    weight    VARCHAR2(32),
    found     NUMBER
);
/
CREATE OR REPLACE TYPE xx_disl_gu23_wagon_tab AS TABLE OF xx_disl_gu23_wagon_obj;
/

-- спецификация пакета (локальная мини-версия)
--
--  ВНИМАНИЕ: локально создаётся пакет xx_disl_gu23_pkg, содержащий ТОЛЬКО
--  функции gu23_*. На проде эти объявления нужно ДОБАВИТЬ в спецификацию
--  настоящего пакета xx_disl_gu23_pkg (не затирая остальные ~300 функций).
--
--  Разделители для передачи коллекций из PHP без JSON (совместимо с 11g):
--     записи (вагоны/подписанты)  — CHR(30)
--     поля внутри записи          — CHR(31)
create or replace package xx_disl_gu23_pkg as

    -- ---- справочники (select из таблиц ref_*, легко заменить источник) ----
   function gu23_get_ref_cex return xx_disl_gu23_ref_tab
      pipelined;
   function gu23_get_ref_reason (
      p_kind in varchar2 default null
   ) return xx_disl_gu23_ref_tab
      pipelined;
   function gu23_get_ref_station return xx_disl_gu23_ref_tab
      pipelined;
   function gu23_get_ref_owner return xx_disl_gu23_ref_tab
      pipelined;
   function gu23_get_ref_wagon_kind return xx_disl_gu23_ref_tab
      pipelined;
   function gu23_get_ref_signer return xx_disl_gu23_signer_tab
      pipelined;

    -- ---- акты ----
   function gu23_get_acts (
      p_q      in varchar2 default null,
      p_type   in varchar2 default null,
      p_status in varchar2 default null,
      p_cex    in varchar2 default null
   ) return xx_disl_gu23_act_tab
      pipelined;

   function gu23_get_act (
      p_id in number
   ) return xx_disl_gu23_act_tab
      pipelined;
   function gu23_get_rows (
      p_act_id in number
   ) return xx_disl_gu23_row_tab
      pipelined;
   function gu23_get_files (
      p_act_id in number
   ) return xx_disl_gu23_file_tab
      pipelined;
   function gu23_get_signers (
      p_act_id in number
   ) return xx_disl_gu23_signer_tab
      pipelined;
   function gu23_get_hist (
      p_act_id in number
   ) return xx_disl_gu23_hist_tab
      pipelined;

    -- открытые акты начала простоя (для выбора в акте окончания)
   function gu23_get_open_starts return xx_disl_gu23_act_tab
      pipelined;

    -- ещё открытые (не закрытые действующим окончанием) вагоны акта начала
   function gu23_get_open_rows (
      p_start_id in number
   ) return xx_disl_gu23_row_tab
      pipelined;

    -- все акты по номеру вагона (поиск по вагону)
   function gu23_get_by_wagon (
      p_wagon in varchar2
   ) return xx_disl_gu23_act_tab
      pipelined;

    -- ---- интеграция Oracle BI / Дислокация (имитация через select из dual) ----
   function gu23_get_wagon_info (
      p_wagons  in clob,
      p_station in varchar2 default null
   ) return xx_disl_gu23_wagon_tab
      pipelined;

    -- ---- запись ----
    -- получить id для нового файла (имя на диске = id)
   function gu23_new_file_id return number;

   function gu23_add_file (
      p_act_id  in number,
      p_file_id in number,
      p_name    in varchar2,
      p_ext     in varchar2,
      p_mime    in varchar2,
      p_path    in varchar2,
      p_user_id in number
   ) return varchar2;

   function gu23_del_file (
      p_file_id in number,
      p_user_id in number
   ) return varchar2;

    -- сохранение акта (создание/правка черновика) вместе со строками и подписантами.
    -- Возвращает: 'OK'||CHR(31)||id||CHR(31)||number   либо  'ERR'||CHR(31)||текст
   function gu23_save_act (
      p_user_id         in number,
      p_id              in number,        -- 0/NULL = новый
      p_type            in varchar2,      -- start / end / other
      p_status          in varchar2,      -- draft / active
      p_cex             in varchar2,
      p_station         in varchar2,
      p_reason          in varchar2,
      p_circumstances   in varchar2,
      p_start_at        in varchar2,      -- 'YYYY-MM-DD HH24:MI' или NULL
      p_end_at          in varchar2,
      p_linked_start_id in number,
      p_wagons          in clob,          -- записи CHR(30); поля CHR(31): no,owner,kind,from,to,cargo,weight
      p_signers         in clob,          -- записи CHR(30); поля CHR(31): fio,post,org
      p_force           in varchar2 default 'N'  -- 'Y' = разрешить дубль открытого простоя
   ) return varchar2;

   function gu23_del_act (
      p_id      in number,
      p_user_id in number
   ) return varchar2;
   function gu23_annul_act (
      p_id      in number,
      p_user_id in number,
      p_reason  in varchar2
   ) return varchar2;

end xx_disl_gu23_pkg;
/

create or replace package body xx_etw.xx_disl_gu23_pkg as

   c_dtf constant varchar2(30) := 'YYYY-MM-DD HH24:MI:SS';
   c_us  constant char(1) := chr(31);   -- разделитель полей
   c_rs  constant char(1) := chr(30);   -- разделитель записей

    -- ----------------------------------------------------------------
    -- вспомогательные
    -- ----------------------------------------------------------------
   function g_user_name (
      p_user_id in number
   ) return varchar2 is
      v varchar2(256);
   begin
      if p_user_id is null then
         return null;
      end if;
      select full_name
        into v
        from xx_disl_gu23_users
       where user_id = p_user_id;
      return v;
   exception
      when no_data_found then
         return null;
   end;

    -- n-е поле строки, разделители CHR(31)
   function g_field (
      p_line in varchar2,
      p_idx  in pls_integer
   ) return varchar2 is
      v_from pls_integer := 1;
      v_to   pls_integer;
      v_i    pls_integer := 1;
   begin
      loop
         v_to := instr(
            p_line,
            c_us,
            1,
            v_i
         );
         if v_i = p_idx then
            if v_to = 0 then
               return substr(
                  p_line,
                  v_from
               );
            else
               return substr(
                  p_line,
                  v_from,
                  v_to - v_from
               );
            end if;
         end if;
         exit when v_to = 0;
         v_from := v_to + 1;
         v_i := v_i + 1;
      end loop;
      return null;
   end;

   function g_to_date (
      p_str in varchar2
   ) return date is
   begin
      if p_str is null
      or trim(p_str) is null then
         return null;
      end if;
        -- принимаем 'YYYY-MM-DD HH24:MI' или с секундами; берём до минут
      return to_date ( substr(
         replace(
            p_str,
            'T',
            ' '
         ),
         1,
         16
      ),
      'YYYY-MM-DD HH24:MI' );
   end;

    -- следующий уникальный номер акта ГУ23-ЦЕХ-ГОД-000001
   function g_next_number (
      p_cex in varchar2
   ) return varchar2 is
      v_yr  number := to_number ( to_char(
         sysdate,
         'YYYY'
      ) );
      v_cnt number;
   begin
      update xx_disl_gu23_counter
         set
         cnt = cnt + 1
       where cex_code = p_cex
         and yr = v_yr returning cnt into v_cnt;
      if sql%rowcount = 0 then
         v_cnt := 1;
         insert into xx_disl_gu23_counter (
            cex_code,
            yr,
            cnt
         ) values ( p_cex,
                    v_yr,
                    v_cnt );
      end if;
      return 'ГУ23-'
             || p_cex
             || '-'
             || v_yr
             || '-'
             || lpad(
         v_cnt,
         6,
         '0'
      );
   end;

    -- превращаем строку акта в объект
   function g_act_obj (
      a in xx_disl_gu23_act_v%rowtype
   ) return xx_disl_gu23_act_obj is
      o xx_disl_gu23_act_obj := xx_disl_gu23_act_obj(
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null,
         null
      );
   begin
      o.id := a.id;
      o.act_number := a.act_number;
      o.act_type := a.act_type;
      o.status := a.status;
      o.cex := a.cex_code;
      o.station := a.station;
      o.reason := a.reason;
      o.circumstances := a.circumstances;
      o.start_at := to_char(
         a.start_at,
         c_dtf
      );
      o.end_at := to_char(
         a.end_at,
         c_dtf
      );
      o.dur_days := a.dur_days;
      o.dur_hours := a.dur_hours;
      o.dur_total_h := a.dur_total_h;
      o.cal_days := a.cal_days;
      o.linked_start_id := a.linked_start_id;
      o.linked_start_number := a.linked_start_number;
      o.wagon_cnt := a.wagon_cnt;
      o.file_cnt := a.file_cnt;
      o.annul_reason := a.annul_reason;
      o.created_at := to_char(
         a.created_at,
         c_dtf
      );
      o.created_by := g_user_name(a.created_by);
      o.modified_at := to_char(
         a.modified_at,
         c_dtf
      );
      return o;
   end;

    -- ----------------------------------------------------------------
    -- справочники
    -- ----------------------------------------------------------------
   function gu23_get_ref_cex return xx_disl_gu23_ref_tab
      pipelined
   is
   begin
      for r in (
         select code,
                name
           from xx_disl_gu23_ref_cex
          where active = 'Y'
          order by name
      ) loop
         pipe row ( xx_disl_gu23_ref_obj(
            r.code,
            r.name
         ) );
      end loop;
      return;
   end;

   function gu23_get_ref_reason (
      p_kind in varchar2 default null
   ) return xx_disl_gu23_ref_tab
      pipelined
   is
   begin
      for r in (
         select name
           from xx_disl_gu23_ref_reason
          where active = 'Y'
            and ( p_kind is null
             or act_kind in ( 'any',
                              p_kind ) )
          order by name
      ) loop
         pipe row ( xx_disl_gu23_ref_obj(
            r.name,
            r.name
         ) );
      end loop;
      return;
   end;

   function gu23_get_ref_station return xx_disl_gu23_ref_tab
      pipelined
   is
   begin
      for r in (
         select name
           from xx_disl_gu23_ref_station
          where active = 'Y'
          order by name
      ) loop
         pipe row ( xx_disl_gu23_ref_obj(
            r.name,
            r.name
         ) );
      end loop;
      return;
   end;

   function gu23_get_ref_owner return xx_disl_gu23_ref_tab
      pipelined
   is
   begin
      for r in (
         select name
           from xx_disl_gu23_ref_owner
          where active = 'Y'
          order by name
      ) loop
         pipe row ( xx_disl_gu23_ref_obj(
            r.name,
            r.name
         ) );
      end loop;
      return;
   end;

   function gu23_get_ref_wagon_kind return xx_disl_gu23_ref_tab
      pipelined
   is
   begin
      for r in (
         select name
           from xx_disl_gu23_ref_wagon_kind
          where active = 'Y'
          order by name
      ) loop
         pipe row ( xx_disl_gu23_ref_obj(
            r.name,
            r.name
         ) );
      end loop;
      return;
   end;

   function gu23_get_ref_signer return xx_disl_gu23_signer_tab
      pipelined
   is
   begin
      for r in (
         select id,
                fio,
                post,
                org,
                unit,
                stype
           from xx_disl_gu23_ref_signer
          where active = 'Y'
          order by fio
      ) loop
         pipe row ( xx_disl_gu23_signer_obj(
            r.id,
            r.fio,
            r.post,
            r.org,
            r.unit,
            r.stype,
            null
         ) );
      end loop;
      return;
   end;

    -- ----------------------------------------------------------------
    -- акты (чтение)
    -- ----------------------------------------------------------------
   function gu23_get_acts (
      p_q      in varchar2 default null,
      p_type   in varchar2 default null,
      p_status in varchar2 default null,
      p_cex    in varchar2 default null
   ) return xx_disl_gu23_act_tab
      pipelined
   is
      v_q varchar2(512) := lower(p_q);
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where ( p_type is null
             or a.act_type = p_type )
            and ( p_status is null
             or a.status = p_status )
            and ( p_cex is null
             or a.cex_code = p_cex )
            and ( v_q is null
         or lower(a.act_number) like '%'
                  || v_q
                  || '%'
         or lower(a.reason) like '%'
                                 || v_q
                                 || '%'
             or exists (
            select 1
              from xx_disl_gu23_act_row r
             where r.act_id = a.id
               and r.wagon_no like '%'
                                   || p_q
                                   || '%'
         ) )
          order by a.created_at desc,
                   a.id desc
      ) loop
         pipe row ( g_act_obj(a) );
      end loop;
      return;
   end;

   function gu23_get_act (
      p_id in number
   ) return xx_disl_gu23_act_tab
      pipelined
   is
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where a.id = p_id
      ) loop
         pipe row ( g_act_obj(a) );
      end loop;
      return;
   end;

   function gu23_get_rows (
      p_act_id in number
   ) return xx_disl_gu23_row_tab
      pipelined
   is
   begin
      for r in (
         select *
           from xx_disl_gu23_act_row
          where act_id = p_act_id
          order by id
      ) loop
         pipe row ( xx_disl_gu23_row_obj(
            r.id,
            r.act_id,
            r.wagon_no,
            r.owner,
            r.kind,
            r.st_from,
            r.st_to,
            r.cargo,
            r.weight
         ) );
      end loop;
      return;
   end;

   function gu23_get_files (
      p_act_id in number
   ) return xx_disl_gu23_file_tab
      pipelined
   is
   begin
      for f in (
         select *
           from xx_disl_gu23_file
          where act_id = p_act_id
          order by id
      ) loop
         pipe row ( xx_disl_gu23_file_obj(
            f.id,
            f.act_id,
            f.file_name,
            f.file_ext,
            f.mime_type,
            f.real_path,
            to_char(
               f.created_at,
               c_dtf
            ),
            g_user_name(f.created_by)
         ) );
      end loop;
      return;
   end;

   function gu23_get_signers (
      p_act_id in number
   ) return xx_disl_gu23_signer_tab
      pipelined
   is
   begin
      for s in (
         select *
           from xx_disl_gu23_signer
          where act_id = p_act_id
          order by ord_no,
                   id
      ) loop
         pipe row ( xx_disl_gu23_signer_obj(
            s.id,
            s.fio,
            s.post,
            s.org,
            null,
            null,
            s.ord_no
         ) );
      end loop;
      return;
   end;

   function gu23_get_hist (
      p_act_id in number
   ) return xx_disl_gu23_hist_tab
      pipelined
   is
   begin
      for h in (
         select *
           from xx_disl_gu23_hist
          where act_id = p_act_id
          order by ts desc,
                   id desc
      ) loop
         pipe row ( xx_disl_gu23_hist_obj(
            h.id,
            h.act_id,
            to_char(
               h.ts,
               c_dtf
            ),
            g_user_name(h.usr),
            h.txt
         ) );
      end loop;
      return;
   end;

   function gu23_get_open_starts return xx_disl_gu23_act_tab
      pipelined
   is
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where a.act_type = 'start'
            and a.status = 'active'
          order by a.start_at
      ) loop
         pipe row ( g_act_obj(a) );
      end loop;
      return;
   end;

   -- ещё открытые вагоны акта начала (не закрытые действующим актом окончания)
   function gu23_get_open_rows (
      p_start_id in number
   ) return xx_disl_gu23_row_tab
      pipelined
   is
   begin
      for r in (
         select *
           from xx_disl_gu23_act_row sr
          where sr.act_id = p_start_id
            and not exists (
               select 1
                 from xx_disl_gu23_act e,
                      xx_disl_gu23_act_row er
                where er.act_id = e.id
                  and e.act_type = 'end'
                  and e.status = 'active'
                  and e.linked_start_id = p_start_id
                  and er.wagon_no = sr.wagon_no
            )
          order by sr.id
      ) loop
         pipe row ( xx_disl_gu23_row_obj(r.id, r.act_id, r.wagon_no, r.owner,
                                         r.kind, r.st_from, r.st_to, r.cargo, r.weight) );
      end loop;
      return;
   end;

   function gu23_get_by_wagon (
      p_wagon in varchar2
   ) return xx_disl_gu23_act_tab
      pipelined
   is
   begin
      for a in (
         select *
           from xx_disl_gu23_act_v a
          where exists (
            select 1
              from xx_disl_gu23_act_row r
             where r.act_id = a.id
               and r.wagon_no = p_wagon
         )
          order by a.created_at desc,
                   a.id desc
      ) loop
         pipe row ( g_act_obj(a) );
      end loop;
      return;
   end;

    -- ----------------------------------------------------------------
    -- дислокация (заглушка через select из dual)
    -- заменить тело на реальный запрос к источнику
    -- ----------------------------------------------------------------
   function gu23_get_wagon_info (
      p_wagons  in clob,
      p_station in varchar2 default null
   ) return xx_disl_gu23_wagon_tab
      pipelined
   is
      v_len  pls_integer := nvl(
         dbms_lob.getlength(p_wagons),
         0
      );
      v_from pls_integer := 1;
      v_to   pls_integer;
      v_no   varchar2(32);
      v_last pls_integer;
      v_d2   pls_integer;
   begin
        -- данные подтягиваются только если станция операции — Углеуральская
      if
         p_station is not null
         and p_station <> 'Углеуральская'
      then
         return;
      end if;
      while v_from <= v_len loop
         v_to := instr(
            p_wagons,
            c_rs,
            v_from
         );
         if v_to = 0 then
            v_to := v_len + 1;
         end if;
         v_no := trim(dbms_lob.substr(
            p_wagons,
            v_to - v_from,
            v_from
         ));
         v_from := v_to + 1;
         if v_no is null then
            continue;
         end if;

            -- заглушка: начало (заменить на реальный select)
            -- Имитация: вагон с последней цифрой 0 считается «не найденным».
         v_last := to_number ( substr(
            v_no,
            -1
         ) );
         v_d2 := to_number ( substr(
            v_no,
            -2
         ) );
         if v_last = 0 then
            pipe row ( xx_disl_gu23_wagon_obj(
               v_no,
               null,
               null,
               null,
               null,
               null,
               null,
               0
            ) );
         else
            for d in (
               select case mod(
                  v_d2,
                  5
               )
                  when 0 then
                     'ПГК'
                  when 1 then
                     'ФГК'
                  when 2 then
                     'СУЭК'
                  when 3 then
                     'Уралкалий'
                  else
                     'НефтеТрансСервис'
                      end as owner,
                      case mod(
                         v_d2,
                         4
                      )
                         when 0 then
                            'Полувагон'
                         when 1 then
                            'Цистерна'
                         when 2 then
                            'Хоппер'
                         else
                            'Крытый'
                      end as kind,
                      case mod(
                         v_d2,
                         3
                      )
                         when 0 then
                            'Кизел'
                         when 1 then
                            'Березники'
                         else
                            'Чусовская'
                      end as st_from,
                      'Углеуральская' as st_to,
                      case mod(
                         v_d2,
                         4
                      )
                         when 0 then
                            'Уголь каменный'
                         when 1 then
                            'Удобрения минеральные'
                         when 2 then
                            'Кокс'
                         else
                            'Дизельное топливо'
                      end as cargo,
                      to_char(60 + mod(
                         v_d2,
                         12
                      ))
                      || ','
                      || to_char(v_last)
                      || ' т' as weight
                 from dual
            ) loop
               pipe row ( xx_disl_gu23_wagon_obj(
                  v_no,
                  d.owner,
                  d.kind,
                  d.st_from,
                  d.st_to,
                  d.cargo,
                  d.weight,
                  1
               ) );
            end loop;
         end if;
            -- заглушка: конец
      end loop;
      return;
   end;

    -- ----------------------------------------------------------------
    -- файлы
    -- ----------------------------------------------------------------
   function gu23_new_file_id return number is
      v number;
   begin
      select xx_disl_gu23_file_seq.nextval
        into v
        from dual;
      return v;
   end;

   function gu23_add_file (
      p_act_id  in number,
      p_file_id in number,
      p_name    in varchar2,
      p_ext     in varchar2,
      p_mime    in varchar2,
      p_path    in varchar2,
      p_user_id in number
   ) return varchar2 is
   begin
      insert into xx_disl_gu23_file (
         id,
         act_id,
         file_name,
         file_ext,
         mime_type,
         real_path,
         created_at,
         created_by
      ) values ( p_file_id,
                 p_act_id,
                 p_name,
                 p_ext,
                 p_mime,
                 p_path,
                 sysdate,
                 p_user_id );

      insert into xx_disl_gu23_hist (
         id,
         act_id,
         ts,
         usr,
         txt
      ) values ( xx_disl_gu23_hist_seq.nextval,
                 p_act_id,
                 sysdate,
                 p_user_id,
                 'Прикреплён файл: ' || p_name );
      commit;
      return 'done';
   exception
      when others then
         rollback;
         return 'ERR'
                || c_us
                || sqlerrm;
   end;

   function gu23_del_file (
      p_file_id in number,
      p_user_id in number
   ) return varchar2 is
      v_act  number;
      v_name varchar2(512);
   begin
      select act_id,
             file_name
        into
         v_act,
         v_name
        from xx_disl_gu23_file
       where id = p_file_id;
      delete from xx_disl_gu23_file
       where id = p_file_id;
      insert into xx_disl_gu23_hist (
         id,
         act_id,
         ts,
         usr,
         txt
      ) values ( xx_disl_gu23_hist_seq.nextval,
                 v_act,
                 sysdate,
                 p_user_id,
                 'Удалён файл: ' || v_name );
      commit;
      return 'done';
   exception
      when others then
         rollback;
         return 'ERR'
                || c_us
                || sqlerrm;
   end;

    -- ----------------------------------------------------------------
    -- сохранение акта
    -- ----------------------------------------------------------------
   function gu23_save_act (
      p_user_id         in number,
      p_id              in number,
      p_type            in varchar2,
      p_status          in varchar2,
      p_cex             in varchar2,
      p_station         in varchar2,
      p_reason          in varchar2,
      p_circumstances   in varchar2,
      p_start_at        in varchar2,
      p_end_at          in varchar2,
      p_linked_start_id in number,
      p_wagons          in clob,
      p_signers         in clob,
      p_force           in varchar2 default 'N'
   ) return varchar2 is
      v_id        number := p_id;
      v_number    varchar2(64);
      v_start     date := g_to_date(p_start_at);
      v_end       date := g_to_date(p_end_at);
      v_dd        number;
      v_dh        number;
      v_th        number;
      v_cd        number;
      v_isnew     boolean := ( p_id is null
      or p_id = 0 );
      v_len       pls_integer;
      v_from      pls_integer;
      v_to        pls_integer;
      v_rec       varchar2(4000);
      v_ord       number := 0;
      v_wcnt      number := 0;
      vw_no       varchar2(16);
      vw_owner    varchar2(128);
      vw_kind     varchar2(128);
      vw_from     varchar2(128);
      vw_to       varchar2(128);
      vw_cargo    varchar2(256);
      vw_weight   varchar2(32);
      vs_fio      varchar2(256);
      vs_post     varchar2(256);
      vs_org      varchar2(256);
      v_dupnum    varchar2(64);
      v_has_start number;
      v_tot       number;   -- всего вагонов в акте начала
      v_closed    number;   -- закрыто вагонов действующими окончаниями
      v_cur_status varchar2(16);  -- текущий статус акта при редактировании
   begin
      -- проверяем тип акта и обязательные поля
      if p_type not in ( 'start',
                         'end',
                         'other' ) then
         return 'ERR'
                || c_us
                || 'Неверный тип акта';
      end if;
      if nvl(
         p_cex,
         'X'
      ) = 'X' then
         return 'ERR'
                || c_us
                || 'Не указан цех';
      end if;
      
      -- Проверки дат для акта "Начало простоя"
      if
         p_type = 'start'
         and v_start is null
      then
         return 'ERR'
                || c_us
                || 'Не указана дата начала простоя';
      end if;
      
      -- Проверки дат и связей для акта "Окончание простоя"
      if p_type = 'end' then
         if p_linked_start_id is null then
            return 'ERR'
                   || c_us
                   || 'Не выбран открытый акт начала простоя';
         end if;
         if v_end is null then
            return 'ERR'
                   || c_us
                   || 'Не указана дата окончания простоя';
         end if;
         
         -- Если дата начала не передана с фронтенда, безопасно извлекаем её из БД
         if v_start is null then
            begin
               select start_at
                 into v_start
                 from xx_disl_gu23_act
                where id = p_linked_start_id;
            exception
               when no_data_found then
                  null;
            end;
         end if;
         
         -- Контроль ошибок: дата окончания не должна быть меньше даты начала
         if
            v_start is not null
            and v_end < v_start
         then
            return 'ERR'
                   || c_us
                   || 'Дата окончания не может быть меньше даты начала';
         end if;
         
         -- Контроль ошибок: дата окончания не должна быть больше текущей (в будущем)
         if v_end > sysdate then
            return 'ERR'
                   || c_us
                   || 'Дата окончания не может быть больше текущей даты (в будущем)';
         end if;
      end if;

      -- Расчет длительности простоя (только для актов окончания простоя)
      if
         p_type = 'end'
         and v_start is not null
         and v_end is not null
      then
         v_th := round(
            (v_end - v_start) * 24,
            1
         );
         v_dd := trunc(v_end - v_start);
         v_dh := round(((v_end - v_start) - v_dd) * 24);
         v_cd := ceil(v_end - v_start);
      end if;

      -- сохраняем или обновляем шапку акта
      if v_isnew then
         v_number := g_next_number(p_cex);
         v_id := xx_disl_gu23_act_seq.nextval;
         insert into xx_disl_gu23_act (
            id,
            act_number,
            act_type,
            status,
            cex_code,
            station,
            reason,
            circumstances,
            start_at,
            end_at,
            dur_days,
            dur_hours,
            dur_total_h,
            cal_days,
            linked_start_id,
            created_at,
            created_by,
            modified_at,
            modified_by
         ) values ( v_id,
                    v_number,
                    p_type,
                    p_status,
                    p_cex,
                    p_station,
                    p_reason,
                    p_circumstances,
                    v_start,
                    v_end,
                    v_dd,
                    v_dh,
                    v_th,
                    v_cd,
                    p_linked_start_id,
                    sysdate,
                    p_user_id,
                    sysdate,
                    p_user_id );
      else
         -- Защита: редактировать можно ТОЛЬКО черновик. Действующий/закрытый/
         -- аннулированный акт не изменяется (его можно только аннулировать).
         begin
            select act_number, status
              into v_number, v_cur_status
              from xx_disl_gu23_act
             where id = v_id;
         exception
            when no_data_found then
               return 'ERR' || c_us || 'Акт не найден';
         end;
         if v_cur_status <> 'draft' then
            return 'ERR'
                   || c_us
                   || 'Действующий/закрытый акт не редактируется — аннулируйте и заведите новый';
         end if;
         update xx_disl_gu23_act
            set act_type = p_type,
                status = p_status,
                cex_code = p_cex,
                station = p_station,
                reason = p_reason,
                circumstances = p_circumstances,
                start_at = v_start,
                end_at = v_end,
                dur_days = v_dd,
                dur_hours = v_dh,
                dur_total_h = v_th,
                cal_days = v_cd,
                linked_start_id = p_linked_start_id,
                modified_at = sysdate,
                modified_by = p_user_id
          where id = v_id;
          
         -- Очищаем старые строки вагонов и подписантов для перезаписи
         delete from xx_disl_gu23_act_row
          where act_id = v_id;
         delete from xx_disl_gu23_signer
          where act_id = v_id;
      end if;

      -- разбираем вагоны: тянем данные и проверяем
      v_len := nvl(
         dbms_lob.getlength(p_wagons),
         0
      );
      v_from := 1;
      while v_from <= v_len loop
         v_to := instr(
            p_wagons,
            c_rs,
            v_from
         );
         if v_to = 0 then
            v_to := v_len + 1;
         end if;
         v_rec := dbms_lob.substr(
            p_wagons,
            v_to - v_from,
            v_from
         );
         v_from := v_to + 1;

         -- Считываем номер вагона
         vw_no := trim(g_field(
            v_rec,
            1
         ));
         if vw_no is null then
            continue;
         end if;

         -- ручной ввод характеристик запрещён:
         -- Данные загружаются строго автоматически на бэкенде
         if p_type in ( 'start',
                        'other' ) then
            -- для нового простоя берём данные из функции дислокации
            begin
               select owner,
                      kind,
                      st_from,
                      st_to,
                      cargo,
                      weight
                 into
                  vw_owner,
                  vw_kind,
                  vw_from,
                  vw_to,
                  vw_cargo,
                  vw_weight
                 from table ( xx_disl_gu23_pkg.gu23_get_wagon_info(
                  vw_no,
                  p_station
               ) )
                where rownum = 1;
            exception
               when others then
                  -- Если вагон не найден в BI, оставляем характеристики пустыми
                  vw_owner := null;
                  vw_kind := null;
                  vw_from := null;
                  vw_to := null;
                  vw_cargo := null;
                  vw_weight := null;
            end;
         else
            -- для окончания берём данные из акта начала (как прислал клиент)
            vw_owner := g_field(
               v_rec,
               2
            );
            vw_kind := g_field(
               v_rec,
               3
            );
            vw_from := g_field(
               v_rec,
               4
            );
            vw_to := g_field(
               v_rec,
               5
            );
            vw_cargo := g_field(
               v_rec,
               6
            );
            vw_weight := g_field(
               v_rec,
               7
            );
         end if;

         -- не даём создать «начало», если по вагону уже открыт простой
         if
            p_type = 'start'
            and p_status = 'active'
            and p_force <> 'Y'
         then
            v_dupnum := null;
            begin
               select a.act_number
                 into v_dupnum
                 from xx_disl_gu23_act a,
                      xx_disl_gu23_act_row r
                where r.act_id = a.id
                  and a.act_type = 'start'
                  and a.status = 'active'
                  and a.id <> v_id
                  and r.wagon_no = vw_no
                  and rownum = 1;
            exception
               when no_data_found then
                  v_dupnum := null;
            end;

            if v_dupnum is not null then
               rollback;
               return 'ERR'
                      || c_us
                      || 'Нельзя создать акт «Начало простоя»: по вагону '
                      || vw_no
                      || ' уже есть открытый цикл в акте '
                      || v_dupnum;
            end if;
         end if;

         -- проверка (окончание): вагон должен быть из выбранного акта начала
         -- и быть ещё открытым (не закрыт другим действующим актом окончания).
         if
            p_type = 'end'
            and p_status = 'active'
         then
            -- (а) принадлежность выбранному акту начала
            select count(*)
              into v_has_start
              from xx_disl_gu23_act_row r
             where r.act_id = p_linked_start_id
               and r.wagon_no = vw_no;

            if v_has_start = 0 then
               rollback;
               return 'ERR'
                      || c_us
                      || 'Вагон '
                      || vw_no
                      || ' не относится к выбранному акту начала';
            end if;

            -- (б) вагон ещё не закрыт другим действующим окончанием
            select count(*)
              into v_has_start
              from xx_disl_gu23_act e,
                   xx_disl_gu23_act_row er
             where er.act_id = e.id
               and e.act_type = 'end'
               and e.status = 'active'
               and e.linked_start_id = p_linked_start_id
               and e.id <> v_id
               and er.wagon_no = vw_no;

            if v_has_start > 0 then
               rollback;
               return 'ERR'
                      || c_us
                      || 'Вагон '
                      || vw_no
                      || ' уже закрыт другим актом окончания';
            end if;
         end if;

         -- Сохраняем проверенную строку вагона
         insert into xx_disl_gu23_act_row (
            id,
            act_id,
            wagon_no,
            owner,
            kind,
            st_from,
            st_to,
            cargo,
            weight
         ) values ( xx_disl_gu23_act_row_seq.nextval,
                    v_id,
                    vw_no,
                    vw_owner,
                    vw_kind,
                    vw_from,
                    vw_to,
                    vw_cargo,
                    vw_weight );
         v_wcnt := v_wcnt + 1;
      end loop;

      if v_wcnt = 0 then
         rollback;
         return 'ERR'
                || c_us
                || 'Не добавлен ни один вагон';
      end if;

      -- разбираем и пишем подписантов
      v_len := nvl(
         dbms_lob.getlength(p_signers),
         0
      );
      v_from := 1;
      while v_from <= v_len loop
         v_to := instr(
            p_signers,
            c_rs,
            v_from
         );
         if v_to = 0 then
            v_to := v_len + 1;
         end if;
         v_rec := dbms_lob.substr(
            p_signers,
            v_to - v_from,
            v_from
         );
         v_from := v_to + 1;
         vs_fio := g_field(
            v_rec,
            1
         );
         vs_post := g_field(
            v_rec,
            2
         );
         vs_org := g_field(
            v_rec,
            3
         );
         if trim(vs_fio) is null then
            continue;
         end if;
         v_ord := v_ord + 1;
         insert into xx_disl_gu23_signer (
            id,
            act_id,
            fio,
            post,
            org,
            ord_no
         ) values ( xx_disl_gu23_signer_seq.nextval,
                    v_id,
                    vs_fio,
                    vs_post,
                    vs_org,
                    v_ord );
      end loop;

      -- Закрытие циклов акта начала: частичное/полное.
      -- Акт начала переводится в «Закрыт» ТОЛЬКО когда закрыты ВСЕ его вагоны.
      if
         p_type = 'end'
         and p_status = 'active'
         and p_linked_start_id is not null
      then
         select count(*)
           into v_tot
           from xx_disl_gu23_act_row
          where act_id = p_linked_start_id;

         select count(distinct er.wagon_no)
           into v_closed
           from xx_disl_gu23_act e,
                xx_disl_gu23_act_row er
          where er.act_id = e.id
            and e.act_type = 'end'
            and e.status = 'active'
            and e.linked_start_id = p_linked_start_id;

         if v_closed >= v_tot then
            update xx_disl_gu23_act
               set status = 'closed',
                   modified_at = sysdate,
                   modified_by = p_user_id
             where id = p_linked_start_id
               and status = 'active';
            insert into xx_disl_gu23_hist (
               id, act_id, ts, usr, txt
            ) values ( xx_disl_gu23_hist_seq.nextval,
                       p_linked_start_id,
                       sysdate,
                       p_user_id,
                       'Цикл простоя полностью закрыт актом окончания ' || v_number );
         else
            insert into xx_disl_gu23_hist (
               id, act_id, ts, usr, txt
            ) values ( xx_disl_gu23_hist_seq.nextval,
                       p_linked_start_id,
                       sysdate,
                       p_user_id,
                       'Частично закрыто актом окончания ' || v_number
                       || ' (' || v_closed || ' из ' || v_tot || ')' );
         end if;
      end if;

      -- Логирование операции в историю изменений
      insert into xx_disl_gu23_hist (
         id,
         act_id,
         ts,
         usr,
         txt
      ) values ( xx_disl_gu23_hist_seq.nextval,
                 v_id,
                 sysdate,
                 p_user_id,
                 case
                    when v_isnew then
                          case
                             when p_status = 'draft' then
                                'Акт создан (черновик)'
                             else
                                'Акт создан и заведён'
                          end
                    else
                       case
                          when p_status = 'draft' then
                                'Черновик изменён'
                          else
                             'Акт изменён / заведён'
                       end
                 end
      );
      commit;
      return 'OK'
             || c_us
             || v_id
             || c_us
             || v_number;
   exception
      when others then
         rollback;
         return 'ERR'
                || c_us
                || sqlerrm;
   end;

   function gu23_del_act (
      p_id      in number,
      p_user_id in number
   ) return varchar2 is
      v_status varchar2(16);
   begin
      select status
        into v_status
        from xx_disl_gu23_act
       where id = p_id;
      if v_status <> 'draft' then
         return 'ERR'
                || c_us
                || 'Удалять можно только черновик. Действующий акт аннулируется.';
      end if;
      delete from xx_disl_gu23_act
       where id = p_id;   -- дети по ON DELETE CASCADE
      commit;
      return 'done';
   exception
      when no_data_found then
         return 'ERR'
                || c_us
                || 'Акт не найден';
      when others then
         rollback;
         return 'ERR'
                || c_us
                || sqlerrm;
   end;

   function gu23_annul_act (
      p_id      in number,
      p_user_id in number,
      p_reason  in varchar2
   ) return varchar2 is
      v_type   varchar2(16);
      v_linked number;
   begin
      select act_type,
             linked_start_id
        into
         v_type,
         v_linked
        from xx_disl_gu23_act
       where id = p_id;

      update xx_disl_gu23_act
         set status = 'annulled',
             annul_reason = p_reason,
             modified_at = sysdate,
             modified_by = p_user_id
       where id = p_id;

        -- при аннулировании акта окончания — снова открываем связанный акт начала
      if
         v_type = 'end'
         and v_linked is not null
      then
         update xx_disl_gu23_act
            set status = 'active',
                modified_at = sysdate,
                modified_by = p_user_id
          where id = v_linked
            and status = 'closed';
      end if;

      insert into xx_disl_gu23_hist (
         id,
         act_id,
         ts,
         usr,
         txt
      ) values ( xx_disl_gu23_hist_seq.nextval,
                 p_id,
                 sysdate,
                 p_user_id,
                 'Акт аннулирован: ' || p_reason );
      commit;
      return 'done';
   exception
      when no_data_found then
         return 'ERR'
                || c_us
                || 'Акт не найден';
      when others then
         rollback;
         return 'ERR'
                || c_us
                || sqlerrm;
   end;

end xx_disl_gu23_pkg;

-- =====================================================================
--  seed_gu23.sql  —  демо-наполнение справочников и dev-пользователя
--  (значения из прототипа; редактируются прямо в таблицах ref_*)
-- =====================================================================

-- --- dev-пользователь (его user_id должен совпадать с db_config.local.php) ---
DELETE FROM xx_disl_gu23_users WHERE user_id = 1;
INSERT INTO xx_disl_gu23_users (user_id, login, full_name)
VALUES (1, 'dev', 'Локальный разработчик');

-- --- цеха ---
INSERT INTO xx_disl_gu23_ref_cex (id, code, name) VALUES (xx_disl_gu23_ref_cex_seq.NEXTVAL, 'ЖДЦ', 'Железнодорожный цех');
INSERT INTO xx_disl_gu23_ref_cex (id, code, name) VALUES (xx_disl_gu23_ref_cex_seq.NEXTVAL, 'ВЧД', 'Вагонное депо');
INSERT INTO xx_disl_gu23_ref_cex (id, code, name) VALUES (xx_disl_gu23_ref_cex_seq.NEXTVAL, 'ПТО', 'Пункт техн. обслуживания');
INSERT INTO xx_disl_gu23_ref_cex (id, code, name) VALUES (xx_disl_gu23_ref_cex_seq.NEXTVAL, 'ПРР', 'Погрузо-разгрузочный район');

-- --- причины ---
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Простой под выгрузкой');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Простой под погрузкой');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Неприём вагонов станцией');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Ожидание подачи/уборки');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Неудовлетворительное состояние вагона');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Техническая неисправность');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Коммерческая неисправность');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Повреждение вагона');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Следы течи / просыпания / загрязнения');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Несоответствие требованиям погрузки/выгрузки');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Качество перевозимого груза');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Предоставление информации собственнику');
INSERT INTO xx_disl_gu23_ref_reason (id, name) VALUES (xx_disl_gu23_ref_reason_seq.NEXTVAL, 'Предоставление информации экспедитору');

-- --- станции ---
INSERT INTO xx_disl_gu23_ref_station (id, name) VALUES (xx_disl_gu23_ref_station_seq.NEXTVAL, 'Углеуральская');
INSERT INTO xx_disl_gu23_ref_station (id, name) VALUES (xx_disl_gu23_ref_station_seq.NEXTVAL, 'Чусовская');
INSERT INTO xx_disl_gu23_ref_station (id, name) VALUES (xx_disl_gu23_ref_station_seq.NEXTVAL, 'Пермь-Сортировочная');
INSERT INTO xx_disl_gu23_ref_station (id, name) VALUES (xx_disl_gu23_ref_station_seq.NEXTVAL, 'Гороблагодатская');
INSERT INTO xx_disl_gu23_ref_station (id, name) VALUES (xx_disl_gu23_ref_station_seq.NEXTVAL, 'Кизел');
INSERT INTO xx_disl_gu23_ref_station (id, name) VALUES (xx_disl_gu23_ref_station_seq.NEXTVAL, 'Березники');

-- --- собственники ---
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'ОАО «РЖД»');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'ПГК');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'ФГК');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'НефтеТрансСервис');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'СУЭК');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'Собственный парк');
INSERT INTO xx_disl_gu23_ref_owner (id, name) VALUES (xx_disl_gu23_ref_owner_seq.NEXTVAL, 'Уралкалий');

-- --- род вагона ---
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Полувагон');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Цистерна');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Крытый');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Платформа');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Хоппер');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Думпкар');
INSERT INTO xx_disl_gu23_ref_wagon_kind (id, name) VALUES (xx_disl_gu23_ref_wagon_kind_seq.NEXTVAL, 'Окатышевоз');

-- --- подписанты ---
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Смирнов А.В.', 'Начальник смены', 'Предприятие', 'ЖДЦ', 'Работник предприятия');
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Петрова Е.Н.', 'Инженер по перевозкам', 'Предприятие', 'ЖДЦ', 'Работник предприятия');
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Козлов Д.А.', 'Приёмосдатчик', 'ОАО «РЖД»', 'ст. Углеуральская', 'Работник станции ОАО «РЖД»');
INSERT INTO xx_disl_gu23_ref_signer (id, fio, post, org, unit, stype)
VALUES (xx_disl_gu23_ref_signer_seq.NEXTVAL, 'Орлова М.С.', 'Мастер', 'Предприятие', 'ВЧД', 'Работник предприятия');

COMMIT;
