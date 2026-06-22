<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Документация API — Система управления вагонами и заявками</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #ffffff;
            --text: #222222;
            --text-secondary: #666666;
            --border: #e0e0e0;
            --accent: #007bff;
            --success: #28a745;
            --warning: #ffc107;
            --danger: #dc3545;
            --code-bg: #f8f9fa;
            --code-border: #e9ecef;
            --card-bg: #fbfbfb;
            --header-bg: #f8f9fa;
            --sidebar-bg: #fafafa;
            --highlight: #fff9c4;
        }

        .dark-theme {
            --bg: #121212;
            --text: #e0e0e0;
            --text-secondary: #a0a0a0;
            --border: #333333;
            --code-bg: #2d2d2d;
            --code-border: #444444;
            --card-bg: #1e1e1e;
            --header-bg: #1a1a1a;
            --sidebar-bg: #181818;
            --highlight: #333333;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Roboto', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 0;
            margin: 0;
        }

        .container {
            max-width: 1024px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* Header */
        header {
            background-color: var(--header-bg);
            padding: 20px 0;
            border-bottom: 1px solid var(--border);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--accent);
        }

        .theme-toggle {
            background: none;
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 0.9rem;
            color: var(--text);
            background-color: var(--card-bg);
        }

        /* Article */
        article {
            padding: 30px 0;
        }

        h1 {
            font-size: 2.2rem;
            margin-bottom: 1.5rem;
            font-weight: 700;
        }

        h2 {
            font-size: 1.7rem;
            margin: 2.5rem 0 1.5rem;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--accent);
            color: var(--text);
        }

        h3 {
            font-size: 1.4rem;
            margin: 2rem 0 1rem;
            color: var(--text);
        }

        p {
            margin-bottom: 1rem;
        }

        /* Blocks */
        .note, .tip, .important {
            padding: 16px;
            border-radius: 6px;
            margin: 1.5rem 0;
            font-size: 0.95rem;
        }

        .note {
            background-color: var(--highlight);
            border-left: 4px solid var(--warning);
            color: var(--text);
        }

        .tip {
            background-color: rgba(40, 167, 69, 0.08);
            border-left: 4px solid var(--success);
            color: var(--text);
        }

        .important {
            background-color: rgba(220, 53, 69, 0.08);
            border-left: 4px solid var(--danger);
            color: var(--text);
        }

        /* Code blocks */
        .code-block {
            position: relative;
            margin: 1.5rem 0;
            background-color: var(--code-bg);
            border: 1px solid var(--code-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .code-header {
            background-color: var(--card-bg);
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }

        .code-copy {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.85rem;
        }

        pre {
            margin: 0;
            padding: 16px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            background: transparent;
        }

        code {
            background-color: var(--code-bg);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }

        /* Endpoint block */
        .endpoint {
            background-color: var(--card-bg);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1px solid var(--border);
        }

        .endpoint-method {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: 500;
            font-size: 0.85rem;
            color: white;
            margin-right: 10px;
        }

        .method-get { background-color: var(--success); }
        .method-post { background-color: var(--accent); }
        .method-put { background-color: #6c757d; }
        .method-delete { background-color: var(--danger); }

        .endpoint-title {
            font-size: 1.3rem;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
        }

        .endpoint-path {
            font-family: 'Courier New', monospace;
            font-weight: 500;
            color: var(--accent);
        }

        .endpoint-desc {
            color: var(--text-secondary);
            margin-bottom: 16px;
            font-size: 0.95rem;
        }

        .params, .response {
            margin-top: 16px;
        }

        .params-title, .response-title {
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--text);
        }

        .param-item {
            margin-bottom: 8px;
            padding-left: 16px;
            position: relative;
        }

        .param-item:before {
            content: "•";
            position: absolute;
            left: 0;
            color: var(--accent);
        }

        /* Footer */
        footer {
            text-align: center;
            padding: 30px 0;
            color: var(--text-secondary);
            font-size: 0.9rem;
            border-top: 1px solid var(--border);
            margin-top: 40px;
        }

        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 12px;
            }
            h1 { font-size: 1.8rem; }
            h2 { font-size: 1.5rem; }
        }

        .copied {
            color: var(--success);
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <div class="header-content">
                <div class="logo">API Документация</div>
                <button class="theme-toggle" id="themeToggle">Темная тема</button>
            </div>
        </div>
    </header>

    <main class="container">
        <article>
            <h1>Документация API системы управления вагонами и заявками</h1>
            <p>Эта документация описывает публичные REST-методы API для интеграции с системой учета вагонов, погрузки, взвешивания и заявок на увод/взвешивание.</p>

            <div class="note">
                <strong>Примечание:</strong> Все методы возвращают JSON в формате:
                <pre>{
  "status": "S", // "S" — успех, "E" — ошибка
  "message": "", // сообщение (может быть null)
  "data": {}     // данные ответа (структура зависит от метода)
}</pre>
            </div>

            <!-- System Endpoints -->
            <h2>Системные методы</h2>

            <div class="endpoint">
                <div class="endpoint-title">
                    <span class="endpoint-method method-get">GET</span>
                    <span class="endpoint-path">/api/TestDbConnection</span>
                </div>
                <div class="endpoint-desc">
                    Проверяет соединение с базой данных Oracle.
                </div>

                <div class="response">
                    <div class="response-title">Успешный ответ (<code>status: "S"</code>)</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Ответ</span>
                            <button class="code-copy" data-target="#copy-test-db">Копировать</button>
                        </div>
                        <pre id="copy-test-db">{
  "status": "S",
  "message": "Connection successful!",
  "data": []
}</pre>
                    </div>
                </div>
            </div>

            <!-- Car Number Endpoints -->
            <h2>Методы работы с вагонами</h2>

            <div class="endpoint">
                <div class="endpoint-title">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/api/GetWagonsToDestination</span>
                </div>
                <div class="endpoint-desc">
                    Получает список вагонов, назначенных на МД (Место Доставки), с фильтрацией по типу вагона и грузу.
                </div>

                <div class="params">
                    <div class="params-title">Параметры</div>
                    <div class="param-item">
                        <code>type_car</code> — массив строк (необязательно): типы вагонов, напр. <code>["ПЛ", "ЦС"]</code>
                    </div>
                    <div class="param-item">
                        <code>freight_name</code> — массив строк (необязательно): наименования грузов, напр. <code>["КФК", "КФС"]</code>
                    </div>
                    <div class="param-item">
                        <strong>POST</strong>: в теле запроса как JSON.
                    </div>
                </div>

                <div class="response">
                    <div class="response-title">Пример запроса (POST)</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Запрос</span>
                            <button class="code-copy" data-target="#copy-get-wagons-request">Копировать</button>
                        </div>
                        <pre id="copy-get-wagons-request">{
  "type_car": ["ПЛ", "ЦС"],
  "freight_name": ["КФК", "КФС"]
}</pre>
                    </div>

                    <div class="response-title">Успешный ответ (<code>status: "S"</code>)</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Ответ</span>
                            <button class="code-copy" data-target="#copy-get-wagons-response">Копировать</button>
                        </div>
                        <pre id="copy-get-wagons-response">{
  "status": "S",
  "message": null,
  "data": [
    {
      "car_next_repair": "14.03.2026",
      "car_number": 40027716,
      "car_status": "Годен (43)",
      "car_type": "ПЛ с КЦ",
      "freight_name": "КФС",
      "inv_from_station_name": "КОЙТЫ (284101)",
      "inv_number": "ЭМ362642/24.01.2026 07:40:42",
      "inv_payer_name": "КОЙТЫ (284101)",
      "place_disl": "ПСП <- Углеуральская",
      "sim_exp_approach": 5,
      "station_name": "Углеуральская",
      "way": "/Водораздельная/Есть уведомление с ПСП"
    },
    {
      "car_next_repair": "15.02.2026",
      "car_number": 42275149,
      "car_status": "Подходит срок ремонта (16)",
      "car_type": "ПЛ",
      "freight_name": "Фенол",
      "inv_from_station_name": "КОМБИНАТСКАЯ (831504)",
      "inv_number": "ЭИ151038/14.11.2025 23:02:16",
      "inv_payer_name": "КОМБИНАТСКАЯ (831504)",
      "place_disl": "ПСП <- Водораздельная",
      "sim_exp_approach": 76,
      "station_name": "Углеуральская",
      "way": "/Углеуральская/Вагоны Метадинеи на ПСП/3602 20.12.2025"
    }
  ]
}</pre>
                    </div>
                </div>
            </div>

            <div class="endpoint">
                <div class="endpoint-title">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/api/GetWeighingData</span>
                </div>
                <div class="endpoint-desc">
                    Получает данные по взвешиванию для указанных вагонов (можно запрашивать несколько за один вызов).
                </div>

                <div class="params">
                    <div class="params-title">Параметры</div>
                    <div class="param-item">
                        Тело запроса — JSON с полем <code>"cars"</code>, содержащим массив объектов:
                        <ul>
                            <li><code>car_number</code> — номер вагона (строка)</li>
                            <li><code>weight_type</code> — тип веса: <code>"brutto"</code> или <code>"tare"</code></li>
                        </ul>
                    </div>
                </div>

                <div class="response">
                    <div class="response-title">Пример запроса</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Запрос</span>
                            <button class="code-copy" data-target="#copy-weighing-request">Копировать</button>
                        </div>
                        <pre id="copy-weighing-request">{
  "cars": [
    {
      "car_number": "50366442",
      "weight_type": "brutto"
    },
    {
      "car_number": "40027716",
      "weight_type": "tare"
    }
  ]
}</pre>
                    </div>

                    <div class="response-title">Успешный ответ (<code>status: "S"</code>)</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Ответ</span>
                            <button class="code-copy" data-target="#copy-weighing-response">Копировать</button>
                        </div>
                        <pre id="copy-weighing-response">{
  "status": "S",
  "message": null,
  "data": [
    {
      "car_number": "50366442",
      "weighing_date": "03.01.2026 07:41:02",
      "weight": "89740",
      "weight_type": "brutto"
    },
    {
      "car_number": "40027716",
      "weighing_date": "14.08.2025 06:50:11",
      "weight": "27740",
      "weight_type": "tare"
    }
  ]
}</pre>
                    </div>
                </div>
            </div>

            <div class="endpoint">
                <div class="endpoint-title">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/api/CreateWagonLoading</span>
                </div>
                <div class="endpoint-desc">
                    Создаёт запись о погрузке вагонов (используется при подтверждении погрузки).
                </div>

                <div class="params">
                    <div class="params-title">Параметры</div>
                    <div class="param-item">
                        Тело запроса — JSON, структура определяется моделью <code>createWagonLoading</code>.
                    </div>
                </div>

                <div class="response">
                    <div class="response-title">Пример ответа</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Ответ</span>
                            <button class="code-copy" data-target="#copy-create-loading">Копировать</button>
                        </div>
                        <pre id="copy-create-loading">{
  "status": "S",
  "message": "",
  "data": {
    "loading_id": 12345,
    "timestamp": "2026-06-09T10:25:33Z"
  }
}</pre>
                    </div>
                </div>
            </div>

            <!-- Request Endpoints -->
            <h2>Методы работы с заявками</h2>

            <div class="endpoint">
                <div class="endpoint-title">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/api/CreateApplication</span>
                </div>
                <div class="endpoint-desc">
                    Создаёт заявку на увод или взвешивание.
                </div>

                <div class="params">
                    <div class="params-title">Параметры</div>
                    <div class="param-item">
                        Тело запроса — JSON, структура определяется моделью <code>createRequests</code>.
                    </div>
                </div>

                <div class="response">
                    <div class="response-title">Пример ответа</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Ответ</span>
                            <button class="code-copy" data-target="#copy-create-app">Копировать</button>
                        </div>
                        <pre id="copy-create-app">{
  "status": "S",
  "message": "",
  "data": {
    "request_id": "156839",
    "created_at": "2026-06-09T10:26:01Z",
    "status": "Создана"
  }
}</pre>
                    </div>
                </div>
            </div>

            <div class="endpoint">
                <div class="endpoint-title">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/api/GetApplicationStatus</span>
                </div>
                <div class="endpoint-desc">
                    Возвращает текущий статус одной или нескольких заявок. <strong>Важно:</strong> метод принимает не ID, а полную структуру заявки (как при создании), чтобы найти её в БД по совпадению полей (<code>task_header_id</code>, <code>req_line</code>, и др.).
                </div>

                <div class="params">
                    <div class="params-title">Параметры</div>
                    <div class="param-item">
                        Тело запроса — JSON, идентичный тому, что передаётся в <code>CreateApplication</code>, напр.:
                    </div>
                    <div class="param-item">
                        <code>created_by</code>, <code>criticality_id</code>, <code>deadline_date_in</code>, <code>deadline_date_out</code>, <code>req_line</code> (массив строк), <code>request_id</code> (может быть <code>"0"</code>), <code>task_header_id</code>.
                    </div>
                </div>

                <div class="response">
                    <div class="response-title">Пример запроса</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Запрос</span>
                            <button class="code-copy" data-target="#copy-get-status-request">Копировать</button>
                        </div>
                        <pre id="copy-get-status-request">{
  "created_by": "KHALEZOVEB",
  "criticality_id": "1",
  "deadline_date_in": "30.01.2026 17:00:00",
  "deadline_date_out": "31.01.2026 21:00:00",
  "req_line": [
    {
      "car_count": "1",
      "car_number": "50366442",
      "car_type": "пл",
      "criteria_line_id": "11",
      "freight": "СМОЛА МД",
      "note": "взвесить срочно",
      "railway_id": "14_СМОЛА_МЕТАДИНЕА",
      "send_psp": "0",
      "send_weighing": "1",
      "state": "пор."
    }
  ],
  "request_id": "0",
  "task_header_id": "14"
}</pre>
                    </div>

                    <div class="response-title">Успешный ответ (<code>status: "S"</code>)</div>
                    <div class="code-block">
                        <div class="code-header">
                            <span>Ответ</span>
                            <button class="code-copy" data-target="#copy-get-status-response">Копировать</button>
                        </div>
                        <pre id="copy-get-status-response">{
  "status": "S",
  "message": null,
  "data": [
    {
      "request_id": 156840,
      "status": "В обработке"
    },
    {
      "request_id": 156839,
      "status": "Выполнено"
    }
  ]
}</pre>
                    </div>

                    <div class="important">
                        Поле <code>data</code> всегда — <em>массив</em>. Даже если найдена одна заявка — она будет в виде элемента массива. Статус может быть: <code>"Выполнено"</code>, <code>"В обработке"</code>, <code>"Не определено"</code>, <code>"Отклонено"</code> и др. — в зависимости от бизнес-логики.
                    </div>
                </div>
            </div>

            <div class="tip">
               Все POST-методы требуют заголовка <code>Content-Type: application/json</code>. GET-методы не принимают тело запроса. Реализация контроллеров находится в <code>/controllers/</code>, модели — в <code>/models/</code>. Схема маршрутизации задана в <code>index.php</code>.
            </div>
        </article>

        <footer>
            <p>© 2026 — Документация API. Версия: v1.3 | Последнее обновление: 09 июня 2026</p>
        </footer>
    </main>

    <script>
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;

        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            html.classList.add('dark-theme');
            themeToggle.textContent = 'Светлая тема';
        } else {
            html.classList.remove('dark-theme');
            themeToggle.textContent = 'Темная тема';
        }

        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark-theme');
            if (html.classList.contains('dark-theme')) {
                localStorage.theme = 'dark';
                themeToggle.textContent = 'Светлая тема';
            } else {
                localStorage.theme = 'light';
                themeToggle.textContent = 'Темная тема';
            }
        });

        document.querySelectorAll('.code-copy').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const codeEl = document.getElementById(targetId);
                const text = codeEl.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    const originalText = button.textContent;
                    button.textContent = '✓ Скопировано';
                    button.classList.add('copied');
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.classList.remove('copied');
                    }, 2000);
                });
            });
        });
    </script>
</body>
</html>