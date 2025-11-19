
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
    const cdnScripts = [
        "https://kaibertelsen.github.io/neonclientframe/neonApiClient.umd.js",
        "https://kaibertelsen.github.io/KonsernKontroll/rootresponse.js",
        "https://kaibertelsen.github.io/KonsernKontroll/usefunction.js"   
    ];
    
    // Laste inn alle skriptene sekvensielt
    cdnScripts.reduce((promise, script) => {
        return promise.then(() => loadScript(script));
    }, Promise.resolve()).then(() => {
        console.log("All scripts loaded");
    }).catch(error => {
        console.error(error);
    });
    
    