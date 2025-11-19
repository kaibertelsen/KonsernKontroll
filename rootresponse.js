// =======================================================================
//  KonsernKontroll – GLOBAL RESPONSE ROUTER
// =======================================================================
//
//  Denne filen samler ALLE responsId → funksjon-handler koblinger.
//  Men viktigere: Moduler kan selv registrere nye handlers i
//  window.responseHandlers via Object.assign().
//
//  Dette betyr:
//  - rootresponse.js trenger IKKE å oppdateres for hver modul!
//  - så lenge modulene registrerer sine handlers
//
// =======================================================================


// =======================================================================
//  GLOBALT HANDLER-KART
// =======================================================================

window.responseHandlers = window.responseHandlers || {};

// Denne er her for å støtte eldre modulnavn / backward compatibility
const legacyHandlers = {
    responsPatchStartup: data => responsPatchStartup?.(data),
    responsPostCustomer: data => responsPostCustomer?.(data),
    responsDelOrder: data => responsDelOrder?.(data)
};

// Slå sammen legacy → global
Object.assign(window.responseHandlers, legacyHandlers);


// =======================================================================
//  HOVED FUNKSJON – ROUTER
// =======================================================================

function apiresponse(data, responsId) {
    console.log(`API Response (${responsId}):`, data);

    if (!responsId) {
        console.warn("API-response mangler responsId. Data:", data);
        return;
    }

    const handler = window.responseHandlers[responsId];

    if (typeof handler === "function") {
        handler(data);
    } else {
        console.warn(`Ingen handler funnet for responsId: '${responsId}'`);
    }
}


// =======================================================================
//  EKSPORT
// =======================================================================

// Tilgjengelig i alle moduler
window.apiresponse = apiresponse;

console.log("KonsernKontroll Root Response Router loaded");
