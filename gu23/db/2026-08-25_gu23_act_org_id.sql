alter table xx_etw.xx_disl_gu23_act
    add (org_id number default 2);

comment on column xx_etw.xx_disl_gu23_act.org_id is
    'ID организации пользователя, создавшего акт (XX_DISL_USERS.ENTERPRISE)';
