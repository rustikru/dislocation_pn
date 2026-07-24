<div class="phead">
  <h1>Архив актов</h1>
  <div class="spacer"></div>
  <button class="btn ghost" id="btn-reset-filters" title="Сбросить фильтры"
    style="color:var(--muted);margin-right:9px">Сбросить</button>
</div>

<div class="filters" id="archive-filters">
  <div class="searchbox">
    <input type="text" class="inp" id="search-input" placeholder="Номер акта, номер вагона, причина...">
  </div>

  <!-- add 24.07.2026 BekmansurovRR: личные шаблоны фильтров (наполнение — этап 2) -->
  <select class="inp" id="archive-preset-select" title="Мои шаблоны">
    <option value="">Мои шаблоны</option>
  </select>

  <div class="refs-actions archive-excel-actions">
    <button class="refs-action-btn" id="btn-export-acts" type="button">
      <img src="/img/ms_excel.svg" alt="Выгрузить акты" class="refs-excel-icon">
      <span>Excel</span>
    </button>
  </div>

  <!-- add 24.07.2026 BekmansurovRR: кнопка открытия скрытой панели фильтров -->
  <button type="button" class="inp ms-btn" id="btn-toggle-filters"
    style="margin-left:auto">Фильтры</button>
</div>

<!-- add 24.07.2026 BekmansurovRR: все фильтры спрятаны в этот блок -->
<div class="filters archive-filters-panel" id="archive-filters-panel" style="display:none"></div>

<div class="card" id="acts-table-container"></div>
