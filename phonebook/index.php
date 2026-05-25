
<!doctype html>
<html lang="ru">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Телефонный справочник</title>
  <link rel="icon" type="image/x-icon" href="image/favicon.ico">
  <link rel="stylesheet" href="css/style.css" />
</head>

<body>

  <!-- шапка -->
  <div class="sticky-header">
    <div class="wrap">

      <div class="page-header">
        <div class="page-title">Телефонный справочник</div>
        <!-- <div class="page-sub">Всего записей: <span id="totalCount">0</span> </div> -->
         
      </div>
      <div class="info-accordions" >
       <!-- <details class="info-details"> 
          <summary class="info-summary main-summary">Инструкции</summary> -->

           <div class="info-content main-content">
            <!-- Техподдержка -->
            <details class="info-details">
              <summary class="info-summary">Техподдержка</summary>
              <div class="info-content sub-content ribbon-block">
                <p>По вопросам актуальности информации справочника или работы приложения просьба обращаться по телефону
                  <strong>5990</strong> или направить письмо на адрес <a
                    href="mailto:sdesk@metafrax.ru">sdesk@metafrax.ru</a></p>
              </div>
            </details>
            <!-- FMC -->
            <details class="info-details">
              <summary class="info-summary">Инструкция по использованию сотовых телефонов FMC</summary>
              <div class="info-content sub-content ribbon-block">
                <p>Для звонков со стационарных телефонов АТС АО «Метафракс» необходимо пользоваться колонкой справочника <strong>«Внутр.номер»</strong>.</p>
                <p>При этом:</p>
                <ul>
                  <li>При наборе номера в формате <strong>3ххх</strong> — звонок поступит на <strong>стационарный телефон</strong> вызываемого абонента.</li>
                  <li>При наборе номера в формате <strong>733ххх</strong> — звонок поступит на <strong>стационарный и на мобильный FMC</strong> телефон вызываемого абонента.</li>
                  <li>При наборе номера в формате <strong>1ххх, 2ххх, 6ххх, 7ххх, 8ххх</strong> — звонок поступит на <strong>мобильный FMC</strong> телефон вызываемого абонента.</li>
                  <li><strong>Входящие звонки</strong> на мобильные корпоративные номера FMC из города, с других операторов связи осуществляются путём набора полного федерального номера <strong>89ххххххххх</strong>.</li>
                  <li><strong>Исходящие звонки</strong> с корпоративных сотовых телефонов FMC возможны только в пределах завода, путём прямого набора номеров в виде <strong>3ххх, 1ххх, 2ххх, 6ххх, 7ххх, 8ххх</strong>.</li>
                </ul>
              </div>
            </details>
            <!-- «Росхим» -->
            <details class="info-details">
              <summary class="info-summary">Инструкция по звонкам на предприятия группы АО «Росхим»</summary>
              <div class="info-content sub-content ribbon-block">
                <p>Звонки на предприятия группы «Росхим» осуществляются через специальный префикс, который упрощает связь между различными структурами компании.</p> 
                <p>Телефонный префикс — это цифры, которые стоят перед номером абонента.</p>
                <p>Новый формат включает префикс <strong>6X</strong>, после которого следует краткий номер абонента, состоящий из трёх/четырёх цифр <strong>(XXX)/(ХХХХ)</strong>. Например, для связи с абонентами группы АО «Росхим» можно будет использовать номер <strong>64-4011</strong> или <strong>67-341</strong>.</p>
                <p>На данный момент реализованы звонки на следующие предприятия группы:</p>
                
                <!-- <div class="prefix-list">
                  <span>АО «Росхим» — <strong>61XXX</strong></span>
                  <span>АО «СЗ» — <strong>65XXXX</strong></span>
                  <span>АО «Титановые инвестиции» — <strong>66XXXX</strong></span>
                  <span>АО «КучукСульфат» — <strong>67XXX</strong></span>
                  <span>АО «ДонБиоТех» — <strong>68XXX</strong></span>
                  <span>АО «Волжский Оргсинтез» — <strong>71XXXX</strong></span>
                </div> -->
                <table class="table-rushem">
                  <tr>
                    <td>АО «Росхим»</td> <td>61XXX</td>
                  </tr>
                  <tr>
                    <td>АО «СЗ»</td> <td>65XXXX</td>
                  </tr>
                  <tr>
                    <td>АО «Титановые инвестиции»</td> <td>66XXXX</td>
                  </tr>
                  <tr>
                    <td>АО «КучукСульфат»</td> <td>67XXX</td>
                  </tr>
                  <tr>
                    <td>АО «ДонБиоТех»</td> <td>68XXX</td>
                  </tr>
                  <tr>
                    <td>АО «Волжский Оргсинтез»</td> <td>71XXXX</td>
                  </tr>
                </table>
              </div>
            </details>


          </div>
        <!-- </details> -->
      </div>
      <div class="filter-panel">
        <div class="field">
          <label>Организация</label>
          <div class="select-wrap">
            <select id="filterOrg">
              <option value="">Все организации</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Подразделение</label>
          <div class="select-wrap">
            <select id="filterDiv">
              <option value="">Все подразделения</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Отдел / Участок</label>
          <div class="select-wrap">
            <select id="filterDep">
              <option value="">Все отделы</option>
            </select>
          </div>
        </div>
      </div>

      <div class="search-row">
        <div class="search-box">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" id="searchInput" placeholder="Поиск по ФИО, должности, номеру телефона, сектору..." />
        </div>
        <div class="toolbar">
          <div class="count-pill">Найдено: <span id="foundCount">0</span></div>
          <!-- <button class="btn-expand" onclick="expandAll()">↕ Раскрыть все</button>
          <button class="btn-collapse" onclick="collapseAll()">↕ Свернуть все</button> -->
          <button class="btn-reset" onclick="resetAll()">✕ Сбросить</button>
          <button class="btn-export" onclick="exportExcel()">⬇ Excel</button>
        </div>
      </div>

    </div>
  </div>

  <!-- Контент -->
  <div class="wrap wrap--content">
    <div class="tree" id="tree"></div>
    <div class="loading-state" id="loadingState">
      <div class="loading-spinner"></div>
      <p class="loading-text">Загрузка справочника…</p>
    </div>
    <div class="no-results" id="noResults" style="display: none">
      <div class="no-results-icon">🔍</div>
      <p>
        По вашему запросу ничего не найдено.<br />Попробуйте изменить фильтры или поисковый запрос.
      </p>
    </div>
    <div class="no-search" id="noSearch" style="display: none">
      <div class="no-results-icon">🔍</div>
      <p>Введите имя, должность, номер телефона или выберите фильтр для поиска</p>
    </div>
    
  </div>

  <script src="js/default.js" defer></script>

</body>

</html>