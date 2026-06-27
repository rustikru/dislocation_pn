# Модуль ГУ-23 — Акты общей формы

Веб-модуль для составления, регистрации и электронного согласования актов общей формы ГУ-23.

---

## Содержание

1. [Структура файлов](#структура-файлов)
2. [Схема базы данных](#схема-базы-данных)
3. [Жизненный цикл акта](#жизненный-цикл-акта)
4. [Oracle-пакет](#oracle-пакет-xx_disl_gu23_pkg)
5. [PHP-слой](#php-слой-guactrepositorphp)
6. [Согласование актов](#согласование-актов)
7. [Права доступа](#права-доступа)
8. [Ajax API](#ajax-api)
9. [Установка и миграции](#установка-и-миграции)
10. [Логирование — включение и отключение](#логирование--включение-и-отключение)
11. [Типичные ошибки и диагностика](#типичные-ошибки-и-диагностика)
12. [Локальная разработка](#локальная-разработка)

---

## Структура файлов

```
gu23/
├── index.php                  # Точка входа (SPA-оболочка)
├── js.php                     # Сборщик JS-файлов модуля
├── gu23.css                   # Стили модуля
├── app.js                     # Роутер страниц (archive / new / card / wsearch / refs / roles)
├── api.js                     # sendApiRequest() — обёртка над $.ajax
├── state.js                   # Глобальное состояние (activeDraft, references)
├── utils.js                   # Вспомогательные функции (форматирование дат и т.д.)
├── GuActRepository.php        # Единый PHP-обработчик всех ajax_action
├── ApprovalRepository.php     # Обработчик страницы approve.php (по HMAC-ссылке)
├── Gu23Logger.php             # Логгер (файловый, PSR-style)
├── get_file.php               # Стриминг вложений (attachment)
├── approve.php                # Страница подписания/отклонения по HMAC-ссылке
│
├── components/
│   ├── form.js                # Форма создания / редактирования акта
│   ├── card.js                # Карточка просмотра акта
│   ├── registry.js            # Реестр актов (список + фильтры)
│   ├── nav.js                 # Навигационная панель
│   ├── refs.js                # Страница справочников (подписанты, причины)
│   ├── roles.js               # Страница ролей и полномочий
│   ├── ui.js                  # Общие UI-компоненты (toast, confirm, chips…)
│   └── wagonSearch.js         # Поиск актов по номеру вагона
│
├── report/
│   ├── report.php             # Генерация DOCX (скачивание)
│   └── GuActDocxReport.php    # Класс генерации отчёта
│
├── log/
│   ├── .htaccess              # Запрет прямого доступа к логам
│   └── .gitignore             # Логи не попадают в репозиторий
│
└── sql-DB/
    ├── install_gu23_all.sql         # DDL: таблицы, представление, последовательности
    ├── install_approval.sql         # DDL: таблица xx_disl_gu23_approval + индексы
    ├── alter_ref_signer_user_id.sql # Миграция: поле user_id в xx_disl_gu23_ref_signer
    ├── migrate_signer_stype.sql     # Миграция: поле stype в xx_disl_gu23_signer
    ├── add_version_status.sql       # Миграция: content_version, signed_version, signer_ip
    ├── migrate_hist_ip.sql          # Миграция: поле ip в xx_disl_gu23_hist
    ├── XX_DISL_GU23_PKG.pks        # Спецификация Oracle-пакета
    ├── XX_DISL_GU23_PKG.pkb        # Тело Oracle-пакета
    ├── fill_roles.sql               # Начальные данные: 4 роли
    ├── fill_permissions.sql         # Начальные данные: 10 полномочий + матрица ролей
    └── fill_gu23_data.sql           # Тестовые данные (причины, справочники)
```

---

## Схема базы данных

### Основные таблицы

| Таблица                 | Назначение                                           |
| ----------------------- | ---------------------------------------------------- |
| `xx_disl_gu23_act`      | Заголовок акта (тип, статус, даты, цех, станции)     |
| `xx_disl_gu23_act_row`  | Строки акта (вагоны)                                 |
| `xx_disl_gu23_signer`   | Подписанты конкретного акта                          |
| `xx_disl_gu23_approval` | Запросы согласования (pending / approved / rejected) |
| `xx_disl_gu23_hist`     | История изменений акта (с полем `ip` клиента)        |
| `xx_disl_gu23_file`     | Прикреплённые файлы/фото                             |
| `xx_disl_gu23_counter`  | Счётчик нумерации (по цеху и году)                   |

### Справочники

| Таблица                   | Назначение                                                             |
| ------------------------- | ---------------------------------------------------------------------- |
| `xx_disl_gu23_ref_reason` | Причины составления акта                                               |
| `xx_disl_gu23_ref_signer` | Справочник подписантов; `user_id` → `xx_disl_users` для рассылки писем |

### Роли и полномочия

| Таблица                         | Назначение                                  |
| ------------------------------- | ------------------------------------------- |
| `xx_disl_gu23_roles`            | Список ролей (GU23_ADMIN, GU23_USER, …)     |
| `xx_disl_gu23_user_roles`       | Назначение ролей пользователям              |
| `xx_disl_gu23_permissions`      | Справочник кодов полномочий (CREATE_ACT, …) |
| `xx_disl_gu23_role_permissions` | Матрица: какие полномочия у какой роли      |

**Роли:**

| Код           | Название            | Полномочия                              |
| ------------- | ------------------- | --------------------------------------- |
| `GU23_ADMIN`  | Администратор ГУ-23 | Все (10 из 10)                          |
| `GU23_USER`   | Пользователь цеха   | CREATE_ACT, EDIT_OWN_ACT, SEND_APPROVAL |
| `GU23_SIGNER` | Подписант           | SIGN_ACT                                |
| `GU23_VIEWER` | Просмотр архива     | VIEW_ALL_ACTS                           |

**Полномочия (permission codes):**

`CREATE_ACT`, `EDIT_OWN_ACT`, `EDIT_ALL_ACTS`, `DELETE_ACT`, `ANNUL_ACT`,
`SIGN_ACT`, `SEND_APPROVAL`, `CLOSE_ACT`, `VIEW_ALL_ACTS`, `MANAGE_REFS`, `MANAGE_ROLES`

> **Подписанты от предприятия** (`stype='own'`) хранятся в `xx_disl_users`.  
> **Подписанты от РЖД** (`stype='rzd'`) хранятся в `xx_disl_gu23_ref_signer` и **не участвуют** в электронном согласовании.

### Поле `stype` в `xx_disl_gu23_signer`

| Значение | Смысл                                                                 |
| -------- | --------------------------------------------------------------------- |
| `'own'`  | Работник предприятия (`signer_ref_id` → `xx_disl_users.id`)           |
| `'rzd'`  | Работник станции РЖД (`signer_ref_id` → `xx_disl_gu23_ref_signer.id`) |
| `NULL`   | Введён вручную, без привязки к справочнику                            |

Поле сохраняется фронтендом при выборе подписанта. `sync_act_status` использует только `stype='own'` подписантов для подсчёта кворума согласования.

### Представление `xx_disl_gu23_act_v`

Объединяет шапку акта с вычисляемыми полями: номер связанного акта начала, количество вагонов (`wagon_cnt`), количество файлов. Пакет читает акты только через это представление.

---

## Жизненный цикл акта

```
                        ┌─────────────────────────────────┐
                        ▼                                 │
draft ──регистрация──► active ──все own согласовали──► signed
  │                      │                                │
удаление              аннул./                          аннул.
  │                   закрытие                           │
  ▼                      ▼                               ▼
[удалён]         rejected / closed / annulled        annulled
```

| Статус     | Описание                                            |
| ---------- | --------------------------------------------------- |
| `draft`    | Проект, не зарегистрирован, не имеет номера         |
| `active`   | Зарегистрирован, имеет номер, В процессе подписания |
| `signed`   | Все own-подписанты согласовали                      |
| `rejected` | Хотя бы один own-подписант отклонил                 |
| `closed`   | Закрыт администратором (только для `end`-актов)     |
| `annulled` | Аннулирован (с каскадом на связанный акт)           |

### Типы актов

| Тип     | Мин. подписантов | Особенности                                     |
| ------- | ---------------- | ----------------------------------------------- |
| `start` | 3                | Требует `start_at`                              |
| `end`   | 3                | Требует `linked_start_id`, `start_at`, `end_at` |
| `other` | 2                | Требует `start_at`                              |

### Каскадное аннулирование

При аннулировании акта типа `end` автоматически аннулируется связанный акт начала (`linked_start_id`), и наоборот.

---

## Oracle-пакет `xx_disl_gu23_pkg`

Весь доступ к данным идёт только через пакет. Прямые DML из PHP запрещены.

### Основные функции/процедуры

| Имя                           | Описание                                                        |
| ----------------------------- | --------------------------------------------------------------- |
| `gu23_set_client_ip(p_ip)`    | Устанавливает IP клиента для записи в историю                   |
| `gu23_get_refs`               | Справочники (цеха, станции, причины, подписанты)                |
| `gu23_get_acts`               | Реестр актов с фильтрами                                        |
| `gu23_get_act`                | Карточка одного акта                                            |
| `gu23_save_act`               | Сохранение / регистрация акта                                   |
| `gu23_annul_act`              | Аннулирование (с каскадом)                                      |
| `gu23_close_act`              | Закрытие акта типа `end`                                        |
| `gu23_get_signers`            | Подписанты акта (с полем `stype`)                               |
| `gu23_approval_init`          | Создание pending-записей согласования                           |
| `gu23_approval_get_signers`   | own-подписанты с email для рассылки                             |
| `gu23_approval_save_decision` | Сохранить решение по HMAC-ссылке                                |
| `gu23_direct_decision`        | Подписание/отклонение в приложении                              |
| `sync_act_status` (private)   | Меняет статус акта на `signed`/`rejected` после каждого решения |
| `log_act_history` (private)   | Пишет запись в `xx_disl_gu23_hist` (с IP из `g_client_ip`)      |

---

## PHP-слой (`GuActRepository.php`)

### `handle(string $action)`

Диспетчер: принимает `ajax_action` из POST и вызывает нужный приватный метод.  
В начале каждого запроса вызывает `gu23_set_client_ip` — передаёт реальный IP клиента (с учётом `X-Forwarded-For`) в пакет.

### Вспомогательные методы

**`pipe(string $sql, array $binds): array`**  
Выполняет SELECT и возвращает массив строк. Используется для конвейерных функций пакета.

**`callFunc(string $expr, array $binds, int $retLen): ?string`**  
Вызывает скалярную PL/SQL-функцию через `BEGIN :ret := expr; END;`. Бросает `RuntimeException` при ошибке OCI.

**`packRows(array $rows, array $fields): string`**  
Упаковывает массив строк в строку с разделителями `CHR(30)` (между записями) и `CHR(31)` (между полями) для передачи в пакет через CLOB.

### Флаги в ответе `gu23_get_act`

| Поле           | Тип    | Описание                                                                                |
| -------------- | ------ | --------------------------------------------------------------------------------------- |
| `isAdmin`      | bool   | Текущий пользователь — администратор                                                    |
| `isUserSigner` | bool   | Текущий пользователь есть среди own-подписантов акта                                    |
| `myApproval`   | string | Статус согласования текущего пользователя: `pending` / `approved` / `rejected` / `none` |

---

## Согласование актов

### Инициализация (`gu23_send_approval`)

**Перед отправкой проверяется:** в акте должно быть > 0 вагонов (и в JS, и в PHP).

Порядок:

1. `gu23_get_act` → проверка `WAGON_CNT > 0`
2. `gu23_approval_init` — создаёт `pending`-записи в `xx_disl_gu23_approval` (MERGE: повторный вызов не дублирует)
3. `gu23_approval_get_signers` — получает own-подписантов с учётными записями
4. Для каждого: генерирует HMAC-ссылку, сохраняет `token_sig` в БД, отправляет письмо

### Режим рассылки (`APPROVAL_MODE` в `form.js`)

```js
const APPROVAL_MODE = 'send_file' // 'send_mail' | 'send_file' | false
```

| Значение      | Поведение                                          |
| ------------- | -------------------------------------------------- |
| `'send_mail'` | Реальная отправка через PHP `mail()`               |
| `'send_file'` | Сохранить HTML-письмо в папку `mail/` (для тестов) |
| `false`       | Не отправлять ничего                               |

### Подписание через приложение (`gu23_approve_in_app`)

Подписант с признаком `isUserSigner` может подписать/отклонить акт прямо в интерфейсе без перехода по ссылке. Пишется запись в `xx_disl_gu23_hist`.

### Подписание по HMAC-ссылке

Ссылки вида `/gu23/approve.php?act=…&uid=…&action=approve&sig=…` обрабатываются `approve.php` + `ApprovalRepository.php`. Срок действия ссылки — 7 дней.

### Автоматическое обновление статуса (`sync_act_status`)

Вызывается после каждого решения. Алгоритм:

- Если есть хотя бы одно `rejected` → статус акта = `rejected`
- Подсчитывает `own`-подписантов (`stype='own'`, `signer_ref_id IS NOT NULL`)
- Подсчитывает одобривших через JOIN `signer_ref_id = approver_id`
- Если все одобрили → статус акта = `signed`

---

## Права доступа

Проверка идёт через `hasPerm($code)` в `GuActRepository` → пакетная функция `gu23_has_perm(p_user_id, p_perm_code)`. Глобальный администратор системы (`isAuthAdmin`) обходит все проверки.

| Действие                        | Полномочие      |
| ------------------------------- | --------------- |
| Создание акта                   | `CREATE_ACT`    |
| Редактирование своего черновика | `EDIT_OWN_ACT`  |
| Редактирование любого акта      | `EDIT_ALL_ACTS` |
| Удаление проекта                | `DELETE_ACT`    |
| Аннулирование                   | `ANNUL_ACT`     |
| Подписание / отклонение         | `SIGN_ACT`      |
| Отправка на согласование        | `SEND_APPROVAL` |
| Закрытие акта (`end`)           | `CLOSE_ACT`     |
| Просмотр всех актов             | `VIEW_ALL_ACTS` |
| Редактирование справочников     | `MANAGE_REFS`   |
| Управление ролями               | `MANAGE_ROLES`  |

---

## Ajax API

### Основные действия

| `ajax_action`          | Метод PHP          | Описание                              |
| ---------------------- | ------------------ | ------------------------------------- |
| `gu23_get_refs`        | `getRefs()`        | Справочные данные для формы           |
| `gu23_get_acts`        | `getActs()`        | Список актов с фильтрами              |
| `gu23_get_act`         | `getActCard()`     | Карточка акта                         |
| `gu23_get_open_starts` | `getOpenStarts()`  | Открытые акты начала                  |
| `gu23_get_by_wagon`    | `getByWagon()`     | Акты по номеру вагона                 |
| `gu23_get_wagon_info`  | `getWagonInfo()`   | Данные вагона из дислокации           |
| `gu23_search_station`  | `searchStation()`  | Поиск станции (autocomplete, мин. 3)  |
| `gu23_save_act`        | `saveAct()`        | Сохранение акта                       |
| `gu23_del_act`         | `delAct()`         | Удаление Проекта                      |
| `gu23_annul_act`       | `annulAct()`       | Аннулирование                         |
| `gu23_close_act`       | `closeAct()`       | Закрытие акта                         |
| `gu23_upload_file`     | `uploadFile()`     | Загрузка вложения                     |
| `gu23_del_file`        | `delFile()`        | Удаление вложения                     |
| `gu23_send_approval`   | `sendApproval()`   | Рассылка запросов согласования        |
| `gu23_resend_approval` | `resendApproval()` | Переотправка ссылки одному подписанту |
| `gu23_approve_in_app`  | `approveInApp()`   | Подписание в приложении               |

### Справочники (администрирование)

| `ajax_action`            | Метод PHP           | Описание                               |
| ------------------------ | ------------------- | -------------------------------------- |
| `gu23_refs_get_all`      | `refsGetAll()`      | Список подписантов/причин с пагинацией |
| `gu23_ref_signer_save`   | `refSignerSave()`   | Создать / обновить подписанта РЖД      |
| `gu23_ref_signer_toggle` | `refSignerToggle()` | Включить / отключить подписанта РЖД    |
| `gu23_ref_reason_save`   | `refReasonSave()`   | Создать / обновить причину             |
| `gu23_ref_reason_toggle` | `refReasonToggle()` | Включить / отключить причину           |

### Роли и полномочия

| `ajax_action`      | Метод PHP      | Описание                                  |
| ------------------ | -------------- | ----------------------------------------- |
| `gu23_roles_users` | `rolesUsers()` | Список пользователей с ролями (пагинация) |
| `gu23_role_assign` | `roleAssign()` | Назначить роль пользователю               |
| `gu23_role_revoke` | `roleRevoke()` | Отозвать роль у пользователя              |
| `gu23_role_perms`  | `rolePerms()`  | Матрица полномочий всех ролей             |
| `gu23_perm_assign` | `permAssign()` | Добавить полномочие роли                  |
| `gu23_perm_revoke` | `permRevoke()` | Убрать полномочие у роли                  |

---

## Установка и миграции

### Первичная установка

```sql
-- 1. DDL основных таблиц и представления
@sql-DB/install_gu23_all.sql

-- 2. DDL таблицы согласований
@sql-DB/install_approval.sql

-- 3. Компиляция пакета
@sql-DB/XX_DISL_GU23_PKG.pks
@sql-DB/XX_DISL_GU23_PKG.pkb

-- 4. Начальные данные
@sql-DB/fill_roles.sql
@sql-DB/fill_permissions.sql
```

### Миграции (обновление существующей базы)

```sql
-- Поле user_id в справочнике подписантов РЖД (привязка к xx_disl_users)
@sql-DB/alter_ref_signer_user_id.sql

-- Поле stype в таблице подписантов акта (own/rzd/NULL)
@sql-DB/migrate_signer_stype.sql

-- content_version в акте + signed_version, signer_ip в согласованиях
@sql-DB/add_version_status.sql

-- Поле ip клиента в истории изменений
@sql-DB/migrate_hist_ip.sql

-- Перекомпилировать пакет после любых изменений
@sql-DB/XX_DISL_GU23_PKG.pks
@sql-DB/XX_DISL_GU23_PKG.pkb
```

---

## Логирование — включение и отключение

### Файл лога

Логи пишутся в `gu23/log/gu23_YYYY-MM-DD.log` (один файл в сутки).  
Формат строки: `[2026-06-26 21:05:12] [LEVEL] user=login ip=1.2.3.4 uri=/data.php | сообщение | {json}`

### Включить логирование

В `GuActRepository.php` раскомментировать строку в `handle()`:

```php
// Было:
//Gu23Logger::info('action', ['action' => $action]);

// Стало:
Gu23Logger::info('action', ['action' => $action]);
```

Для debug-логов конкретных операций (например, CLOB подписантов) в `saveAct()`:

```php
Gu23Logger::debug('signer_clob', [
    'count'  => count($signers),
    'stypes' => array_column($signers, 'stype'),
    'clob'   => $signerClob,
]);
```

### Отключить логирование быстро

Самый быстрый способ — поставить заглушку в начало `Gu23Logger.php`:

```php
// Временно отключить все логи (раскомментировать строку ниже):
// return; // ← добавить в начало каждого публичного метода info/debug/error
```

Или добавить константу в `db_config.php`:

```php
define('GU23_LOG_ENABLED', false);
```

И в `Gu23Logger.php` проверять её в начале каждого метода:

```php
if (!defined('GU23_LOG_ENABLED') || !GU23_LOG_ENABLED) return;
```

### Уровни логирования (`Gu23Logger`)

| Метод                                | Когда использовать                           |
| ------------------------------------ | -------------------------------------------- |
| `Gu23Logger::info($msg, $ctx)`       | Нормальные события (вход, действие)          |
| `Gu23Logger::debug($msg, $ctx)`      | Детали для отладки (CLOB, параметры запроса) |
| `Gu23Logger::error($msg, $ctx)`      | Ошибки OCI, несоответствия данных            |
| `Gu23Logger::exception($e, $action)` | Необработанные исключения в `handle()`       |

### Oracle: таблица `xx_disl_log_new`

Для отладки на уровне PL/SQL пакет пишет в `xx_disl_log_new` через `log_new()` (autonomous transaction):

```sql
-- Просмотр последних записей пакета:
SELECT * FROM xx_disl_log_new
 WHERE log_function LIKE 'xx_disl_gu23_pkg%'
 ORDER BY id DESC
 FETCH FIRST 50 ROWS ONLY;
```

---

## Типичные ошибки и диагностика

### 1. Статус акта не меняется на `signed` после согласования

**Симптом:** Все подписанты нажали «Подписать», но статус остался `active`.

**Причины и проверки:**

```sql
-- 1. Проверить stype у подписантов акта (подставить нужный act_id):
SELECT id, signer_ref_id, fio, stype
  FROM xx_disl_gu23_signer
 WHERE act_id = :act_id;
-- stype должен быть 'own' у подписантов предприятия.
-- Если NULL — пакет не знает, что они должны подписывать.

-- 2. Проверить записи согласования:
SELECT approver_id, status, decided_at
  FROM xx_disl_gu23_approval
 WHERE act_id = :act_id;
-- Должны быть записи со status='approved'.

-- 3. Проверить связку signer_ref_id = approver_id:
SELECT s.signer_ref_id, s.stype, a.approver_id, a.status
  FROM xx_disl_gu23_signer s
  LEFT JOIN xx_disl_gu23_approval a
    ON s.signer_ref_id = a.approver_id AND s.act_id = a.act_id
 WHERE s.act_id = :act_id AND s.stype = 'own';
-- approver_id не должен быть NULL.
```

**Исправление:** перекомпилировать пакет с актуальным `XX_DISL_GU23_PKG.pkb`.

---

### 2. Ошибка `ORA-XXXXX` / пустой ответ от `data.php`

**Симптом:** В браузере `{"ok":false,"msg":"..."}` или пустой JSON.

**Что проверять:**

1. Файл лога: `tail -f gu23/log/gu23_$(date +%F).log`
2. Oracle alert log / `xx_disl_log_new`
3. Состояние пакета:

```sql
SELECT object_name, status
  FROM all_objects
 WHERE object_name = 'XX_DISL_GU23_PKG'
   AND object_type IN ('PACKAGE', 'PACKAGE BODY');
-- Оба должны быть VALID. INVALID → перекомпилировать.
```

4. Ошибки компиляции:

```sql
SELECT line, position, text
  FROM all_errors
 WHERE name = 'XX_DISL_GU23_PKG'
 ORDER BY line;
```

---

### 3. Письма согласования не приходят

**Симптом:** Кнопка «Отправить на согласование» нажата, тост «Письма отправлены», но писем нет.

**Что проверять:**

1. Режим рассылки в `form.js`:

```js
const APPROVAL_MODE = 'send_file' // ← письма сохраняются в папку mail/, не отправляются
```

2. Наличие HTML-файлов в `gu23/mail/` (при `send_file`).
3. Наличие подписантов с `user_id` в справочнике:

```sql
SELECT id, fio, user_id FROM xx_disl_gu23_ref_signer WHERE active = 'Y';
-- user_id должен быть заполнен у тех, кому нужно слать письма.
```

4. Проверить результат `gu23_approval_get_signers`:

```sql
SELECT * FROM TABLE(xx_disl_gu23_pkg.gu23_approval_get_signers(:act_id));
-- Если пусто → подписантов с user_id нет или stype != 'own'.
```

---

### 4. `stype` у подписантов акта — NULL

**Симптом:** Подписанты выбраны из списка, но в БД `stype = NULL`.

**Причина:** Старый код фронтенда не передавал `stype` при сохранении, или редактирование акта не переносило поле при загрузке.

**Ручное исправление:**

```sql
-- Для актов, созданных до добавления stype:
UPDATE xx_disl_gu23_signer s
   SET stype = CASE
                  WHEN EXISTS (SELECT 1 FROM xx_disl_users u WHERE u.id = s.signer_ref_id)
                  THEN 'own'
                  WHEN s.signer_ref_id IS NOT NULL
                  THEN 'rzd'
               END
 WHERE stype IS NULL;
COMMIT;
```

---

### 5. Ошибка «Нет доступа» при входе в модуль

**Симптом:** Страница с замком, «нет роли в модуле ГУ-23».

**Что проверять:**

```sql
-- Проверить роли пользователя (подставить user_id):
SELECT r.role_code, r.role_name
  FROM xx_disl_gu23_user_roles ur
  JOIN xx_disl_gu23_roles r ON r.role_id = ur.role_id
 WHERE ur.user_id = :user_id;

-- Назначить роль вручную (если нужно):
INSERT INTO xx_disl_gu23_user_roles (user_id, role_id)
SELECT :user_id, role_id FROM xx_disl_gu23_roles WHERE role_code = 'GU23_USER';
COMMIT;
```

---

### 6. Ошибка «Нельзя отправить на согласование: в акте нет вагонов»

**Причина:** Вагоны не добавлены, проверка выполняется и на клиенте, и на сервере.

**Решение:** Добавить вагоны в акт (кнопка «Добавить вагон» в форме) и повторить отправку.

---

### 7. HMAC-ссылка недействительна

**Симптом:** Подписант переходит по ссылке из письма и видит «Ссылка недействительна».

**Причины:**

- Срок действия ссылки истёк (7 дней)
- Ссылка уже использована (решение уже записано)
- `HMAC_SECRET` изменился на сервере

**Действие:** Администратор нажимает «Переотправить ссылки» в карточке акта — генерируется новый `token_sig`.

---

### 8. Пакет Oracle в статусе `INVALID`

После любых изменений скриптов `.pks`/`.pkb` нужно перекомпилировать:

```sql
@sql-DB/XX_DISL_GU23_PKG.pks
@sql-DB/XX_DISL_GU23_PKG.pkb
```

Или вручную в SQL Developer:

```sql
ALTER PACKAGE xx_etw.xx_disl_gu23_pkg COMPILE;
ALTER PACKAGE xx_etw.xx_disl_gu23_pkg COMPILE BODY;
```

---

## Локальная разработка

Папки `test/` и `mail/` добавлены в `.gitignore`.

- `mail/` — HTML-файлы писем при `APPROVAL_MODE = 'send_file'`
- `test/` — вспомогательные тестовые скрипты

Для отключения рассылки при разработке:

```js
// form.js
const APPROVAL_MODE = false
```

### Обход авторизации локально

Скопируйте шаблон:

```bash
cp db_config.local.php.example db_config.local.php
```

Файл задаёт фейковую сессию (логин `dev`, `user_id = 1`, роль администратора) и параметры подключения к локальному Oracle. `db_config.local.php` в `.gitignore` — на прод не попадает.

```
http://localhost/gu23/index.php
```
