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

  <!-- add 24.07.2026 BekmansurovRR: личные шаблоны фильтров -->
  <select class="inp" id="archive-preset-select" title="Мои шаблоны">
    <option value="">Мои шаблоны</option>
  </select>
  <button type="button" class="btn ghost" id="btn-save-preset" title="Сохранить текущие фильтры как шаблон">Сохранить шаблон</button>
  <button type="button" class="btn ghost" id="btn-del-preset" title="Удалить выбранный шаблон">✕</button>

  <div class="refs-actions archive-excel-actions">
    <button class="refs-action-btn" id="btn-export-acts" type="button">
      <img src="/img/ms_excel.svg" alt="Выгрузить акты" class="refs-excel-icon">
      <span>Excel</span>
    </button>
  </div>

  <!-- add 24.07.2026 BekmansurovRR: кнопка открытия скрытой панели фильтров -->
  <button type="button" class="inp ms-btn" id="btn-toggle-filters"
    style="margin-left:auto">Фильтры</button>

  <!-- add 24.07.2026 BekmansurovRR: фильтры применяются только по этой кнопке -->
  <button type="button" class="btn primary" id="btn-apply-filters">Применить фильтр</button>
</div>

<!-- add 24.07.2026 BekmansurovRR: все фильтры спрятаны в этот блок -->
<div class="filters archive-filters-panel" id="archive-filters-panel" style="display:none"></div>

<!-- add 24.07.2026 BekmansurovRR: сводка по применённому шаблону -->
<div class="archive-filters-summary" id="archive-filters-summary" style="display:none"></div>

<div class="card" id="acts-table-container"></div>
