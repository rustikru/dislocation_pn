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

-- =====================================================================
--  КОММЕНТАРИИ К ТАБЛИЦАМ И ПОЛЯМ
-- =====================================================================

-- пользователи (локальный аналог справочника пользователей)
COMMENT ON TABLE  xx_disl_gu23_users            IS 'Пользователи модуля ГУ-23 (id, логин, ФИО)';
COMMENT ON COLUMN xx_disl_gu23_users.user_id    IS 'ID пользователя (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_users.login      IS 'Логин';
COMMENT ON COLUMN xx_disl_gu23_users.full_name  IS 'ФИО';

-- справочник: цеха
COMMENT ON TABLE  xx_disl_gu23_ref_cex          IS 'Справочник цехов';
COMMENT ON COLUMN xx_disl_gu23_ref_cex.id       IS 'ID цеха (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_ref_cex.code     IS 'Код цеха (входит в номер акта, напр. ЖДЦ)';
COMMENT ON COLUMN xx_disl_gu23_ref_cex.name     IS 'Наименование цеха';
COMMENT ON COLUMN xx_disl_gu23_ref_cex.active   IS 'Признак активности: Y/N';

-- справочник: причины
COMMENT ON TABLE  xx_disl_gu23_ref_reason          IS 'Справочник причин составления акта';
COMMENT ON COLUMN xx_disl_gu23_ref_reason.id       IS 'ID причины (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_ref_reason.name     IS 'Текст причины';
COMMENT ON COLUMN xx_disl_gu23_ref_reason.act_kind IS 'Для какого типа акта: start/end/other/any';
COMMENT ON COLUMN xx_disl_gu23_ref_reason.active   IS 'Признак активности: Y/N';

-- справочник: станции
COMMENT ON TABLE  xx_disl_gu23_ref_station        IS 'Справочник станций';
COMMENT ON COLUMN xx_disl_gu23_ref_station.id     IS 'ID станции (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_ref_station.name   IS 'Наименование станции';
COMMENT ON COLUMN xx_disl_gu23_ref_station.active IS 'Признак активности: Y/N';

-- справочник: собственники вагонов
COMMENT ON TABLE  xx_disl_gu23_ref_owner        IS 'Справочник собственников вагонов';
COMMENT ON COLUMN xx_disl_gu23_ref_owner.id     IS 'ID собственника (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_ref_owner.name   IS 'Наименование собственника';
COMMENT ON COLUMN xx_disl_gu23_ref_owner.active IS 'Признак активности: Y/N';

-- справочник: род вагона
COMMENT ON TABLE  xx_disl_gu23_ref_wagon_kind        IS 'Справочник родов вагонов';
COMMENT ON COLUMN xx_disl_gu23_ref_wagon_kind.id     IS 'ID рода вагона (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_ref_wagon_kind.name   IS 'Наименование рода вагона';
COMMENT ON COLUMN xx_disl_gu23_ref_wagon_kind.active IS 'Признак активности: Y/N';

-- справочник: подписанты
COMMENT ON TABLE  xx_disl_gu23_ref_signer        IS 'Справочник возможных подписантов акта';
COMMENT ON COLUMN xx_disl_gu23_ref_signer.id     IS 'ID подписанта (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_ref_signer.fio    IS 'ФИО подписанта';
COMMENT ON COLUMN xx_disl_gu23_ref_signer.post   IS 'Должность';
COMMENT ON COLUMN xx_disl_gu23_ref_signer.org    IS 'Организация';
COMMENT ON COLUMN xx_disl_gu23_ref_signer.unit   IS 'Подразделение';
COMMENT ON COLUMN xx_disl_gu23_ref_signer.stype  IS 'Тип подписанта (работник предприятия / станции ОАО РЖД)';
COMMENT ON COLUMN xx_disl_gu23_ref_signer.active IS 'Признак активности: Y/N';

-- счётчик нумерации актов (по цеху и году)
COMMENT ON TABLE  xx_disl_gu23_counter        IS 'Счётчик номеров актов: своё значение на каждый цех и год';
COMMENT ON COLUMN xx_disl_gu23_counter.id     IS 'ID строки счётчика (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_counter.cex_id IS 'ID цеха -> xx_disl_gu23_ref_cex.id';
COMMENT ON COLUMN xx_disl_gu23_counter.yr     IS 'Год нумерации';
COMMENT ON COLUMN xx_disl_gu23_counter.cnt    IS 'Текущий (последний выданный) номер за цех/год';

