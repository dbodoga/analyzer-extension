let coadaSalvare = Promise.resolve();

// Pune operațiile de salvare în ordine.
function adaugaInCoada(operatie) {
    coadaSalvare = coadaSalvare
        .then(operatie)
        .catch((eroare) => {
            console.error("Eroare la salvarea cererilor:", eroare);
        });
}

// Golește lista atunci când începe încărcarea unei pagini noi.
function reseteazaCereri(tabId, momentStart) {
    const cheieCereri = "cereri_" + tabId;
    const cheieStatistici = "statistici_" + tabId;

    adaugaInCoada(async () => {
        await chrome.storage.local.set({
            [cheieCereri]: [],
            [cheieStatistici]: {
                numar: 0,
                inceput: momentStart,
                durata: null
            }
        });
    });
}

function salveazaCerere(details) {
    if (details.tabId < 0) return;

    const cheie = "cereri_" + details.tabId;
    const cheieStatistici = "statistici_" + details.tabId;
    const cheieTimp = "timp_" + details.requestId;

    adaugaInCoada(async () => {
        const data = await chrome.storage.local.get([cheie, cheieStatistici]);
        const dateTimp = await chrome.storage.session.get(cheieTimp);

        const cereri = data[cheie] || [];
        const statistici = data[cheieStatistici] || {
            numar: 0,
            inceput: null,
            durata: null
        };

        const adresa = new URL(details.url);
        const inceput = dateTimp[cheieTimp];

        const cerere = {
            id: details.requestId,
            domeniu: adresa.hostname,
            nume: adresa.pathname + adresa.search,
            metoda: details.method,
            status: details.error || details.statusCode,
            tip: details.type,
            timp: inceput === undefined
                ? null
                : Math.max(0, Math.round(details.timeStamp - inceput))
        };

        cereri.push(cerere);
        statistici.numar++;

        await chrome.storage.local.set({
            [cheie]: cereri,
            [cheieStatistici]: statistici
        });

        await chrome.storage.session.remove(cheieTimp);
    });
}

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.tabId < 0) return;

        if (details.type === "main_frame") {
            reseteazaCereri(details.tabId, Date.now());
        }

        const cheieTimp = "timp_" + details.requestId;

        adaugaInCoada(async () => {
            await chrome.storage.session.set({
                [cheieTimp]: details.timeStamp
            });
        });
    },
    { urls: ["http://*/*", "https://*/*"] }
);

chrome.webRequest.onCompleted.addListener((details) => {
        salveazaCerere(details);

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
    { urls: ["http://*/*", "https://*/*"] }
);

chrome.webRequest.onErrorOccurred.addListener((details) => {
        salveazaCerere(details);

        if (details.type === "main_frame" && details.tabId >= 0) {
            chrome.storage.session.remove("site_" + details.tabId);
        }
    },
    { urls: ["http://*/*", "https://*/*"] }
);

chrome.tabs.onUpdated.addListener((tabId, schimbari) => {
    if (schimbari.status !== "complete") return;

    const momentFinal = Date.now();
    const cheie = "statistici_" + tabId;

    adaugaInCoada(async () => {
        const data = await chrome.storage.local.get(cheie);
        const statistici = data[cheie];

        if (statistici && statistici.inceput !== null) {
            statistici.durata = (momentFinal - statistici.inceput) / 1000;
            await chrome.storage.local.set({ [cheie]: statistici });
        }
    });
});