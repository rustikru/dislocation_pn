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

-- =====================================================================
--  xx_dislocation_gu23.pks  —  СПЕЦИФИКАЦИЯ пакета (локальная мини-версия)
--
--  ВНИМАНИЕ: локально создаётся пакет xx_dislocation, содержащий ТОЛЬКО
--  функции gu23_*. На проде эти объявления нужно ДОБАВИТЬ в спецификацию
--  настоящего пакета xx_dislocation (не затирая остальные ~300 функций).
--
--  Разделители для передачи коллекций из PHP без JSON (совместимо с 11g):
--     записи (вагоны/подписанты)  — CHR(30)
--     поля внутри записи          — CHR(31)
-- =====================================================================
CREATE OR REPLACE PACKAGE xx_dislocation AS

    -- ---- справочники (select из таблиц ref_*, легко заменить источник) ----
    FUNCTION gu23_get_ref_cex          RETURN xx_disl_gu23_ref_tab     PIPELINED;
    FUNCTION gu23_get_ref_reason (p_kind IN VARCHAR2 DEFAULT NULL)
                                       RETURN xx_disl_gu23_ref_tab     PIPELINED;
    FUNCTION gu23_get_ref_station      RETURN xx_disl_gu23_ref_tab     PIPELINED;
    FUNCTION gu23_get_ref_owner        RETURN xx_disl_gu23_ref_tab     PIPELINED;
    FUNCTION gu23_get_ref_wagon_kind   RETURN xx_disl_gu23_ref_tab     PIPELINED;
    FUNCTION gu23_get_ref_signer       RETURN xx_disl_gu23_signer_tab  PIPELINED;

    -- ---- акты ----
    FUNCTION gu23_get_acts (
        p_q       IN VARCHAR2 DEFAULT NULL,
        p_type    IN VARCHAR2 DEFAULT NULL,
        p_status  IN VARCHAR2 DEFAULT NULL,
        p_cex     IN VARCHAR2 DEFAULT NULL
    ) RETURN xx_disl_gu23_act_tab PIPELINED;

    FUNCTION gu23_get_act        (p_id IN NUMBER)      RETURN xx_disl_gu23_act_tab     PIPELINED;
    FUNCTION gu23_get_rows       (p_act_id IN NUMBER)  RETURN xx_disl_gu23_row_tab     PIPELINED;
    FUNCTION gu23_get_files      (p_act_id IN NUMBER)  RETURN xx_disl_gu23_file_tab    PIPELINED;
    FUNCTION gu23_get_signers    (p_act_id IN NUMBER)  RETURN xx_disl_gu23_signer_tab  PIPELINED;
    FUNCTION gu23_get_hist       (p_act_id IN NUMBER)  RETURN xx_disl_gu23_hist_tab    PIPELINED;

    -- открытые акты начала простоя (для выбора в акте окончания)
    FUNCTION gu23_get_open_starts RETURN xx_disl_gu23_act_tab PIPELINED;

    -- все акты по номеру вагона (поиск по вагону)
    FUNCTION gu23_get_by_wagon (p_wagon IN VARCHAR2) RETURN xx_disl_gu23_act_tab PIPELINED;

    -- ---- интеграция Oracle BI / Дислокация (имитация через select из dual) ----
    FUNCTION gu23_get_wagon_info (
        p_wagons   IN CLOB,
        p_station  IN VARCHAR2 DEFAULT NULL
    ) RETURN xx_disl_gu23_wagon_tab PIPELINED;

    -- ---- запись ----
    -- получить id для нового файла (имя на диске = id)
    FUNCTION gu23_new_file_id RETURN NUMBER;

    FUNCTION gu23_add_file (
        p_act_id    IN NUMBER,
        p_file_id   IN NUMBER,
        p_name      IN VARCHAR2,
        p_ext       IN VARCHAR2,
        p_mime      IN VARCHAR2,
        p_path      IN VARCHAR2,
        p_user_id   IN NUMBER
    ) RETURN VARCHAR2;

    FUNCTION gu23_del_file (p_file_id IN NUMBER, p_user_id IN NUMBER) RETURN VARCHAR2;

    -- сохранение акта (создание/правка черновика) вместе со строками и подписантами.
    -- Возвращает: 'OK'||CHR(31)||id||CHR(31)||number   либо  'ERR'||CHR(31)||текст
    FUNCTION gu23_save_act (
        p_user_id          IN NUMBER,
        p_id               IN NUMBER,        -- 0/NULL = новый
        p_type             IN VARCHAR2,      -- start / end / other
        p_status           IN VARCHAR2,      -- draft / active
        p_cex              IN VARCHAR2,
        p_station          IN VARCHAR2,
        p_reason           IN VARCHAR2,
        p_circumstances    IN VARCHAR2,
        p_start_at         IN VARCHAR2,      -- 'YYYY-MM-DD HH24:MI' или NULL
        p_end_at           IN VARCHAR2,
        p_linked_start_id  IN NUMBER,
        p_wagons           IN CLOB,          -- записи CHR(30); поля CHR(31): no,owner,kind,from,to,cargo,weight
        p_signers          IN CLOB,          -- записи CHR(30); поля CHR(31): fio,post,org
        p_force            IN VARCHAR2 DEFAULT 'N'  -- 'Y' = разрешить дубль открытого простоя
    ) RETURN VARCHAR2;

    FUNCTION gu23_del_act   (p_id IN NUMBER, p_user_id IN NUMBER) RETURN VARCHAR2;
    FUNCTION gu23_annul_act (p_id IN NUMBER, p_user_id IN NUMBER, p_reason IN VARCHAR2) RETURN VARCHAR2;

