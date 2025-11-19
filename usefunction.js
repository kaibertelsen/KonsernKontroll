
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


  


   