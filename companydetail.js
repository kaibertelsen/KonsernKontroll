// =======================================================================
//  KonsernKontroll – Company Detail Page (companydetail.js)
// =======================================================================

window.KK = window.KK || {};

let chartOmsetning = null;
let chartResultat = null;
let chartLikviditet = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!KK.ready) {
        console.warn("startup.js ikke klar ennå");
        return;
    }

    // Skal vi vise detaljer kun hvis selskap-id er sendt?
    const cid = getCompanyIdFromUrl();
    if (!cid) {
        console.warn("Ingen companyId i URL");
        return;
    }

    loadCompanyDetail(cid);
});


// ------------------------------------------------------------
// Hent ?companyId=123
// ------------------------------------------------------------
function getCompanyIdFromUrl() {
    const url = new URL(window.location.href);
    return Number(url.searchParams.get("companyId"));
}


// ------------------------------------------------------------
// MAIN FLOW
// ------------------------------------------------------------
function loadCompanyDetail(companyId) {
    const company = KK.companies.find(c => c.id === companyId);
    if (!company) return;

    document.getElementById("kk-detail-title").textContent = company.name;

    const rows = KK.kpiValues.filter(v => v.companyId === companyId);
    const meta = KK.kpiMeta;

    // sammendrag
    const latest = getLatestKpiValues(companyId);
    setSummary(latest);

    // tabell
    fillHistoryTable(rows);

    // grafer
    buildCharts(rows, meta);
}


// ------------------------------------------------------------
// SUMMARY BOX INFO
// ------------------------------------------------------------
function setSummary(latest) {
    document.getElementById("kk-meta-omsetning").textContent =
        latest.omsetning ? formatNumber(latest.omsetning) : "-";

    document.getElementById("kk-meta-resultat").textContent =
        latest.resultat ? formatNumber(latest.resultat) : "-";

    document.getElementById("kk-meta-likviditet").textContent =
        latest.likviditet ? formatNumber(latest.likviditet) : "-";

    document.getElementById("kk-meta-budsjett").textContent =
        latest.budsjett ? formatNumber(latest.budsjett) : "-";
}


// ------------------------------------------------------------
// TABLE
// ------------------------------------------------------------
function fillHistoryTable(list) {
    const body = document.getElementById("kk-detail-table-body");
    body.innerHTML = "";

    list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    list.forEach(row => {
        const kpi = KK.kpiMeta.find(k => k.id === row.kpiId);

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${capitalize(kpi.key)}</td>
            <td>${formatNumber(row.value)}</td>
            <td>${row.year || "-"}</td>
            <td>${row.month || "-"}</td>
            <td>${new Date(row.createdAt).toLocaleDateString()}</td>
        `;

        body.appendChild(tr);
    });
}


// ------------------------------------------------------------
// GRAPHS
// ------------------------------------------------------------
function buildCharts(rows, meta) {

    const byKpi = {
        omsetning: [],
        resultat: [],
        likviditet: []
    };

    rows.forEach(r => {
        const m = meta.find(x => x.id === r.kpiId);
        if (!m) return;

        if (byKpi[m.key]) {
            byKpi[m.key].push(r);
        }
    });

    drawLineChart(
        "kk-chart-omsetning",
        "Omsetning",
        byKpi.omsetning
    );

    drawLineChart(
        "kk-chart-resultat",
        "Resultat",
        byKpi.resultat
    );

    drawLineChart(
        "kk-chart-likviditet",
        "Likviditet",
        byKpi.likviditet
    );
}


// ------------------------------------------------------------
// SINGLE LINE CHART
// ------------------------------------------------------------
function drawLineChart(canvasId, label, values) {
    const ctx = document.getElementById(canvasId);

    // sort after year + month
    values.sort((a,b) => {
        const da = new Date(a.year, (a.month||1)-1);
        const db = new Date(b.year, (b.month||1)-1);
        return da - db;
    });

    const labels = values.map(v =>
        `${v.year}-${String(v.month || 1).padStart(2,"0")}`
    );

    const dataPoints = values.map(v => Number(v.value));

    // Destroy old if exists
    let chartRef = null;
    if (canvasId === "kk-chart-omsetning") chartRef = chartOmsetning;
    if (canvasId === "kk-chart-resultat") chartRef = chartResultat;
    if (canvasId === "kk-chart-likviditet") chartRef = chartLikviditet;

    if (chartRef) chartRef.destroy();

    const chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label,
                data: dataPoints,
                borderColor: "#1a73e8",
                backgroundColor: "rgba(26,115,232,0.2)",
                borderWidth: 2,
                tension: 0.25,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false }
            }
        }
    });

    if (canvasId === "kk-chart-omsetning") chartOmsetning = chart;
    if (canvasId === "kk-chart-resultat") chartResultat = chart;
    if (canvasId === "kk-chart-likviditet") chartLikviditet = chart;
}


// ------------------------------------------------------------
// helpers
// ------------------------------------------------------------
function formatNumber(n) {
    return Number(n).toLocaleString("no-NO");
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
