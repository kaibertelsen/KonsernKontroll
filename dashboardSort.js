// =======================================================================
// KonsernKontroll – Dashboard Sortering (dashboardSort.js)
// =======================================================================

window.KK = window.KK || {};

document.addEventListener("DOMContentLoaded", () => {
    if (!KK.ready) return;

    const select = document.getElementById("kk-sort-select");
    if (!select) {
        console.warn("Sort dropdown not found");
        return;
    }

    // Apply sorting when changed
    select.addEventListener("change", applyDashboardSort);

    // Initial sort
    applyDashboardSort();
});


// ------------------------------------------------------------
// MAIN ENTRY
// ------------------------------------------------------------
function applyDashboardSort() {
    if (!KK.companies || !KK.renderCompanies) {
        console.warn("Dashboard sort: Missing KK.companies or KK.renderCompanies");
        return;
    }

    const mode = document.getElementById("kk-sort-select").value;
    const list = [...KK.companies]; // clone

    const enriched = list.map(c => ({
        ...c,
        kpi: getLatestCompanyKpis(c.id),
        status: calculateCompanyStatus(c.id).status
    }));

    let sorted = [];

    switch (mode) {

        // NAVN
        case "name_asc":
            sorted = enriched.sort((a,b) => a.name.localeCompare(b.name));
            break;

        case "name_desc":
            sorted = enriched.sort((a,b) => b.name.localeCompare(a.name));
            break;

        // OMSETNING
        case "omsetning_desc":
            sorted = enriched.sort((a,b) => (b.kpi.omsetning || 0) - (a.kpi.omsetning || 0));
            break;

        case "omsetning_asc":
            sorted = enriched.sort((a,b) => (a.kpi.omsetning || 0) - (b.kpi.omsetning || 0));
            break;

        // RESULTAT
        case "resultat_desc":
            sorted = enriched.sort((a,b) => (b.kpi.resultat || 0) - (a.kpi.resultat || 0));
            break;

        case "resultat_asc":
            sorted = enriched.sort((a,b) => (a.kpi.resultat || 0) - (b.kpi.resultat || 0));
            break;

        // LIKVIDITET
        case "likviditet_desc":
            sorted = enriched.sort((a,b) => (b.kpi.likviditet || 0) - (a.kpi.likviditet || 0));
            break;

        case "likviditet_asc":
            sorted = enriched.sort((a,b) => (a.kpi.likviditet || 0) - (b.kpi.likviditet || 0));
            break;

        // STATUS
        case "status_best":
            sorted = enriched.sort((a,b) => statusRank(a.status) - statusRank(b.status));
            break;

        case "status_worst":
            sorted = enriched.sort((a,b) => statusRank(b.status) - statusRank(a.status));
            break;

        default:
            sorted = enriched;
    }

    KK.renderCompanies(sorted);
}



// ------------------------------------------------------------
// KPI PULLER
// ------------------------------------------------------------
function getLatestCompanyKpis(companyId) {
    const rows = KK.kpiValues.filter(r => r.companyId === companyId);
    const meta = KK.kpiMeta;

    const latest = {};
    rows.forEach(r => {
        const m = meta.find(x => x.id === r.kpiId);
        if (!m) return;

        if (!latest[m.key] || new Date(r.createdAt) > new Date(latest[m.key].createdAt)) {
            latest[m.key] = r;
        }
    });

    const flat = {};
    Object.keys(latest).forEach(k => flat[k] = Number(latest[k].value));

    return flat;
}


// ------------------------------------------------------------
// STATUS RANK FOR SORTING
// ------------------------------------------------------------
function statusRank(status) {
    if (status === "green") return 1;
    if (status === "yellow") return 2;
    return 3; // red worst
}
