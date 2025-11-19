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
