create or replace package xx_disl_gu23_pkg as
-- спецификация пакета (локальная мини-версия)
-- локально создаётся пакет xx_disl_gu23_pkg только с функциями gu23_*.
-- на проде эти объявления нужно добавить в спецификацию настоящего
-- пакета xx_disl_gu23_pkg (не затирая остальные ~300 функций).
-- разделители коллекций из PHP без JSON (11g): записи CHR(30), поля CHR(31).

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