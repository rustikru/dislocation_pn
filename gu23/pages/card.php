<div class="phead">
  <button class="btn ghost" id="btn-back-to-archive">Назад</button>
  <h1 id="card-act-number" style="font-family:var(--mono);font-size:18px;margin-left:16px"></h1>
  <div class="spacer"></div>
</div>

<div id="annulled-banner-place"></div>

<div class="grid-layout" style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start">
  <div id="card-left-column">
    <div class="card" id="card-details-block">
      <div class="cardpad"
        style="border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px">
        <b>Реквизиты акта</b>
        <div style="display:flex;align-items:center;gap:8px">
          <div id="card-report-buttons" style="display:flex;align-items:center;gap:8px"></div>
          <div class="actions-dd" id="actions-dd" style="display:none">
            <button class="btn icon-btn" id="btn-actions" title="Ещё действия">...</button>
            <div class="actions-menu" id="actions-menu"></div>
          </div>
        </div>
      </div>
      <dl class="kv" id="card-details-list" style="padding:16px 18px"></dl>
    </div>

    <div class="card" id="card-wagons-block" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line)">
        <b id="card-wagons-title">Вагоны</b>
      </div>
      <div style="overflow:auto;max-height:calc(100vh - 220px);min-height:360px">
        <table class="tbl">
          <thead>
            <tr>
              <th>№ вагона</th>
              <th>Накладная</th>
              <th>Собственник</th>
              <th>Род</th>
              <th>Ст. отпр.</th>
              <th>Ст. назн.</th>
              <th>Груз</th>
              <th>Вес(кг)</th>
            </tr>
          </thead>
          <tbody id="card-wagons-rows"></tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="card-right-column">
    <div class="card" id="card-signers-block">
      <div class="cardpad" style="border-bottom:1px solid var(--line)">
        <b>Подписанты</b>
      </div>
      <div id="card-signers-body" style="padding:8px 16px 4px"></div>
    </div>

    <div class="card" id="card-files-block" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line);display:flex;align-items:center">
        <b>Приложения</b>
        <div style="flex:1"></div>
        <div id="card-files-buttons"></div>
      </div>
      <div class="cardpad" id="card-files-body"></div>
    </div>

    <div class="card" id="card-history-block" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line)">
        <b>История</b>
      </div>
      <div class="hist-container">
        <ul class="hist" id="card-history-list" style="padding:0 18px"></ul>
      </div>
    </div>
  </div>
</div>