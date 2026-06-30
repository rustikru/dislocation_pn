/* Formatted on 30.06.2026 9:03:40 (QP5 v5.417) */
create or replace package xx_etw.xx_disl_gu23_pkg
as
    /******************************************************************************
    NAME:  xx_etw.xx_disl_gu23_pkg
    PURPOSE:   Акты: составление актов (форма ГУ-23)
    REVISIONS:
    Ver        Date        Author           Description
    ---------  ----------  ---------------  ------------------------------------
    1.0        23.06.2026  BekmansurovRR    1. Created this package.
    1.1        23.06.2026  BekmansurovRR    2. Новые поля акта: st_from, st_to,
                                              waybill_no, cargo_ref; раздельные
                                              справочники станций и подписантов;
                                              справочник грузов.
 ******************************************************************************/

    /* ---- Установить IP клиента ---- */
    procedure gu23_set_client_ip (p_ip in varchar2);

    /* ---- Вернуть секретный ключ для HMAC-ссылок согласования ---- */
    function gu23_get_hmac_secret
        return varchar2;

    /* ---- Отправить HTML-письмо ---- */
    procedure gu23_send_mail (
        p_to        in varchar2,
        p_subject   in varchar2,
        p_body      in clob,
        p_from      in varchar2 default 'noreply@test.ru');

    /* ************* Begin Типы ************************* */

    type xx_disl_gu23_ref_row is record
    (
        id      number,
        code    varchar2 (512),
        name    varchar2 (512)
    );

    type xx_disl_gu23_ref_tab is table of xx_disl_gu23_ref_row;

    type xx_disl_gu23_signer_row is record
    (
        id               number,
        signer_ref_id    number,                      -- ref ID из справочника
        fio              varchar2 (256),
        POST             varchar2 (256),
        org              varchar2 (256),
        unit             varchar2 (256),
        stype            varchar2 (128),
        ord_no           number,
        user_id          number        -- ID пользователя (если ref-подписант)
    );

    type xx_disl_gu23_signer_tab is table of xx_disl_gu23_signer_row;

    type t_gu23_act_row is record
    (
        id                     number,
        act_number             varchar2 (64),
        act_start_number       varchar2 (64),
        act_type               varchar2 (16),
        status                 varchar2 (16),
        dept_id                number,                              -- ID цеха
        dept                   varchar2 (32),    -- код цеха (для отображения)
        station_id             varchar2 (150),           -- ID ст. составления
        station                varchar2 (128),   -- ст. составления (название)
        st_from_id             varchar2 (150),           -- ID ст. отправления
        st_from                varchar2 (128),   -- ст. отправления (название)
        st_to_id               varchar2 (150),            -- ID ст. назначения
        st_to                  varchar2 (128),    -- ст. назначения (название)
        cargo_ref              varchar2 (256),                         -- груз
        reason_id              varchar2 (512),
        reason_name            varchar2 (1000),
        circumstances          varchar2 (4000),
        start_at               varchar2 (20),
        end_at                 varchar2 (20),
        dur_days               number,
        dur_hours              number,
        dur_total_h            number,
        cal_days               number,
        linked_start_id        number,
        linked_start_number    varchar2 (64),
        wagon_cnt              number,
        file_cnt               number,
        annul_reason           varchar2 (1000),
        created_at             varchar2 (20),
        created_by             varchar2 (256),
        modified_at            varchar2 (20),
        content_version        number,
        rn                     number
    );

    type xx_disl_gu23_act_tab is table of t_gu23_act_row;

    type xx_disl_gu23_row is record
    (
        id            number,
        act_id        number,
        wagon_no      varchar2 (16),
        owner         varchar2 (128),
        kind          varchar2 (128),
        st_from       varchar2 (128),
        st_to         varchar2 (128),
        cargo         varchar2 (256),
        weight        varchar2 (32),
        waybill_no    varchar2 (64)
    );

    type xx_disl_gu23_row_tab is table of xx_disl_gu23_row;

    type xx_disl_gu23_file_row is record
    (
        id               number,
        act_id           number,
        file_name        varchar2 (512),
        file_ext         varchar2 (32),
        mime_type        varchar2 (128),
        real_path        varchar2 (1024),
        created_at       varchar2 (20),
        created_by       varchar2 (256),
        file_category    varchar2 (16)
    );

    type xx_disl_gu23_file_tab is table of xx_disl_gu23_file_row;

    type xx_disl_gu23_hist_row is record
    (
        id        number,
        act_id    number,
        ts        varchar2 (20),
        usr       varchar2 (256),
        txt       varchar2 (1000),
        ip        varchar2 (64)
    );

    type xx_disl_gu23_hist_tab is table of xx_disl_gu23_hist_row;

    type xx_disl_gu23_wagon_row is record
    (
        wagon_no      varchar2 (16),
        owner         varchar2 (128),
        kind          varchar2 (128),
        st_from       varchar2 (128),
        st_to         varchar2 (128),
        st_to_code    varchar2 (128),
        cargo         varchar2 (256),
        weight        varchar2 (32),
        waybill_no    varchar2 (64),
        FOUND         number,
        dup_act       varchar2 (64), -- номер уже существующего акта начала, занявшего вагон/накладную (null = свободен)
        dup_by        varchar2 (16) -- по чему совпадение: 'wagon' (в пределах месяца) или 'waybill' (в пределах 3 мес.)
    );

    type xx_disl_gu23_wagon_tab is table of xx_disl_gu23_wagon_row;

    -- ---- Типы для параметров Сохранения акта ----
    type t_gu23_save_act is record
    (
        p_user_id            number,
        p_id                 number,                         -- 0/NULL = новый
        p_type               varchar2 (16),             -- start / end / other
        p_status             varchar2 (16),                  -- draft / active
        p_dept               varchar2 (32),                        -- код цеха
        p_station            varchar2 (128),             -- ID ст. составления
        p_st_from            varchar2 (128),             -- ID ст. отправления
        p_st_to              varchar2 (128),              -- ID ст. назначения
        p_waybill_no         varchar2 (64), -- № накладной (только для поиска Дислокации, не хранится на строках акта)
        p_cargo_ref          varchar2 (256),
        p_reason             varchar2 (512),
        p_circumstances      varchar2 (4000),
        p_start_at           varchar2 (20),   -- 'YYYY-MM-DD HH24:MI' или NULL
        p_end_at             varchar2 (20),
        p_linked_start_id    number,
        p_wagons             clob, -- CHR(30): записи; CHR(31): поля: no,owner,kind,from,to,cargo,weight
        p_signers            clob, -- CHR(30): записи; CHR(31): поля: ref_id,fio,post,org
        p_force              varchar2 (1) -- 'Y' = разрешить дубль открытого простоя
    );

    type t_gu23_add_file is record
    (
        p_act_id      number,
        p_file_id     number,
        p_name        varchar2 (512),
        p_ext         varchar2 (32),
        p_mime        varchar2 (128),
        p_path        varchar2 (1024),
        p_user_id     number,
        p_category    varchar2 (16)
    );

    type t_gu23_annul_act is record
    (
        p_id         number,
        p_user_id    number,
        p_reason     varchar2 (1000)
    );

    type t_gu23_del_act is record
    (
        p_id         number,
        p_user_id    number
    );

    type t_gu23_del_file is record
    (
        p_file_id    number,
        p_user_id    number
    );

    /* ************* end Типы ************************* */
    function fnc_boolean_num (p_bool in boolean)
        return number;

    procedure insert_act (p_row in xx_disl_gu23_act%rowtype);

    procedure update_act (p_row in xx_disl_gu23_act%rowtype);

    procedure insert_act_row (p_row in xx_disl_gu23_act_row%rowtype);

    procedure insert_signer (p_row in xx_disl_gu23_signer%rowtype);

    -- ---- Справочники
    function gu23_get_ref_cex
        return xx_disl_gu23_ref_tab
        pipelined;

    function gu23_get_ref_reason (p_kind in varchar2 default null)
        return xx_disl_gu23_ref_tab
        pipelined;

    -- ---- Справочники станций
    function gu23_get_ref_station_compile
        return xx_disl_gu23_ref_tab                         -- ст. составления
        pipelined;

    function gu23_get_ref_st_from
        return xx_disl_gu23_ref_tab                         -- ст. отправления
        pipelined;

    function gu23_get_ref_st_to
        return xx_disl_gu23_ref_tab                          -- ст. назначения
        pipelined;

    function gu23_get_ref_cargo
        return xx_disl_gu23_ref_tab
        pipelined;

    -- Справочники подписантов
    -- работники предприятия; p_dept ? код цеха для фильтрации (null = все)
    function gu23_get_ref_signer_own (p_dept_id in varchar2 default null)
        return xx_disl_gu23_signer_tab
        pipelined;

    -- работники станции ОАО ?РЖД?
    function gu23_get_ref_signer_rzd
        return xx_disl_gu23_signer_tab
        pipelined;

    -- ---- Акты ----
    function gu23_get_acts (p_q            in varchar2 default null,
                            p_type         in varchar2 default null,
                            p_status       in varchar2 default null,
                            p_dept_id      in varchar2 default null,
                            p_date_from    in varchar2 default null, -- 'DD.MM.YYYY'
                            p_date_to      in varchar2 default null, -- 'DD.MM.YYYY'
                            p_has_signed   in varchar2 default null, -- 'Y' = есть подписанный файл
                            p_page         in number default 1, -- номер страницы (с 1)
                            p_page_size    in number default null -- размер страницы (null = все)
                                                                 )
        return xx_disl_gu23_act_tab
        pipelined;

    -- количество актов под те же фильтры
    function gu23_count_acts (p_q            in varchar2 default null,
                              p_type         in varchar2 default null,
                              p_status       in varchar2 default null,
                              p_dept_id      in varchar2 default null,
                              p_date_from    in varchar2 default null,
                              p_date_to      in varchar2 default null,
                              p_has_signed   in varchar2 default null)
        return number;

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

    -- ---- Поиск станций (для autocomplete, мин 3 символа) ----
    function gu23_search_station (p_q in varchar2)
        return xx_disl_gu23_ref_tab
        pipelined;

    -- Строка, разобранная из CLOB-пачки вагонов (RS/US-формат)
    type t_wagon_clob_row is record
    (
        wagon_no      varchar2 (16),
        owner         varchar2 (128),
        kind          varchar2 (128),
        st_from       varchar2 (128),
        st_to         varchar2 (128),
        cargo         varchar2 (256),
        weight        varchar2 (32),
        waybill_no    varchar2 (64)
    );

    type t_wagon_clob_tab is table of t_wagon_clob_row;

    function parse_wagon_clob (p_clob in clob)
        return t_wagon_clob_tab
        pipelined;

    -- получить данные по вагонам из дислокации ----
    function gu23_get_wagon_info (p_wagons         in clob,
                                  p_waybill_no     in varchar2 default null,
                                  p_dest_station   in varchar2 default null,
                                  p_cargo_name     in varchar2 default null,
                                  p_act_type       in varchar2 default null)
        return xx_disl_gu23_wagon_tab
        pipelined;

    -- ---- Запись ----
    -- получить id для нового файла
    function gu23_new_file_id
        return number;

    function gu23_add_file (p_data in t_gu23_add_file)
        return varchar2;

    function gu23_del_file (p_data in t_gu23_del_file)
        return varchar2;

    -- Сохранение акта (создание/правка Проекта) вместе со строками и подписантами.
    -- Возвращает: 'OK'||CHR(31)||id||CHR(31)||number   либо  'ERR'||CHR(31)||текст
    function gu23_save_act (p_data in t_gu23_save_act)
        return varchar2;

    function gu23_del_act (p_data in t_gu23_del_act)
        return varchar2;

    function gu23_annul_act (p_data in t_gu23_annul_act)
        return varchar2;

    -- Закрыть акт (только тип 'end', только активный)
    -- Возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_close_act (p_id in number, p_user_id in number)
        return varchar2;

    -- ---- Согласование актов ----

    -- Строка результата gu23_approval_get_signers
    type t_gu23_approval_signer_row is record
    (
        approver_id    number,
        full_name      varchar2 (256),
        email          varchar2 (256)
    );

    type t_gu23_approval_signer_tab is table of t_gu23_approval_signer_row;

    -- Подписанты акта, у которых есть user_id в справочнике (email-согласование)
    function gu23_approval_get_signers (p_act_id in number)
        return t_gu23_approval_signer_tab
        pipelined;

    -- Создать записи согласования для всех подходящих подписантов.
    -- Возвращает число созданных записей или 'ERR'||CHR(31)||текст.
    function gu23_approval_init (p_act_id         in number,
                                 p_requested_by   in number)
        return varchar2;

    -- ФИО пользователя по ID
    function gu23_approval_get_name (p_id in number)
        return varchar2;

    -- Найти запись по HMAC-подписи; возвращает 'status'||CHR(31)||'DD.MM.YYYY HH24:MI' или NULL
    function gu23_approval_by_sig (p_sig in varchar2)
        return varchar2;

    -- Статус согласования по act_id + approver_id (для reject-ссылок с другим sig)
    function gu23_approval_get_status (p_act_id        in number,
                                       p_approver_id   in number)
        return varchar2;

    -- Создать запрос на согласование; возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_approval_request (p_act_id         in number,
                                    p_approver_id    in number,
                                    p_requested_by   in number,
                                    p_token_sig      in varchar2)
        return varchar2;

    -- Сохранить решение согласующего; возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_approval_save_decision (
        p_act_id        in number,
        p_approver_id   in number,
        p_status        in varchar2,
        p_comment       in varchar2,
        p_token_sig     in varchar2,
        p_signer_ip     in varchar2 default null)
        return varchar2;

    -- Текущий статус согласования одного пользователя по акту
    -- Возвращает: 'none' | 'pending' | 'approved' | 'rejected'
    function gu23_approval_my_status (p_act_id    in number,
                                      p_user_id   in number)
        return varchar2;

    -- Все записи согласования по акту (для отображения статусов в карточке)
    type t_gu23_approval_row is record
    (
        approver_id       number,
        full_name         varchar2 (256),
        status            varchar2 (16),
        decided_at        varchar2 (20),
        comment_txt       varchar2 (1000),
        signed_version    number,
        signer_ip         varchar2 (64)
    );

    type t_gu23_approval_tab is table of t_gu23_approval_row;

    function gu23_get_approvals (p_act_id in number)
        return t_gu23_approval_tab
        pipelined;

    -- Подписать акт напрямую (без email-ссылки, из интерфейса)
    -- Возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_direct_decision (p_act_id      in number,
                                   p_user_id     in number,
                                   p_status      in varchar2,
                                   p_comment     in varchar2,
                                   p_signer_ip   in varchar2 default null)
        return varchar2;

    -- ---- Роли и доступ ----

    -- Есть ли у пользователя хотя бы одна роль в модуле ГУ-23 ('Y'/'N')
    function gu23_can_access (p_user_id in number)
        return varchar2;

    -- Является ли пользователь администратором ГУ-23 (роль GU23_ADMIN) ('Y'/'N')
    function gu23_is_admin (p_user_id in number)
        return varchar2;

    type t_gu23_role_row is record
    (
        role_id      number,
        role_code    varchar2 (50),
        role_name    varchar2 (100)
    );

    type t_gu23_role_tab is table of t_gu23_role_row;

    -- Справочник всех ролей
    function gu23_roles_get_all
        return t_gu23_role_tab
        pipelined;

    type t_gu23_user_role_row is record
    (
        user_id      number,
        login        varchar2 (100),
        full_name    varchar2 (256),
        role_id      number,
        role_code    varchar2 (50),
        role_name    varchar2 (100)
    );

    type t_gu23_user_role_tab is table of t_gu23_user_role_row;

    -- Пользователи с их ролями (одна строка на пару user+role; нет роли ? role_* null)
    function gu23_users_roles_get (p_search in varchar2 default null)
        return t_gu23_user_role_tab
        pipelined;

    -- Назначить роль пользователю; возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_role_assign (p_user_id in number, p_role_id in number)
        return varchar2;

    -- Отозвать роль у пользователя; возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_role_revoke (p_user_id in number, p_role_id in number)
        return varchar2;

    -- Проверить наличие полномочия у пользователя ('Y'/'N')
    function gu23_has_perm (p_user_id in number, p_perm_code in varchar2)
        return varchar2;

    -- Получить все коды полномочий пользователя (pipelined)
    type t_gu23_perm_code_tab is table of varchar2 (50);

    function gu23_user_perms_get (p_user_id in number)
        return t_gu23_perm_code_tab
        pipelined;

    -- Матрица роль ? полномочие (все строки perm_id ? role_id)
    type t_gu23_role_perm_row is record
    (
        perm_id      number,
        perm_code    varchar2 (50),
        descr        varchar2 (200),
        role_id      number,
        role_code    varchar2 (50),
        role_name    varchar2 (100),
        has_perm     varchar2 (1)
    );

    type t_gu23_role_perm_tab is table of t_gu23_role_perm_row;

    function gu23_role_perms_get
        return t_gu23_role_perm_tab
        pipelined;

    -- Назначить полномочие роли; возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_perm_assign (p_role_id in number, p_perm_id in number)
        return varchar2;

    -- Отозвать полномочие у роли; возвращает 'OK' или 'ERR'||CHR(31)||текст
    function gu23_perm_revoke (p_role_id in number, p_perm_id in number)
        return varchar2;

    -- ---- Администрирование справочников ----

    type t_gu23_ref_signer_row is record
    (
        id        number,
        fio       varchar2 (256),
        POST      varchar2 (256),
        org       varchar2 (256),
        unit      varchar2 (256),
        active    char (1)
    );

    type t_gu23_ref_signer_tab is table of t_gu23_ref_signer_row;

    type t_gu23_ref_reason_row is record
    (
        id          number,
        name        varchar2 (512),
        act_kind    varchar2 (16),
        active      char (1)
    );

    type t_gu23_ref_reason_tab is table of t_gu23_ref_reason_row;

    function gu23_ref_signers_all
        return t_gu23_ref_signer_tab
        pipelined;

    function gu23_ref_reasons_all
        return t_gu23_ref_reason_tab
        pipelined;

    function gu23_ref_signer_save (p_id     in number,
                                   p_fio    in varchar2,
                                   p_post   in varchar2,
                                   p_org    in varchar2,
                                   p_unit   in varchar2)
        return varchar2;

    function gu23_ref_signer_toggle (p_id in number)
        return varchar2;

    function gu23_ref_reason_save (p_id         in number,
                                   p_name       in varchar2,
                                   p_act_kind   in varchar2)
        return varchar2;

    function gu23_ref_reason_toggle (p_id in number)
        return varchar2;
end xx_disl_gu23_pkg;
/
