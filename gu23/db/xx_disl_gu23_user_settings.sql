create table xx_disl_gu23_user_settings (
   user_id          number not null,
   default_act_type varchar2(10) default 'start' not null,
   created_at       date default sysdate not null,
   updated_at       date default sysdate not null,
   constraint xx_gu23_user_settings_pk primary key ( user_id )
);