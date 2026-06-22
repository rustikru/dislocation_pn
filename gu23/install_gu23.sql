-- =====================================================================
--  install_gu23.sql  —  ГУ-23 · Акты общей формы
--  Локальный (standalone) инсталл-скрипт для модуля gu23.
--
--  ЧТО ДЕЛАЕТ:
--    1. Создаёт таблицы xx_disl_gu23_* и sequences (по одному на таблицу).
--    2. Создаёт объектные типы для конвейерных функций.
--    3. Создаёт пакет xx_dislocation в ЛОКАЛЬНОЙ мини-версии — только
--       функции gu23_*. Они зависят ТОЛЬКО от таблиц xx_disl_gu23_*,
--       поэтому компилируются на пустой базе (без всех таблиц прода).
--    4. Засевает справочники, dev-пользователя и демо-вагоны для
--       имитации Oracle BI / Дислокации.
--
--  ВАЖНО (прод): на проде функции gu23_* нужно ВРЕЗАТЬ в настоящий
--  пакет xx_dislocation (он уже существует и содержит ~300 функций).
--  Здесь они оформлены отдельно только ради локального запуска.
--
--  ЗАПУСК:
--    sqlplus xx_etw/xx_etw@127.0.0.1:1521/FREEPDB1 @install_gu23.sql
-- =====================================================================

SET DEFINE OFF
WHENEVER SQLERROR CONTINUE

PROMPT === Удаление старых объектов (ошибки при первом запуске — норма) ===
DROP TABLE xx_disl_gu23_hist            CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_signer          CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_file            CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_act_row         CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_act             CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_counter         CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_ref_signer      CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_ref_wagon_kind  CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_ref_owner       CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_ref_station     CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_ref_reason      CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_ref_cex         CASCADE CONSTRAINTS PURGE;
DROP TABLE xx_disl_gu23_users           CASCADE CONSTRAINTS PURGE;

DROP SEQUENCE xx_disl_gu23_hist_seq;
DROP SEQUENCE xx_disl_gu23_signer_seq;
DROP SEQUENCE xx_disl_gu23_file_seq;
DROP SEQUENCE xx_disl_gu23_act_row_seq;
DROP SEQUENCE xx_disl_gu23_act_seq;
DROP SEQUENCE xx_disl_gu23_ref_signer_seq;
DROP SEQUENCE xx_disl_gu23_ref_wagon_kind_seq;
DROP SEQUENCE xx_disl_gu23_ref_owner_seq;
DROP SEQUENCE xx_disl_gu23_ref_station_seq;
DROP SEQUENCE xx_disl_gu23_ref_reason_seq;
DROP SEQUENCE xx_disl_gu23_ref_cex_seq;
DROP SEQUENCE xx_disl_gu23_users_seq;

-- =====================================================================
--  ТАБЛИЦЫ + SEQUENCES
-- =====================================================================
WHENEVER SQLERROR EXIT FAILURE

PROMPT === Таблица пользователей (локальный аналог справочника пользователей) ===
CREATE TABLE xx_disl_gu23_users (
    user_id    NUMBER        PRIMARY KEY,
    login      VARCHAR2(64)  NOT NULL,
    full_name  VARCHAR2(256) NOT NULL
);
CREATE SEQUENCE xx_disl_gu23_users_seq START WITH 100 INCREMENT BY 1 NOCACHE;

PROMPT === Справочники ===
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

PROMPT === Нумерация актов (ГУ23-ЦЕХ-ГОД-000001) ===
CREATE TABLE xx_disl_gu23_counter (
    cex_code  VARCHAR2(32),
    yr        NUMBER,
    cnt       NUMBER DEFAULT 0,
    CONSTRAINT xx_disl_gu23_counter_pk PRIMARY KEY (cex_code, yr)
);

PROMPT === Акты (шапка) ===
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

PROMPT === Строки актов (вагоны) ===
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

PROMPT === Приложения (файлы) ===
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

PROMPT === Подписанты акта (хранение, без процесса подписания) ===
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

PROMPT === История изменений ===
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

-- =====================================================================
--  ОБЪЕКТНЫЕ ТИПЫ ДЛЯ КОНВЕЙЕРНЫХ ФУНКЦИЙ
-- =====================================================================
PROMPT === Объектные типы ===

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

PROMPT === Установка пакета ===
@@xx_dislocation_gu23.pks
@@xx_dislocation_gu23.pkb

PROMPT === Засев справочников и демо-данных ===
@@seed_gu23.sql

PROMPT === Готово ===
