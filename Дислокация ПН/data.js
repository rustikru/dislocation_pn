// ====== Дислокация ПН — данные прототипа ======

// Грузы, характерные для химпроизводства
const CARGOES = [
  "Метанол", "Формалин", "КФК", "Карбамид", "Смолы КФ",
  "Параформ", "Фенол", "Уротропин", "Полиамид", "Аммиак",
  "Натр едкий", "Серная к-та", "Меламин", "Пентаэритрит"
];

const CONSIGNEES = ["МТФ", "МД", "АКМ", "ЦПДН", "КФК"];
const TYPES = ["ЦС", "КР", "ПВ", "ПЛ", "ЦБ"];

// Детерминированный псевдо-рандом, чтобы данные не «прыгали» при перерисовке
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function pad(n) { return n < 10 ? "0" + n : "" + n; }

function makeWagon(num, seed) {
  const r = rng(seed);
  const loaded = r() > 0.42;
  const type = TYPES[Math.floor(r() * TYPES.length)];
  const cargo = loaded ? CARGOES[Math.floor(r() * CARGOES.length)] : "";
  const tara = +(22 + r() * 8).toFixed(1);
  const gruz = loaded ? +(40 + r() * 28).toFixed(3) : 0;
  const brutto = +(tara + gruz).toFixed(3);
  const vesy = loaded && r() > 0.6 ? +(20 + r() * 8).toFixed(2) : null;
  const day = 5 + Math.floor(r() * 24);
  const day2 = Math.min(28, day + Math.floor(r() * 4));
  const okStatuses = ["Годен (707)", "Годен (707)", "Годен (707)", "Неиспр. (627)", "В ремонте"];
  const status = okStatuses[Math.floor(r() * okStatuses.length)];
  return {
    num: "" + num,
    type,
    status,
    state: loaded ? "гр." : "пор.",
    cargo,
    gruz: loaded ? gruz : null,
    tara,
    brutto: loaded ? brutto : tara,
    vesy,
    nakl: loaded && r() > 0.5 ? "ЭЦ" + Math.floor(700000 + r() * 99999) : "",
    cont: type === "ПЛ" && r() > 0.5 ? "TCKU" + Math.floor(1000000 + r() * 8999999) : "",
    consignee: CONSIGNEES[Math.floor(r() * CONSIGNEES.length)],
    arrive: `${pad(day)}.05.2026 ${pad(Math.floor(r() * 24))}:${pad(Math.floor(r() * 60))}`,
    lastOp: `${pad(day2)}.05.2026 ${pad(Math.floor(r() * 24))}:${pad(Math.floor(r() * 60))}`,
    siteOp: r() > 0.5 ? `${pad(day2)}.05.2026 ${pad(Math.floor(r() * 24))}:00` : ""
  };
}

// Реальные номера с исходного экрана (путь 12_Отстой)
const TRACK12_NUMS = [
  "76413830","76413632","76401173","76413657","76413442","76413020",
  "76407568","76418219","76409853","76407600","76410513","76413418",
  "76413434","76412675","76409218","76411099","76408442","76412006",
  "76410877"
];

function genWagons(nums, baseSeed) {
  return nums.map((n, i) => makeWagon(n, baseSeed + i * 37 + (+n % 9973)));
}

function genTrackWagons(count, baseSeed) {
  const nums = [];
  let base = 76400000 + (baseSeed % 9000);
  for (let i = 0; i < count; i++) {
    base += 137 + (baseSeed * (i + 3)) % 900;
    nums.push("" + base);
  }
  return genWagons(nums, baseSeed * 7 + 11);
}

// ====== Дерево станции ======
// node: { id, label, count, occupied, capacity, wagons?, children?, group? }
function track(id, label, count, cap, seed, flag) {
  return { id, label, count, cap, flag: !!flag, wagons: count ? genTrackWagons(count, seed) : [] };
}

