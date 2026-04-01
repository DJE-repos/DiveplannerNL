(() => {
    const openButton = document.getElementById('openMapOverlayBtn');
    const closeButton = document.getElementById('closeMapOverlayBtn');
    const overlay = document.getElementById('mapOverlay');

    if (!openButton || !closeButton || !overlay) {
        return;
    }

    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');

    function openOverlay() {
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('map-overlay-open');

        if (typeof window.ensureDiveMap === 'function') {
            window.ensureDiveMap('osmDiveMapOverlay');
            requestAnimationFrame(() => {
                if (typeof window.invalidateDiveMap === 'function') {
                    window.invalidateDiveMap();
                    setTimeout(() => window.invalidateDiveMap(), 80);
                }
            });
        }
    }

    function closeOverlay() {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('map-overlay-open');
    }

    openButton.addEventListener('click', openOverlay);
    closeButton.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeOverlay();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !overlay.hidden) {
            closeOverlay();
        }
    });
})();
