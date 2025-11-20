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
