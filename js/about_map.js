(() => {
    if (typeof L === 'undefined') {
        return;
    }

    let mapInstance = null;

    const bboxWest = 3.574785944268058;
    const bboxSouth = 51.4338365096352;
    const bboxEast = 4.362709738530668;
    const bboxNorth = 51.74483914516523;

    const osBounds = L.latLngBounds(
        [bboxSouth, bboxWest],
        [bboxNorth, bboxEast]
    );

    const scubaMaskIcon = L.icon({
        iconUrl: 'img/scuba-mask-marker.svg',
        iconSize: [24, 32],
        iconAnchor: [12, 31],
        popupAnchor: [0, -28]
    });

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toValidUrl(value) {
        if (typeof value !== 'string') {
            return '';
        }

        const trimmed = value.trim();
        if (!/^https?:\/\//i.test(trimmed)) {
            return '';
        }

        return trimmed;
    }

    function addDiveSpotMarkers(map, data) {
        if (!data || typeof data !== 'object') {
            return;
        }

        Object.entries(data).forEach(([spotName, spotInfo]) => {
            const coordinates = spotInfo?.coordinaat;
            if (!Array.isArray(coordinates) || coordinates.length < 2) {
                return;
            }

            const longitude = Number(coordinates[0]);
            const latitude = Number(coordinates[1]);

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return;
            }

            const linkUrl = toValidUrl(spotInfo?.link);
            const popupLink = linkUrl
                ? `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">Open locatie-link</a>`
                : 'Geen locatie-link beschikbaar';

            const marker = L.marker([latitude, longitude], { icon: scubaMaskIcon }).addTo(map);
            marker.bindPopup(`<strong>${escapeHtml(spotName)}</strong><br>${popupLink}`);
        });
    }

    function createMap(mapContainer) {
        const map = L.map(mapContainer, {
            zoomControl: true,
            minZoom: 9,
            maxZoom: 18
        });

        const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
            referrerPolicy: 'strict-origin-when-cross-origin'
        });

        tileLayer.addTo(map);

        let hasTileWarning = false;
        tileLayer.on('tileerror', () => {
            if (hasTileWarning) {
                return;
            }

            hasTileWarning = true;
            const warning = document.createElement('p');
            warning.className = 'map-error-note';
            warning.textContent = 'OSM-tegels konden niet worden geladen. Open deze pagina via http(s) in een normale browser zodat een Referer-header wordt meegestuurd.';
            mapContainer.insertAdjacentElement('afterend', warning);
        });

        map.fitBounds(osBounds, { padding: [12, 12] });

        fetch('divespots_current.json')
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Kon duiklocaties niet laden (HTTP ${response.status})`);
                }
                return response.json();
            })
            .then((data) => {
                addDiveSpotMarkers(map, data);
            })
            .catch((error) => {
                console.error(error);
            });

        return map;
    }

    function ensureDiveMap(preferredContainerId) {
        if (mapInstance) {
            mapInstance.invalidateSize();
            return mapInstance;
        }

        const fallbackContainer = document.getElementById('osmDiveMap');
        const targetContainer = preferredContainerId
            ? document.getElementById(preferredContainerId)
            : null;
        const mapContainer = targetContainer || fallbackContainer;

        if (!mapContainer) {
            return null;
        }

        mapInstance = createMap(mapContainer);
        return mapInstance;
    }

    function invalidateDiveMap() {
        if (mapInstance) {
            mapInstance.invalidateSize();
        }
    }

    window.ensureDiveMap = ensureDiveMap;
    window.invalidateDiveMap = invalidateDiveMap;

    ensureDiveMap();
})();
