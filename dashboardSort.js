// =======================================================================
//  KonsernKontroll – Dashboard Sorting (dashboardSort.js)
// =======================================================================
//
//  Integrerer med:
//   - KK.companies (dashboard data)
//   - getLatestKpiValues()  → fra kpi.js
//   - calculateCompanyStatus() → statusfarger
//   - renderCompanyCards() → fra dashboardCore.js
//
// =======================================================================

window.KK = window.KK || {};

console.log("✓ DashboardSort loaded");

// ----------------------------------------------------------------------
// INIT – aktiver når siden er klar
// ----------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("kk-sort-select");
    if (!dropdown) {
        console.warn("DashboardSort: #kk-sort-select not found");
        return;
    }

    dropdown.addEventListener("change", () => {
        applyDashboardSort(dropdown.value);
    });
});

// ----------------------------------------------------------------------
// HOVEDFUNKSJON – SORTERE OG RENDER DASHBOARD
// ----------------------------------------------------------------------

window.applyDashboardSort = function (mode) {
    if (!KK.companies || !Array.isArray(KK.companies)) {
        console.warn("DashboardSort: KK.companies missing");
        return;
    }

    KK.sortMode = mode || KK.sortMode || "name_asc";

    const enriched = KK.companies.map(c => {
        const kpi = getLatestKpiValues(c.id);
        const statusObj = calculateCompanyStatus(c.id);

        return {
            ...c,
            kpi,
            status: statusObj.status
        };
    });

    let sorted = [...enriched];

    switch (KK.sortMode) {

        // -----------------------
        // NAVN
        // -----------------------
        case "name_asc":
            sorted.sort((a,b) => a.name.localeCompare(b.name));
            break;

        case "name_desc":
            sorted.sort((a,b) => b.name.localeCompare(a.name));
            break;

        // -----------------------
        // OMSETNING
        // -----------------------
        case "omsetning_desc":
            sorted.sort((a,b) => (b.kpi.omsetning || 0) - (a.kpi.omsetning || 0));
            break;

        case "omsetning_asc":
            sorted.sort((a,b) => (a.kpi.omsetning || 0) - (b.kpi.omsetning || 0));
            break;

        // -----------------------
        // RESULTAT
        // -----------------------
        case "resultat_desc":
            sorted.sort((a,b) => (b.kpi.resultat || 0) - (a.kpi.resultat || 0));
            break;

        case "resultat_asc":
            sorted.sort((a,b) => (a.kpi.resultat || 0) - (b.kpi.resultat || 0));
            break;

        // -----------------------
        // LIKVIDITET
        // -----------------------
        case "likviditet_desc":
            sorted.sort((a,b) => (b.kpi.likviditet || 0) - (a.kpi.likviditet || 0));
            break;

        case "likviditet_asc":
            sorted.sort((a,b) => (a.kpi.likviditet || 0) - (b.kpi.likviditet || 0));
            break;

        // -----------------------
        // STATUS (green → yellow → red)
        // -----------------------
        case "status_best":
            sorted.sort((a,b) => statusRank(a.status) - statusRank(b.status));
            break;

        case "status_worst":
            sorted.sort((a,b) => statusRank(b.status) - statusRank(a.status));
            break;
    }

    // Oppdater hovedlista
    KK.companies = sorted;

    // Re-render dashboard
    if (typeof window.renderCompanyCards === "function") {
        window.renderCompanyCards();
    }
};


// ----------------------------------------------------------------------
// STATUS PRIORITET
// ----------------------------------------------------------------------

function statusRank(status) {
    switch (status) {
        case "green": return 1;
        case "yellow": return 2;
        default: return 3; // red
    }
}
