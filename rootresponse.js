// En map med alle funksjoner knyttet til hvert responsId
const responseHandlers = {
  responsPatchStartup: data => responsPatchStartup(data),
  responsPostCustomer: data => responsPostCustomer(data),
  responsDelOrder: data => responsDelOrder(data),

  // legg bare til nye her…
};



function apiresponse(data, responsId) {
  console.log("API Response:", data);

  // Sjekk om det finnes en handler for responsId
  const handler = responseHandlers[responsId];

  if (handler) {
    handler(data);     // Kjør riktig funksjon
  } else {
    console.warn(`No response handler found for '${responsId}'`);
  }
}
