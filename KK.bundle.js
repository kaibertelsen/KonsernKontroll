(function(global){
'use strict';
global.KonsernKontroll = global.KonsernKontroll || {};
const KK = global.KonsernKontroll;

// ===== File: nav.js =====
// =============================================================
// KONK – FRONTEND NAVIGASJON
// =============================================================

window.addEventListener("DOMContentLoaded", () => {
    console.log("KonsernKontroll NAV loaded");

    const panels = {
        dashboard: document.getElementById("kk-dashboard"),
        report: document.getElementById("kk-report-panel"),
        budget: document.getElementById("kk-budget-panel"),
        admin: document.getElementById("kk-user-admin-modal"),
        companyDetail: document.getElementById("kk-company-detail")
    };

    const navButtons = {
        dashboard: document.getElementById("kk-nav-dashboard"),
        report: document.getElementById("kk-nav-report"),
        budget: document.getElementById("kk-nav-budget"),
        admin: document.getElementById("kk-nav-admin-users")
    };

    function showPanel(key) {
        Object.values(panels).forEach(p => p.classList.add("kk-hidden"));
        panels[key]?.classList.remove("kk-hidden");

        Object.values(navButtons).forEach(btn => btn.classList.remove("kk-active"));
        navButtons[key]?.classList.add("kk-active");
    }

    // Koble knapper → paneler
    navButtons.dashboard.onclick = () => showPanel("dashboard");
    navButtons.report.onclick = () => {
        loadReportingUI();
        showPanel("report");
    };
    navButtons.budget.onclick = () => {
        loadBudgetUI();
        showPanel("budget");
    };
    navButtons.admin.onclick = () => {
        loadUserAdminUI();
        panels.admin.classList.remove("kk-hidden");
    };

    // BACK fra selskapsdetalj
    const backBtn = document.getElementById("kk-detail-back");
    if (backBtn) {
        backBtn.onclick = () => showPanel("dashboard");
    }

    // Eksponer funksjon
    window.showPanel = showPanel;
});


// ===== File: loader.js =====

/* Denne skal ligge i webflow
<script src="https://kaibertelsen.github.io/KonsernKontroll/loader.js"></script>
*/


    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(`Failed to load script: ${url}`);
            document.head.appendChild(script);
        });
    }
    
    // Liste over CDN-URL-er som skal lastes inn
// Liste over CDN-URL-er som skal lastes inn
const cdnScripts = [
    "https://kaibertelsen.github.io/KonsernKontroll/neonApiClient.umd.js",

    "https://kaibertelsen.github.io/KonsernKontroll/rootresponse.js",
    "https://kaibertelsen.github.io/KonsernKontroll/usefunction.js",

    // Core + sort først
    "https://kaibertelsen.github.io/KonsernKontroll/dashboardCore.js",
    "https://kaibertelsen.github.io/KonsernKontroll/dashboardSort.js",

    // Funksjonsmoduler
    "https://kaibertelsen.github.io/KonsernKontroll/kpi.js",
    "https://kaibertelsen.github.io/KonsernKontroll/reporting.js",
    "https://kaibertelsen.github.io/KonsernKontroll/budgetadmin.js",
    "https://kaibertelsen.github.io/KonsernKontroll/companydetail.js",
    "https://kaibertelsen.github.io/KonsernKontroll/konsernsum.js",
    "https://kaibertelsen.github.io/KonsernKontroll/useradmin.js",

 
    "https://kaibertelsen.github.io/KonsernKontroll/startup.js"
];


    
    // Når alle scripts er ferdiglastet:
    cdnScripts.reduce((promise, script) => {
        return promise.then(() => loadScript(script));
    }, Promise.resolve()).then(() => {
        console.log("All scripts loaded");
        if (typeof startUp === "function") startUp();   // <–– KJØR START!
    }).catch(error => {
        console.error(error);
    });
    
    

// ===== File: startup.js =====
// =======================================================================
//  KonsernKontroll – STARTUP MODULE
// =======================================================================

window.KK = window.KK || {};
KK.user = null;
KK.client = null;


// =======================================================================
//  FIRST RUN CHECK
// =======================================================================

function startUp() {
    console.log("KonsernKontroll startUp()…");

    // ✔ sjekk om det finnes brukere i KK-databasen
    getNEON({
        table: "users",
        where: null,
        limit: 1,
        responsId: "respCheckUsers"
    });
}

