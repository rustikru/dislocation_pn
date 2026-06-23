-- XX_DISL_GU23_PKG.pks — Спецификация пакета xx_disl_gu23_pkg.
-- Ставится отдельно перед телом (XX_DISL_GU23_PKG.pkb).

create or replace package xx_disl_gu23_pkg
as
    /******************************************************************************
    NAME:  xx_etw.xx_disl_gu23_pkg
    PURPOSE:   Акты: составление актов (форма ГУ-23)
    REVISIONS:
    Ver        Date        Author           Description
    ---------  ----------  ---------------  ------------------------------------
    1.0        23.06.2026  BekmansurovRR    1. Created this package.
    1.1        23.06.2026  BekmansurovRR    2. Pipe-types -> RECORD; новые поля акта:
                                              waybill_no, st_from, st_to, cargo_ref;
                                              раздельные справочники станций и подписантов.
 ******************************************************************************/

    /* ************* Begin Типы ************************* */

    TYPE xx_disl_gu23_ref_row IS RECORD (
        code  VARCHAR2(512),
        name  VARCHAR2(512)
    );
    TYPE xx_disl_gu23_ref_tab IS TABLE OF xx_disl_gu23_ref_row;


    TYPE xx_disl_gu23_signer_row IS RECORD (
        id            NUMBER,
        signer_ref_id NUMBER,
        user_id       NUMBER,
        fio           VARCHAR2(256),
        post          VARCHAR2(256),
        org           VARCHAR2(256),
        unit          VARCHAR2(256),
        stype         VARCHAR2(128),
        ord_no        NUMBER
    );
    TYPE xx_disl_gu23_signer_tab IS TABLE OF xx_disl_gu23_signer_row;


    TYPE xx_disl_gu23_act_row IS RECORD (
        id                   NUMBER,
        act_number           VARCHAR2(64),
        act_type             VARCHAR2(16),
        status               VARCHAR2(16),
        cex                  VARCHAR2(32),
        station              VARCHAR2(128),   -- ст. составления
        st_from              VARCHAR2(128),   -- ст. отправления
        st_to                VARCHAR2(128),   -- ст. назначения
        waybill_no           VARCHAR2(64),    -- № накладной
        cargo_ref            VARCHAR2(256),   -- груз
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
    TYPE xx_disl_gu23_act_tab IS TABLE OF xx_disl_gu23_act_row;


    TYPE xx_disl_gu23_row IS RECORD (
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
    TYPE xx_disl_gu23_row_tab IS TABLE OF xx_disl_gu23_row;


    TYPE xx_disl_gu23_file_row IS RECORD (
        id          NUMBER,
        act_id      NUMBER,
        file_name   VARCHAR2(512),
        file_ext    VARCHAR2(32),
        mime_type   VARCHAR2(128),
        real_path   VARCHAR2(1024),
        created_at  VARCHAR2(20),
        created_by  VARCHAR2(256)
    );
    TYPE xx_disl_gu23_file_tab IS TABLE OF xx_disl_gu23_file_row;


    TYPE xx_disl_gu23_hist_row IS RECORD (
        id      NUMBER,
        act_id  NUMBER,
        ts      VARCHAR2(20),
        usr     VARCHAR2(256),
        txt     VARCHAR2(1000)
    );
    TYPE xx_disl_gu23_hist_tab IS TABLE OF xx_disl_gu23_hist_row;


    TYPE xx_disl_gu23_wagon_row IS RECORD (
        wagon_no  VARCHAR2(16),
        owner     VARCHAR2(128),
        kind      VARCHAR2(128),
        st_from   VARCHAR2(128),
        st_to     VARCHAR2(128),
        cargo     VARCHAR2(256),
        weight    VARCHAR2(32),
        found     NUMBER
    );
    TYPE xx_disl_gu23_wagon_tab IS TABLE OF xx_disl_gu23_wagon_row;

    /* ************* end Типы ************************* */

    -- ---- Справочники (базовые)
    function gu23_get_ref_cex
        return xx_disl_gu23_ref_tab
        pipelined;

    function gu23_get_ref_reason (p_kind in varchar2 default null)
        return xx_disl_gu23_ref_tab
        pipelined;

    -- ---- Поиск станций (живой поиск для автодополнения)
    function gu23_search_station (p_q in varchar2)
        return xx_disl_gu23_ref_tab
        pipelined;

    -- ---- Справочники станций (три отдельные процедуры по назначению)
    function gu23_get_ref_station_compile   -- ст. составления
        return xx_disl_gu23_ref_tab
        pipelined;

    function gu23_get_ref_st_from           -- ст. отправления
        return xx_disl_gu23_ref_tab
        pipelined;

    function gu23_get_ref_st_to             -- ст. назначения
        return xx_disl_gu23_ref_tab
        pipelined;

    -- старое имя оставлено для обратной совместимости
    function gu23_get_ref_station
        return xx_disl_gu23_ref_tab
        pipelined;

    -- ---- Прочие справочники
    function gu23_get_ref_owner
        return xx_disl_gu23_ref_tab
        pipelined;

    function gu23_get_ref_wagon_kind
        return xx_disl_gu23_ref_tab
        pipelined;

    function gu23_get_ref_cargo
        return xx_disl_gu23_ref_tab
        pipelined;

    -- ---- Справочники подписантов (две отдельные процедуры по типу)
    function gu23_get_ref_signer_own        -- работники предприятия
        return xx_disl_gu23_signer_tab
        pipelined;

    function gu23_get_ref_signer_rzd        -- работники станции ОАО «РЖД»
        return xx_disl_gu23_signer_tab
        pipelined;

    -- старое имя оставлено для обратной совместимости
    function gu23_get_ref_signer
        return xx_disl_gu23_signer_tab
        pipelined;

    -- ---- Акты ----
    function gu23_get_acts (p_q        in varchar2 default null,
                            p_type     in varchar2 default null,
                            p_status   in varchar2 default null,
                            p_cex      in varchar2 default null)
        return xx_disl_gu23_act_tab
        pipelined;

    function gu23_get_act (p_id in number)
        return xx_disl_gu23_act_tab
        pipelined;

    function gu23_get_rows (p_act_id in number)
        return xx_disl_gu23_row_tab
        pipelined;

    function gu23_get_files (p_act_id in number)
        return xx_disl_gu23_file_tab
        pipelined;

    function gu23_get_signers (p_act_id in number)
        return xx_disl_gu23_signer_tab
        pipelined;

    function gu23_get_hist (p_act_id in number)
        return xx_disl_gu23_hist_tab
        pipelined;

    -- открытые акты начала простоя (без связи с актами окончания)
    function gu23_get_open_starts
        return xx_disl_gu23_act_tab
        pipelined;

    -- ещё открытые (не закрытые действующим окончанием) вагоны акта начала
    function gu23_get_open_rows (p_start_id in number)
        return xx_disl_gu23_row_tab
        pipelined;

    -- все акты по номеру вагона (поиск по вагону)
    function gu23_get_by_wagon (p_wagon in varchar2)
        return xx_disl_gu23_act_tab
        pipelined;

    -- ---- Интеграция Oracle BI / Дислокация ----
    -- p_waybill_no и p_cargo_ref передаются как контекст запроса к Дислокации
    function gu23_get_wagon_info (p_wagons      in clob,
                                  p_station     in varchar2 default null,
                                  p_waybill_no  in varchar2 default null,
                                  p_cargo_ref   in varchar2 default null)
        return xx_disl_gu23_wagon_tab
        pipelined;

    -- ---- Запись ----
    -- получить id для нового файла
    function gu23_new_file_id
        return number;

    function gu23_add_file (p_act_id    in number,
                            p_file_id   in number,
                            p_name      in varchar2,
                            p_ext       in varchar2,
                            p_mime      in varchar2,
                            p_path      in varchar2,
                            p_user_id   in number)
        return varchar2;

    function gu23_del_file (p_file_id in number, p_user_id in number)
        return varchar2;

    -- сохранение акта (создание/правка черновика) вместе со строками и подписантами.
    -- Возвращает: 'OK'||CHR(31)||id||CHR(31)||number   либо  'ERR'||CHR(31)||текст
    function gu23_save_act (p_user_id           in number,
                            p_id                in number,     -- 0/NULL = новый
                            p_type              in varchar2,   -- start / end / other
                            p_status            in varchar2,   -- draft / active
                            p_cex               in varchar2,
                            p_station           in varchar2,   -- ст. составления
                            p_st_from           in varchar2,   -- ст. отправления
                            p_st_to             in varchar2,   -- ст. назначения
                            p_waybill_no        in varchar2,   -- № накладной
                            p_cargo_ref         in varchar2,   -- груз
                            p_reason            in varchar2,
                            p_circumstances     in varchar2,
                            p_start_at          in varchar2,   -- 'YYYY-MM-DD HH24:MI' или NULL
                            p_end_at            in varchar2,
                            p_linked_start_id   in number,
                            p_wagons            in clob,       -- записи CHR(30); поля CHR(31): no,owner,kind,from,to,cargo,weight
                            p_signers           in clob,       -- записи CHR(30); поля CHR(31): ref_id,user_id,stype,fio,post,org
                            p_force             in varchar2 default 'N'  -- 'Y' = разрешить дубль открытого простоя
                                                                        )
        return varchar2;

    function gu23_del_act (p_id in number, p_user_id in number)
        return varchar2;

    function gu23_annul_act (p_id        in number,
                             p_user_id   in number,
                             p_reason    in varchar2)
        return varchar2;
end xx_disl_gu23_pkg;
/
