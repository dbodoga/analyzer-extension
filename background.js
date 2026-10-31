let coadaSalvare = Promise.resolve();

function salveazaCerere(cerere) {
    coadaSalvare = coadaSalvare
        .then(async () => {
            const data = await chrome.storage.local.get({ cereri: [] });

            data.cereri.push(cerere);

            await chrome.storage.local.set({
                cereri: data.cereri.slice(-20)
            });
        })
        .catch((error) => {
            console.error("Eroare la salvarea cererii:", error);
        });
}

chrome.webRequest.onCompleted.addListener(
    function (details) {
        const initiator = details.initiator || "unknown";

        const cerere =
            details.type + " | " +
            details.method + " " + details.url +
            " | Status: " + details.statusCode +
            " | Tab: " + details.tabId +
            " | Inițiator: " + initiator;

        salveazaCerere(cerere);

        if (details.type === "main_frame" && details.tabId >= 0) {
            const cheie = "site_" + details.tabId;

            chrome.storage.session.set({
                [cheie]: {
                    url: details.url,
                    ip: details.ip || "—",
                    status: details.statusCode
                }
            });
        }
    },
    {
        urls: ["https://example.com/*"]
    }
);

chrome.webRequest.onErrorOccurred.addListener(
    function (details) {
        const initiator = details.initiator || "unknown";

        const cerere =
            details.type + " | " +
            details.method + " " + details.url +
            " | Eroare: " + details.error +
            " | Tab: " + details.tabId +
            " | Inițiator: " + initiator;

        salveazaCerere(cerere);

        if (details.type === "main_frame" && details.tabId >= 0) {
            chrome.storage.session.remove("site_" + details.tabId);
        }
    },
    {
        urls: ["https://example.com/*"]
    }
);