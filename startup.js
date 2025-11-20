/* ===================================================================
   KonsernKontroll – STARTUP ENGINE (FULL VERSION)
   Laster ALLE nødvendige data før appen kan brukes
=================================================================== */

console.log("✓ KonsernKontroll startup.js loaded");

window.KK = {
    ready: false,
    user: null,
    client: null,

    companies: [],
    kpiMeta: [],
    kpiValues: [],
    companySettings: [],
    userCompanyAccess: []
};

/* ===================================================================
   STARTUP FLOW
=================================================================== */

window.startUp = async function () {
    console.log("KonsernKontroll startUp()…");

    // 1) Sjekk om det finnes brukere
    getNEON({
        table: "users",
        where: null,
        limit: 1,
        responsId: "startup_checkUsers"
    });
};


/* ===================================================================
   1: RESPONS – sjekk users først
=================================================================== */

window.responseHandlers.startup_checkUsers = function (data) {
    const count = data.rows?.length || 0;

    if (count === 0) {
        console.warn("🚨 Ingen brukere → FIRST RUN MODE");
        document.getElementById("kk-initial-setup").classList.remove("kk-hidden");
        document.getElementById("kk-setup-create-btn").onclick = createFirstSuperadmin;
        return;
    }

    console.log("Brukere finnes → normal oppstart");

    // Midlertidig hardkodet
    const HARDCODED_USER_ID = 1;

    getNEON({
        table: "users",
        where: { id: HARDCODED_USER_ID },
        responsId: "startup_userLoaded"
    });
};


/* ===================================================================
   2: RESPONS – innlogget bruker lastet
=================================================================== */

window.responseHandlers.startup_userLoaded = function (data) {
    KK.user = data.rows?.[0];

    if (!KK.user) {
        alert("Fant ikke bruker!");
        return;
    }

    console.log("Innlogget bruker:", KK.user);

    // Last inn klient
    getNEON({
        table: "clients",
        where: { id: KK.user.clientId },
        limit: 1,
        responsId: "startup_clientLoaded"
    });
};


/* ===================================================================
   3: RESPONS – klient lastet, start datalastingen
=================================================================== */

window.responseHandlers.startup_clientLoaded = function (data) {
    KK.client = data.rows?.[0];

    if (!KK.client) {
        alert("Fant ikke klient!");
        return;
    }

    console.log("Klient lastet:", KK.client);

    // START PARALLELL DATAHENTING
    loadAllCoreData();
};


/* ===================================================================
   4: LAST ALLE DATA PARALLELT
=================================================================== */

function loadAllCoreData() {
    console.log("Henter selskaper, meta, kpi, settings…");

    getNEON({ table: "companies", where: { clientId: KK.client.id }, responsId: "startup_companies" });
    getNEON({ table: "kpi_meta", responsId: "startup_kpiMeta" });
    getNEON({ table: "kpi_values", responsId: "startup_kpiValues" });
    getNEON({ table: "company_settings", responsId: "startup_companySettings" });

    // Hvis controller/user:
    getNEON({ table: "user_companies", where: { userId: KK.user.id }, responsId: "startup_userCompanyAccess" });
}


/* ===================================================================
   5: RESPONS – lagre dataene i KK
=================================================================== */

window.responseHandlers.startup_companies = function (data) {
    KK.companies = data.rows || [];
    checkIfStartupComplete();
};

window.responseHandlers.startup_kpiMeta = function (data) {
    KK.kpiMeta = data.rows || [];
    checkIfStartupComplete();
};

window.responseHandlers.startup_kpiValues = function (data) {
    KK.kpiValues = data.rows || [];
    checkIfStartupComplete();
};

window.responseHandlers.startup_companySettings = function (data) {
    KK.companySettings = data.rows || [];
    checkIfStartupComplete();
};

window.responseHandlers.startup_userCompanyAccess = function (data) {
    KK.userCompanyAccess = data.rows || [];
    checkIfStartupComplete();
};


/* ===================================================================
   6: SYNKRONISER — vent til ALLE 5 datasett er lastet
=================================================================== */

let startupLoaded = {
    companies: false,
    kpiMeta: false,
    kpiValues: false,
    companySettings: false,
    userCompanyAccess: false
};

function checkIfStartupComplete() {

    // Mark lastet respons
    const lastCall = Object.keys(window.responseHandlers).find(k => k.startsWith("startup_"));

    if (lastCall === "startup_companies") startupLoaded.companies = true;
    if (lastCall === "startup_kpiMeta") startupLoaded.kpiMeta = true;
    if (lastCall === "startup_kpiValues") startupLoaded.kpiValues = true;
    if (lastCall === "startup_companySettings") startupLoaded.companySettings = true;
    if (lastCall === "startup_userCompanyAccess") startupLoaded.userCompanyAccess = true;

    const allDone =
        startupLoaded.companies &&
        startupLoaded.kpiMeta &&
        startupLoaded.kpiValues &&
        startupLoaded.companySettings &&
        startupLoaded.userCompanyAccess;

    if (!allDone) return;

    console.log("🎉 ALL CORE DATA LOADED — READY!");

    KK.ready = true;

    // VIS DASHBOARD
    document.getElementById("kk-dashboard").classList.remove("kk-hidden");

    // Tegn dashboardet
    if (typeof window.KK.renderDashboardCompanies === "function") {
        window.KK.renderDashboardCompanies(KK.companies);
    }
}


/* ===================================================================
   OPPRETTE SUPERADMIN (FIRST RUN)
=================================================================== */

function createFirstSuperadmin() {
    const email = document.getElementById("kk-setup-email").value.trim();
    const name  = document.getElementById("kk-setup-name").value.trim();

    if (!email || !name) {
        alert("Du må skrive inn navn og e-post");
        return;
    }

    console.log("Oppretter første klient + superadmin…");

    postNEON({
        table: "clients",
        data: [{ name: "Mitt første konsern" }],
        responsId: "startup_firstClient"
    });
}

window.responseHandlers.startup_firstClient = function (data) {
    const clientId = data?.inserted?.[0]?.id;
    if (!clientId) return alert("Feil ved opprettelse av klient!");

    postNEON({
        table: "users",
        data: [{
            clientId,
            name: document.getElementById("kk-setup-name").value.trim(),
            email: document.getElementById("kk-setup-email").value.trim(),
            role: "superadmin",
            neonUserId: "__setup__"
        }],
        responsId: "startup_firstUser"
    });
};

window.responseHandlers.startup_firstUser = function () {
    alert("Superadmin opprettet. Last siden på nytt.");
    location.reload();
};