window.responseHandlers.respCheckUsers = function (data) {
    console.log("respCheckUsers:", data);

    const count = data.rows?.length || 0;

    if (count === 0) {
        console.warn("🚨 Ingen brukere i systemet → FIRST RUN MODE");
        showFirstRunSetup();
        return;
    }

    console.log("Brukere finnes → normal oppstart");

    // ⭐️ Ikke hardkod — last første bruker dynamisk
    const firstUserId = data.rows[0].id;

    getNEON({
        table: "users",
        where: { id: firstUserId },
        responsId: "respUserLoaded"
    });
};


// =======================================================================
//  FIRST RUN UI
// =======================================================================

function showFirstRunSetup() {
    document.getElementById("kk-initial-setup").classList.remove("kk-hidden");
    document.getElementById("kk-setup-create-btn").onclick = createFirstSuperadmin;
}

function createFirstSuperadmin() {
    const email = document.getElementById("kk-setup-email").value.trim();
    const name = document.getElementById("kk-setup-name").value.trim();

    if (!email || !name) {
        alert("Du må skrive inn navn og e-post");
        return;
    }

    console.log("Oppretter første klient + superadmin…");

    // ⭐️ send IKKE createdAt
    postNEON({
        table: "clients",
        data: [
            {
                name: "Mitt første konsern"
            }
        ],
        responsId: "respFirstClientCreated"
    });
}

window.responseHandlers.respFirstClientCreated = function (data) {
    console.log("respFirstClientCreated:", data);

    // ⭐️ riktig datastruktur
    const clientId = data?.inserted?.[0]?.id;

    if (!clientId) {
        alert("Kunne ikke opprette klient!");
        return;
    }

    KK.client = { id: clientId, name: "Mitt første konsern" };

    // 2) OPPRETT SUPERADMIN
    postNEON({
        table: "users",
        data: [
            {
                clientId,
                name: document.getElementById("kk-setup-name").value.trim(),
                email: document.getElementById("kk-setup-email").value.trim(),
                role: "superadmin",

                // ⭐️ midlertidig superadmin ID
                neonUserId: "__setup_superadmin__"
            }
        ],
        responsId: "respFirstUserCreated"
    });
};

window.responseHandlers.respFirstUserCreated = function (data) {
    console.log("respFirstUserCreated:", data);

    const userId = data?.inserted?.[0]?.id;

    if (!userId) {
        alert("Kunne ikke opprette superadmin!");
        return;
    }

    KK.user = data.inserted[0];

    alert("Superadmin opprettet! Last siden på nytt.");

    // ⭐️ reload er OK – nå vil GET users finne den nye brukeren
    location.reload();
};


// =======================================================================
//  NORMAL OPPSTART – LASTER BRUKER
// =======================================================================

window.responseHandlers.respUserLoaded = function (data) {
    const user = data.rows?.[0];
    if (!user) {
        alert("Fant ikke bruker!");
        return;
    }

    KK.user = user;
    console.log("Innlogget bruker:", user);

    getNEON({
        table: "clients",
        where: { id: user.clientId },
        limit: 1,
        responsId: "respClientLoaded"
    });
};


// =======================================================================
//  NORMAL OPPSTART – LASTER KLIENT
// =======================================================================

window.responseHandlers.respClientLoaded = function (data) {
    KK.client = data.rows?.[0];

    if (!KK.client) {
        alert("Fant ikke klient!");
        return;
    }

    console.log("Klient lastet:", KK.client);

    document.getElementById("kk-client-name").textContent = KK.client.name;

    if (typeof loadDashboard === "function") {
        loadDashboard();
    }

    document.getElementById("kk-dashboard").classList.remove("kk-hidden");
};


// =======================================================================
//  EKSPORT
// =======================================================================

window.startUp = startUp;

console.log("startup.js loaded");


// ===== File: rootresponse.js =====
// =======================================================================
//  KonsernKontroll – GLOBAL RESPONSE ROUTER
// =======================================================================
//
//  Denne filen håndterer ALLE responsId → funksjon-handler koblinger.
//  Moduler kan selv registrere nye handlers ved å gjøre:
//
//      Object.assign(window.responseHandlers, { respX: fn });
//
//  Dette betyr:
//  - rootresponse.js skal sjelden endres
//  - modulene kan registrere sine egne response handlers
//
// =======================================================================