const TREE = [
  track("t0",  "0_Транз_Новая",        1,  null, 100, true),
  track("t1",  "1_Приемо-отправочный", 23, "1_2", 101),
  track("t2",  "2_Приемо-отправочный", 22, "1_1", 102),
  track("t3",  "3_Приемо-отправочный", 24, "1_2", 103),
  track("t4",  "4_Приемо-отправочный", 26, "1_1", 104),
  track("t5",  "5_Приемо-отправочный", 16, "2_1", 105),
  track("t6",  "6_Сортировочно-весов", 19, null, 106, true),
  track("t7",  "7_Приемо-оправочный",  1,  null, 107, true),
  track("t8",  "8_Приемо-отправочный", 21, "1_3", 108),
  track("t9",  "9_Приемо-отправочный", 19, "1_3", 109),
  track("t10", "10_Вытяжной",          22, "5_0", 110),
  {
    id: "parks", label: "ПАРКИ ОТСТОЯ", count: 221, group: true,
    children: [
      {
        id: "parkA", label: "Парк А", count: 64, group: true,
        children: [
          track("a9",  "9_Отстой",  15, "1_1", 201),
          track("a10", "10_Отстой",  8, "2_1", 202),
          { ...mk12(), open: true },
          track("a13", "13_Отстой", 22, "1_3", 204)
        ]
      },
      {
        id: "parkB", label: "Парк Б", count: 157, group: true,
        children: [
          track("b1", "1_Отстой", 21, "4_0", 301),
          track("b2", "2_Отстой", 19, "4_0", 302),
          track("b3", "3_Отстой", 27, "5_0", 303),
          track("b4", "4_Отстой", 33, "5_0", 304),
          track("b5", "5_Отстой", 28, "5_0", 305),
          track("b6", "6_Отстой", 29, "6_0", 306)
        ]
      }
    ]
  }
];

function mk12() {
  return { id: "a12", label: "12_Отстой", count: 19, cap: "1_2", flag: false, wagons: genWagons(TRACK12_NUMS, 500) };
}

// ====== Заявки ======
// st: ok | warn | err
const REQUESTS = [
  { no: "159864", date: "28.05.2026", text: "МТФ_КФК Формалин Подача",       st: "err"  },
  { no: "159770", date: "25.05.2026", text: "ЦПДН Подача",                    st: "err"  },
  { no: "159890", date: "29.05.2026", text: "МТФ_Метанол Уборка",             st: "warn" },
  { no: "159891", date: "29.05.2026", text: "МТФ_Метанол Подача",             st: "warn" },
  { no: "159889", date: "29.05.2026", text: "МД_All (Смолы, Фенол) Уборка",   st: "warn" },
  { no: "159888", date: "29.05.2026", text: "МТФ_ПАРАФОРМ Уборка",            st: "warn" },
  { no: "159887", date: "29.05.2026", text: "АКМ_All Подача",                 st: "ok"   },
  { no: "159886", date: "28.05.2026", text: "АКМ_All Уборка",                 st: "ok"   },
  { no: "159884", date: "28.05.2026", text: "МД_All (Смолы, Фенол) Уборка",   st: "ok"   },
  { no: "159883", date: "28.05.2026", text: "МТФ_СР 1392 Подача",             st: "warn" },
  { no: "159882", date: "28.05.2026", text: "МТФ_СР 1392 Взвешивание",        st: "warn" },
  { no: "159881", date: "28.05.2026", text: "МТФ_СР 1392 Уборка",             st: "idle" },
  { no: "159880", date: "28.05.2026", text: "МТФ_ГП пэ, уро 1385 Уборка",     st: "warn" },
  { no: "159879", date: "28.05.2026", text: "АКМ_All Подача",                 st: "ok"   },
  { no: "159878", date: "27.05.2026", text: "МД_All Карбамид Взвешивание",    st: "idle" }
];

// Контекстное меню (как на проде)
const CTX_MENU = [
  { key: "up",        label: "Вверх" },
  { key: "down",      label: "Вниз" },
  { sep: true },
  { key: "move",      label: "Переместить внутри станции" },
  { key: "send",      label: "Отправить на другую станцию" },
  { key: "attrs",     label: "Изменить атрибуты" },
  { sep: true },
  { key: "unload",    label: "Разгрузка" },
  { key: "unloadakm", label: "Разгрузка при перемещении (АКМ)" },
  { key: "inspect",   label: "Ввод осмотра" },
  { key: "process",   label: "Обработка вагонов" },
  { key: "inspectm",  label: "Ввод осмотра нескольких вагонов" },
  { sep: true },
  { key: "newreq",    label: "Создать заявку" },
  { key: "weigh",     label: "Результаты взвешиваний" },
  { key: "passport",  label: "Паспорт вагонов" },
  { key: "remove",    label: "Вывод из системы", danger: true }
];

// Станции (селектор как на проде)
const STATIONS = ["Углеуральская", "Водораздельная", "Новая"];

window.DISLOC = { TREE, REQUESTS, CTX_MENU, STATIONS };
