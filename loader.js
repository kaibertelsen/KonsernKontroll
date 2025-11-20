
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
    "https://kaibertelsen.github.io/KonsernKontroll/vendor-neonApiClient.js",
    "https://kaibertelsen.github.io/KonsernKontroll/KK.bundle.js",
    
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
    
    