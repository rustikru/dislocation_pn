-- ----------------------------------------------------------------
-- Таблица согласований актов ГУ-23
-- Очистка перед созданием (идемпотентный скрипт)
-- ----------------------------------------------------------------
begin
    for x in (
        select 'DROP TABLE '  || t || ' CASCADE CONSTRAINTS PURGE' ddl
          from (select column_value t
                  from table(sys.odcivarchar2list('XX_DISL_GU23_APPROVAL')))
        union all
        select 'DROP SEQUENCE ' || s
          from (select column_value s
                  from table(sys.odcivarchar2list('XX_DISL_GU23_APPROVAL_SEQ')))
    ) loop
        begin
            execute immediate x.ddl;
        exception
            when others then null;
        end;
    end loop;
end;
/

create table xx_disl_gu23_approval (
    id           number        not null,
    act_id       number        not null,
    approver_id  number        not null,   -- ID из xx_disl_users
    status       varchar2(16)  default 'pending' not null,  -- pending/approved/rejected
    comment_txt  varchar2(1000),                            -- причина отклонения
    requested_at date          default sysdate not null,
    requested_by number        not null,   -- кто запросил согласование
    decided_at   date,
    token_sig    varchar2(128),            -- HMAC-подпись (для одноразовости)
    constraint xx_disl_gu23_approval_pk primary key (id),
    constraint xx_disl_gu23_approval_status_ck
        check (status in ('pending', 'approved', 'rejected'))
);

create sequence xx_disl_gu23_approval_seq start with 1 increment by 1 nocache;

-- Индексы
create index xx_disl_gu23_approval_act_idx
    on xx_disl_gu23_approval (act_id);

create index xx_disl_gu23_approval_user_idx
    on xx_disl_gu23_approval (approver_id);

-- Уникальность: один запрос на акт + согласующего
create unique index xx_disl_gu23_approval_unq
    on xx_disl_gu23_approval (act_id, approver_id);

comment on table xx_disl_gu23_approval is 'Согласования актов ГУ-23';
comment on column xx_disl_gu23_approval.token_sig   is 'HMAC-подпись из ссылки (одноразовая)';
comment on column xx_disl_gu23_approval.status      is 'pending / approved / rejected';
comment on column xx_disl_gu23_approval.comment_txt is 'Причина отклонения (заполняется при rejected)';
