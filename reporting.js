// =======================================================================
//  KonsernKontroll – Rapporteringspanel (reporting.js)
// =======================================================================

window.KK = window.KK || {};

// ------------------------- Init -------------------------

document.addEventListener("DOMContentLoaded", () => {
    if (!window.KK.ready) {
        console.warn("startup.js har ikke lastet ferdig enda");
        return;
    }
    initReportPanel();
});


// ------------------------- Build UI -------------------------

function initReportPanel() {
    console.log("Report panel init...");

    populateYearDropdown();
    populateMonthDropdown();
    populateCompanyDropdown();

    document.getElementById("kk-report-submit")
        .addEventListener("click", submitReporting);
}


// ------------------------- Dropdowns -------------------------

function populateCompanyDropdown() {
    const sel = document.getElementById("kk-report-company");
    sel.innerHTML = "";

    let list = [];

    if (KK.user.role === "user") {
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


function populateYearDropdown() {
    const sel = document.getElementById("kk-report-year");
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


function populateMonthDropdown() {
    const sel = document.getElementById("kk-report-month");
    sel.innerHTML = "";

    const months = [
        "01-Jan", "02-Feb", "03-Mar", "04-Apr", "05-Mai", "06-Jun",
        "07-Jul", "08-Aug", "09-Sep", "10-Okt", "11-Nov", "12-Des"
    ];

    const mNow = new Date().getMonth() + 1;

    months.forEach((txt, index) => {
        const o = document.createElement("option");
        o.value = index + 1;
        o.text = txt;
        if (index + 1 === mNow) o.selected = true;
        sel.appendChild(o);
    });
}


// ------------------------- Submit -------------------------

function submitReporting() {
    const companyId = Number(document.getElementById("kk-report-company").value);
    const year = Number(document.getElementById("kk-report-year").value);
    const month = Number(document.getElementById("kk-report-month").value);

    const omsetning = Number(document.getElementById("kk-report-omsetning").value || 0);
    const resultat = Number(document.getElementById("kk-report-resultat").value || 0);
    const likviditet = Number(document.getElementById("kk-report-likviditet").value || 0);

    const items = [];

    // Look up KPI IDs from meta
    const meta = KK.kpiMeta;

    function pushKpi(key, value) {
        const m = meta.find(x => x.key === key);
        if (!m) return;
        items.push({
            companyId,
            kpiId: m.id,
            value,
            year,
            month
        });
    }

    pushKpi("omsetning", omsetning);
    pushKpi("resultat", resultat);
    pushKpi("likviditet", likviditet);

    if (items.length === 0) {
        return setReportStatus("Ingen KPI-er å lagre", "error");
    }

    console.log("Sender rapportering:", items);

    postNEON({
        table: "kpi_values",
        data: items,
        responsId: "respReportSubmit"
    });

    KK.responseHandlers.respReportSubmit = respReportSubmit;
}


function respReportSubmit(data) {
    console.log("Rapportering lagret:", data);
    setReportStatus("Tallene er lagret!", "ok");
}


// ------------------------- Status UI -------------------------

function setReportStatus(msg, type) {
    const el = document.getElementById("kk-report-status");
    el.textContent = msg;
    el.className = "kk-report-status " + type;
}