END xx_dislocation;
/


-- =====================================================================
--  xx_dislocation_gu23.pkb  —  ТЕЛО пакета (локальная мини-версия)
--  Все select'ы и обработка ГУ-23 живут здесь (на проде — врезать в
--  настоящий пакет xx_dislocation).
-- =====================================================================
CREATE OR REPLACE PACKAGE BODY xx_dislocation AS

    c_dtf  CONSTANT VARCHAR2(30) := 'YYYY-MM-DD HH24:MI:SS';
    c_us   CONSTANT CHAR(1)      := CHR(31);   -- разделитель полей
    c_rs   CONSTANT CHAR(1)      := CHR(30);   -- разделитель записей

    -- ----------------------------------------------------------------
    --  ВСПОМОГАТЕЛЬНЫЕ
    -- ----------------------------------------------------------------
    FUNCTION g_user_name (p_user_id IN NUMBER) RETURN VARCHAR2 IS
        v VARCHAR2(256);
    BEGIN
        IF p_user_id IS NULL THEN RETURN NULL; END IF;
        SELECT full_name INTO v FROM xx_disl_gu23_users WHERE user_id = p_user_id;
        RETURN v;
    EXCEPTION WHEN NO_DATA_FOUND THEN RETURN NULL;
    END;

    -- n-е поле строки, разделители CHR(31)
    FUNCTION g_field (p_line IN VARCHAR2, p_idx IN PLS_INTEGER) RETURN VARCHAR2 IS
        v_from PLS_INTEGER := 1;
        v_to   PLS_INTEGER;
        v_i    PLS_INTEGER := 1;
    BEGIN
        LOOP
            v_to := INSTR(p_line, c_us, 1, v_i);
            IF v_i = p_idx THEN
                IF v_to = 0 THEN RETURN SUBSTR(p_line, v_from);
                ELSE RETURN SUBSTR(p_line, v_from, v_to - v_from); END IF;
            END IF;
            EXIT WHEN v_to = 0;
            v_from := v_to + 1;
            v_i := v_i + 1;
        END LOOP;
        RETURN NULL;
    END;

    FUNCTION g_to_date (p_str IN VARCHAR2) RETURN DATE IS
    BEGIN
        IF p_str IS NULL OR TRIM(p_str) IS NULL THEN RETURN NULL; END IF;
        -- принимаем 'YYYY-MM-DD HH24:MI' или с секундами; берём до минут
        RETURN TO_DATE(SUBSTR(REPLACE(p_str,'T',' '),1,16), 'YYYY-MM-DD HH24:MI');
    END;

    -- следующий уникальный номер акта ГУ23-ЦЕХ-ГОД-000001
    FUNCTION g_next_number (p_cex IN VARCHAR2) RETURN VARCHAR2 IS
        v_yr  NUMBER := TO_NUMBER(TO_CHAR(SYSDATE,'YYYY'));
        v_cnt NUMBER;
    BEGIN
        UPDATE xx_disl_gu23_counter
           SET cnt = cnt + 1
         WHERE cex_code = p_cex AND yr = v_yr
        RETURNING cnt INTO v_cnt;
        IF SQL%ROWCOUNT = 0 THEN
            v_cnt := 1;
            INSERT INTO xx_disl_gu23_counter (cex_code, yr, cnt)
            VALUES (p_cex, v_yr, v_cnt);
        END IF;
        RETURN 'ГУ23-' || p_cex || '-' || v_yr || '-' || LPAD(v_cnt, 6, '0');
    END;

    -- единый маппер строки представления акта -> объект (именованно, наглядно)
    FUNCTION g_act_obj (a IN xx_disl_gu23_act_v%ROWTYPE) RETURN xx_disl_gu23_act_obj IS
        o xx_disl_gu23_act_obj := xx_disl_gu23_act_obj(
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
    BEGIN
        o.id                  := a.id;
        o.act_number          := a.act_number;
        o.act_type            := a.act_type;
        o.status              := a.status;
        o.cex                 := a.cex_code;
        o.station             := a.station;
        o.reason              := a.reason;
        o.circumstances       := a.circumstances;
        o.start_at            := TO_CHAR(a.start_at, c_dtf);
        o.end_at              := TO_CHAR(a.end_at,   c_dtf);
        o.dur_days            := a.dur_days;
        o.dur_hours           := a.dur_hours;
        o.dur_total_h         := a.dur_total_h;
        o.cal_days            := a.cal_days;
        o.linked_start_id     := a.linked_start_id;
        o.linked_start_number := a.linked_start_number;
        o.wagon_cnt           := a.wagon_cnt;
        o.file_cnt            := a.file_cnt;
        o.annul_reason        := a.annul_reason;
        o.created_at          := TO_CHAR(a.created_at, c_dtf);
        o.created_by          := g_user_name(a.created_by);
        o.modified_at         := TO_CHAR(a.modified_at, c_dtf);
        RETURN o;
    END;

    -- ----------------------------------------------------------------
    --  СПРАВОЧНИКИ
    -- ----------------------------------------------------------------
    FUNCTION gu23_get_ref_cex RETURN xx_disl_gu23_ref_tab PIPELINED IS
    BEGIN
        FOR r IN (SELECT code, name FROM xx_disl_gu23_ref_cex
                   WHERE active = 'Y' ORDER BY name) LOOP
            PIPE ROW (xx_disl_gu23_ref_obj(r.code, r.name));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_ref_reason (p_kind IN VARCHAR2 DEFAULT NULL)
        RETURN xx_disl_gu23_ref_tab PIPELINED IS
    BEGIN
        FOR r IN (SELECT name FROM xx_disl_gu23_ref_reason
                   WHERE active = 'Y'
                     AND (p_kind IS NULL OR act_kind IN ('any', p_kind))
                   ORDER BY name) LOOP
            PIPE ROW (xx_disl_gu23_ref_obj(r.name, r.name));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_ref_station RETURN xx_disl_gu23_ref_tab PIPELINED IS
    BEGIN
        FOR r IN (SELECT name FROM xx_disl_gu23_ref_station
                   WHERE active = 'Y' ORDER BY name) LOOP
            PIPE ROW (xx_disl_gu23_ref_obj(r.name, r.name));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_ref_owner RETURN xx_disl_gu23_ref_tab PIPELINED IS
    BEGIN
        FOR r IN (SELECT name FROM xx_disl_gu23_ref_owner
                   WHERE active = 'Y' ORDER BY name) LOOP
            PIPE ROW (xx_disl_gu23_ref_obj(r.name, r.name));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_ref_wagon_kind RETURN xx_disl_gu23_ref_tab PIPELINED IS
    BEGIN
        FOR r IN (SELECT name FROM xx_disl_gu23_ref_wagon_kind
                   WHERE active = 'Y' ORDER BY name) LOOP
            PIPE ROW (xx_disl_gu23_ref_obj(r.name, r.name));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_ref_signer RETURN xx_disl_gu23_signer_tab PIPELINED IS
    BEGIN
        FOR r IN (SELECT id, fio, post, org, unit, stype FROM xx_disl_gu23_ref_signer
                   WHERE active = 'Y' ORDER BY fio) LOOP
            PIPE ROW (xx_disl_gu23_signer_obj(r.id, r.fio, r.post, r.org, r.unit, r.stype, NULL));
        END LOOP;
        RETURN;
    END;

    -- ----------------------------------------------------------------
    --  АКТЫ (чтение)
    -- ----------------------------------------------------------------
    FUNCTION gu23_get_acts (
        p_q       IN VARCHAR2 DEFAULT NULL,
        p_type    IN VARCHAR2 DEFAULT NULL,
        p_status  IN VARCHAR2 DEFAULT NULL,
        p_cex     IN VARCHAR2 DEFAULT NULL
    ) RETURN xx_disl_gu23_act_tab PIPELINED IS
        v_q VARCHAR2(512) := LOWER(p_q);
    BEGIN
        FOR a IN (
            SELECT * FROM xx_disl_gu23_act_v a
             WHERE (p_type   IS NULL OR a.act_type = p_type)
               AND (p_status IS NULL OR a.status   = p_status)
               AND (p_cex    IS NULL OR a.cex_code = p_cex)
               AND (v_q IS NULL
                    OR LOWER(a.act_number) LIKE '%'||v_q||'%'
                    OR LOWER(a.reason)     LIKE '%'||v_q||'%'
                    OR EXISTS (SELECT 1 FROM xx_disl_gu23_act_row r
                                WHERE r.act_id = a.id AND r.wagon_no LIKE '%'||p_q||'%'))
             ORDER BY a.created_at DESC, a.id DESC
        ) LOOP
            PIPE ROW (g_act_obj(a));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_act (p_id IN NUMBER) RETURN xx_disl_gu23_act_tab PIPELINED IS
    BEGIN
        FOR a IN (SELECT * FROM xx_disl_gu23_act_v a WHERE a.id = p_id) LOOP
            PIPE ROW (g_act_obj(a));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_rows (p_act_id IN NUMBER) RETURN xx_disl_gu23_row_tab PIPELINED IS
    BEGIN
        FOR r IN (SELECT * FROM xx_disl_gu23_act_row WHERE act_id = p_act_id ORDER BY id) LOOP
            PIPE ROW (xx_disl_gu23_row_obj(r.id, r.act_id, r.wagon_no, r.owner,
                                           r.kind, r.st_from, r.st_to, r.cargo, r.weight));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_files (p_act_id IN NUMBER) RETURN xx_disl_gu23_file_tab PIPELINED IS
    BEGIN
        FOR f IN (SELECT * FROM xx_disl_gu23_file WHERE act_id = p_act_id ORDER BY id) LOOP
            PIPE ROW (xx_disl_gu23_file_obj(f.id, f.act_id, f.file_name, f.file_ext,
                                            f.mime_type, f.real_path,
                                            TO_CHAR(f.created_at, c_dtf), g_user_name(f.created_by)));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_signers (p_act_id IN NUMBER) RETURN xx_disl_gu23_signer_tab PIPELINED IS
    BEGIN
        FOR s IN (SELECT * FROM xx_disl_gu23_signer WHERE act_id = p_act_id ORDER BY ord_no, id) LOOP
            PIPE ROW (xx_disl_gu23_signer_obj(s.id, s.fio, s.post, s.org, NULL, NULL, s.ord_no));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_hist (p_act_id IN NUMBER) RETURN xx_disl_gu23_hist_tab PIPELINED IS
    BEGIN
        FOR h IN (SELECT * FROM xx_disl_gu23_hist WHERE act_id = p_act_id ORDER BY ts DESC, id DESC) LOOP
            PIPE ROW (xx_disl_gu23_hist_obj(h.id, h.act_id, TO_CHAR(h.ts, c_dtf),
                                            g_user_name(h.usr), h.txt));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_open_starts RETURN xx_disl_gu23_act_tab PIPELINED IS
    BEGIN
        FOR a IN (SELECT * FROM xx_disl_gu23_act_v a
                   WHERE a.act_type = 'start' AND a.status = 'active'
                   ORDER BY a.start_at) LOOP
            PIPE ROW (g_act_obj(a));
        END LOOP;
        RETURN;
    END;

    FUNCTION gu23_get_by_wagon (p_wagon IN VARCHAR2) RETURN xx_disl_gu23_act_tab PIPELINED IS
    BEGIN
        FOR a IN (
            SELECT * FROM xx_disl_gu23_act_v a
             WHERE EXISTS (SELECT 1 FROM xx_disl_gu23_act_row r
                            WHERE r.act_id = a.id AND r.wagon_no = p_wagon)
             ORDER BY a.created_at DESC, a.id DESC
        ) LOOP
            PIPE ROW (g_act_obj(a));
        END LOOP;
        RETURN;
    END;

    -- ----------------------------------------------------------------
    --  Oracle BI / Дислокация (ИМИТАЦИЯ через select из dual)
    --  >>> ЗАМЕНИТЬ тело на реальный запрос к источнику данных <<<
    -- ----------------------------------------------------------------
    FUNCTION gu23_get_wagon_info (
        p_wagons   IN CLOB,
        p_station  IN VARCHAR2 DEFAULT NULL
    ) RETURN xx_disl_gu23_wagon_tab PIPELINED IS
        v_len   PLS_INTEGER := NVL(DBMS_LOB.GETLENGTH(p_wagons), 0);
        v_from  PLS_INTEGER := 1;
        v_to    PLS_INTEGER;
        v_no    VARCHAR2(32);
        v_last  PLS_INTEGER;
        v_d2    PLS_INTEGER;
    BEGIN
        -- данные подтягиваются только если станция операции — Углеуральская
        IF p_station IS NOT NULL AND p_station <> 'Углеуральская' THEN
            RETURN;
        END IF;

        WHILE v_from <= v_len LOOP
            v_to := INSTR(p_wagons, c_rs, v_from);
            IF v_to = 0 THEN v_to := v_len + 1; END IF;
            v_no := TRIM(DBMS_LOB.SUBSTR(p_wagons, v_to - v_from, v_from));
            v_from := v_to + 1;
            IF v_no IS NULL THEN CONTINUE; END IF;

            -- ===== НАЧАЛО блока-заглушки (заменить на реальный select) =====
            -- Имитация: вагон с последней цифрой 0 считается «не найденным».
            v_last := TO_NUMBER(SUBSTR(v_no, -1));
            v_d2   := TO_NUMBER(SUBSTR(v_no, -2));
            IF v_last = 0 THEN
                PIPE ROW (xx_disl_gu23_wagon_obj(v_no, NULL, NULL, NULL, NULL, NULL, NULL, 0));
            ELSE
                FOR d IN (
                    SELECT
                        CASE MOD(v_d2, 5)
                            WHEN 0 THEN 'ПГК' WHEN 1 THEN 'ФГК' WHEN 2 THEN 'СУЭК'
                            WHEN 3 THEN 'Уралкалий' ELSE 'НефтеТрансСервис' END AS owner,
                        CASE MOD(v_d2, 4)
                            WHEN 0 THEN 'Полувагон' WHEN 1 THEN 'Цистерна'
                            WHEN 2 THEN 'Хоппер' ELSE 'Крытый' END AS kind,
                        CASE MOD(v_d2, 3)
                            WHEN 0 THEN 'Кизел' WHEN 1 THEN 'Березники' ELSE 'Чусовская' END AS st_from,
                        'Углеуральская' AS st_to,
                        CASE MOD(v_d2, 4)
                            WHEN 0 THEN 'Уголь каменный' WHEN 1 THEN 'Удобрения минеральные'
                            WHEN 2 THEN 'Кокс' ELSE 'Дизельное топливо' END AS cargo,
                        TO_CHAR(60 + MOD(v_d2, 12)) || ',' || TO_CHAR(v_last) || ' т' AS weight
                    FROM dual
                ) LOOP
                    PIPE ROW (xx_disl_gu23_wagon_obj(v_no, d.owner, d.kind,
                                d.st_from, d.st_to, d.cargo, d.weight, 1));
                END LOOP;
            END IF;
            -- ===== КОНЕЦ блока-заглушки =====
        END LOOP;
        RETURN;
    END;

    -- ----------------------------------------------------------------
    --  ФАЙЛЫ
    -- ----------------------------------------------------------------
    FUNCTION gu23_new_file_id RETURN NUMBER IS
        v NUMBER;
    BEGIN
        SELECT xx_disl_gu23_file_seq.NEXTVAL INTO v FROM dual;
        RETURN v;
    END;

    FUNCTION gu23_add_file (
        p_act_id    IN NUMBER,
        p_file_id   IN NUMBER,
        p_name      IN VARCHAR2,
        p_ext       IN VARCHAR2,
        p_mime      IN VARCHAR2,
        p_path      IN VARCHAR2,
        p_user_id   IN NUMBER
    ) RETURN VARCHAR2 IS
    BEGIN
        INSERT INTO xx_disl_gu23_file (id, act_id, file_name, file_ext, mime_type,
                                       real_path, created_at, created_by)
        VALUES (p_file_id, p_act_id, p_name, p_ext, p_mime, p_path, SYSDATE, p_user_id);

        INSERT INTO xx_disl_gu23_hist (id, act_id, ts, usr, txt)
        VALUES (xx_disl_gu23_hist_seq.NEXTVAL, p_act_id, SYSDATE, p_user_id,
                'Прикреплён файл: ' || p_name);
        COMMIT;
        RETURN 'done';
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK; RETURN 'ERR' || c_us || SQLERRM;
    END;

    FUNCTION gu23_del_file (p_file_id IN NUMBER, p_user_id IN NUMBER) RETURN VARCHAR2 IS
        v_act NUMBER; v_name VARCHAR2(512);
    BEGIN
        SELECT act_id, file_name INTO v_act, v_name
          FROM xx_disl_gu23_file WHERE id = p_file_id;
        DELETE FROM xx_disl_gu23_file WHERE id = p_file_id;
        INSERT INTO xx_disl_gu23_hist (id, act_id, ts, usr, txt)
        VALUES (xx_disl_gu23_hist_seq.NEXTVAL, v_act, SYSDATE, p_user_id,
                'Удалён файл: ' || v_name);
        COMMIT;
        RETURN 'done';
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK; RETURN 'ERR' || c_us || SQLERRM;
    END;

    -- ----------------------------------------------------------------
    --  СОХРАНЕНИЕ АКТА
    -- ----------------------------------------------------------------
    FUNCTION gu23_save_act (
        p_user_id          IN NUMBER,
        p_id               IN NUMBER,
        p_type             IN VARCHAR2,
        p_status           IN VARCHAR2,
        p_cex              IN VARCHAR2,
        p_station          IN VARCHAR2,
        p_reason           IN VARCHAR2,
        p_circumstances    IN VARCHAR2,
        p_start_at         IN VARCHAR2,
        p_end_at           IN VARCHAR2,
        p_linked_start_id  IN NUMBER,
        p_wagons           IN CLOB,
        p_signers          IN CLOB,
        p_force            IN VARCHAR2 DEFAULT 'N'
    ) RETURN VARCHAR2 IS
        v_id        NUMBER := p_id;
        v_number    VARCHAR2(64);
        v_start     DATE := g_to_date(p_start_at);
        v_end       DATE := g_to_date(p_end_at);
        v_dd        NUMBER; v_dh NUMBER; v_th NUMBER; v_cd NUMBER;
        v_isnew     BOOLEAN := (p_id IS NULL OR p_id = 0);
        v_dup       VARCHAR2(2000);
        v_len       PLS_INTEGER;
        v_from      PLS_INTEGER;
        v_to        PLS_INTEGER;
        v_rec       VARCHAR2(4000);
        v_ord       NUMBER := 0;
        v_wcnt      NUMBER := 0;
    BEGIN
        -- --- валидация ---
        IF p_type NOT IN ('start','end','other') THEN
            RETURN 'ERR' || c_us || 'Неверный тип акта';
        END IF;
        IF NVL(p_cex,'X') = 'X' THEN
            RETURN 'ERR' || c_us || 'Не указан цех';
        END IF;
        IF p_type = 'start' AND v_start IS NULL THEN
            RETURN 'ERR' || c_us || 'Не указана дата начала простоя';
        END IF;
        IF p_type = 'end' THEN
            IF p_linked_start_id IS NULL THEN
                RETURN 'ERR' || c_us || 'Не выбран открытый акт начала простоя';
            END IF;
            IF v_end IS NULL THEN
                RETURN 'ERR' || c_us || 'Не указана дата окончания простоя';
            END IF;
            -- подтягиваем дату начала из связанного акта, если не передана
            IF v_start IS NULL THEN
                BEGIN SELECT start_at INTO v_start FROM xx_disl_gu23_act
                       WHERE id = p_linked_start_id; EXCEPTION WHEN NO_DATA_FOUND THEN NULL; END;
            END IF;
            IF v_start IS NOT NULL AND v_end < v_start THEN
                RETURN 'ERR' || c_us || 'Дата окончания меньше даты начала';
            END IF;
        END IF;

        -- Запрет дубля открытого простоя (для start/active) выполняется ниже,
        -- при разборе вагонов — по каждому номеру.

        -- --- расчёт простоя (для end) ---
        IF p_type = 'end' AND v_start IS NOT NULL AND v_end IS NOT NULL THEN
            v_th := ROUND((v_end - v_start) * 24, 1);
            v_dd := TRUNC(v_end - v_start);
            v_dh := ROUND(((v_end - v_start) - v_dd) * 24);
            v_cd := CEIL(v_end - v_start);
        END IF;

        -- --- номер ---
        IF v_isnew THEN
            v_number := g_next_number(p_cex);
            v_id := xx_disl_gu23_act_seq.NEXTVAL;
            INSERT INTO xx_disl_gu23_act (
                id, act_number, act_type, status, cex_code, station, reason,
                circumstances, start_at, end_at, dur_days, dur_hours, dur_total_h,
                cal_days, linked_start_id, created_at, created_by, modified_at, modified_by)
            VALUES (
                v_id, v_number, p_type, p_status, p_cex, p_station, p_reason,
                p_circumstances, v_start, v_end, v_dd, v_dh, v_th,
                v_cd, p_linked_start_id, SYSDATE, p_user_id, SYSDATE, p_user_id);
        ELSE
            SELECT act_number INTO v_number FROM xx_disl_gu23_act WHERE id = v_id;
            UPDATE xx_disl_gu23_act
               SET act_type = p_type, status = p_status, cex_code = p_cex,
                   station = p_station, reason = p_reason, circumstances = p_circumstances,
                   start_at = v_start, end_at = v_end, dur_days = v_dd, dur_hours = v_dh,
                   dur_total_h = v_th, cal_days = v_cd, linked_start_id = p_linked_start_id,
                   modified_at = SYSDATE, modified_by = p_user_id
             WHERE id = v_id;
            DELETE FROM xx_disl_gu23_act_row WHERE act_id = v_id;
            DELETE FROM xx_disl_gu23_signer  WHERE act_id = v_id;
        END IF;

        -- --- разбор и вставка вагонов ---
        v_len := NVL(DBMS_LOB.GETLENGTH(p_wagons), 0);
        v_from := 1;
        WHILE v_from <= v_len LOOP
            v_to := INSTR(p_wagons, c_rs, v_from);
            IF v_to = 0 THEN v_to := v_len + 1; END IF;
            v_rec := DBMS_LOB.SUBSTR(p_wagons, v_to - v_from, v_from);
            v_from := v_to + 1;
            IF TRIM(g_field(v_rec, 1)) IS NULL THEN CONTINUE; END IF;

            -- проверка дубля открытого простоя
            IF p_type = 'start' AND p_status = 'active' AND p_force <> 'Y' THEN
                FOR d IN (SELECT a.act_number FROM xx_disl_gu23_act a
                           JOIN xx_disl_gu23_act_row r ON r.act_id = a.id
                          WHERE a.act_type = 'start' AND a.status = 'active'
                            AND a.id <> v_id AND r.wagon_no = TRIM(g_field(v_rec,1))
                            AND ROWNUM = 1) LOOP
                    ROLLBACK;
                    RETURN 'ERR' || c_us || 'По вагону ' || TRIM(g_field(v_rec,1)) ||
                           ' уже есть открытый акт начала (' || d.act_number || ')';
                END LOOP;
            END IF;

            INSERT INTO xx_disl_gu23_act_row (id, act_id, wagon_no, owner, kind,
                                              st_from, st_to, cargo, weight)
            VALUES (xx_disl_gu23_act_row_seq.NEXTVAL, v_id,
                    TRIM(g_field(v_rec,1)), g_field(v_rec,2), g_field(v_rec,3),
                    g_field(v_rec,4), g_field(v_rec,5), g_field(v_rec,6), g_field(v_rec,7));
            v_wcnt := v_wcnt + 1;
        END LOOP;

        IF v_wcnt = 0 THEN
            ROLLBACK;
            RETURN 'ERR' || c_us || 'Не добавлен ни один вагон';
        END IF;

        -- --- разбор и вставка подписантов ---
        v_len := NVL(DBMS_LOB.GETLENGTH(p_signers), 0);
        v_from := 1;
        WHILE v_from <= v_len LOOP
            v_to := INSTR(p_signers, c_rs, v_from);
            IF v_to = 0 THEN v_to := v_len + 1; END IF;
            v_rec := DBMS_LOB.SUBSTR(p_signers, v_to - v_from, v_from);
            v_from := v_to + 1;
            IF TRIM(g_field(v_rec, 1)) IS NULL THEN CONTINUE; END IF;
            v_ord := v_ord + 1;
            INSERT INTO xx_disl_gu23_signer (id, act_id, fio, post, org, ord_no)
            VALUES (xx_disl_gu23_signer_seq.NEXTVAL, v_id,
                    g_field(v_rec,1), g_field(v_rec,2), g_field(v_rec,3), v_ord);
        END LOOP;

        -- --- закрытие связанного акта начала (для активного акта окончания) ---
        IF p_type = 'end' AND p_status = 'active' AND p_linked_start_id IS NOT NULL THEN
            UPDATE xx_disl_gu23_act SET status = 'closed', modified_at = SYSDATE,
                   modified_by = p_user_id
             WHERE id = p_linked_start_id AND status = 'active';
            IF SQL%ROWCOUNT > 0 THEN
                INSERT INTO xx_disl_gu23_hist (id, act_id, ts, usr, txt)
                VALUES (xx_disl_gu23_hist_seq.NEXTVAL, p_linked_start_id, SYSDATE,
                        p_user_id, 'Цикл простоя закрыт актом окончания ' || v_number);
            END IF;
        END IF;

        -- --- история ---
        INSERT INTO xx_disl_gu23_hist (id, act_id, ts, usr, txt)
        VALUES (xx_disl_gu23_hist_seq.NEXTVAL, v_id, SYSDATE, p_user_id,
                CASE WHEN v_isnew THEN
                        CASE WHEN p_status = 'draft' THEN 'Акт создан (черновик)'
                             ELSE 'Акт создан и заведён' END
                     ELSE
                        CASE WHEN p_status = 'draft' THEN 'Черновик изменён'
                             ELSE 'Акт изменён / заведён' END
                END);

        COMMIT;
        RETURN 'OK' || c_us || v_id || c_us || v_number;
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK;
        RETURN 'ERR' || c_us || SQLERRM;
    END;

    FUNCTION gu23_del_act (p_id IN NUMBER, p_user_id IN NUMBER) RETURN VARCHAR2 IS
        v_status VARCHAR2(16);
    BEGIN
        SELECT status INTO v_status FROM xx_disl_gu23_act WHERE id = p_id;
        IF v_status <> 'draft' THEN
            RETURN 'ERR' || c_us || 'Удалять можно только черновик. Действующий акт аннулируется.';
        END IF;
        DELETE FROM xx_disl_gu23_act WHERE id = p_id;   -- дети по ON DELETE CASCADE
        COMMIT;
        RETURN 'done';
    EXCEPTION
        WHEN NO_DATA_FOUND THEN RETURN 'ERR' || c_us || 'Акт не найден';
        WHEN OTHERS THEN ROLLBACK; RETURN 'ERR' || c_us || SQLERRM;
    END;

    FUNCTION gu23_annul_act (p_id IN NUMBER, p_user_id IN NUMBER, p_reason IN VARCHAR2)
        RETURN VARCHAR2 IS
        v_type VARCHAR2(16); v_linked NUMBER;
    BEGIN
        SELECT act_type, linked_start_id INTO v_type, v_linked
          FROM xx_disl_gu23_act WHERE id = p_id;

        UPDATE xx_disl_gu23_act
           SET status = 'annulled', annul_reason = p_reason,
               modified_at = SYSDATE, modified_by = p_user_id
         WHERE id = p_id;

        -- при аннулировании акта окончания — снова открываем связанный акт начала
        IF v_type = 'end' AND v_linked IS NOT NULL THEN
            UPDATE xx_disl_gu23_act SET status = 'active', modified_at = SYSDATE,
                   modified_by = p_user_id
             WHERE id = v_linked AND status = 'closed';
        END IF;

        INSERT INTO xx_disl_gu23_hist (id, act_id, ts, usr, txt)
        VALUES (xx_disl_gu23_hist_seq.NEXTVAL, p_id, SYSDATE, p_user_id,
                'Акт аннулирован: ' || p_reason);
        COMMIT;
        RETURN 'done';
    EXCEPTION
        WHEN NO_DATA_FOUND THEN RETURN 'ERR' || c_us || 'Акт не найден';
        WHEN OTHERS THEN ROLLBACK; RETURN 'ERR' || c_us || SQLERRM;
    END;

END xx_dislocation;
/


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
