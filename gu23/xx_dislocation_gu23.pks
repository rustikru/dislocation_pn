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
