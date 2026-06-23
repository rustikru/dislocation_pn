-- install_gu23_all.sql — ТОЛЬКО обычные объекты ГУ-23
-- (drop + таблицы, последовательности, представление, объектные типы).
-- Пакет ставится отдельно:   compile_gu23_pkg.sql
-- Справочники/данные:         fill_gu23_data.sql
-- Запускать как скрипт под нужной схемой (локально — XX_ETW).

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
        'XX_DISL_GU23_ACT_ROW_SEQ','XX_DISL_GU23_ACT_SEQ','XX_DISL_GU23_COUNTER_SEQ','XX_DISL_GU23_REF_SIGNER_SEQ',
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
    id        NUMBER PRIMARY KEY,
    cex_id    NUMBER NOT NULL,
    yr        NUMBER NOT NULL,
    cnt       NUMBER DEFAULT 0,
    CONSTRAINT xx_disl_gu23_counter_uk UNIQUE (cex_id, yr),
    CONSTRAINT xx_disl_gu23_counter_fk FOREIGN KEY (cex_id)
        REFERENCES xx_disl_gu23_ref_cex (id) ON DELETE CASCADE
);
CREATE SEQUENCE xx_disl_gu23_counter_seq START WITH 1 INCREMENT BY 1 NOCACHE;

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
