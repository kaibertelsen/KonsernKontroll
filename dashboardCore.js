/* ----------------------------------------------------
   KonsernKontroll – Dashboard Core Engine
   Denne filen er ansvarlig for å:
   - Tegne selskapkort på dashboard
   - Håndtere sortering
   - Håndtere KPI-status
   - Aktivere click-handlers for detaljside
-----------------------------------------------------*/

// GLOBAL RENDER STATE
window.KK = {
    companies: [],       // selskap for dashboard
    userRole: null,      // "superadmin" | "controller" | "user"
    activeClient: null,  // konsern
    sortMode: "name",    // default sortering
};


/* ----------------------------------------------------
   PUBLIC API – kall disse fra startup.js
-----------------------------------------------------*/

window.setDashboardContext = function ({ companies, userRole, client }) {
    KK.companies = companies || [];
    KK.userRole = userRole || "user";
    KK.activeClient = client || null;

    renderCompanyCards();
};


/* ----------------------------------------------------
   Hovedfunksjon: renderCompanyCards()
-----------------------------------------------------*/
window.renderCompanyCards = function () {
    const container = document.getElementById("company-list");
    if (!container) {
        console.warn("company-list container not found");
        return;
    }

    container.innerHTML = "";

    if (!KK.companies.length) {
        container.innerHTML = `
            <div class="no-data">
                Ingen selskaper tilgjengelig.
            </div>
        `;
        return;
    }

    // Kjør sortering dersom dashboardSort.js eksisterer
    if (typeof window.applyDashboardSort === "function") {
        KK.companies = window.applyDashboardSort(KK.companies, KK.sortMode);
    }

    KK.companies.forEach(company => {
        container.appendChild(renderSingleCompanyCard(company));
    });

    // Oppdater konsernsum
    if (typeof window.updateKonsernSum === "function") {
        window.updateKonsernSum(KK.companies);
    }
};


/* ----------------------------------------------------
   Render ett selskapskort
-----------------------------------------------------*/
function renderSingleCompanyCard(company) {
    const {
        id,
        name,
        revenue_ytd,
        result_ytd,
        liquidity_ytd
    } = company;

    // KPI farger
    const statusRevenue = getStatusColor(company, "revenue");
    const statusResult = getStatusColor(company, "result");
    const statusLiquidity = getStatusColor(company, "liquidity");

    const card = document.createElement("div");
    card.className = "company-card";
    card.dataset.companyId = id;

    card.innerHTML = `
        <div class="company-card-header">
            <h3>${name}</h3>
        </div>

        <div class="company-metrics">

            <div class="metric">
                <label>Omsetning</label>
                <span class="metric-value">${formatNumber(revenue_ytd)} kr</span>
                <span class="status-dot ${statusRevenue}"></span>
            </div>

            <div class="metric">
                <label>Resultat</label>
                <span class="metric-value">${formatNumber(result_ytd)} kr</span>
                <span class="status-dot ${statusResult}"></span>
            </div>

            <div class="metric">
                <label>Likviditet</label>
                <span class="metric-value">${formatNumber(liquidity_ytd)} kr</span>
                <span class="status-dot ${statusLiquidity}"></span>
            </div>

        </div>
    `;

    // Klikk = åpne detaljside
    card.addEventListener("click", () => {
        if (typeof window.openCompanyDetail === "function") {
            window.openCompanyDetail(id);
        } else {
            console.warn("openCompanyDetail() mangler");
        }
    });

    return card;
}


/* ----------------------------------------------------
   KPI-status henter fra kpi.js via getKpiStatus()
-----------------------------------------------------*/
function getStatusColor(company, metric) {
    if (typeof window.getKpiStatus !== "function") {
        console.warn("getKpiStatus() mangler");
        return "gray";
    }
    return window.getKpiStatus(company, metric);
}


/* ----------------------------------------------------
   Formatering
-----------------------------------------------------*/
function formatNumber(value) {
    if (!value && value !== 0) return "0";
    return Number(value).toLocaleString("nb-NO");
}


/* ----------------------------------------------------
   Ekstern sorteringskontroll
-----------------------------------------------------*/
window.setDashboardSortMode = function (mode) {
    KK.sortMode = mode;
    renderCompanyCards();
};


/* ----------------------------------------------------
  Reload dashboard after data update
-----------------------------------------------------*/
window.refreshDashboard = function () {
    renderCompanyCards();
};

console.log("✓ KonsernKontroll DashboardCore loaded");


// ======================================================================
// RENDER COMPANY CARDS (DASHBOARD)
// ======================================================================

function renderCompanyCards(companies = KK.cacheCompanies || []) {
    if (!Array.isArray(companies)) {
        console.error("renderCompanyCards: invalid companies array", companies);
        return;
    }

    KK.cacheCompanies = companies;

    const container = document.getElementById("kk-company-list");
    if (!container) {
        console.warn("renderCompanyCards: #kk-company-list not found in DOM");
        return;
    }

    container.innerHTML = ""; // Clear previous

    companies.forEach(company => {
        const card = document.createElement("div");
        card.classList.add("kk-company-card");

        card.innerHTML = `
            <div class="kk-company-header">
                <h3>${company.name}</h3>
                <span class="kk-company-org">${company.orgnr || ""}</span>
            </div>

            <div class="kk-company-kpi">
                <div><label>Omsetning:</label> <span>${formatNumber(company.omsetning)}</span></div>
                <div><label>Resultat:</label> <span>${formatNumber(company.resultat)}</span></div>
                <div><label>Likviditet:</label> <span>${formatNumber(company.likviditet)}</span></div>
                <div><label>Budsjett:</label> <span>${formatNumber(company.budsjett)}</span></div>
            </div>

            <button class="kk-btn-detail" data-id="${company.id}">
                Åpne detaljer →
            </button>
        `;

        // Klikk: vis detaljer
        card.querySelector(".kk-btn-detail")
            .addEventListener("click", () => {
                if (typeof KK.loadCompanyDetail === "function") {
                    KK.loadCompanyDetail(company.id);
                } else {
                    console.error("KK.loadCompanyDetail mangler!");
                }
            });

        container.appendChild(card);
    });
}
