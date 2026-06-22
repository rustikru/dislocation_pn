-- =====================================================================
--  seed_gu23.sql  —  демо-наполнение справочников и dev-пользователя
--  (значения из прототипа; редактируются прямо в таблицах ref_*)
-- =====================================================================
SET DEFINE OFF

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
