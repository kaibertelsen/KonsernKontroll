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
