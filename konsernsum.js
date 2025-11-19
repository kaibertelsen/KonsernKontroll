// =======================================================================
//  KonsernKontroll – Konsernsummering (konsernsum.js)
// =======================================================================

window.KK = window.KK || {};

document.addEventListener("DOMContentLoaded", () => {
    if (!KK.ready) return;

    if (!["controller", "superadmin"].includes(KK.user.role)) {
        console.warn("User has no access to group summary");
        return;
    }

    initGroupSummary();
});


// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
function initGroupSummary() {
    populateGroupYear();
    populateGroupMonth();

    document.getElementById("kk-group-year").addEventListener("change", updateGroupSummary);
    document.getElementById("kk-group-month").addEventListener("change", updateGroupSummary);

    updateGroupSummary();
}


// ------------------------------------------------------------
// DROPDOWNS
// ------------------------------------------------------------
function populateGroupYear() {
    const sel = document.getElementById("kk-group-year");
    sel.innerHTML = "";

    const now = new Date().getFullYear();
    for (let y = now - 3; y <= now + 1; y++) {
        const o = document.createElement("option");
        o.value = y;
        o.textContent = y;
        if (y === now) o.selected = true;
        sel.appendChild(o);
    }
}

function populateGroupMonth() {
    const sel = document.getElementById("kk-group-month");
    sel.innerHTML = "";

    const mNow = new Date().getMonth() + 1;
    for (let m = 0; m <= 12; m++) {
        const o = document.createElement("option");
        o.value = m;
        o.textContent = m === 0 ? "Til nå i år" : m;
        if (m === mNow) o.selected = true;
        sel.appendChild(o);
    }
}


// ------------------------------------------------------------
// MAIN GROUP SUMMING LOGIC
// ------------------------------------------------------------
function updateGroupSummary() {

    const year = Number(document.getElementById("kk-group-year").value);
    const month = Number(document.getElementById("kk-group-month").value);

    // Avgrens data til det valgte året
    const rows = KK.kpiValues.filter(r => r.year === year);

    // YTD-filter
    const filtered = rows.filter(r => {
        if (!r.month) return true;
        if (month === 0) return true;
        return r.month <= month;
    });

    let totalOmsetning = 0;
    let totalResultat = 0;
    let totalLikviditet = 0;
    let totalBudsjett = 0;

    const meta = KK.kpiMeta;

    KK.companies.forEach(company => {
        const compRows = filtered.filter(r => r.companyId === company.id);
        const latest = pickLatestPerKpi(compRows, meta);

        if (latest.omsetning) totalOmsetning += latest.omsetning;
        if (latest.resultat) totalResultat += latest.resultat;
        if (latest.likviditet) totalLikviditet += latest.likviditet;
        if (latest.budsjett) totalBudsjett += latest.budsjett;
    });

    // Update UI
    document.getElementById("kk-group-omsetning").textContent = fmt(totalOmsetning);
    document.getElementById("kk-group-resultat").textContent = fmt(totalResultat);
    document.getElementById("kk-group-likviditet").textContent = fmt(totalLikviditet);
    document.getElementById("kk-group-budsjett").textContent = fmt(totalBudsjett);

    const st = calculateGroupStatus();
    setGroupStatus(st);
}


// ------------------------------------------------------------
// PICK LATEST KPI FOR A COMPANY
// ------------------------------------------------------------
function pickLatestPerKpi(rows, meta) {
    const out = {};
    rows.forEach(r => {
        const m = meta.find(x => x.id === r.kpiId);
        if (!m) return;

        if (!out[m.key] || new Date(r.createdAt) > new Date(out[m.key].createdAt)) {
            out[m.key] = r;
        }
    });

    // convert to flat numeric object
    Object.keys(out).forEach(key => {
        out[key] = Number(out[key].value);
    });

    return out;
}


// ------------------------------------------------------------
// GROUP STATUS (AGGREGATED)
// ------------------------------------------------------------
function calculateGroupStatus() {

    let worst = "green";

    KK.companies.forEach(c => {
        const st = calculateCompanyStatus(c.id).status;

        if (st === "red") worst = "red";
        else if (st === "yellow" && worst !== "red") worst = "yellow";
    });

    return worst;
}


// ------------------------------------------------------------
// UPDATE STATUS COLOR/TEXT
// ------------------------------------------------------------
function setGroupStatus(status) {
    const el = document.getElementById("kk-group-status");

    el.className = "kk-group-status";

    if (status === "green") {
        el.classList.add("kk-stat-green");
        el.textContent = "OK";
    }
    if (status === "yellow") {
        el.classList.add("kk-stat-yellow");
        el.textContent = "OBS";
    }
    if (status === "red") {
        el.classList.add("kk-stat-red");
        el.textContent = "AVVIK";
    }
}


// ------------------------------------------------------------
function fmt(v) {
    return Number(v).toLocaleString("no-NO");
}
