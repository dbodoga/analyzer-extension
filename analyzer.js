const formular = document.getElementById("url-form");
const campLink = document.getElementById("url-input");
const mesaj = document.getElementById("status");
const siteHost = document.getElementById("site-host");
const siteProtocol = document.getElementById("site-protocol");

function actualizeazaSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, (file) => {
        const fila = file[0];

        siteHost.textContent = "—";
        siteProtocol.textContent = "—";
        document.getElementById("site-ip").textContent = "—";
        document.getElementById("site-status").textContent = "—";

        if (!fila || !fila.url) {
            siteHost.textContent = "Indisponibil";
            return;
        }

        const adresa = new URL(fila.url);

        if (adresa.protocol !== "http:" && adresa.protocol !== "https:") {
            siteHost.textContent = "Indisponibil";
            return;
        }

        siteHost.textContent = adresa.hostname;
        siteProtocol.textContent = adresa.protocol.slice(0, -1).toUpperCase();
        campLink.value = fila.url;

        const cheie = "site_" + fila.id;

        chrome.storage.session.get(cheie, (data) => {
            const site = data[cheie];
            const urlCurent = fila.url.split("#")[0];

            if (site && site.url === urlCurent) {
                document.getElementById("site-ip").textContent = site.ip;
                document.getElementById("site-status").textContent = site.status;
            }
        });
    });
}

// Citește informațiile când se deschide extensia.
actualizeazaSite();

// Actualizează informațiile când pagina se încarcă.
chrome.tabs.onUpdated.addListener((tabId, schimbari) => {
    if (schimbari.status === "complete") {
        chrome.tabs.query({ active: true, currentWindow: true }, (file) => {
            if (file[0] && file[0].id === tabId) {
                actualizeazaSite();
            }
        });
    }
});

// Actualizează informațiile când sunt salvate date noi despre site.
chrome.storage.onChanged.addListener((schimbari, zona) => {
    if (zona === "session") {
        actualizeazaSite();
    }
});

formular.addEventListener("submit", (e) => {
    e.preventDefault();

    let link = campLink.value.trim();

    if (!link.includes("://")) {
        link = "https://" + link;
    }

    try {
        const adresa = new URL(link);

        if (adresa.protocol !== "http:" && adresa.protocol !== "https:") {
            mesaj.textContent = "Introdu o adresă HTTP sau HTTPS.";
            return;
        }

        if (!adresa.hostname.includes(".")) {
            adresa.hostname += ".com";
        }

        chrome.tabs.update({ url: adresa.href });
    } catch (eroare) {
        mesaj.textContent = "Adresa introdusă nu este validă.";
    }
});

const listaCereri = document.getElementById("lista-cereri");

function afiseazaCereri() {
    chrome.tabs.query({ active: true, currentWindow: true }, (file) => {
        const fila = file[0];

        if (!fila) return;

        const cheie = "cereri_" + fila.id;

        const cheieStatistici = "statistici_" + fila.id;

        chrome.storage.local.get([cheie, cheieStatistici], (data) => {
            const cereri = data[cheie] || [];
            const statistici = data[cheieStatistici];

            const numar = statistici ? statistici.numar : 0;
            const durata = statistici && statistici.durata !== null
                ? statistici.durata.toFixed(2)
                : "—";

            document.getElementById("statistici").textContent =
                numar + " requests | " + durata + " seconds";

            listaCereri.innerHTML = "";

            for (const cerere of cereri) {
                // Cererile salvate în formatul vechi erau texte.
                if (typeof cerere === "string") continue;

                const rand = document.createElement("tr");

                if ((typeof cerere.status === "number" && cerere.status >= 400) || typeof cerere.status === "string") {
                    rand.classList.add("cerere-eroare");
                }

                const valori = [
                    cerere.id,
                    cerere.domeniu,
                    cerere.nume,
                    cerere.metoda,
                    cerere.status,
                    cerere.tip,
                    cerere.timp === null ? "—" : cerere.timp + " ms"
                ];

                for (const valoare of valori) {
                    const celula = document.createElement("td");
                    celula.textContent = valoare;
                    rand.appendChild(celula);
                }

                listaCereri.appendChild(rand);
            }
        });
    });
}

// Afișează cererile când se deschide extensia.
afiseazaCereri();

// Actualizează lista când se salvează cereri noi.
chrome.storage.onChanged.addListener((schimbari, zona) => {
    if (zona === "local") {
        afiseazaCereri();
    }
});

const butonRefresh = document.getElementById("refresh");

butonRefresh.addEventListener("click", () => {
    chrome.tabs.reload();
});

const tabel = document.getElementById("tabel-cereri");
const antete = tabel.querySelectorAll("th");
const coloane = tabel.querySelectorAll("col");

antete.forEach((antet, index) => {
    const maner = document.createElement("span");
    maner.classList.add("redimensionare");
    antet.appendChild(maner);

    maner.addEventListener("pointerdown", (e) => {
        e.preventDefault();

        const pozitieStart = e.clientX;
        const latimeStart = antet.getBoundingClientRect().width;
        const latimeTabelStart = tabel.getBoundingClientRect().width;

        maner.setPointerCapture(e.pointerId);

        function redimensioneaza(event) {
            const diferenta = event.clientX - pozitieStart;
            const latimeNoua = Math.max(50, latimeStart + diferenta);
            const modificare = latimeNoua - latimeStart;

            coloane[index].style.width = latimeNoua + "px";
            tabel.style.width = (latimeTabelStart + modificare) + "px";
        }

        function opreste() {
            maner.removeEventListener("pointermove", redimensioneaza);
            maner.removeEventListener("pointerup", opreste);
            maner.removeEventListener("pointercancel", opreste);
        }

        maner.addEventListener("pointermove", redimensioneaza);
        maner.addEventListener("pointerup", opreste);
        maner.addEventListener("pointercancel", opreste);
    });
});