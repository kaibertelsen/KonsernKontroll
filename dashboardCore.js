/* ======================================================================
   KonsernKontroll – Dashboard Core
   Viser:
   - Alle selskaper for innlogget klient
   - KPI-status (grønn / gul / rød)
   - KPI-verdier (omsetning, resultat, likviditet, budsjett)
   - Klikk → åpne detaljside
====================================================================== */

console.log("✓ DashboardCore loaded");

// GLOBAL NAMESPACE
window.KK = window.KK || {};
KK.companies = [];
KK.kpiMeta = [];
KK.kpiValues = [];
KK.companySettings = [];

/* ======================================================================
   PUBLIC API – Kalles fra startup.js → loadDashboard()
====================================================================== */
window.renderDashboard = function () {
    console.log("▶️ renderDashboard()");

    if (!KK.companies.length) {
        console.warn("Ingen companies funnet. Avventer startup.js…");
        return;
    }

    renderCompanyList(KK.companies);

    // Gi sorteringsmodulen tilgang
    KK.renderCompanies = renderCompanyList;

    // Initial sort
    if (typeof applyDashboardSort === "function") {
        applyDashboardSort();
    }
};

/* ======================================================================
   Tegner hele company-list
====================================================================== */
function renderCompanyList(companies) {
    const list = document.getElementById("kk-company-list");
    if (!list) {
        console.error("❌ #kk-company-list not found");
        return;
    }

    list.innerHTML = "";

    if (!companies.length) {
        list.innerHTML = "<p>Ingen selskaper funnet.</p>";
        return;
    }

    companies.forEach(company => list.appendChild(renderCompanyCard(company)));
}

/* ======================================================================
   Render ett selskapskort
====================================================================== */
function renderCompanyCard(company) {
    const latest = getLatestKpiValues(company.id);       // fra kpi.js
    const status = calculateCompanyStatus(company.id);   // fra kpi.js

    const div = document.createElement("div");
    div.className = "kk-company-card";

    div.innerHTML = `
        <div class="kk-company-header">
            <h3>${company.name}</h3>
            <span class="kk-company-org">Org.nr: ${company.orgnr || "-"}</span>
        </div>

        <div class="kk-company-kpi">
            <div><label>Omsetning:</label> <strong>${formatNumber(latest.omsetning)}</strong></div>
            <div><label>Resultat:</label> <strong>${formatNumber(latest.resultat)}</strong></div>
            <div><label>Likviditet:</label> <strong>${formatNumber(latest.likviditet)}</strong></div>
            <div><label>Budsjett:</label> <strong>${formatNumber(latest.budsjett)}</strong></div>
        </div>

        <div class="kk-company-status kk-status-${status.status}">
            Status: ${status.status.toUpperCase()}
        </div>

        <button class="kk-btn kk-btn-primary kk-open-detail" data-id="${company.id}">
            Åpne detaljer →
        </button>
    `;

    // Klikk → åpne detaljer
    div.querySelector(".kk-open-detail").onclick = () => openCompanyDetail(company.id);

    return div;
}

/* ======================================================================
   Åpne selskapets detaljside
====================================================================== */
async function openCompanyDetail(companyId) {
    console.log("➡️ Åpner detaljer for selskap", companyId);

    KK.currentCompanyId = companyId;

    // Hent selskapet – så companydetail.js får freshe data
    await getNEON({
        table: "companies",
        where: { id: companyId },
        limit: 1,
        responsId: "companyDetailLoaded"
    });

    if (typeof showPanel === "function") {
        showPanel("companyDetail");
    }
}

window.responseHandlers.companyDetailLoaded = function (data) {
    const row = data.rows?.[0];
    if (!row) {
        console.error("❌ companyDetailLoaded: fant ikke selskap");
        return;
    }

    document.getElementById("kk-detail-title").textContent = row.name;

    // Når detaillogikk skal inn, fortsetter vi her
};

/* ======================================================================
   Utils
====================================================================== */
function formatNumber(n) {
    if (n === undefined || n === null) return "-";
    return Number(n).toLocaleString("nb-NO");
}

