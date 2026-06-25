   SET DEFINE OFF

delete from xx_disl_gu23_ref_reason;

-- причины
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Простой под выгрузкой' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Простой под погрузкой' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Неприём вагонов станцией' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Ожидание подачи/уборки' );
insert into xx_disl_gu23_ref_reason (
   id,
   name
) values ( xx_disl_gu23_ref_reason_seq.nextval,
           'Неудовлетворительное состояние вагона' );

commit;

insert into xx_disl_gu23_ref_signer (
   id,
   fio,
   post,
   org,
   unit,
   stype,
   active
) values ( xx_disl_gu23_ref_signer_seq.nextval,
           'Ерлыгин А.В.',
           'Начальник станции',
           'ОАО РЖД',
           'Станция Углеуральская',
           'Работник станции ОАО РЖД',
           'Y' );
insert into xx_disl_gu23_ref_signer (
   id,
   fio,
   post,
   org,
   unit,
   stype,
   active
) values ( xx_disl_gu23_ref_signer_seq.nextval,
           'Зиганшина Н.В.',
           'Заместитель начальника станции ',
           'ОАО РЖД',
           'Станция Углеуральская',
           'Работник станции ОАО РЖД',
           'Y' );
commit;

commit;