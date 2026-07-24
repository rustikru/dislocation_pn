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
  <select class="inp" id="archive-preset-select" title="Мои шаблоны фильтров">
    <option value="">Без шаблона</option>
  </select>
  <div class="refs-actions archive-excel-actions">
    <button class="refs-action-btn" id="btn-export-acts" type="button">
      <img src="/img/ms_excel.svg" alt="Выгрузить акты" class="refs-excel-icon">
      <span>Excel</span>
    </button>
  </div>

  <button type="button" class="inp ms-btn" id="btn-toggle-filters" style="margin-left:auto">Фильтры</button>

  <button type="button" class="btn primary" id="btn-apply-filters">Применить фильтр</button>
</div>

<div class="archive-filters-panel" id="archive-filters-panel" style="display:none">
  <div class="archive-preset-toolbar">
    <label for="archive-preset-select">Шаблон фильтра</label>

    <button type="button" class="btn ghost" id="btn-save-preset"
      title="Сохранить текущие параметры как новый шаблон">Сохранить как новый</button>
    <button type="button" class="btn ghost" id="btn-update-preset" disabled
      title="Изменить выбранный пользовательский фильтр">Сохранить изм. фильтра</button>
    <button type="button" class="btn danger archive-preset-delete" id="btn-del-preset" disabled
      title="Удалить выбранный шаблон">Удалить шаблон</button>
  </div>
  <div class="filters archive-filter-controls" id="archive-filter-controls"></div>
</div>

<!-- инфа по применённому шаблону -->
<div class="archive-filters-summary" id="archive-filters-summary" style="display:none"></div>

<div class="card" id="acts-table-container"></div>