// =======================================================================
//  GLOBALT HANDLER-KART
// =======================================================================

window.responseHandlers = window.responseHandlers || {};


// =======================================================================
//  LEGACY HANDLERS (BACKWARD COMPATIBILITY)
// =======================================================================

const legacyHandlers = {
    responsPatchStartup: data => responsPatchStartup?.(data),
    responsPostCustomer: data => responsPostCustomer?.(data),
    responsDelOrder: data => responsDelOrder?.(data)
};

Object.assign(window.responseHandlers, legacyHandlers);


// =======================================================================
//  FIRST-RUN / SETUP HANDLERS
// =======================================================================
//
//  Disse funksjonene blir registrert i startup.js:
//      respCheckUsers
//      respFirstUserCreated
//      respClient
//
//  For å synliggjøre at systemet støtter nye routing-nøkler,
//  legger vi dem inn som null-placeholder. Modulene overskriver dem.
//

Object.assign(window.responseHandlers, {
    respCheckUsers: null,
    respFirstUserCreated: null,
    respClient: null
});


// =======================================================================
//  HOVED ROUTER (API RESPONSE ENTRYPOINT)
// =======================================================================

function apiresponse(data, responsId) {
    console.log(`API Response (${responsId}):`, data);

    if (!responsId) {
        console.warn("API-response mangler responsId. Full respons:", data);
        return;
    }

    const handler = window.responseHandlers[responsId];

    if (typeof handler === "function") {
        try {
            handler(data);
        } catch (err) {
            console.error(`Feil under kjøring av handler '${responsId}':`, err);
        }
    } else {
        console.warn(`⚠️ Ingen handler registrert for responsId '${responsId}'`);
    }
}


// =======================================================================
//  EKSPORT
// =======================================================================

window.apiresponse = apiresponse;

console.log("KonsernKontroll Root Response Router loaded");


// ===== File: usefunction.js =====

function useNEONCRUD() {
  //GET
  //fields = [ "id", "runnnr" ] spesifiserer hvilke felter som skal hentes i hver rad
  //where = null henter alle rader, eller rader basert på filter spesifiseres slik { id: 5, status: "active" }
  //pagination = null henter alle rader, eller spesifiseres slik { limit: 100, offset: 0 }
  getNEON({
    table: "bbrunning",
    fields: ["id", "runnnr"],
    where: null,
    responsId: "resp1",
    cache: false,
    public: false,
    pagination: {
      limit: 100,
      offset: 0
    }
  });
    
  //POST
  //data = [ { feltnavn: verdi }, { feltnavn: verdi } ] for flere rader
  //data = { feltnavn: verdi } for én rad
  postNEON({
    table: "bbrunning",
    data: [
      { runnnr: 777, externalId: "webflow-test" },
      { runnnr: 888, externalId: "webflow-test" },
      { runnnr: 999, externalId: "webflow-test" }
    ],
    responsId: "resp2"
  });
  
  //PATCH
  //data = { feltnavn: verdi } for én rad
  //data = { id: 5, fields: { feltnavn: verdi } } for å oppdatere rad med id 5
  //data = [ { id: 5, fields: { feltnavn: verdi } }, { id: 6, fields: { feltnavn: verdi } } ] for flere rader
  patchNEON({
    table: "bbrunning",
    data: { id: 1, fields: { runnnr: 88888 } },
    responsId: "resp2"
  });

 //DELETE
  //data = 5 for å slette rad med id 5
  //data = [ 3, 4, 5 ] for å slette flere rader
  deleteNEON({
    table: "bbrunning",
    data: [3, 4, 5],
    responsId: "resp2"
  });
}


  


   

// ===== File: dashboardCore.js =====
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



// ===== File: dashboardSort.js =====
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


// ===== File: konsernsum.js =====
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


// ===== File: kpi.js =====
// =======================================================================
//  KonsernKontroll – KPI ENGINE (kpi.js)
// =======================================================================
//
//  Gir disse funksjonene:
//
//   ✔ getLatestKpiValues(companyId)
//       → returnerer siste registrerte tall per KPI-type
//
//   ✔ getKpiStatus(company, metric)
//       → returnerer "green" | "yellow" | "red" for dashboard
//
//   ✔ calculateCompanyStatus(companyId)
//       → brukes til konsern-sum og ev. detaljer
//
// =======================================================================

window.KK = window.KK || {};

