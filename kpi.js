// =======================================================================
//  KonsernKontroll – KPI ENGINE (kpi.js)
// =======================================================================
//
//  Gir disse funksjonene:
//
//   ✔ getLatestKpiValues(companyId)
//       → returnerer siste registrerte tall per KPI-type
//
//   ✔ getKpiStatus(company, metric)
//       → returnerer "green" | "yellow" | "red" for dashboard
//
//   ✔ calculateCompanyStatus(companyId)
//       → brukes til konsern-sum og ev. detaljer
//
// =======================================================================

window.KK = window.KK || {};

console.log("✓ KPI Engine loaded");


// =======================================================================
//  1) HENT SISTE KPI-VERDI FOR ET SELSKAP
// =======================================================================

function getLatestKpiValues(companyId) {
    const rows = (KK.kpiValues || []).filter(v => v.companyId === companyId);
    const meta = KK.kpiMeta || [];

    // Sorter newest → oldest
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const result = {};

    for (const m of meta) {
        const r = rows.find(x => x.kpiId === m.id);
        if (r) {
            result[m.key] = Number(r.value);
        }
    }

    return result;
}


// =======================================================================
//  2) HENT COMPANY_SETTINGS
// =======================================================================

function getCompanySettings(companyId) {
    return (KK.companySettings || []).filter(s => s.companyId === companyId);
}


// =======================================================================
//  3) BEREGN KPI-STATUS FOR ÉN KPI-TYPE
// =======================================================================
//
//  metric = "omsetning" | "resultat" | "likviditet"
//

function getKpiStatus(company, metric) {

    if (!company?.id) return "gray";

    const companyId = company.id;

    const latest = getLatestKpiValues(companyId);
    const settings = getCompanySettings(companyId);
    const meta = KK.kpiMeta.find(m => m.key === metric);

    if (!meta) return "gray";

    const value = Number(latest[metric] || 0);
    const budsjett = Number(latest["budsjett"] || 0);

    // Ingen tall → gul
    if (!budsjett) return "yellow";

    // Finn avvik-prosent for denne KPI-typen
    const setting = settings.find(s => s.kpiId === meta.id);
    const allowedPct = setting ? Number(setting.avvikProsent) : 10;

    const allowedDeviation = budsjett * (allowedPct / 100);
    const deviation = Math.abs(value - budsjett);

    if (deviation <= allowedDeviation) {
        return "green";
    }
    if (deviation <= allowedDeviation * 2) {
        return "yellow";
    }
    return "red";
}


// =======================================================================
//  4) FULL COMPANY STATUS (samler alle KPI'er)
// =======================================================================

function calculateCompanyStatus(companyId) {

    const latest = getLatestKpiValues(companyId);
    const settings = getCompanySettings(companyId);
    const meta = KK.kpiMeta || [];

    if (!latest || Object.keys(latest).length === 0) {
        return { status: "yellow", reason: "Mangler KPI-data" };
    }

    let worst = "green";

    for (const m of meta) {
        if (m.key === "budsjett") continue;

        const value = Number(latest[m.key] || 0);
        const budsjett = Number(latest["budsjett"] || 0);
        if (!budsjett) {
            worst = "yellow";
            continue;
        }

        const setting = settings.find(s => s.kpiId === m.id);
        const pct = setting ? Number(setting.avvikProsent) : 10;

        const allowed = budsjett * (pct / 100);
        const deviation = Math.abs(value - budsjett);

        if (deviation > allowed * 2) worst = "red";
        else if (deviation > allowed && worst !== "red") worst = "yellow";
    }

    return { status: worst, reason: "" };
}


// =======================================================================
//  EKSPORT GLOBALE FUNKSJONER
// =======================================================================

window.getLatestKpiValues = getLatestKpiValues;
window.getKpiStatus = getKpiStatus;
window.calculateCompanyStatus = calculateCompanyStatus;
window.getCompanySettings = getCompanySettings;
