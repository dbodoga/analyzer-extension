const formular = document.getElementById("url-form");
const campLink = document.getElementById("url-input");
const mesaj = document.getElementById("status");
const siteHost = document.getElementById("site-host");
const siteProtocol = document.getElementById("site-protocol");

chrome.tabs.query({ active: true, currentWindow: true }, (file) => {
    const fila = file[0];

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

formular.addEventListener("submit", (e) => {
    e.preventDefault();

    const link = campLink.value;
    mesaj.textContent = "Link introdus: " + link;
});

const listaCereri = document.getElementById("lista-cereri");

chrome.storage.local.get({cereri: []}, (data) => {
    for (const cerere of data.cereri) {
        const elementLista = document.createElement("li");
        elementLista.textContent = cerere;
        listaCereri.appendChild(elementLista);
    }
});