console.log("✓ KPI Engine loaded");


// =======================================================================
//  1) HENT SISTE KPI-VERDI FOR ET SELSKAP
// =======================================================================

function getLatestKpiValues(companyId) {
    const rows = (KK.kpiValues || []).filter(v => v.companyId === companyId);
    const meta = KK.kpiMeta || [];

    // Sorter newest → oldest
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const result = {};

    for (const m of meta) {
        const r = rows.find(x => x.kpiId === m.id);
        if (r) {
            result[m.key] = Number(r.value);
        }
    }

    return result;
}


// =======================================================================
//  2) HENT COMPANY_SETTINGS
// =======================================================================

function getCompanySettings(companyId) {
    return (KK.companySettings || []).filter(s => s.companyId === companyId);
}


// =======================================================================
//  3) BEREGN KPI-STATUS FOR ÉN KPI-TYPE
// =======================================================================
//
//  metric = "omsetning" | "resultat" | "likviditet"
//

function getKpiStatus(company, metric) {

    if (!company?.id) return "gray";

    const companyId = company.id;

    const latest = getLatestKpiValues(companyId);
    const settings = getCompanySettings(companyId);
    const meta = KK.kpiMeta.find(m => m.key === metric);

    if (!meta) return "gray";

    const value = Number(latest[metric] || 0);
    const budsjett = Number(latest["budsjett"] || 0);

    // Ingen tall → gul
    if (!budsjett) return "yellow";

    // Finn avvik-prosent for denne KPI-typen
    const setting = settings.find(s => s.kpiId === meta.id);
    const allowedPct = setting ? Number(setting.avvikProsent) : 10;

    const allowedDeviation = budsjett * (allowedPct / 100);
    const deviation = Math.abs(value - budsjett);

    if (deviation <= allowedDeviation) {
        return "green";
    }
    if (deviation <= allowedDeviation * 2) {
        return "yellow";
    }
    return "red";
}


// =======================================================================
//  4) FULL COMPANY STATUS (samler alle KPI'er)
// =======================================================================

function calculateCompanyStatus(companyId) {

    const latest = getLatestKpiValues(companyId);
    const settings = getCompanySettings(companyId);
    const meta = KK.kpiMeta || [];

    if (!latest || Object.keys(latest).length === 0) {
        return { status: "yellow", reason: "Mangler KPI-data" };
    }

    let worst = "green";

    for (const m of meta) {
        if (m.key === "budsjett") continue;

        const value = Number(latest[m.key] || 0);
        const budsjett = Number(latest["budsjett"] || 0);
        if (!budsjett) {
            worst = "yellow";
            continue;
        }

        const setting = settings.find(s => s.kpiId === m.id);
        const pct = setting ? Number(setting.avvikProsent) : 10;

        const allowed = budsjett * (pct / 100);
        const deviation = Math.abs(value - budsjett);

        if (deviation > allowed * 2) worst = "red";
        else if (deviation > allowed && worst !== "red") worst = "yellow";
    }

    return { status: worst, reason: "" };
}


// =======================================================================
//  EKSPORT GLOBALE FUNKSJONER
// =======================================================================

window.getLatestKpiValues = getLatestKpiValues;
window.getKpiStatus = getKpiStatus;
window.calculateCompanyStatus = calculateCompanyStatus;
window.getCompanySettings = getCompanySettings;


// ===== File: companydetail.js =====
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



// ===== File: reporting.js =====
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


// ===== File: budgetadmin.js =====
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


// ===== File: useradmin.js =====
// =======================================================================
//  KonsernKontroll – USER ADMINISTRATION
// =======================================================================

console.log("✓ User Administration loaded");

window.KK = window.KK || {};
KK.users = KK.users || [];

// =======================================================================
//  OPEN / CLOSE MODAL
// =======================================================================

function openUserAdminModal() {
    const modal = document.getElementById("kk-user-admin-modal");
    if (!modal) return console.error("❌ kk-user-admin-modal not found");
    
    modal.classList.remove("kk-hidden");
    loadUsersList();
}

function closeUserAdminModal() {
    const modal = document.getElementById("kk-user-admin-modal");
    if (modal) modal.classList.add("kk-hidden");
}

// riktig knapp-ID fra HTML:
document.getElementById("kk-nav-admin-users")?.addEventListener("click", openUserAdminModal);
document.getElementById("kk-user-admin-close")?.addEventListener("click", closeUserAdminModal);