-- акты (шапка)
COMMENT ON TABLE  xx_disl_gu23_act                 IS 'Акты общей формы ГУ-23 (шапка)';
COMMENT ON COLUMN xx_disl_gu23_act.id              IS 'ID акта (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_act.act_number      IS 'Номер акта (ГУ23-ЦЕХ-ГОД-NNNNNN)';
COMMENT ON COLUMN xx_disl_gu23_act.act_type        IS 'Тип акта: start (начало) / end (окончание) / other (прочий)';
COMMENT ON COLUMN xx_disl_gu23_act.status          IS 'Статус: draft / active / closed / annulled';
COMMENT ON COLUMN xx_disl_gu23_act.cex_code        IS 'Код цеха составления (из справочника цехов)';
COMMENT ON COLUMN xx_disl_gu23_act.station         IS 'Станция составления';
COMMENT ON COLUMN xx_disl_gu23_act.reason          IS 'Причина составления';
COMMENT ON COLUMN xx_disl_gu23_act.circumstances   IS 'Обстоятельства, вызвавшие составление акта';
COMMENT ON COLUMN xx_disl_gu23_act.start_at        IS 'Дата и время начала простоя';
COMMENT ON COLUMN xx_disl_gu23_act.end_at          IS 'Дата и время окончания простоя';
COMMENT ON COLUMN xx_disl_gu23_act.dur_days        IS 'Длительность простоя: полных дней';
COMMENT ON COLUMN xx_disl_gu23_act.dur_hours       IS 'Длительность простоя: остаток часов';
COMMENT ON COLUMN xx_disl_gu23_act.dur_total_h     IS 'Длительность простоя: всего часов';
COMMENT ON COLUMN xx_disl_gu23_act.cal_days        IS 'Календарных дней (для претензий)';
COMMENT ON COLUMN xx_disl_gu23_act.linked_start_id IS 'Связанный акт начала (для окончания) -> xx_disl_gu23_act.id';
COMMENT ON COLUMN xx_disl_gu23_act.annul_reason    IS 'Причина аннулирования';
COMMENT ON COLUMN xx_disl_gu23_act.created_at      IS 'Дата создания';
COMMENT ON COLUMN xx_disl_gu23_act.created_by      IS 'Кто создал -> xx_disl_gu23_users.user_id';
COMMENT ON COLUMN xx_disl_gu23_act.modified_at     IS 'Дата последнего изменения';
COMMENT ON COLUMN xx_disl_gu23_act.modified_by     IS 'Кто изменил -> xx_disl_gu23_users.user_id';

-- строки актов (вагоны)
COMMENT ON TABLE  xx_disl_gu23_act_row          IS 'Вагоны акта (строки)';
COMMENT ON COLUMN xx_disl_gu23_act_row.id       IS 'ID строки (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_act_row.act_id   IS 'Акт -> xx_disl_gu23_act.id';
COMMENT ON COLUMN xx_disl_gu23_act_row.wagon_no IS 'Номер вагона';
COMMENT ON COLUMN xx_disl_gu23_act_row.owner    IS 'Собственник';
COMMENT ON COLUMN xx_disl_gu23_act_row.kind     IS 'Род вагона';
COMMENT ON COLUMN xx_disl_gu23_act_row.st_from  IS 'Станция отправления';
COMMENT ON COLUMN xx_disl_gu23_act_row.st_to    IS 'Станция назначения';
COMMENT ON COLUMN xx_disl_gu23_act_row.cargo    IS 'Груз';
COMMENT ON COLUMN xx_disl_gu23_act_row.weight   IS 'Вес';

-- приложения (файлы)
COMMENT ON TABLE  xx_disl_gu23_file            IS 'Приложения к акту (файлы/фото)';
COMMENT ON COLUMN xx_disl_gu23_file.id         IS 'ID файла (первичный ключ); имя на диске = id';
COMMENT ON COLUMN xx_disl_gu23_file.act_id     IS 'Акт -> xx_disl_gu23_act.id';
COMMENT ON COLUMN xx_disl_gu23_file.file_name  IS 'Оригинальное имя файла';
COMMENT ON COLUMN xx_disl_gu23_file.file_ext   IS 'Расширение';
COMMENT ON COLUMN xx_disl_gu23_file.mime_type  IS 'MIME-тип';
COMMENT ON COLUMN xx_disl_gu23_file.real_path  IS 'Физический путь к файлу на диске';
COMMENT ON COLUMN xx_disl_gu23_file.created_at IS 'Дата загрузки';
COMMENT ON COLUMN xx_disl_gu23_file.created_by IS 'Кто загрузил -> xx_disl_gu23_users.user_id';

-- подписанты акта (хранение, без процесса подписания)
COMMENT ON TABLE  xx_disl_gu23_signer        IS 'Подписанты конкретного акта';
COMMENT ON COLUMN xx_disl_gu23_signer.id     IS 'ID строки (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_signer.act_id IS 'Акт -> xx_disl_gu23_act.id';
COMMENT ON COLUMN xx_disl_gu23_signer.fio    IS 'ФИО подписанта';
COMMENT ON COLUMN xx_disl_gu23_signer.post   IS 'Должность';
COMMENT ON COLUMN xx_disl_gu23_signer.org    IS 'Организация';
COMMENT ON COLUMN xx_disl_gu23_signer.ord_no IS 'Порядковый номер подписанта в акте';

-- история изменений
COMMENT ON TABLE  xx_disl_gu23_hist        IS 'История изменений акта';
COMMENT ON COLUMN xx_disl_gu23_hist.id     IS 'ID записи (первичный ключ)';
COMMENT ON COLUMN xx_disl_gu23_hist.act_id IS 'Акт -> xx_disl_gu23_act.id';
COMMENT ON COLUMN xx_disl_gu23_hist.ts     IS 'Дата и время события';
COMMENT ON COLUMN xx_disl_gu23_hist.usr    IS 'Кто выполнил -> xx_disl_gu23_users.user_id';
COMMENT ON COLUMN xx_disl_gu23_hist.txt    IS 'Текст события';

-- представление акта (шапка + вычисляемые поля)
COMMENT ON TABLE  xx_disl_gu23_act_v                     IS 'Акты + вычисляемые поля (номер связанного акта, кол-во вагонов/файлов)';
COMMENT ON COLUMN xx_disl_gu23_act_v.linked_start_number IS 'Номер связанного акта начала';
COMMENT ON COLUMN xx_disl_gu23_act_v.wagon_cnt           IS 'Кол-во вагонов в акте';
COMMENT ON COLUMN xx_disl_gu23_act_v.file_cnt            IS 'Кол-во приложений в акте';
