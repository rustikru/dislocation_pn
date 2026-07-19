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
  <div class="refs-actions archive-excel-actions">
    <button class="refs-action-btn" id="btn-export-acts" type="button">
      <img src="/img/ms_excel.svg" alt="Выгрузить акты" class="refs-excel-icon">
      <span>Excel</span>
    </button>
  </div>
</div>

<div class="card" id="acts-table-container"></div>
