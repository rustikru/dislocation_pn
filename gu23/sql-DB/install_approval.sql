-- ----------------------------------------------------------------
-- Таблица согласований актов ГУ-23
-- ----------------------------------------------------------------

create table xx_disl_gu23_approval (
    id           number        not null,
    act_id       number        not null,
    approver_id  number        not null,   -- ID из xx_disl_users
    status       varchar2(16)  default 'pending' not null,  -- pending/approved/rejected
    comment      varchar2(1000),
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
comment on column xx_disl_gu23_approval.token_sig  is 'HMAC-подпись из ссылки (одноразовая)';
comment on column xx_disl_gu23_approval.status     is 'pending / approved / rejected';
