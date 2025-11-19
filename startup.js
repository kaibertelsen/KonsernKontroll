function startUp() {
    console.log("KonsernKontroll startUp()...");
    console.log("⚠️ Memberstack disabled for first-run setup.");
  
    // ------------------------------------------------------
    // 1) Hent ALLE brukere i databasen (max 1 holder)
    // ------------------------------------------------------
    getNEON({
      table: "users",
      limit: 1,
      responsId: "respCheckUsers",
      cache: false
    });
  }
  
  
  // ======================================================================
  //  HANDLE: respCheckUsers
  // ======================================================================
  function respCheckUsers(data) {
    console.log("User table check:", data);
  
    const hasUsers = data.rows && data.rows.length > 0;
  
    if (!hasUsers) {
      console.warn("🔧 No users found → entering first-run setup mode");
      showInitialSetup();
      return;
    }
  
    // ------------------------------------------------------
    // System has users → continue normal flow
    // ------------------------------------------------------
    const user = data.rows[0];
    KK.user = user;
  
    console.log("Logged in as existing user:", user);
  
    // Now load client + companies etc…
    loadClientAndDashboard();
  }
  
  
  // ======================================================================
  //  SHOW FIRST-RUN SETUP PANEL
  // ======================================================================
  function showInitialSetup() {
    document.getElementById("kk-dashboard").classList.add("kk-hidden");
    document.getElementById("kk-initial-setup").classList.remove("kk-hidden");
  
    // Bind button only once
    const btn = document.getElementById("kk-setup-create-btn");
    if (!btn.dataset.bound) {
      btn.dataset.bound = "true";
  
      btn.addEventListener("click", () => {
        const name = document.getElementById("kk-setup-name").value.trim();
        const email = document.getElementById("kk-setup-email").value.trim();
  
        if (!name || !email) {
          alert("Navn og e-post må fylles ut");
          return;
        }
  
        console.log("Creating FIRST superadmin…");
  
        postNEON({
          table: "users",
          data: {
            name,
            email,
            role: "superadmin",
            clientId: 1,          // midlertidig – byttes senere
            neonUserId: null      // kobles senere
          },
          responsId: "respFirstUserCreated"
        });
      });
    }
  }
  
  
  // ======================================================================
  //  HANDLE: respFirstUserCreated
  // ======================================================================
  function respFirstUserCreated(data) {
    console.log("Superadmin created:", data);
  
    alert("Superadmin opprettet! Last siden på nytt.");
  
    location.reload();
  }
  
  
  // ======================================================================
  //  NORMAL NORMAL FLOW AFTER USERS EXIST
  // ======================================================================
  function loadClientAndDashboard() {
    console.log("Loading dashboard…");
  
    // Hent klienten brukeren tilhører
    getNEON({
      table: "clients",
      where: { id: KK.user.clientId },
      responsId: "respClient"
    });
  }
  
  