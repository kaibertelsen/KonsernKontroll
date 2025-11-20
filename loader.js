// Loader for å hente inn eksterne skript fra CDN
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(`Failed to load script: ${url}`);
        document.head.appendChild(script);
    });
}

// Liste over CDN-scripts
const cdnScripts = [
    "https://kaibertelsen.github.io/KonsernKontroll/vendor-neonApiClient.js",
    "https://kaibertelsen.github.io/KonsernKontroll/KK.bundle.js",
];

// Når alle scripts er ferdig lastet:
cdnScripts.reduce((p, url) => p.then(() => loadScript(url)), Promise.resolve())
    .then(() => {
        console.log("All scripts loaded");

        // Riktig entrypoint for bundle C1:
        if (window.KonsernKontroll && typeof KonsernKontroll.startUp === "function") {
            KonsernKontroll.startUp();
        } else {
            console.error("KonsernKontroll.startUp() mangler!");
        }
    })
    .catch(err => console.error(err));