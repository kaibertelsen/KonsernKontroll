// =======================================================================
//  KonsernKontroll – Budsjett & Avviksadministrasjon (budgetadmin.js)
// =======================================================================

window.KK = window.KK || {};

console.log("✓ Budget admin loaded");

document.addEventListener("DOMContentLoaded", () => {
    if (!window.KK.ready) {
        console.warn("budgetadmin: KK not ready yet");
        return;
    }
    if (!KK.user || !["controller", "superadmin"].includes(KK.user.role)) {
        console.warn("User has no access to budget admin");
        return;
    }

    initBudgetPanel();
});

// For å kunne bruke i handlers
KK._budgetContext = KK._budgetContext || {};

// ------------------------------------------------------
// INIT
// ------------------------------------------------------
function initBudgetPanel() {
    const panel = document.getElementById("kk-budget-panel");
    if (!panel) {
        console.warn("budgetadmin: #kk-budget-panel finnes ikke i DOM");
        return;
    }

    populateBudgetCompanyDropdown();
    populateBudgetYearDropdown();
    buildKpiSettingsRows();
    ensureBudgetStatusElement();

    const saveBtn = document.getElementById("kk-budget-save");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveBudgetSettings);
    }

    // Last første selskap sin config
    loadExistingBudget();
}

// ------------------------------------------------------
// COMPANY SELECT
// ------------------------------------------------------
function populateBudgetCompanyDropdown() {
    const sel = document.getElementById("kk-budget-company");
    if (!sel) {
        console.warn("budgetadmin: #kk-budget-company mangler");
        return;
    }

    sel.innerHTML = "";

    // Alle companies i dette konsernet (KK.companies skal allerede være filtrert)
    const list = KK.companies || [];

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
function populateBudgetYearDropdown() {
    const sel = document.getElementById("kk-budget-year");
    if (!sel) {
        console.warn("budgetadmin: #kk-budget-year mangler");
        return;
    }

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
// KPI SETTINGS ROWS (avvik % per KPI)
// ------------------------------------------------------
function buildKpiSettingsRows() {
    const wrap = document.getElementById("kk-budget-kpi-settings");
    if (!wrap) {
        console.warn("budgetadmin: #kk-budget-kpi-settings mangler");
        return;
    }

    wrap.innerHTML = "";

    (KK.kpiMeta || []).forEach(kpi => {
        if (kpi.key === "budsjett") return; // Budsjett behandles separat

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
// LOAD EXISTING SETTINGS (budsjett + avvik)
// ------------------------------------------------------
function loadExistingBudget() {
    const companySel = document.getElementById("kk-budget-company");
    const yearSel    = document.getElementById("kk-budget-year");
    const budgetInp  = document.getElementById("kk-budget-value");

    if (!companySel || !yearSel || !budgetInp) return;

    const companyId = Number(companySel.value);
    const year      = Number(yearSel.value);

    if (!companyId || !year) return;

    // 1) Budsjett (fra kpi_values)
    const kpiBudget = (KK.kpiMeta || []).find(m => m.key === "budsjett");
    if (kpiBudget) {
        const rows = (KK.kpiValues || []).filter(v =>
            v.companyId === companyId &&
            v.kpiId === kpiBudget.id &&
            Number(v.year) === year
        );

        rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const latest = rows[0];
        budgetInp.value = latest ? Number(latest.value) : "";
    } else {
        budgetInp.value = "";
    }

    // 2) Avvik-prosent (company_settings – ikke per år)
    const sets = (KK.companySettings || []).filter(s => s.companyId === companyId);

    document.querySelectorAll(".kk-budget-kpi-line").forEach(line => {
        const kpiId = Number(line.dataset.kpiId);
        const inp   = line.querySelector("input");
        if (!inp) return;

        const s = sets.find(x => x.kpiId === kpiId);
        inp.value = s ? Number(s.avvikProsent) : "";
    });
}

// ------------------------------------------------------
// SAVE
// ------------------------------------------------------
function saveBudgetSettings() {
    const companySel = document.getElementById("kk-budget-company");
    const yearSel    = document.getElementById("kk-budget-year");
    const budgetInp  = document.getElementById("kk-budget-value");

    if (!companySel || !yearSel || !budgetInp) return;

    const companyId = Number(companySel.value);
    const year      = Number(yearSel.value);
    const budsjett  = Number(budgetInp.value || 0);

    if (!companyId || !year) {
        setBudgetStatus("Velg selskap og år før du lagrer.", "error");
        return;
    }

    const kpiBudget = (KK.kpiMeta || []).find(m => m.key === "budsjett");
    if (!kpiBudget) {
        setBudgetStatus("Fant ikke KPI 'budsjett' i kpi_meta.", "error");
        return;
    }

    setBudgetStatus("Lagrer...", "pending");

    // 1) Budsjett → kpi_values
    const valuesPayload = [{
        companyId,
        kpiId: kpiBudget.id,
        value: budsjett,
        year,
        month: null
    }];

    // 2) Avvik-prosent → company_settings
    const avvikRows = [];
    document.querySelectorAll(".kk-budget-kpi-line").forEach(line => {
        const kpiId = Number(line.dataset.kpiId);
        const input = line.querySelector("input");
        if (!input) return;

        const val = input.value.trim();
        if (val === "") return;

        avvikRows.push({
            companyId,
            kpiId,
            avvikProsent: Number(val)
        });
    });

    // Lagre kontekst til bruk i handlers
    KK._budgetContext = {
        companyId,
        year,
        avvikRows
    };

    // --------------------------------------------------
    // Registrer response-handlere
    // --------------------------------------------------
    window.responseHandlers = window.responseHandlers || {};

    // Budsjett lagret
    window.responseHandlers.respBudgetSave = function (data) {
        console.log("Budget saved (kpi_values):", data);

        // Oppdater KK.kpiValues i minnet
        if (Array.isArray(data.inserted)) {
            // Fjern gamle budsjett-rader for dette company + år
            KK.kpiValues = (KK.kpiValues || []).filter(v =>
                !(v.companyId === companyId &&
                  v.kpiId === kpiBudget.id &&
                  Number(v.year) === year)
            );
            KK.kpiValues.push(...data.inserted);
        }
    };

    // Etter sletting av gamle avvik
    window.responseHandlers.respBudgetDelete = function (data) {
        console.log("Gamle avviksrader slettet:", data);

        if (!KK._budgetContext || !KK._budgetContext.avvikRows.length) {
            // Ingen nye avvik → ferdig
            finishBudgetSave();
            return;
        }

        // Opprett nye company_settings
        postNEON({
            table: "company_settings",
            data: KK._budgetContext.avvikRows,
            responsId: "respBudgetSettingsSaved"
        });
    };

    // Nye avviksinnstillinger lagret
    window.responseHandlers.respBudgetSettingsSaved = function (data) {
        console.log("Nye avviksinnstillinger lagret:", data);

        // Oppdater KK.companySettings i minnet
        if (Array.isArray(data.inserted)) {
            KK.companySettings = (KK.companySettings || []).filter(s =>
                s.companyId !== companyId
            );
            KK.companySettings.push(...data.inserted);
        }

        finishBudgetSave();
    };

    // --------------------------------------------------
    // Kall API
    // --------------------------------------------------

    // 1) Lagre budsjett
    postNEON({
        table: "kpi_values",
        data: valuesPayload,
        responsId: "respBudgetSave"
    });

    // 2) Avvik – først slett gamle (for dette selskapet)
    const existing = (KK.companySettings || []).filter(s => s.companyId === companyId);
    const ids = existing.map(x => x.id);

    if (ids.length > 0) {
        deleteNEON({
            table: "company_settings",
            data: ids,
            responsId: "respBudgetDelete"
        });
    } else if (avvikRows.length > 0) {
        // Ingen gamle rader → bare lagre nye
        postNEON({
            table: "company_settings",
            data: avvikRows,
            responsId: "respBudgetSettingsSaved"
        });
    } else {
        // Ingen avvik å lagre
        finishBudgetSave();
    }
}

// ------------------------------------------------------
// Status UI
// ------------------------------------------------------
function ensureBudgetStatusElement() {
    let el = document.getElementById("kk-budget-status");
    if (!el) {
        const panel = document.getElementById("kk-budget-panel");
        if (!panel) return;

        el = document.createElement("div");
        el.id = "kk-budget-status";
        el.className = "kk-budget-status";
        panel.appendChild(el);
    }
}

function setBudgetStatus(msg, type) {
    ensureBudgetStatusElement();
    const el = document.getElementById("kk-budget-status");
    if (!el) return;
    el.textContent = msg;
    el.className = "kk-budget-status " + (type || "");
}

function finishBudgetSave() {
    setBudgetStatus("Budsjett og avviksprosent er lagret.", "ok");

    // Oppdater dashboard hvis ønskelig
    if (typeof window.refreshDashboard === "function") {
        setTimeout(() => refreshDashboard(), 500);
    }
}

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
