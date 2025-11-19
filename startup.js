// =========================================================
//   GLOBAL STATE
// =========================================================
window.KK = {
    user: null,
    client: null,
    companies: [],
    kpiMeta: [],
    kpiValues: [],
    companySettings: [],
  };
  
  
  // =========================================================
  //   STARTUP
  // =========================================================
  function startUp() {
    console.log("KonsernKontroll startUp()...");
  
    // Hent Memberstack user → neonUserId
    window.MemberStack?.onReady?.then(ms => {
      const neonUserId = ms?.member?.neonUserId || ms?.member?.id || null;
  
      if (!neonUserId) {
        console.error("Missing neonUserId from Memberstack user");
        return;
      }
  
      console.log("Logged in user neonUserId:", neonUserId);
  
      // Hent bruker-raden
      getNEON({
        table: "users",
        where: { neonUserId },
        responsId: "respUser",
        cache: false,
      });
    });
  }
  
  
  // =========================================================
  //   RESPONSE HANDLER: USER
  // =========================================================
  function responsUser(data) {
    if (!data?.rows?.length) {
      console.error("User not found in Neon");
      return;
    }
  
    const user = data.rows[0];
    KK.user = user;
  
    console.log("User loaded:", user);
  
    // Trenger clientId og userId
    const { clientId, id: userId } = user;
  
    // Hent konsern (client)
    getNEON({
      table: "clients",
      where: { id: clientId },
      responsId: "respClient",
    });
  
    // Hent tilganger til selskaper
    getNEON({
      table: "user_companies",
      where: { userId },
      responsId: "respUserCompanies",
    });
  
    // KPI meta (resultat, omsetning, likviditet, budsjett)
    getNEON({
      table: "kpi_meta",
      responsId: "respKpiMeta",
    });
  }
  
  
  // =========================================================
  //   RESPONSE HANDLER: CLIENT
  // =========================================================
  function responsClient(data) {
    KK.client = data.rows[0];
    console.log("Client loaded:", KK.client);
  
    // Oppdater UI
    document.getElementById("kk-client-name").textContent = KK.client.name;
  }
  
  
  // =========================================================
  //   RESPONSE HANDLER: USER_COMPANIES
  //   → hent alle selskaper brukeren har tilgang til
  // =========================================================
  function responsUserCompanies(data) {
    const accessRows = data.rows || [];
    const companyIds = accessRows.map(x => x.companyId);
  
    if (!companyIds.length) {
      console.warn("User has no company access");
      return;
    }
  
    // Hent selskapene
    getNEON({
      table: "companies",
      where: { id: companyIds.join(",") },
      responsId: "respCompanies",
    });
  }
  
  
  // =========================================================
  //   RESPONSE HANDLER: KPI META
  // =========================================================
  function responsKpiMeta(data) {
    KK.kpiMeta = data.rows || [];
    console.log("KPI meta loaded:", KK.kpiMeta);
  }
  
  
  // =========================================================
  //   RESPONSE HANDLER: COMPANIES
  // =========================================================
  function responsCompanies(data) {
    KK.companies = data.rows || [];
    console.log("Companies loaded:", KK.companies);
  
    // Hent KPI values for disse selskapene (siste års synk)
    const ids = KK.companies.map(c => c.id).join(",");
  
    getNEON({
      table: "kpi_values",
      where: { companyId: ids },
      responsId: "respKpiValues",
    });
  
    // Hent avviksprosent pr KPI pr selskap
    getNEON({
      table: "company_settings",
      where: { companyId: ids },
      responsId: "respCompanySettings",
    });
  }
  
  
  // =========================================================
  //   RESPONSE HANDLER: KPI VALUES
  // =========================================================
  function responsKpiValues(data) {
    KK.kpiValues = data.rows || [];
    console.log("KPI values loaded:", KK.kpiValues);
  
    // Når KPI values er lastet → vi kan rendere dashboardet
    renderDashboard();
  }
  
  
  // =========================================================
  //   RESPONSE HANDLER: COMPANY SETTINGS
  // =========================================================
  function responsCompanySettings(data) {
    KK.companySettings = data.rows || [];
    console.log("Company settings loaded:", KK.companySettings);
  }
  
  
  // =========================================================
  //   RENDER DASHBOARD
  // =========================================================
  function renderDashboard() {
    console.log("Rendering dashboard...");
  
    const container = document.getElementById("kk-companies");
    container.innerHTML = ""; // reset
  
    KK.companies.forEach(company => {
      const card = buildCompanyCard(company);
      container.appendChild(card);
    });
  
    renderSummaryTotals();
  }
  
  
  // =========================================================
  //   BUILD COMPANY CARD
  // =========================================================
  function buildCompanyCard(company) {
    const div = document.createElement("div");
    div.className = "kk-card";
    div.dataset.companyId = company.id;
  
    // h3 title
    const header = document.createElement("div");
    header.className = "kk-card-header";
  
    const title = document.createElement("h3");
    title.className = "kk-card-title";
    title.textContent = company.name;
  
    const status = document.createElement("span");
    status.className = "kk-status kk-green";
    status.textContent = "OK"; // logikk kommer senere
  
    header.appendChild(title);
    header.appendChild(status);
  
    const body = document.createElement("div");
    body.className = "kk-card-body";
  
    // KPIs
    const kpis = getLatestKpiValues(company.id);
    Object.keys(kpis).forEach(key => {
      const row = document.createElement("div");
      row.className = "kk-kpi-line";
  
      const lbl = document.createElement("span");
      lbl.className = "kk-kpi-label";
      lbl.textContent = capitalizeFirst(key);
  
      const val = document.createElement("span");
      val.className = "kk-kpi-value";
      val.textContent = formatNumber(kpis[key]);
  
      row.appendChild(lbl);
      row.appendChild(val);
      body.appendChild(row);
    });
  
    div.appendChild(header);
    div.appendChild(body);
    return div;
  }
  
  
  // =========================================================
  //   GET LATEST KPI VALUE PER COMPANY
  // =========================================================
  function getLatestKpiValues(companyId) {
    const rows = KK.kpiValues.filter(v => v.companyId === companyId);
  
    const latest = {};
    rows.forEach(r => {
      const kpiKey = KK.kpiMeta.find(x => x.id === r.kpiId)?.key;
      if (!kpiKey) return;
  
      // sist registrerte verdi = gjeldende
      if (!latest[kpiKey] || new Date(r.createdAt) > new Date(latest[kpiKey].createdAt)) {
        latest[kpiKey] = r;
      }
    });
  
    // returner raw numbers
    const output = {};
    Object.keys(latest).forEach(k => {
      output[k] = Number(latest[k].value);
    });
  
    return output;
  }
  
  
  // =========================================================
  //   SUMMARY TOTALS
  // =========================================================
  function renderSummaryTotals() {
    const totals = {
      omsetning: 0,
      resultat: 0,
      likviditet: 0,
      budsjett: 0,
    };
  
    KK.companies.forEach(company => {
      const k = getLatestKpiValues(company.id);
      Object.keys(k).forEach(type => {
        totals[type] += Number(k[type] || 0);
      });
    });
  
    // Set DOM
    document.getElementById("kk-total-omsetning").textContent = formatNumber(totals.omsetning);
    document.getElementById("kk-total-resultat").textContent = formatNumber(totals.resultat);
    document.getElementById("kk-total-likviditet").textContent = formatNumber(totals.likviditet);
    document.getElementById("kk-total-budsjett").textContent = formatNumber(totals.budsjett);
  }
  
  
  // =========================================================
  //   HELPERS
  // =========================================================
  function formatNumber(num) {
    return Number(num || 0).toLocaleString("no-NO");
  }
  
  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  