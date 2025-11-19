// =======================================================================
//  KonsernKontroll – KPI ENGINE
//  Provides: getLatestKpiValues(), calculateCompanyStatus()
// =======================================================================

window.KK = window.KK || {};


// -----------------------------------------------------------
//  Return latest KPI values per company
// -----------------------------------------------------------
function getLatestKpiValues(companyId) {
    const rows = (KK.kpiValues || []).filter(v => v.companyId === companyId);

    const latest = {};
    rows.forEach(r => {
        const meta = KK.kpiMeta.find(x => x.id === r.kpiId);
        if (!meta) return;

        // find latest value for this kpi
        if (!latest[meta.key] || new Date(r.createdAt) > new Date(latest[meta.key].createdAt)) {
            latest[meta.key] = r;
        }
    });

    const output = {};
    Object.keys(latest).forEach(key => {
        output[key] = Number(latest[key].value);
    });

    return output;
}


// -----------------------------------------------------------
//  Compute company status (green/yellow/red)
// -----------------------------------------------------------
function calculateCompanyStatus(companyId) {

    const latest = getLatestKpiValues(companyId);
    const settings = (KK.companySettings || []).filter(s => s.companyId === companyId);
    const meta = KK.kpiMeta || [];

    // If missing data → warning status
    if (!latest || Object.keys(latest).length === 0) {
        return { status: "yellow", reason: "Mangler KPI-data" };
    }

    let worstStatus = "green";

    meta.forEach(m => {
        const key = m.key;

        if (key === "budsjett") return;

        const actual = Number(latest[key] || 0);
        const budsjett = Number(latest["budsjett"] || 0);

        if (!budsjett) {
            worstStatus = "yellow";
            return;
        }

        const setting = settings.find(s => s.kpiId === m.id);
        const avvik = setting ? Number(setting.avvikProsent) : 10;

        const allowedDeviation = budsjett * (avvik / 100);
        const deviation = Math.abs(budsjett - actual);

        if (deviation <= allowedDeviation) {
            // green
        } else if (deviation <= allowedDeviation * 2) {
            worstStatus = (worstStatus === "red") ? "red" : "yellow";
        } else {
            worstStatus = "red";
        }
    });

    return { status: worstStatus, reason: "" };
}


// -----------------------------------------------------------
//  Expose to global (UMD style)
// -----------------------------------------------------------
window.getLatestKpiValues = getLatestKpiValues;
window.calculateCompanyStatus = calculateCompanyStatus;

console.log("KonsernKontroll KPI engine loaded");