// =======================================================================
//  LOAD USERS
// =======================================================================

function loadUsersList() {
    if (!KK.user) return console.warn("KK.user not loaded yet");

    if (!["controller", "superadmin"].includes(KK.user.role)) {
        return console.warn("🔐 User lacks permission to manage users");
    }

    getNEON({
        table: "users",
        where: { clientId: KK.user.clientId },
        responsId: "respUsersList"
    });
}

function respUsersList(data) {
    KK.users = data?.rows || [];
    renderUsersList();
}


// =======================================================================
//  RENDER USER LIST
// =======================================================================

function renderUsersList() {
    const container = document.getElementById("kk-user-admin-list");
    if (!container) return console.error("kk-user-admin-list missing");

    container.innerHTML = "";

    if (!KK.users.length) {
        container.innerHTML = "<p>Ingen brukere funnet.</p>";
        return;
    }

    KK.users.forEach(user => {
        const row = document.createElement("div");
        row.className = "kk-user-row";

        row.innerHTML = `
            <div>
                <strong>${user.name}</strong><br>
                <span class="kk-text-light">${user.email}</span>
            </div>

            <div class="kk-admin-actions">
                <select class="kk-edit-role" data-user-id="${user.id}">
                    <option value="user"       ${user.role === "user" ? "selected" : ""}>Bruker</option>
                    <option value="controller" ${user.role === "controller" ? "selected" : ""}>Controller</option>
                    <option value="superadmin" ${user.role === "superadmin" ? "selected" : ""}>Superadmin</option>
                </select>

                <button class="kk-btn kk-btn-small kk-btn-primary" data-edit="${user.id}">Lagre</button>
                <button class="kk-btn kk-btn-small kk-btn-danger" data-delete="${user.id}">Slett</button>
            </div>
        `;

        container.appendChild(row);
    });

    // Save handlers
    container.querySelectorAll("[data-edit]").forEach(btn => {
        btn.onclick = () => saveUserChanges(btn.dataset.edit);
    });

    // Delete handlers
    container.querySelectorAll("[data-delete]").forEach(btn => {
        btn.onclick = () => deleteUser(btn.dataset.delete);
    });
}


// =======================================================================
//  UPDATE USER
// =======================================================================

function saveUserChanges(userId) {
    const select = document.querySelector(`select[data-user-id="${userId}"]`);
    if (!select) return;

    const newRole = select.value;

    patchNEON({
        table: "users",
        data: {
            id: Number(userId),
            fields: { role: newRole }
        },
        responsId: "respUserUpdated"
    });
}

function respUserUpdated(data) {
    console.log("User updated:", data);
    loadUsersList();
}


// =======================================================================
//  DELETE USER
// =======================================================================

function deleteUser(userId) {
    if (!confirm("Er du sikker på at du vil slette denne brukeren?")) return;

    deleteNEON({
        table: "users",
        data: {
            field: "id",
            value: userId
        },
        responsId: "respUserDeleted"
    });
}

function respUserDeleted(data) {
    console.log("User deleted:", data);
    loadUsersList();
}


// =======================================================================
//  ADD NEW USER
// =======================================================================

document.getElementById("kk-add-user-btn")?.addEventListener("click", addNewUser);

function addNewUser() {
    const name  = document.getElementById("kk-new-user-name").value.trim();
    const email = document.getElementById("kk-new-user-email").value.trim();
    const role  = document.getElementById("kk-new-user-role").value;

    if (!name || !email) {
        alert("Navn og e-post må fylles ut");
        return;
    }

    postNEON({
        table: "users",
        data: [
            {
                clientId: KK.user.clientId,
                name,
                email,
                role,
                neonUserId: null
            }
        ],
        responsId: "respUserCreated"
    });
}

function respUserCreated(data) {
    console.log("User created:", data);

    document.getElementById("kk-new-user-name").value = "";
    document.getElementById("kk-new-user-email").value = "";
    document.getElementById("kk-new-user-role").value = "user";

    loadUsersList();
}


// =======================================================================
//  REGISTER RESPONSE HANDLERS
// =======================================================================

window.responseHandlers = window.responseHandlers || {};
Object.assign(window.responseHandlers, {
    respUsersList,
    respUserUpdated,
    respUserDeleted,
    respUserCreated
});


})(window);
