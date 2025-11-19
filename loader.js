
/* Denne skal ligge i webflow
<script src="https://kaibertelsen.github.io/KonsernKontroll/loader.js"></script>
*/


    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(`Failed to load script: ${url}`);
            document.head.appendChild(script);
        });
    }
    
    // Liste over CDN-URL-er som skal lastes inn
// Liste over CDN-URL-er som skal lastes inn
const cdnScripts = [
    "https://kaibertelsen.github.io/neonclientframe/neonApiClient.umd.js",

    "https://kaibertelsen.github.io/KonsernKontroll/rootresponse.js",
    "https://kaibertelsen.github.io/KonsernKontroll/usefunction.js",

    // Core + sort først
    "https://kaibertelsen.github.io/KonsernKontroll/dashboardCore.js",
    "https://kaibertelsen.github.io/KonsernKontroll/dashboardSort.js",

    // Funksjonsmoduler
    "https://kaibertelsen.github.io/KonsernKontroll/kpi.js",
    "https://kaibertelsen.github.io/KonsernKontroll/reporting.js",
    "https://kaibertelsen.github.io/KonsernKontroll/budgetadmin.js",
    "https://kaibertelsen.github.io/KonsernKontroll/companydetail.js",
    "https://kaibertelsen.github.io/KonsernKontroll/konsernsum.js",
    "https://kaibertelsen.github.io/KonsernKontroll/useradmin.js",

    "https://kaibertelsen.github.io/KonsernKontroll/dataprotection.js",

    "https://kaibertelsen.github.io/KonsernKontroll/startup.js"
];


    
    // Når alle scripts er ferdiglastet:
    cdnScripts.reduce((promise, script) => {
        return promise.then(() => loadScript(script));
    }, Promise.resolve()).then(() => {
        console.log("All scripts loaded");
        if (typeof startUp === "function") startUp();   // <–– KJØR START!
    }).catch(error => {
        console.error(error);
    });
    
    