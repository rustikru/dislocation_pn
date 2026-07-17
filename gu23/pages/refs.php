<div class="phead" style="padding-bottom:10px">
  <h2 style="margin:0;font-size:16px">Справочники</h2>
</div>

<div id="refs-tabs" style="display:flex;gap:3px;margin-bottom:10px;border-bottom:1px solid var(--line2)">
  <button class="refs-tab refs-tab-active" data-tab="signers">Подписанты</button>
  <button class="refs-tab" data-tab="reasons">Причины</button>
</div>

<div class="refs-tools">
  <input class="inp refs-search" id="refs-search" value="" placeholder="Поиск...">
  <div class="refs-actions">
    <button class="refs-action-btn" id="btn-add-ref" type="button">
      <span class="refs-plus">+</span>
      <span>Добавить запись</span>
    </button>
    <button class="refs-action-btn" id="btn-export-reasons" type="button" style="display:none">
      <img src="/img/ms_excel.svg" alt="" class="refs-excel-icon">
      <span></span>
    </button>
  </div>
</div>

<div id="refs-body">
  <div class="muted" style="font-size:13px">Загрузка...</div>
</div>