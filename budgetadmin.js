// =======================================================================
//  KonsernKontroll – Budsjett & Avviksadministrasjon (budgetadmin.js)
// =======================================================================

window.KK = window.KK || {};

document.addEventListener("DOMContentLoaded", () => {
    if (!window.KK.ready) {
        console.warn("startup.js er ikke ferdig lastet enda");
        return;
    }
    if (!["controller", "superadmin"].includes(KK.user.role)) {
        console.warn("User has no access to budget admin");
        return;
    }

    initBudgetPanel();
});


// ------------------------------------------------------
// INIT
// ------------------------------------------------------
function initBudgetPanel() {
    populateCompanyDropdown();
    populateYearDropdown();
    buildKpiSettingsRows();
    loadExistingBudget();

    document
        .getElementById("kk-budget-save")
        .addEventListener("click", saveBudgetSettings);
}


// ------------------------------------------------------
// COMPANY SELECT
// ------------------------------------------------------
function populateCompanyDropdown() {
    const sel = document.getElementById("kk-budget-company");
    sel.innerHTML = "";

    const list = (KK.user.role === "superadmin")
        ? KK.companies
        : KK.companies.filter(c => c.groupId === KK.user.groupId);

    list.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
    });

    sel.addEventListener("change", loadExistingBudget);
}


// ------------------------------------------------------
// YEAR SELECT
// ------------------------------------------------------
function populateYearDropdown() {
    const sel = document.getElementById("kk-budget-year");
    sel.innerHTML = "";

    const now = new Date().getFullYear();

    for (let y = now - 2; y <= now + 2; y++) {
        const o = document.createElement("option");
        o.value = y;
        o.textContent = y;
        if (y === now) o.selected = true;
        sel.appendChild(o);
    }

    sel.addEventListener("change", loadExistingBudget);
}


// ------------------------------------------------------
// KPI SETTINGS ROWS
// ------------------------------------------------------
function buildKpiSettingsRows() {
    const wrap = document.getElementById("kk-budget-kpi-settings");
    wrap.innerHTML = "";

    KK.kpiMeta.forEach(kpi => {
        if (kpi.key === "budsjett") return; // handled separately

        const line = document.createElement("div");
        line.className = "kk-budget-kpi-line";
        line.dataset.kpiId = kpi.id;

        const lbl = document.createElement("label");
        lbl.textContent = `${capitalize(kpi.key)} – Avvik %`;

        const inp = document.createElement("input");
        inp.type = "number";
        inp.placeholder = "Avvik %";

        line.appendChild(lbl);
        line.appendChild(inp);

        wrap.appendChild(line);
    });
}


// ------------------------------------------------------
// LOAD EXISTING SETTINGS
// ------------------------------------------------------
function loadExistingBudget() {
    const companyId = Number(document.getElementById("kk-budget-company").value);
    const year = Number(document.getElementById("kk-budget-year").value);

    if (!companyId) return;

    const latest = getLatestKpiValues(companyId);

    document.getElementById("kk-budget-value").value =
        latest.budsjett || "";

    // set avvik fields
    const sets = KK.companySettings.filter(s => s.companyId === companyId);

    document.querySelectorAll(".kk-budget-kpi-line").forEach(line => {
        const kpiId = Number(line.dataset.kpiId);
        const inp = line.querySelector("input");

        const s = sets.find(x => x.kpiId === kpiId);
        inp.value = s ? s.avvikProsent : "";
    });
}


// ------------------------------------------------------
// SAVE
// ------------------------------------------------------
function saveBudgetSettings() {

    const statusEl = document.getElementById("kk-budget-status");
    statusEl.textContent = "Lagrer...";
    statusEl.className = "kk-budget-status";

    const companyId = Number(document.getElementById("kk-budget-company").value);
    const year = Number(document.getElementById("kk-budget-year").value);
    const budsjett = Number(document.getElementById("kk-budget-value").value || 0);

    const kpiMeta = KK.kpiMeta;

    // 1) Save budget to kpi_values
    const kpiBudget = kpiMeta.find(m => m.key === "budsjett");

    const valuesPayload = [{
        companyId,
        kpiId: kpiBudget.id,
        value: budsjett,
        year,
        month: null
    }];

    // 2) Save avvik to company_settings
    const avvikRows = [];
    document.querySelectorAll(".kk-budget-kpi-line").forEach(line => {
        const kpiId = Number(line.dataset.kpiId);
        const val = Number(line.querySelector("input").value || 0);

        avvikRows.push({
            companyId,
            kpiId,
            avvikProsent: val
        });
    });

    // POST budget
    postNEON({
        table: "kpi_values",
        data: valuesPayload,
        responsId: "respBudgetSave"
    });

    // PATCH settings (delete + insert strategy)
    // Delete old settings:
    const existing = KK.companySettings.filter(s => s.companyId === companyId);
    const ids = existing.map(x => x.id);

    if (ids.length > 0) {
        deleteNEON({
            table: "company_settings",
            data: ids,
            responsId: "respBudgetDelete"
        });

        KK.responseHandlers.respBudgetDelete = () => {
            // Insert new ones
            postNEON({
                table: "company_settings",
                data: avvikRows,
                responsId: "respBudgetSettingsSaved"
            });
        };
    } else {
        postNEON({
            table: "company_settings",
            data: avvikRows,
            responsId: "respBudgetSettingsSaved"
        });
    }

    KK.responseHandlers.respBudgetSave = () => {};
    KK.responseHandlers.respBudgetSettingsSaved = () => {
        statusEl.textContent = "Lagret!";
        statusEl.className = "kk-budget-status ok";
    };
}


// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
