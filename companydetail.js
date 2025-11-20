/* ======================================================================
   KonsernKontroll – Company Detail Page
   Viser:
   - Navn på selskapet
   - KPI-grafer (omsetning, resultat, likviditet)
   - Tilbakeknapp
====================================================================== */

console.log("✓ CompanyDetail loaded");

window.KK = window.KK || {};

// Chart-referanser
let chartOmsetning = null;
let chartResultat = null;
let chartLikviditet = null;

/* ======================================================================
   HOVEDFUNKSJON – KALLES FRA dashboardCore.js
====================================================================== */
window.KK.loadCompanyDetail = function (companyId) {

    const company = KK.companies.find(c => c.id === companyId);
    if (!company) {
        console.error("❌ Fant ikke selskap med id:", companyId);
        return;
    }

    // Bytt panel
    document.getElementById("kk-dashboard").classList.add("kk-hidden");
    document.getElementById("kk-company-detail").classList.remove("kk-hidden");

    // Sett tittel
    document.getElementById("kk-detail-title").textContent = company.name;

    // Filtrer KPI-verdier for selskapet
    const rows = KK.kpiValues.filter(r => r.companyId === companyId);

    // Tegn grafer
    buildCharts(rows, KK.kpiMeta);
};


/* ======================================================================
   TILBAKE-KNAPP
====================================================================== */
document.getElementById("kk-detail-back")?.addEventListener("click", () => {
    document.getElementById("kk-company-detail").classList.add("kk-hidden");
    document.getElementById("kk-dashboard").classList.remove("kk-hidden");
});


/* ======================================================================
   GRAF-BYGGER (Samler KPI-verdier)
====================================================================== */
function buildCharts(rows, meta) {

    const bucket = {
        omsetning: [],
        resultat: [],
        likviditet: []
    };

    rows.forEach(r => {
        const m = meta.find(x => x.id === r.kpiId);
        if (!m) return;
        if (bucket[m.key]) bucket[m.key].push(r);
    });

    drawLineChart("kk-chart-omsetning", "Omsetning", bucket.omsetning);
    drawLineChart("kk-chart-resultat", "Resultat", bucket.resultat);
    drawLineChart("kk-chart-likviditet", "Likviditet", bucket.likviditet);
}


/* ======================================================================
   TEGN LINECHART (Chart.js)
====================================================================== */
function drawLineChart(canvasId, label, values) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.warn("Canvas mangler:", canvasId);
        return;
    }

    // Sorter kronologisk
    values.sort((a, b) => {
        const da = new Date(a.year, (a.month || 1) - 1);
        const db = new Date(b.year, (b.month || 1) - 1);
        return da - db;
    });

    const labels = values.map(v =>
        `${v.year}-${String(v.month || 1).padStart(2, "0")}`
    );

    const data = values.map(v => Number(v.value));

    // Fjern gamle grafer
    if (canvasId === "kk-chart-omsetning" && chartOmsetning) chartOmsetning.destroy();
    if (canvasId === "kk-chart-resultat" && chartResultat) chartResultat.destroy();
    if (canvasId === "kk-chart-likviditet" && chartLikviditet) chartLikviditet.destroy();

    const chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label,
                data,
                borderColor: "#0074F0",
                backgroundColor: "rgba(0, 116, 240, 0.20)",
                borderWidth: 2,
                tension: 0.25
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: true,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });

    if (canvasId === "kk-chart-omsetning") chartOmsetning = chart;
    if (canvasId === "kk-chart-resultat") chartResultat = chart;
    if (canvasId === "kk-chart-likviditet") chartLikviditet = chart;
}


/* ======================================================================
   HELPERS
====================================================================== */
function formatNumber(n) {
    return Number(n).toLocaleString("nb-NO");
}

