// =======================================================================
//  KonsernKontroll – Rapporteringspanel (reporting.js)
// =======================================================================

window.KK = window.KK || {};

console.log("✓ Reporting engine loaded");

// =======================================================================
//  INIT
// =======================================================================

document.addEventListener("DOMContentLoaded", () => {
    if (!KK.ready) {
        console.warn("Reporting: KK not ready yet");
        return;
    }
    initReportPanel();
});

// =======================================================================
//  INIT UI
// =======================================================================

function initReportPanel() {
    console.log("Report panel init...");

    populateYearDropdown();
    populateMonthDropdown();
    populateCompanyDropdown();

    const submitBtn = document.getElementById("kk-report-submit");
    if (submitBtn) submitBtn.addEventListener("click", submitReporting);
}

// =======================================================================
//  COMPANY DROPDOWN
// =======================================================================

function populateCompanyDropdown() {
    const sel = document.getElementById("kk-report-company");
    if (!sel) return;
    sel.innerHTML = "";

    let list = [];

    // Hvis brukeren kun har tilgang til enkelte selskaper
    if (KK.user.role === "user" && Array.isArray(KK.userCompanyAccess)) {
        list = KK.companies.filter(c =>
            KK.userCompanyAccess.some(a => a.companyId === c.id)
        );
    } else {
        list = KK.companies;
    }

    list.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
    });
}

// =======================================================================
//  YEAR DROPDOWN
// =======================================================================

function populateYearDropdown() {
    const sel = document.getElementById("kk-report-year");
    if (!sel) return;

    sel.innerHTML = "";

    const yearNow = new Date().getFullYear();

    for (let y = yearNow - 3; y <= yearNow + 1; y++) {
        const o = document.createElement("option");
        o.value = y;
        o.text = y;
        if (y === yearNow) o.selected = true;
        sel.appendChild(o);
    }
}

// =======================================================================
//  MONTH DROPDOWN
// =======================================================================

function populateMonthDropdown() {
    const sel = document.getElementById("kk-report-month");
    if (!sel) return;

    sel.innerHTML = "";

    const months = [
        "01-Jan", "02-Feb", "03-Mar", "04-Apr", "05-Mai", "06-Jun",
        "07-Jul", "08-Aug", "09-Sep", "10-Okt", "11-Nov", "12-Des"
    ];

    const mNow = new Date().getMonth() + 1;

    months.forEach((txt, index) => {
        const opt = document.createElement("option");
        opt.value = index + 1;
        opt.textContent = txt;
        if (index + 1 === mNow) opt.selected = true;
        sel.appendChild(opt);
    });
}

// =======================================================================
//  SUBMIT REPORTING
// =======================================================================

function submitReporting() {
    const companyId = Number(document.getElementById("kk-report-company").value);
    const year      = Number(document.getElementById("kk-report-year").value);
    const month     = Number(document.getElementById("kk-report-month").value);

    const omsetning  = Number(document.getElementById("kk-report-omsetning").value || 0);
    const resultat   = Number(document.getElementById("kk-report-resultat").value || 0);
    const likviditet = Number(document.getElementById("kk-report-likviditet").value || 0);

    const meta = KK.kpiMeta;
    const payload = [];

    function addKpi(key, value) {
        const m = meta.find(x => x.key === key);
        if (!m) {
            console.error("KPI missing:", key);
            return;
        }
        payload.push({
            companyId,
            kpiId: m.id,
            value,
            year,
            month
        });
    }

    // Legg inn 3 KPI-typer
    addKpi("omsetning", omsetning);
    addKpi("resultat", resultat);
    addKpi("likviditet", likviditet);

    if (!payload.length) {
        return setReportStatus("Ingen KPI-data å sende.", "error");
    }

    console.log("Rapporterer KPI:", payload);

    postNEON({
        table: "kpi_values",
        data: payload,
        responsId: "respReportSubmit"
    });
}

// =======================================================================
//  HANDLE RESPONSE
// =======================================================================

function respReportSubmit(data) {
    console.log("Rapportering lagret:", data);

    setReportStatus("Tallene er lagret!", "ok");

    // Oppdater dashboard etter lagring
    if (typeof window.refreshDashboard === "function") {
        setTimeout(() => refreshDashboard(), 500);
    }
}

// Registrer på globalt nivå (viktig at dette skjer før submit)
window.responseHandlers = window.responseHandlers || {};
window.responseHandlers.respReportSubmit = respReportSubmit;

// =======================================================================
//  STATUS UI
// =======================================================================

function setReportStatus(msg, type) {
    let el = document.getElementById("kk-report-status");

    if (!el) {
        el = document.createElement("div");
        el.id = "kk-report-status";
        el.className = "kk-report-status";
        document.getElementById("kk-report-panel")?.appendChild(el);
    }

    el.textContent = msg;
    el.className = "kk-report-status " + type;
}
