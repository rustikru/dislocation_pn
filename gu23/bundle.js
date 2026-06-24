(() => {
  // utils.js
  function escapeHtml(string) {
    return String(string == null ? "" : string).replace(/[&<>"]/g, (match) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[match];
    });
  }
  function formatToInputDate(databaseDateStr) {
    if (!databaseDateStr) return "";
    const match = String(databaseDateStr).match(
      /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
    );
    return match ? `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}` : "";
  }
  function formatToDatabaseDate(inputDateStr) {
    if (!inputDateStr) return "";
    const match = String(inputDateStr).match(
      /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/
    );
    return match ? `${match[3]}-${match[2]}-${match[1]} ${match[4]}:${match[5]}` : "";
  }
  function formatDateTime(databaseDateStr) {
    if (!databaseDateStr) return "\u2014";
    const match = String(databaseDateStr).match(
      /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
    );
    return match ? `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}` : "\u2014";
  }
  function formatDate(databaseDateStr) {
    if (!databaseDateStr) return "\u2014";
    const match = String(databaseDateStr).match(/(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "\u2014";
  }
  function parseTimeToMilliseconds(inputDateStr) {
    const match = String(inputDateStr).match(
      /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/
    );
    return match ? new Date(
      +match[3],
      +match[2] - 1,
      +match[1],
      +match[4],
      +match[5]
    ).getTime() : NaN;
  }
  function calculateDuration(startTimestamp, endTimestamp) {
    const difference = endTimestamp - startTimestamp;
    const days = Math.floor(difference / 864e5);
    const hours = Math.round((difference - days * 864e5) / 36e5);
    return {
      milliseconds: difference,
      totalHours: difference / 36e5,
      days,
      hours,
      calendarDays: Math.ceil(difference / 864e5)
    };
  }
  function parseWagonsFromText(rawText) {
    const seenWagons = {};
    const result = [];
    String(rawText || "").split(/[\s,;\n\t]+/).forEach((token) => {
      const wagonNumber = token.replace(/[^\d]/g, "");
      if (wagonNumber.length >= 6 && wagonNumber.length <= 8 && !seenWagons[wagonNumber]) {
        seenWagons[wagonNumber] = 1;
        result.push(wagonNumber);
      }
    });
    return result;
  }

  // components/ui.js
  var actTypesConfig = {
    start: { label: "\u041D\u0430\u0447\u0430\u043B\u043E \u043F\u0440\u043E\u0441\u0442\u043E\u044F", className: "typ-start" },
    end: { label: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0441\u0442\u043E\u044F", className: "typ-end" },
    other: { label: "\u041F\u0440\u043E\u0447\u0438\u0439 \u0430\u043A\u0442", className: "typ-other" }
  };
  var actStatusesConfig = {
    draft: { label: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A", className: "st-draft" },
    active: { label: "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439", className: "st-signed" },
    closed: { label: "\u0417\u0430\u043A\u0440\u044B\u0442", className: "st-closed" },
    annulled: { label: "\u0410\u043D\u043D\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D", className: "st-annulled" }
  };
  function showStatusChip(status) {
    const config = actStatusesConfig[status] || {
      label: status,
      className: "st-draft"
    };
    return `<span class="chip ${config.className}">${config.label}</span>`;
  }
  function showTypeName(type) {
    const config = actTypesConfig[type] || { label: type, className: "typ-other" };
    return config.label;
  }
  function showStatusName(status) {
    const config = actStatusesConfig[status] || {
      label: status,
      className: "st-draft"
    };
    return config.label;
  }
  function showTypeChip(type) {
    const config = actTypesConfig[type] || { label: type, className: "typ-other" };
    return `<span class="typchip ${config.className}">${config.label}</span>`;
  }
  function showFormField(label, inputHtml, isRequired = false) {
    return `
    <div class="frow">
      <label>${label} ${isRequired ? '<span class="req">*</span>' : ""}</label>
      ${inputHtml}
    </div>
  `;
  }
  function showToast(message, type) {
    const icon = type === "ok" ? "\u2713 " : type === "err" ? "\u26A0 " : "";
    const toastHtml = `
    <div class="toast ${type || ""}">
      ${icon}${escapeHtml(message)}
    </div>
  `;
    const $toast = $(toastHtml).appendTo("body");
    setTimeout(() => $toast.remove(), 3200);
  }
  function openModalWindow(title, contentHtml, buttons = []) {
    const footerButtonsHtml = buttons.map(
      (button, index) => `
    <button class="${button.className}" id="modal-btn-${index}">${button.label}</button>
  `
    ).join("");
    const modalHtml = `
    <div class="scrim" id="modal-backdrop">
      <div class="modal">
        <div class="mhead">
          <h3>${escapeHtml(title)}</h3>
          <button class="x" id="modal-close-x">\xD7</button>
        </div>
        <div class="mbody">${contentHtml}</div>
        <div class="mfoot">${footerButtonsHtml}</div>
      </div>
    </div>
  `;
    $("#modalRoot").html(modalHtml);
    $("#modal-close-x, #modal-backdrop").on("click", function(e) {
      if (e.target === this) closeModalWindow();
    });
    buttons.forEach((button, index) => {
      $(`#modal-btn-${index}`).on("click", () => button.callback());
    });
  }
  function closeModalWindow() {
    $("#modalRoot").empty();
  }
  function showConfirmBox(title, message, onConfirm) {
    const content = `<p>${escapeHtml(message)}</p>`;
    openModalWindow(title, content, [
      { label: "\u041E\u0442\u043C\u0435\u043D\u0430", className: "btn ghost", callback: closeModalWindow },
      {
        label: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C",
        className: "btn primary",
        callback: () => {
          closeModalWindow();
          onConfirm();
        }
      }
    ]);
  }
  function showPromptBox(title, message, onConfirm) {
    const content = `
    <p>${escapeHtml(message)}</p>
    <textarea class="inp" id="prompt-textarea" style="min-height:80px"></textarea>
  `;
    openModalWindow(title, content, [
      { label: "\u041E\u0442\u043C\u0435\u043D\u0430", className: "btn ghost", callback: closeModalWindow },
      {
        label: "OK",
        className: "btn primary",
        callback: () => {
          const value = $("#prompt-textarea").val().trim();
          closeModalWindow();
          onConfirm(value);
        }
      }
    ]);
  }

  // api.js
  function sendApiRequest(action, data) {
    return $.ajax({
      url: "/data.php",
      type: "POST",
      dataType: "json",
      data: $.extend({ ajax_action: action }, data || {})
    });
  }
  $(document).ready(() => {
    $(document).ajaxStart(() => $(".loadImg").show());
    $(document).ajaxStop(() => $(".loadImg").hide());
    $(document).ajaxError((event, jqXHR, settings, thrownError) => {
      const errorDetail = thrownError || jqXHR.statusText || "";
      const responseBody = jqXHR.responseText || "";
      let serverMessage = "";
      try {
        serverMessage = JSON.parse(responseBody).msg || "";
      } catch (e) {
      }
      let actionName = "";
      try {
        actionName = new URLSearchParams(settings.data).get("ajax_action") || "";
      } catch (e) {
      }
      console.error(`AJAX error [${actionName}]`, jqXHR.status, errorDetail);
      const finalMessage = serverMessage ? `: ${serverMessage}` : errorDetail ? `: ${errorDetail}` : "";
      showToast(
        `\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 [${actionName || jqXHR.status}]${finalMessage}`,
        "err"
      );
    });
  });

  // state.js
  var references = {
    departmentsList: [],
    //  cexes
    reasonsList: [],
    //  reasons
    stationsList: [],
    //  stations
    stationsFromList: [],
    //  stations_from
    ownersList: [],
    wagonKindsList: [],
    cargosList: [],
    signersOwnList: [],
    signersRzdList: []
  };
  var applicationState = {
    currentPage: "archive",
    selectedActId: null
  };
  var activeDraft = null;
  function setActiveDraft(value) {
    activeDraft = value;
  }
  function createNewDraft(actType) {
    activeDraft = {
      id: 0,
      type: actType,
      // 'start', 'end' или 'other'
      status: "draft",
      departmentCode: (references.departmentsList[0] || {}).CODE || "",
      stationId: String((references.stationsList[0] || {}).CODE || ""),
      stationFromId: String((references.stationsFromList[0] || {}).CODE || ""),
      stationFromName: "",
      stationToId: String(references.ST_TO_ID || ""),
      stationToName: "",
      waybillNumber: "",
      cargoReference: "",
      reasonId: "",
      circumstances: "",
      wagons: [],
      signers: [],
      startAt: "",
      endAt: "",
      linkedStartId: "",
      linkedStartNumber: "",
      _summary: null,
      _openStarts: null
    };
    return activeDraft;
  }

  // components/nav.js
  function drawNav() {
    const navigationItems = [
      { page: "new", icon: "\uFF0B", label: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u043A\u0442" },
      { page: "archive", icon: "", label: "\u0410\u0440\u0445\u0438\u0432 \u0430\u043A\u0442\u043E\u0432" }
    ];
    const $nav = $("#nav").empty();
    navigationItems.forEach((item) => {
      const isActive = applicationState.currentPage === item.page || item.page === "archive" && applicationState.currentPage === "card";
      const $button = $(`
      <button class="navbtn ${isActive ? "active" : ""}">
        <span class="ic">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `);
      $button.on("click", () => {
        if (item.page === "new") setActiveDraft(null);
        navigateTo(item.page);
      });
      $nav.append($button);
    });
    $nav.append('<div class="foot"></div>');
  }

  // components/archive.js
  function showArchive(container) {
    $(container).html(`
    <div class="phead">
      <h1>\u0410\u0440\u0445\u0438\u0432 \u0430\u043A\u0442\u043E\u0432</h1>
      <div class="spacer"></div>
    </div>
    <div class="filters" id="archive-filters">
      <div class="searchbox">
        <input type="text" class="inp" id="search-input" placeholder="\u041D\u043E\u043C\u0435\u0440 \u0430\u043A\u0442\u0430, \u043D\u043E\u043C\u0435\u0440 \u0432\u0430\u0433\u043E\u043D\u0430, \u043F\u0440\u0438\u0447\u0438\u043D\u0430\u2026">
      </div>
    </div>
    <div class="card" id="acts-table-container"></div>
  `);
    const filterState = { q: "", type: "", status: "", cex: "" };
    let searchTimeout = null;
    const createSelectFilter = (options, labels, key) => {
      const optionsHtml = options.map((val, idx) => `<option value="${val}">${labels[idx]}</option>`).join("");
      const $select = $(`<select class="inp">${optionsHtml}</select>`);
      $select.on("change", (e) => {
        filterState[key] = e.target.value;
        loadArchiveData();
      });
      $("#archive-filters").append($select);
    };
    createSelectFilter(
      ["", "start", "end", "other"],
      ["\u0412\u0441\u0435 \u0442\u0438\u043F\u044B", "\u041D\u0430\u0447\u0430\u043B\u043E \u043F\u0440\u043E\u0441\u0442\u043E\u044F", "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435", "\u041F\u0440\u043E\u0447\u0438\u0439"],
      "type"
    );
    createSelectFilter(
      ["", "draft", "active", "closed", "annulled"],
      ["\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044B", "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A", "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439", "\u0417\u0430\u043A\u0440\u044B\u0442", "\u0410\u043D\u043D\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D"],
      "status"
    );
    const departmentCodes = references.departmentsList.map((d) => d.CODE);
    createSelectFilter(
      [""].concat(references.departmentsList.map((d) => String(d.ID))),
      ["\u0412\u0441\u0435 \u0446\u0435\u0445\u0430"].concat(departmentCodes),
      "cex"
    );
    $("#search-input").on("input", function() {
      filterState.q = $(this).val().trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(loadArchiveData, 250);
    });
    function loadArchiveData() {
      sendApiRequest("gu23_get_acts", filterState).done((list) => {
        const acts = list || [];
        let rowsHtml = "";
        if (!acts.length) {
          rowsHtml = `<tr><td colspan="8" class="muted" style="padding:24px;text-align:center">\u0410\u043A\u0442\u043E\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E</td></tr>`;
        } else {
          rowsHtml = acts.map(
            (act) => `
          <tr class="clickable-row" data-id="${act.ID}">
            <td class="num">${escapeHtml(act.ACT_NUMBER)}</td>
            <td class="muted">${formatDateTime(act.START_AT)}</td>
            <td>${showTypeChip(act.ACT_TYPE)}</td>
            <td>${escapeHtml(act.CEX)}</td>
            <td class="muted text-ellipsis" style="max-width:230px" title="${escapeHtml(act.REASON_NAME)}">${escapeHtml(act.REASON_NAME)}</td>
            <td class="num">${act.WAGON_CNT || 0}</td>
            
            <td>${showStatusChip(act.STATUS)}</td>
          </tr>
        `
          ).join("");
        }
        const tableHtml = `
        <div style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr><th>\u041D\u043E\u043C\u0435\u0440</th><th>\u041D\u0430\u0447\u0430\u043B\u043E \u043F\u0440\u043E\u0441\u0442\u043E\u044F</th><th>\u0422\u0438\u043F</th><th>\u0426\u0435\u0445</th><th>\u041F\u0440\u0438\u0447\u0438\u043D\u0430</th><th>\u0412\u0430\u0433\u043E\u043D\u044B</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="cardpad muted" style="border-top:1px solid var(--line);font-size:12px">
          \u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0430\u043A\u0442\u043E\u0432: ${acts.length}
        </div>
      `;
        $("#acts-table-container").html(tableHtml);
        $(".clickable-row").on("click", function() {
          navigateTo("card", $(this).data("id"));
        });
      });
    }
    loadArchiveData();
  }

  // components/form.js
  function showForm(container) {
    if (!activeDraft) createNewDraft("start");
    $(container).html(`
    <div class="phead">
      <h1>${activeDraft.id ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0430 \u0413\u0423-23" : "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0430 \u0413\u0423-23"}</h1>
      <div class="spacer"></div>
    </div>
    <div class="seg" id="type-switcher" style="margin-bottom:18px"></div>
    <div class="card" id="form-card">
      <div class="cardpad" id="form-body"></div>
      <div class="cardpad" id="form-footer" style="border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end"></div>
    </div>
  `);
    showTypeSwitcher();
    showFormFields();
    showFormButtons();
  }
  function showTypeSwitcher() {
    if (activeDraft.id) return;
    const types = [
      { id: "start", label: "\u041D\u0430\u0447\u0430\u043B\u043E \u043F\u0440\u043E\u0441\u0442\u043E\u044F" },
      { id: "end", label: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0441\u0442\u043E\u044F" },
      { id: "other", label: "\u041F\u0440\u043E\u0447\u0438\u0439 \u0430\u043A\u0442" }
    ];
    const buttonsHtml = types.map(
      (t) => `
    <button class="${activeDraft.type === t.id ? "on" : ""}" data-type="${t.id}">${t.label}</button>
  `
    ).join("");
    $("#type-switcher").html(buttonsHtml).find("button").on("click", function() {
      createNewDraft($(this).data("type"));
      showForm($("#view")[0]);
    });
  }
  function showFormFields() {
    const $body = $("#form-body");
    if (activeDraft.type === "end") {
      $body.append(`
      <div class="banner info">\u0410\u043A\u0442 \xAB\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0441\u0442\u043E\u044F\xBB \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0440\u0430\u043D\u0435\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0430\u043A\u0442 \u043D\u0430\u0447\u0430\u043B\u0430. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0430\u043A\u0442 \u2014 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u0434\u0442\u044F\u043D\u0443\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.</div>
      <div class="frow">
        <label>\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0430\u043A\u0442 \u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0441\u0442\u043E\u044F <span class="req">*</span></label>
        <select class="inp" id="select-linked-start">
          <option value="">\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0430\u043A\u0442 \u043D\u0430\u0447\u0430\u043B\u0430 \u2014</option>
        </select>
      </div>
    `);
      loadOpenStartsList();
    }
    let dateRowHtml = "";
    if (activeDraft.type === "start") {
      dateRowHtml = showFormField(
        "\u0414\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F \u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0441\u0442\u043E\u044F",
        `<input class="inp datetime-inp" id="inp-startAt" placeholder="\u0434\u0434\u043C\u043C\u0433\u0433 \u0447\u0447\u043C\u043C" value="${activeDraft.startAt}">`,
        true
      );
    } else if (activeDraft.type === "end") {
      dateRowHtml = showFormField(
        "\u0414\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043F\u0440\u043E\u0441\u0442\u043E\u044F",
        `<input class="inp datetime-inp" id="inp-endAt" placeholder="\u0434\u0434\u043C\u043C\u0433\u0433 \u0447\u0447\u043C\u043C" value="${activeDraft.endAt}">`,
        true
      );
    }
    if (dateRowHtml) {
      $body.append(`<div class="cols">${dateRowHtml}<div></div></div>`);
      if (typeof init_date_time_input === "function") {
        init_date_time_input($(".datetime-inp"));
      }
      $("#inp-startAt").on("blur", function() {
        activeDraft.startAt = validateAndGetDate($(this));
      });
      $("#inp-endAt").on("blur", function() {
        activeDraft.endAt = validateAndGetDate($(this));
        showDurationBanner();
      });
    }
    $body.append('<div id="duration-banner-place"></div>');
    showDurationBanner();
    const deptsHtml = references.departmentsList.map(
      (d) => `<option value="${d.CODE}" ${activeDraft.departmentCode === d.CODE ? "selected" : ""}>${d.CODE}</option>`
    ).join("");
    const stationsHtml = references.stationsList.map(
      (s) => `<option value="${s.CODE}" ${activeDraft.stationId === String(s.CODE) ? "selected" : ""}>${s.NAME}</option>`
    ).join("");
    const stationsFromHtml = references.stationsFromList.map(
      (s) => `<option value="${s.CODE}" ${activeDraft.stationFromId === String(s.CODE) ? "selected" : ""}>${s.NAME}</option>`
    ).join("");
    $body.append(`
    <div class="cols">
      ${showFormField("\u0426\u0435\u0445 \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F", `<select class="inp" id="sel-dept">${deptsHtml}</select>`, true)}
      ${showFormField("\u0421\u0442. \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F", `<select class="inp" id="sel-station">${stationsHtml}</select>`, true)}
      ${showFormField("\u0421\u0442. \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", `<select class="inp" id="sel-stationFrom">${stationsFromHtml}</select>`, true)}
    </div>
  `);
    $("#sel-dept").on("change", function() {
      activeDraft.departmentCode = this.value;
    });
    $("#sel-station").on("change", function() {
      activeDraft.stationId = this.value;
    });
    $("#sel-stationFrom").on("change", function() {
      activeDraft.stationFromId = this.value;
    });
    const cargosHtml = [""].concat(references.cargosList.map((c) => c.NAME || c.CODE)).map(
      (c) => `<option value="${c}" ${activeDraft.cargoReference === c ? "selected" : ""}>${c || "\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u2014"}</option>`
    ).join("");
    $body.append(`
    <div class="cols">
      ${showFormField("\u0421\u0442. \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F", `<div style="position:relative"><input class="inp" id="auto-stationTo" placeholder="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043C\u0438\u043D. 3 \u0441\u0438\u043C\u0432\u043E\u043B\u0430)\u2026" value="${activeDraft.stationToName}"><div class="dropdown" id="auto-dropdown" style="display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;"></div></div>`, true)}
      
      ${showFormField("\u0413\u0440\u0443\u0437", `<select class="inp" id="sel-cargo">${cargosHtml}</select>`, true)}
      
    </div>
  `);
    initStationAutocomplete();
    $("#inp-waybill").on("input", function() {
      activeDraft.waybillNumber = this.value;
    });
    $("#sel-cargo").on("change", function() {
      activeDraft.cargoReference = this.value;
    });
    const reasonsHtml = [
      //  добавляем пустой вариант
      `<option value="" ${!activeDraft.reasonId ? "selected" : ""}>\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u2014</option>`,
      ...references.reasonsList.map((r) => {
        const label = r.NAME || r.CODE;
        const isSelected = activeDraft.reasonId === r.CODE ? "selected" : "";
        return `<option value="${r.CODE}" ${isSelected}>${label}</option>`;
      })
    ].join("");
    $body.append(`
    ${showFormField("\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F", `<select class="inp" id="sel-reason">${reasonsHtml}</select>`, true)}
    ${showFormField("\u041E\u0431\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430, \u0432\u044B\u0437\u0432\u0430\u0432\u0448\u0438\u0435 \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0430\u043A\u0442\u0430", `<textarea class="inp" id="txt-circumstances">${activeDraft.circumstances || ""}</textarea>`, true)}
    ${showFormField("\u2116 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0439", `<input class="inp" id="inp-waybill" value="${activeDraft.waybillNumber || ""}">`)}  `);
    $("#sel-reason").on("change", function() {
      activeDraft.reasonId = this.value;
    });
    $("#txt-circumstances").on("change", function() {
      activeDraft.circumstances = this.value;
    });
    $body.append(`
    <div style="height:6px"></div>
    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">\u0412\u0430\u0433\u043E\u043D\u044B</label>
    <textarea class="inp" id="txt-wagons" style="min-height:56px" placeholder="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440\u0430 \u0432\u0430\u0433\u043E\u043D\u043E\u0432: \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E, \u043F\u0440\u043E\u0431\u0435\u043B, \u043F\u043E\u0441\u0442\u0440\u043E\u0447\u043D\u043E\u2026"></textarea>
    <div style="display:flex;gap:9px;flex-wrap:wrap;margin:10px 0" id="wagon-actions"></div>
    <div id="wagon-summary-place"></div>
    <div id="wagons-table-place"></div>
    <div id="signers-container"></div>
  `);
    showWagonActions();
    showWagonsTable();
  }
  function validateAndGetDate($inp) {
    const value = $inp.val();
    const isValid = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(value) && !$inp.hasClass("red_bckg_color");
    return isValid ? value : "";
  }
  function showDurationBanner() {
    const $place = $("#duration-banner-place");
    if (activeDraft.type !== "end") return $place.empty();
    if (!activeDraft.startAt || !activeDraft.endAt) {
      $place.html(
        '<div class="banner info">\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043F\u0440\u043E\u0441\u0442\u043E\u044F \u0431\u0443\u0434\u0435\u0442 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E \u0434\u0430\u0442\u0435 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F.</div>'
      );
      return;
    }
    const startMs = parseTimeToMilliseconds(activeDraft.startAt);
    const endMs = parseTimeToMilliseconds(activeDraft.endAt);
    if (endMs < startMs) {
      $place.html(
        '<div class="banner err">\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043C\u0435\u043D\u044C\u0448\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430 \u2014 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E.</div>'
      );
    } else if (endMs === startMs) {
      $place.html(
        '<div class="banner info">\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043F\u0440\u043E\u0441\u0442\u043E\u044F \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 0 \u0447\u0430\u0441\u043E\u0432 (\u0434\u0430\u0442\u044B \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442).</div>'
      );
    } else {
      const duration = calculateDuration(startMs, endMs);
      const durationText = `${duration.days} \u0434\u043D. ${duration.hours} \u0447.`;
      const totalHoursText = `${(Math.round(duration.totalHours * 10) / 10).toLocaleString("ru")} \u0447.`;
      $place.html(
        `<div class="banner info">\u0420\u0430\u0441\u0447\u0451\u0442 \u043F\u0440\u043E\u0441\u0442\u043E\u044F: <b>${durationText}</b>, \u0432\u0441\u0435\u0433\u043E ${totalHoursText} \xB7 \u0434\u043B\u044F \u043F\u0440\u0435\u0442\u0435\u043D\u0437\u0438\u0439: ${duration.calendarDays} \u043A\u0430\u043B. \u0434\u043D.</div>`
      );
    }
  }
  function loadOpenStartsList() {
    const proceedLoading = (list) => {
      activeDraft._openStarts = list || [];
      const $select = $("#select-linked-start");
      activeDraft._openStarts.forEach((act) => {
        const wagonNumbers = (act.WAGONS || []).map((w) => w.WAGON_NO).join(", ");
        const isSelected = String(activeDraft.linkedStartId) === String(act.ID);
        $select.append(
          `<option value="${act.ID}" ${isSelected ? "selected" : ""}>${act.ACT_NUMBER} \u043E\u0442 ${formatToInputDate(act.START_AT)}</option>`
        );
        if (isSelected && act.CARGO_REF) {
          activeDraft.cargoReference = act.CARGO_REF;
          $("#sel-cargo").val(act.CARGO_REF);
        }
      });
      $select.on("change", function() {
        applySelectedStartAct(this.value);
      });
    };
    if (activeDraft._openStarts == null) {
      sendApiRequest("gu23_get_open_starts").done(proceedLoading);
    } else {
      proceedLoading(activeDraft._openStarts);
    }
  }
  function applySelectedStartAct(id, filterNums = null) {
    const selectedAct = (activeDraft._openStarts || []).find(
      (item) => String(item.ID) === String(id)
    );
    if (!selectedAct) {
      activeDraft.linkedStartId = "";
      return;
    }
    activeDraft.linkedStartId = selectedAct.ID;
    activeDraft.linkedStartNumber = selectedAct.ACT_NUMBER;
    activeDraft.startAt = formatToInputDate(selectedAct.START_AT);
    activeDraft.departmentCode = selectedAct.CEX;
    activeDraft.stationId = String(selectedAct.STATION_ID || "");
    activeDraft.stationFromId = String(selectedAct.ST_FROM_ID || "");
    activeDraft.stationFromName = selectedAct.ST_FROM || "";
    activeDraft.stationToId = String(selectedAct.ST_TO_ID || "");
    activeDraft.stationToName = selectedAct.ST_TO || "";
    activeDraft.reasonName = selectedAct.REASON_NAME;
    activeDraft.reasonId = selectedAct.REASON_ID;
    activeDraft.cargoReference = selectedAct.CARGO_REF;
    const allWagons = selectedAct.WAGONS || [];
    const wagonsToLoad = filterNums ? allWagons.filter((w) => filterNums.includes(w.WAGON_NO)) : allWagons;
    const newWagons = wagonsToLoad.map((w) => ({
      n: w.WAGON_NO,
      owner: w.OWNER,
      kind: w.KIND,
      from: w.ST_FROM,
      to: w.ST_TO,
      cargo: w.CARGO,
      weight: w.WEIGHT
    }));
    if (filterNums) {
      const existingNums = new Set(activeDraft.wagons.map((w) => w.n));
      newWagons.forEach((w) => {
        if (!existingNums.has(w.n)) activeDraft.wagons.push(w);
      });
    } else {
      activeDraft.wagons = newWagons;
    }
    activeDraft._summary = {
      req: activeDraft.wagons.length,
      found: activeDraft.wagons.length,
      text: `\u041F\u043E\u0434\u0442\u044F\u043D\u0443\u0442\u044B \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u0430\u043A\u0442\u0430 \u043D\u0430\u0447\u0430\u043B\u0430 ${selectedAct.ACT_NUMBER}.`
    };
    showForm($("#view")[0]);
  }
  function initStationAutocomplete() {
    const $inp = $("#auto-stationTo");
    const $dropdown = $("#auto-dropdown");
    let timer = null;
    let activeIdx = -1;
    function setActive(idx) {
      const $items = $dropdown.find(".ac-item");
      $items.removeClass("ac-active");
      activeIdx = idx;
      if (idx >= 0 && idx < $items.length) {
        const $active = $items.eq(idx).addClass("ac-active");
        $active[0].scrollIntoView({ block: "nearest" });
      }
    }
    function selectItem($item) {
      $inp.val($item.data("name"));
      activeDraft.stationToId = $item.data("code");
      activeDraft.stationToName = $item.data("name");
      $dropdown.hide();
      activeIdx = -1;
    }
    $inp.on("input", function() {
      const value = $(this).val().trim();
      clearTimeout(timer);
      activeIdx = -1;
      if (value.length < 3) {
        $dropdown.hide().empty();
        if (!value) {
          activeDraft.stationToId = "";
          activeDraft.stationToName = "";
        }
        return;
      }
      timer = setTimeout(() => {
        sendApiRequest("gu23_search_station", { q: value }).done((rows) => {
          $dropdown.empty();
          const stations = rows || [];
          if (!stations.length) return $dropdown.hide();
          stations.forEach((row) => {
            const $item = $(
              `<div class="ac-item" data-code="${escapeHtml(String(row.CODE))}" data-name="${escapeHtml(row.NAME)}">${escapeHtml(row.NAME)}</div>`
            );
            $item.on("mousedown", function(e) {
              e.preventDefault();
              selectItem($(this));
            });
            $item.on("mouseenter", function() {
              setActive($(this).index());
            });
            $dropdown.append($item);
          });
          $dropdown.show();
        });
      }, 300);
    });
    $inp.on("keydown", function(e) {
      if (!$dropdown.is(":visible")) return;
      const $items = $dropdown.find(".ac-item");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(Math.min(activeIdx + 1, $items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(Math.max(activeIdx - 1, 0));
      } else if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        selectItem($items.eq(activeIdx));
      } else if (e.key === "Escape") {
        $dropdown.hide();
        activeIdx = -1;
      }
    });
    $inp.on(
      "blur",
      () => setTimeout(() => {
        $dropdown.hide();
        activeIdx = -1;
      }, 200)
    );
  }
  function showWagonActions() {
    const $actions = $("#wagon-actions").empty();
    if (activeDraft.type === "start" || activeDraft.type === "other") {
      const $btn = $(
        '<button class="btn sm primary">\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u0414\u0438\u0441\u043B\u043E\u043A\u0430\u0446\u0438\u0438</button>'
      );
      $btn.on("click", () => loadWagonsDataFromDislocation());
      $actions.append($btn);
      const $btnClear = $(
        '<button class="btn sm primary">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0442\u0430\u0431\u043B\u0438\u0446\u0443</button>'
      );
      const $wtbl = $("#wtbl").empty();
      $btnClear.on("click", () => ClearTableDislocation());
      $wtbl.append($btnClear);
    }
    if (activeDraft.type === "end") {
      const $btn = $(
        '<button class="btn sm">\u041D\u0430\u0439\u0442\u0438 \u0432\u0430\u0433\u043E\u043D \u0432 \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u043C \u0430\u043A\u0442\u0435 \u043F\u0440\u043E\u0441\u0442\u043E\u044F</button>'
      );
      $btn.on("click", () => findOpenStayByWagons());
      $actions.append($btn);
    }
    if (activeDraft.wagons.length) {
      const $btnClear = $('<button class="btn sm">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0442\u0430\u0431\u043B\u0438\u0446\u0443</button>');
      $btnClear.on("click", () => {
        activeDraft.wagons = [];
        activeDraft._summary = null;
        showWagonActions();
        showWagonsTable();
      });
      $actions.append($btnClear);
    }
  }
  function loadWagonsDataFromDislocation() {
    const rawText = $("#txt-wagons").val();
    const inputNums = parseWagonsFromText(rawText);
    activeDraft.waybillNumber = $("#inp-waybill").val() || "";
    if (!inputNums.length && !activeDraft.waybillNumber)
      return showToast("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440\u0430 \u0432\u0430\u0433\u043E\u043D\u043E\u0432 \u0438\u043B\u0438 \u043D\u043E\u043C\u0435\u0440 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0439!", "err");
    sendApiRequest("gu23_get_wagon_info", {
      wagons: JSON.stringify(inputNums),
      waybill_no: activeDraft.waybillNumber || "",
      dest_station: activeDraft.stationToName || "",
      cardo_name: activeDraft.cargoReference || ""
    }).done((rows) => {
      const records = rows || [];
      let foundCount = 0;
      records.forEach((row) => {
        if (String(row.FOUND) === "1") {
          foundCount++;
          activeDraft.wagons.push({
            n: String(row.WAGON_NO),
            owner: row.OWNER,
            kind: row.KIND,
            from: row.ST_FROM,
            to: row.ST_TO,
            cargo: row.CARGO,
            weight: row.WEIGHT
          });
        }
      });
      activeDraft._summary = {
        req: inputNums.length,
        found: foundCount,
        text: `\u0417\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043E ${inputNums.length} \u0432\u0430\u0433\u043E\u043D\u043E\u0432, \u043D\u0430\u0439\u0434\u0435\u043D\u043E ${foundCount}.`
      };
      showToast(
        `\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${foundCount} \u0438\u0437 ${inputNums.length}`,
        foundCount ? "ok" : "err"
      );
      $("#txt-wagons").val("");
      showForm($("#view")[0]);
    });
  }
  function findOpenStayByWagons() {
    const rawText = $("#txt-wagons").val();
    const nums = parseWagonsFromText(rawText);
    if (!nums.length) return showToast("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0432\u0430\u0433\u043E\u043D\u0430", "err");
    const runSearch = () => {
      const foundActs = {};
      nums.forEach((num) => {
        ;
        (activeDraft._openStarts || []).forEach((act) => {
          if ((act.WAGONS || []).some((w) => w.WAGON_NO === num))
            foundActs[act.ID] = act;
        });
      });
      const ids = Object.keys(foundActs);
      if (ids.length === 0) {
        showToast("\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u043F\u0440\u043E\u0441\u0442\u043E\u0439 \u043F\u043E \u044D\u0442\u0438\u043C \u0432\u0430\u0433\u043E\u043D\u0430\u043C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", "err");
      } else if (ids.length > 1) {
        showToast("\u0412\u0432\u0435\u0434\u0451\u043D\u043D\u044B\u0435 \u0432\u0430\u0433\u043E\u043D\u044B \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A \u0440\u0430\u0437\u043D\u044B\u043C \u0430\u043A\u0442\u0430\u043C \u043D\u0430\u0447\u0430\u043B\u0430.", "err");
      } else {
        applySelectedStartAct(ids[0], nums);
        showToast(`\u041D\u0430\u0439\u0434\u0435\u043D \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0430\u043A\u0442 ${foundActs[ids[0]].ACT_NUMBER}`, "ok");
      }
    };
    if (activeDraft._openStarts == null) {
      sendApiRequest("gu23_get_open_starts").done((list) => {
        activeDraft._openStarts = list || [];
        runSearch();
      });
    } else {
      runSearch();
    }
  }
  function ClearTableDislocation() {
    $("#wtbl").empty();
  }
  function showWagonsTable() {
    const $place = $("#wagons-table-place").empty();
    const $summaryPlace = $("#wagon-summary-place").empty();
    if (activeDraft._summary) {
      const summaryClass = activeDraft._summary.found < activeDraft._summary.req ? "warn" : "ok";
      $summaryPlace.html(
        `<div class="banner ${summaryClass}">${activeDraft._summary.text}</div>`
      );
    }
    if (!activeDraft.wagons.length) {
      $place.html(
        '<div class="banner info">\u0412\u0430\u0433\u043E\u043D\u044B \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u044B. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440\u0430 \u0432\u044B\u0448\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u0414\u0438\u0441\u043B\u043E\u043A\u0430\u0446\u0438\u0438\xBB.</div>'
      );
      showSignersFields();
      return;
    }
    const isEndType = activeDraft.type === "end";
    const rowsHtml = activeDraft.wagons.map((wagon, idx) => {
      let durationText = "\u2014";
      if (isEndType && activeDraft.startAt && activeDraft.endAt) {
        const startMs = parseTimeToMilliseconds(activeDraft.startAt);
        const endMs = parseTimeToMilliseconds(activeDraft.endAt);
        if (endMs >= startMs) {
          const dur = calculateDuration(startMs, endMs);
          durationText = `${dur.days} \u0434\u043D. ${dur.hours} \u0447.`;
        }
      }
      return `
      <tr>
        <td class="wn">${wagon.n}</td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.owner || "\u2014"}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.kind || "\u2014"}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.from || "\u2014"}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.to || "\u2014"}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.cargo || "\u2014"}</span></td>
        ${isEndType ? `<td class="dur">${durationText}</td>` : ""}
        <td><button class="delx" data-idx="${idx}">\xD7</button></td>
      </tr>
    `;
    }).join("");
    const tableHtml = `
    <div style="overflow:auto;max-height:360px;border:1px solid var(--line);border-radius:7px">
      <table class="wtbl">
        <thead>
          <tr><th>\u2116 \u0432\u0430\u0433\u043E\u043D\u0430</th><th>\u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u0438\u043A</th><th>\u0420\u043E\u0434</th><th>\u0421\u0442. \u043E\u0442\u043F\u0440.</th><th>\u0421\u0442. \u043D\u0430\u0437\u043D.</th><th>\u0413\u0440\u0443\u0437</th>${isEndType ? "<th>\u041F\u0440\u043E\u0441\u0442\u043E\u0439</th>" : ""}<th></th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="hint" style="margin-top:6px">\u0412\u0430\u0433\u043E\u043D\u043E\u0432 \u0432 \u0430\u043A\u0442\u0435: ${activeDraft.wagons.length}.</div>
  `;
    $place.html(tableHtml).find(".delx").on("click", function() {
      activeDraft.wagons.splice($(this).data("idx"), 1);
      showWagonsTable();
    });
    showSignersFields();
  }
  function showSignersFields() {
    const $container = $("#signers-container").empty().append(
      '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0442\u044B</label>'
    );
    const countNeeded = activeDraft.type === "other" ? 2 : 3;
    for (let i = 0; i < countNeeded; i++) {
      let signersList = [];
      let helpText = "";
      if (activeDraft.type === "other") {
        signersList = references.signersOwnList || [];
        helpText = i === 0 ? "\u041F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043B\u044C \u043F\u0440\u0435\u0434\u043F\u0440\u0438\u044F\u0442\u0438\u044F" : "\u0412\u0442\u043E\u0440\u043E\u0439 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0442";
      } else {
        if (i < 2) {
          signersList = references.signersOwnList || [];
          helpText = "\u0420\u0430\u0431\u043E\u0442\u043D\u0438\u043A \u043F\u0440\u0435\u0434\u043F\u0440\u0438\u044F\u0442\u0438\u044F";
        } else {
          signersList = references.signersRzdList || [];
          helpText = "\u0420\u0430\u0431\u043E\u0442\u043D\u0438\u043A \u0441\u0442\u0430\u043D\u0446\u0438\u0438 \u041E\u0410\u041E \xAB\u0420\u0416\u0414\xBB";
        }
      }
      const signer = activeDraft.signers[i];
      const isManual = signer && signer.manual === true;
      const toggleHtml = `
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <button type="button" class="btn sm signer-mode-btn ${!isManual ? "primary" : ""}" data-slot="${i}" data-mode="ref">\u0418\u0437 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0430</button>
        <button type="button" class="btn sm signer-mode-btn ${isManual ? "primary" : ""}" data-slot="${i}" data-mode="manual">\u0412\u0440\u0443\u0447\u043D\u0443\u044E</button>
      </div>
    `;
      let inputHtml = "";
      if (isManual) {
        inputHtml = `
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:5px">
          <input class="inp signer-fio" data-slot="${i}" placeholder="\u0424\u0418\u041E" value="${escapeHtml(signer.fio || "")}">
          <input class="inp signer-post" data-slot="${i}" placeholder="\u0414\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044C" value="${escapeHtml(signer.post || "")}">
          <input class="inp signer-org" data-slot="${i}" placeholder="\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0446\u0438\u044F" value="${escapeHtml(signer.org || "")}">
        </div>
      `;
      } else {
        const optionsHtml = signersList.map(
          (s) => `<option value="${s.ID}" ${signer && String(signer.id) === String(s.ID) ? "selected" : ""}>${s.FIO} \xB7 ${s.POST || ""} \xB7 ${s.ORG || ""}</option>`
        ).join("");
        inputHtml = `
        <select class="inp signer-select" data-slot="${i}">
          <option value="">\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u2014</option>
          ${optionsHtml}
        </select>
      `;
      }
      $container.append(
        showFormField(
          `\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0442 ${i + 1} <span class="muted" style="font-weight:400">\xB7 ${helpText}</span>`,
          `<div>${toggleHtml}${inputHtml}</div>`
        )
      );
    }
    $(".signer-mode-btn").on("click", function() {
      const slot = $(this).data("slot");
      const mode = $(this).data("mode");
      const current = activeDraft.signers[slot];
      if (mode === "manual") {
        activeDraft.signers[slot] = {
          id: null,
          fio: current ? current.fio : "",
          post: current ? current.post : "",
          org: current ? current.org : "",
          manual: true
        };
      } else {
        activeDraft.signers[slot] = null;
      }
      showSignersFields();
    });
    $(".signer-select").on("change", function() {
      const slot = $(this).data("slot");
      const value = this.value;
      const pool = activeDraft.type === "other" ? references.signersOwnList : slot < 2 ? references.signersOwnList : references.signersRzdList;
      const matched = pool.find((x) => String(x.ID) === value);
      activeDraft.signers[slot] = matched ? {
        id: matched.ID,
        fio: matched.FIO,
        post: matched.POST,
        org: matched.ORG,
        manual: false
      } : null;
    });
    $(".signer-fio, .signer-post, .signer-org").on("input", function() {
      const slot = $(this).data("slot");
      if (!activeDraft.signers[slot])
        activeDraft.signers[slot] = {
          id: null,
          fio: "",
          post: "",
          org: "",
          manual: true
        };
      if ($(this).hasClass("signer-fio"))
        activeDraft.signers[slot].fio = this.value;
      else if ($(this).hasClass("signer-post"))
        activeDraft.signers[slot].post = this.value;
      else activeDraft.signers[slot].org = this.value;
    });
  }
  function showFormButtons() {
    $("#form-footer").html(`
    <button class="btn ghost" id="btn-cancel">\u041E\u0442\u043C\u0435\u043D\u0430</button>
    <button class="btn" id="btn-saveDraft">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A</button>
    <button class="btn primary" id="btn-saveActive">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0438\u0435</button>
  `);
    $("#btn-cancel").on("click", () => {
      setActiveDraft(null);
      navigateTo("archive");
    });
    $("#btn-saveDraft").on("click", () => saveActToServer("draft"));
    $("#btn-saveActive").on("click", () => saveActToServer("active"));
  }
  function validateForm(checkSigners) {
    const errors = [];
    if (!activeDraft.departmentCode) errors.push("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0446\u0435\u0445");
    if (!activeDraft.reasonId) errors.push("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430 \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F");
    if (!String(activeDraft.circumstances).trim())
      errors.push("\u041D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B \u043E\u0431\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430");
    if (!activeDraft.wagons.length && !activeDraft.cargoReference && !activeDraft.waybillNumber)
      errors.push("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432\u0430\u0433\u043E\u043D\u044B \u0438\u043B\u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0433\u0440\u0443\u0437 / \u043D\u043E\u043C\u0435\u0440 \u043D\u0430\u043A\u043B\u0430\u0434\u043D\u043E\u0439");
    if (!activeDraft.stationId) errors.push("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430 \u0441\u0442. \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F");
    if (!activeDraft.stationFromId) errors.push("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430 \u0441\u0442. \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F");
    if (!activeDraft.stationToId) errors.push("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430 \u0441\u0442. \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F");
    if (activeDraft.type === "start" && !activeDraft.startAt)
      errors.push("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430 \u0434\u0430\u0442\u0430 \u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0441\u0442\u043E\u044F");
    if (activeDraft.type === "end") {
      if (!activeDraft.linkedStartId)
        errors.push("\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0430\u043A\u0442 \u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0441\u0442\u043E\u044F");
      if (!activeDraft.endAt) errors.push("\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430 \u0434\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043F\u0440\u043E\u0441\u0442\u043E\u044F");
      if (activeDraft.startAt && activeDraft.endAt && parseTimeToMilliseconds(activeDraft.endAt) < parseTimeToMilliseconds(activeDraft.startAt)) {
        errors.push("\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043C\u0435\u043D\u044C\u0448\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430");
      }
    }
    if (checkSigners) {
      const needed = activeDraft.type === "other" ? 2 : 3;
      const filled = activeDraft.signers.filter((s) => {
        if (!s || !s.fio || !s.fio.trim()) return false;
        if (s.manual) return !!(s.post && s.post.trim() && s.org && s.org.trim());
        return true;
      }).length;
      if (filled < needed)
        errors.push(`\u0423\u043A\u0430\u0437\u0430\u043D\u043E \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0442\u043E\u0432 ${filled} \u0438\u0437 ${needed}`);
    }
    return errors;
  }
  function saveActToServer(status, skipWarning = false) {
    const errors = status === "active" ? validateForm(true) : activeDraft.departmentCode ? [] : ["\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0446\u0435\u0445"];
    if (errors.length) return showToast(errors[0], "err");
    const payload = {
      id: activeDraft.id || 0,
      type: activeDraft.type,
      status,
      cex: activeDraft.departmentCode,
      station: activeDraft.stationId || "",
      st_from: activeDraft.stationFromId || "",
      st_to: activeDraft.stationToId || "",
      waybill_no: activeDraft.waybillNumber || "",
      cargo_ref: activeDraft.cargoReference || "",
      reason: activeDraft.reasonId,
      circumstances: activeDraft.circumstances,
      start_at: formatToDatabaseDate(activeDraft.startAt),
      end_at: formatToDatabaseDate(activeDraft.endAt),
      linked_start_id: activeDraft.linkedStartId || "",
      wagons: JSON.stringify(activeDraft.wagons),
      signers: JSON.stringify(activeDraft.signers.filter(Boolean)),
      force: skipWarning ? "Y" : "N"
    };
    sendApiRequest("gu23_save_act", payload).done((response) => {
      if (response && response.ok) {
        showToast(
          status === "draft" ? "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D" : `\u0410\u043A\u0442 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D ${response.number ? ", \u2116 " + response.number : ""}`,
          "ok"
        );
        setActiveDraft(null);
        navigateTo("card", response.id);
      } else {
        const msg = response && response.msg || "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F";
        if (/уже есть открытый акт начала/.test(msg)) {
          showConfirmBox(
            "\u0414\u0443\u0431\u043B\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0441\u0442\u043E\u044F",
            `${msg}. \u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u043A\u0442?`,
            () => saveActToServer(status, true)
          );
        } else {
          showToast(msg, "err");
        }
      }
    });
  }

  // components/card.js
  function showCard(container) {
    const currentId = $("#view").data("selected-id");
    sendApiRequest("gu23_get_act", { id: currentId }).done((data) => {
      $(container).empty();
      if (!data || !data.ok) {
        $(container).append('<div class="empty-state">\u0410\u043A\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D</div>');
        return;
      }
      buildCardView(container, data);
    });
  }
  function buildCardView(container, data) {
    const act = data.act;
    $(container).html(`
    <div class="phead">
      <button class="btn sm ghost" id="btn-back-to-archive">\u041D\u0430\u0437\u0430\u0434</button>
      <h1 style="font-family:var(--mono);font-size:18px; margin-left: 16px;">${act.ACT_NUMBER}</h1>
      <div class="spacer"></div>
    </div>
    <div id="card-toolbar" style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px"></div>
    <div id="annulled-banner-place"></div>
    <div class="grid-layout" style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start">
      <div id="card-left-column"></div>
      <div id="card-right-column"></div>
    </div>
  `);
    $("#btn-back-to-archive").on("click", () => navigateTo("archive"));
    showToolbarButtons(act, data);
    showDetailsBlock(act);
    showWagonsBlock(data.wagons);
    showSignersBlock(data.signers);
    showAttachmentsBlock(act, data.files);
    showHistoryBlock(data.history);
  }
  function showToolbarButtons(act, data) {
    const $toolbar = $("#card-toolbar");
    if (act.STATUS === "draft") {
      const $editBtn = $('<button class="btn primary">\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C</button>');
      const $delBtn = $('<button class="btn danger">\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A</button>');
      $editBtn.on("click", () => editDraftAct(data));
      $delBtn.on("click", () => deleteDraftAct(act));
      $toolbar.append($editBtn, $delBtn);
    }
    if (act.STATUS === "active" || act.STATUS === "closed") {
      const $annulBtn = $('<button class="btn danger">\u0410\u043D\u043D\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C</button>');
      $annulBtn.on("click", () => annulActiveAct(act));
      $toolbar.append($annulBtn);
    }
    if (act.STATUS === "annulled" && act.ANNUL_REASON) {
      $("#annulled-banner-place").html(`
      <div class="banner err"><b>\u0410\u043D\u043D\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D.</b> \u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${escapeHtml(act.ANNUL_REASON)}</div>
    `);
    }
  }
  function showDetailsBlock(act) {
    const rows = [
      { l: "\u2116 \u0410\u043A\u0442\u0430", v: act.ACT_NUMBER },
      { l: "\u0422\u0438\u043F \u0430\u043A\u0442\u0430", v: showTypeName(act.ACT_TYPE) },
      { l: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0430\u043A\u0442\u0430", v: showStatusName(act.STATUS) },
      { l: " ", v: " " },
      { l: " ", v: " " },
      { l: "\u0426\u0435\u0445 \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F", v: act.CEX },
      { l: "\u0421\u0442. \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F", v: act.STATION },
      { l: "\u0421\u0442. \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", v: act.ST_FROM },
      { l: "\u0421\u0442. \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F", v: act.ST_TO },
      { l: "\u0413\u0440\u0443\u0437", v: act.CARGO_REF },
      { l: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430", v: act.REASON_NAME },
      { l: "\u0414\u0430\u0442\u0430 \u0441\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F", v: formatDateTime(act.CREATED_AT) }
    ];
    let dlHtml = rows.filter((r) => r.v).map((r) => `<dt>${r.l}</dt><dd>${escapeHtml(r.v)}</dd>`).join("");
    if (act.ACT_TYPE !== "other") {
      dlHtml += `<dt>\u041D\u0430\u0447\u0430\u043B\u043E \u043F\u0440\u043E\u0441\u0442\u043E\u044F</dt><dd class="mono">${formatDateTime(act.START_AT)}</dd>`;
    }
    if (act.ACT_TYPE === "end") {
      dlHtml += `
      <dt>\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0441\u0442\u043E\u044F</dt><dd class="mono">${formatDateTime(act.END_AT)}</dd>
      <dt>\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C</dt>
      <dd><b class="mono" style="color:var(--sign)">${act.DUR_DAYS || 0} \u0434\u043D. ${act.DUR_HOURS || 0} \u0447.</b> \xB7 \u0432\u0441\u0435\u0433\u043E ${act.DUR_TOTAL_H || 0} \u0447. \xB7 ${act.CAL_DAYS || 0} \u043A\u0430\u043B. \u0434\u043D.</dd>
    `;
      if (act.LINKED_START_ID) {
        dlHtml += `<dt>\u0421\u0432\u044F\u0437\u0430\u043D \u0441 \u0430\u043A\u0442\u043E\u043C \u043D\u0430\u0447\u0430\u043B\u0430</dt><dd><a href="#" class="link-act" data-linked="${act.LINKED_START_ID}">${escapeHtml(act.LINKED_START_NUMBER || "\u2014")}</a></dd>`;
      }
    }
    dlHtml += `<dt>\u041E\u0431\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430</dt><dd>${escapeHtml(act.CIRCUMSTANCES)}</dd>`;
    dlHtml += `<dt>\u0421\u043E\u0437\u0434\u0430\u043B</dt><dd>${escapeHtml(act.CREATED_BY)}</dd>`;
    $("#card-left-column").append(
      `
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B \u0430\u043A\u0442\u0430</b></div>
      <dl class="kv" style="padding:16px 18px">${dlHtml}</dl>
    </div>
  `
    ).find(".link-act").on("click", function(e) {
      e.preventDefault();
      navigateTo("card", $(this).data("linked"));
    });
  }
  function showWagonsBlock(wagons) {
    const rowsHtml = wagons.map(
      (w) => `
    <tr>
      <td class="num" style="color:var(--signal);font-weight:600">${escapeHtml(w.WAGON_NO)}</td>
      <td>${escapeHtml(w.OWNER || "\u2014")}</td>
      <td>${escapeHtml(w.KIND || "\u2014")}</td>
      <td>${escapeHtml(w.ST_FROM || "\u2014")}</td>
      <td>${escapeHtml(w.ST_TO || "\u2014")}</td>
      <td>${escapeHtml(w.CARGO || "\u2014")}</td>
      <td class="num"></td>
    </tr>
  `
    ).join("");
    $("#card-left-column").append(`
    <div class="card" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>\u0412\u0430\u0433\u043E\u043D\u044B (${wagons.length})</b></div>
      <div style="overflow:auto;max-height:360px">
        <table class="tbl">
          <thead><tr><th>\u2116 \u0432\u0430\u0433\u043E\u043D\u0430</th><th>\u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u0438\u043A</th><th>\u0420\u043E\u0434</th><th>\u0421\u0442. \u043E\u0442\u043F\u0440.</th><th>\u0421\u0442. \u043D\u0430\u0437\u043D.</th><th>\u0413\u0440\u0443\u0437</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `);
  }
  function showSignersBlock(signers) {
    const listHtml = signers.length ? signers.map(
      (s) => `
    <div class="signrow">
     
      <div style="flex:1">
        <div><b>${escapeHtml(s.FIO)}</b></div>
        <div class="muted" style="font-size:11.5px">${s.POST || ""} \xB7 ${s.ORG || ""}</div>
      </div>
    </div>
  `
    ).join("") : '<div class="muted">\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0442\u044B \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u044B</div>';
    $("#card-right-column").append(`
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>\u041F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0442\u044B</b></div>
      <div class="cardpad">${listHtml}</div>
    </div>
  `);
  }
  function showAttachmentsBlock(act, files) {
    const isAnnulled = act.STATUS === "annulled";
    const headHtml = `
    <div class="cardpad" style="border-bottom:1px solid var(--line);display:flex;align-items:center">
      <b>\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F</b>
      <div style="flex:1"></div>
      ${!isAnnulled ? `<label class="btn sm" id="lbl-upload">\uFF0B \u0424\u0430\u0439\u043B<input type="file" multiple id="file-input-field" style="display:none" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></label>` : ""}
    </div>
  `;
    const bodyHtml = files.length ? files.map((file) => {
      const isImage = /(png|jpe?g|gif|bmp|webp)$/i.test(file.FILE_EXT || "");
      return `
      <div style="display:flex;gap:9px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)">
        ${isImage ? `<img src="get_file.php?inline=1&id=${file.ID}" class="img-preview" data-id="${file.ID}" style="width:38px;height:38px;object-fit:cover;border-radius:5px;cursor:pointer">` : ``}
        <div style="flex:1;font-size:12.5px">
          <a href="get_file.php?id=${file.ID}">${escapeHtml(file.FILE_NAME)}</a>
          <div class="muted" style="font-size:11px">${formatDateTime(file.CREATED_AT)} \xB7 ${escapeHtml(file.CREATED_BY || "")}</div>
        </div>
        ${!isAnnulled ? `<button class="delx file-delete-btn" data-id="${file.ID}">\xD7</button>` : ""}
      </div>
    `;
    }).join("") : '<div class="muted" style="font-size:12.5px">\u0424\u043E\u0442\u043E \u0438 \u0444\u0430\u0439\u043B\u044B \u043D\u0435 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u044B.</div>';
    const $block = $(`
    <div class="card" style="margin-top:16px">
      ${headHtml}
      <div class="cardpad">${bodyHtml}</div>
    </div>
  `);
    $("#card-right-column").append($block);
    $("#file-input-field").on("change", function() {
      uploadFilesToServer(act.ID, this.files);
    });
    $(".img-preview").on("click", function() {
      window.open(`get_file.php?inline=1&id=${$(this).data("id")}`);
    });
    $(".file-delete-btn").on("click", function() {
      deleteAttachedFile($(this).data("id"), act.ID);
    });
  }
  function showHistoryBlock(history) {
    const itemsHtml = history.map(
      (log) => `
    <li>
      <span class="t">${formatDateTime(log.TS)}</span>
      <span>${escapeHtml(log.TXT)} ${log.USR ? `\xB7 <span class="muted">${escapeHtml(log.USR)}</span>` : ""}</span>
    </li>
  `
    ).join("");
    $("#card-right-column").append(`
    <div class="card" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>\u0418\u0441\u0442\u043E\u0440\u0438\u044F</b></div>
      <div class="hist-container">
        <ul class="hist" style="padding:0 18px">${itemsHtml}</ul>
      </div>
    </div>
  `);
  }
  function editDraftAct(data) {
    const act = data.act;
    setActiveDraft({
      id: act.ID,
      type: act.ACT_TYPE,
      status: "draft",
      departmentCode: act.CEX,
      stationId: String(act.STATION_ID || ""),
      stationFromId: String(act.ST_FROM_ID || ""),
      stationFromName: act.ST_FROM || "",
      stationToId: String(act.ST_TO_ID || ""),
      stationToName: act.ST_TO || "",
      waybillNumber: "",
      cargoReference: act.CARGO_REF || "",
      reasonId: String(act.REASON_ID || ""),
      reasonName: act.REASON_NAME,
      circumstances: act.CIRCUMSTANCES || "",
      startAt: formatToInputDate(act.START_AT),
      endAt: formatToInputDate(act.END_AT),
      linkedStartId: act.LINKED_START_ID || "",
      linkedStartNumber: act.LINKED_START_NUMBER || "",
      wagons: data.wagons.map((w) => ({
        n: w.WAGON_NO,
        owner: w.OWNER,
        kind: w.KIND,
        from: w.ST_FROM,
        to: w.ST_TO,
        cargo: w.CARGO
      })),
      signers: data.signers.map((s) => ({
        id: s.SIGNER_REF_ID || null,
        fio: s.FIO,
        post: s.POST,
        org: s.ORG,
        manual: !s.SIGNER_REF_ID
      })),
      _summary: null,
      _openStarts: null
    });
    navigateTo("new");
  }
  function deleteDraftAct(act) {
    showConfirmBox(
      "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430",
      `\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A ${act.ACT_NUMBER}? \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u043E.`,
      () => {
        sendApiRequest("gu23_del_act", { id: act.ID }).done((response) => {
          if (response && response.ok) {
            showToast("\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0443\u0434\u0430\u043B\u0451\u043D", "ok");
            navigateTo("archive");
          } else {
            showToast(response && response.msg || "\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F", "err");
          }
        });
      }
    );
  }
  function annulActiveAct(act) {
    showPromptBox(
      "\u0410\u043D\u043D\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0430",
      "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0430\u043D\u043D\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F:",
      (reason) => {
        if (!reason) return;
        sendApiRequest("gu23_annul_act", { id: act.ID, reason }).done(
          (response) => {
            if (response && response.ok) {
              showToast("\u0410\u043A\u0442 \u0430\u043D\u043D\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D", "ok");
              navigateTo("card", act.ID);
            } else {
              showToast(response && response.msg || "\u041E\u0448\u0438\u0431\u043A\u0430", "err");
            }
          }
        );
      }
    );
  }
  function uploadFilesToServer(actId, files) {
    if (!files || !files.length) return;
    const formData = new FormData();
    formData.append("ajax_action", "gu23_upload_file");
    formData.append("act_id", actId);
    for (let i = 0; i < files.length; i++) {
      formData.append(`file${i}`, files[i]);
    }
    $.ajax({
      url: "/data.php",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      dataType: "json"
    }).done((response) => {
      if (response && response.ok) showToast("\u0424\u0430\u0439\u043B\u044B \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B", "ok");
      else showToast("\u0427\u0430\u0441\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u0432 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u0430", "err");
      navigateTo("card", actId);
    });
  }
  function deleteAttachedFile(fileId, actId) {
    showConfirmBox("\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0444\u0430\u0439\u043B\u0430", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435?", () => {
      sendApiRequest("gu23_del_file", { file_id: fileId }).done((response) => {
        if (response && response.ok) {
          showToast("\u0424\u0430\u0439\u043B \u0443\u0434\u0430\u043B\u0451\u043D", "ok");
          navigateTo("card", actId);
        } else {
          showToast(response && response.msg || "\u041E\u0448\u0438\u0431\u043A\u0430", "err");
        }
      });
    });
  }

  // components/wagonSearch.js
  function showWagonSearch(container) {
    $(container).html(`
    <div class="phead">
      <h1>\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0432\u0430\u0433\u043E\u043D\u0443</h1>
      <p>\u0412\u0441\u0435 \u0430\u043A\u0442\u044B, \u0433\u0434\u0435 \u0443\u0447\u0430\u0441\u0442\u0432\u043E\u0432\u0430\u043B \u0432\u0430\u0433\u043E\u043D</p>
    </div>
    <div class="filters">
      <div class="searchbox">
        <input type="text" class="inp" id="wagon-search-input" placeholder="\u041D\u043E\u043C\u0435\u0440 \u0432\u0430\u0433\u043E\u043D\u0430\u2026">
      </div>
      <button class="btn" id="btn-wagon-search-run">\u041D\u0430\u0439\u0442\u0438</button>
    </div>
    <div id="wagon-search-results"></div>
  `);
    const runSearch = () => {
      const rawValue = $("#wagon-search-input").val();
      const parsedNumber = parseWagonsFromText(rawValue)[0] || rawValue.trim();
      if (!parsedNumber) return;
      sendApiRequest("gu23_get_by_wagon", { wagon: parsedNumber }).done(
        (list) => {
          const acts = list || [];
          let rowsHtml = "";
          if (!acts.length) {
            rowsHtml = `<tr><td colspan="7" class="muted" style="padding:24px;text-align:center">\u0410\u043A\u0442\u043E\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E</td></tr>`;
          } else {
            rowsHtml = acts.map(
              (act) => `
          <tr class="wagon-act-row" data-id="${act.ID}">
            <td class="num">${escapeHtml(act.ACT_NUMBER)}</td>
            <td>${showTypeChip(act.ACT_TYPE)}</td>
            <td>${escapeHtml(act.CEX)}</td>
            <td class="muted text-ellipsis" style="max-width:230px">${escapeHtml(act.REASON)}</td>
            <td class="num">${act.WAGON_CNT || 0}</td>
            <td class="muted">${formatDate(act.CREATED_AT)}</td>
            <td>${showStatusChip(act.STATUS)}</td>
          </tr>
        `
            ).join("");
          }
          $("#wagon-search-results").html(
            `
        <div class="card">
          <div style="overflow:auto">
            <table class="tbl">
              <thead><tr><th>\u041D\u043E\u043C\u0435\u0440</th><th>\u0422\u0438\u043F</th><th>\u0426\u0435\u0445</th><th>\u041F\u0440\u0438\u0447\u0438\u043D\u0430</th><th>\u0412\u0430\u0433\u043E\u043D\u044B</th><th>\u0421\u043E\u0437\u0434\u0430\u043D</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `
          ).find(".wagon-act-row").on("click", function() {
            navigateTo("card", $(this).data("id"));
          });
        }
      );
    };
    $("#btn-wagon-search-run").on("click", runSearch);
    $("#wagon-search-input").on("keydown", (e) => {
      if (e.key === "Enter") runSearch();
    });
  }

  // app.js
  function navigateTo(pageName, selectedId = null) {
    applicationState.currentPage = pageName;
    $("#view").data("selected-id", selectedId);
    showApplication();
  }
  function showApplication() {
    drawNav();
    const container = $("#view")[0];
    if (!container) return;
    const screens = {
      archive: showArchive,
      new: showForm,
      card: showCard,
      wsearch: showWagonSearch
    };
    const showCurrentScreen = screens[applicationState.currentPage] || showArchive;
    showCurrentScreen(container);
  }
  $(document).ready(() => {
    sendApiRequest("gu23_get_refs").done((response) => {
      references.departmentsList = response?.cexes || [];
      references.reasonsList = response?.reasons || [];
      references.stationsList = response?.stations || [];
      references.stationsFromList = response?.stations_from || [];
      references.ownersList = response?.owners || [];
      references.wagonKindsList = response?.kinds || [];
      references.cargosList = response?.cargos || [];
      references.signersOwnList = response?.signersOwn || [];
      references.signersRzdList = response?.signersRzd || [];
      showApplication();
    });
  });
})();
