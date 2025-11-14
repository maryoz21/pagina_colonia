/**
 * ARCHIVO: js/map.js (VERSIÓN 3 - CON ESTADÍSTICAS EN HOVER)
 * --------------------------------------------------------
 * 1. Usa la capa de mapa CARTO (más limpia).
 * 2. Carga un JSON de coordenadas mucho más grande.
 * 3. Muestra estadísticas H2H en HOVER (Tooltip) en lugar de en clic (Popup).
 */

const mapModule = (() => {

    // --- Variables Privadas del Módulo ---
    let map;
    let stadiumCoords = {};
    let currentMarkers = [];
    let homeStadiumMarker;

    // --- Funciones Privadas (Ayudantes) ---

    /**
     * Carga las coordenadas de los estadios desde nuestro archivo JSON.
     */
    async function loadStadiumCoordinates() {
        try {
            const response = await fetch('data/stadium_locations.json');
            if (!response.ok) {
                throw new Error('No se pudo cargar data/stadium_locations.json');
            }
            stadiumCoords = await response.json();
            console.log("Coordenadas de estadios cargadas:", stadiumCoords);
        } catch (error) {
            console.error("Error fatal cargando coordenadas:", error);
            document.getElementById('map-container').innerHTML = `<p style="color: red;">Error: No se pudo cargar el archivo de coordenadas de estadios.</p>`;
        }
    }

    /**
     * Borra todos los marcadores del mapa, excepto el del estadio local.
     */
    function clearMarkers() {
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];
    }

    /**
     * Obtiene el resultado final (Tipo 2) de un partido.
     */
    function getFinalResult(match) {
        return match.matchResults.find(r => r.resultTypeID === 2) || null;
    }

    /**
     * ¡NUEVO! Calcula las estadísticas del Köln en un estadio específico para una temporada.
     * @param {string} stadiumName - El nombre del estadio.
     * @param {Array} seasonData - Array de partidos de la temporada.
     * @param {boolean} isHome - ¿Estamos calculando el estadio local?
     * @returns {string} - Un string HTML para el tooltip.
     */
    function getStatsForStadium(stadiumName, seasonData, isHome = false) {
        let partidos = 0;
        let victorias = 0;
        let empates = 0;
        let derrotas = 0;

        // TEAM_NAME es la constante global que definimos en index.html
        const matchesAtStadium = seasonData.filter(match => match.location?.locationStadium === stadiumName);

        matchesAtStadium.forEach(match => {
            const result = getFinalResult(match);
            if (result) {
                partidos++;
                const isColoniaLocal = match.team1.teamName === TEAM_NAME;
                const coloniaScore = isColoniaLocal ? result.pointsTeam1 : result.pointsTeam2;
                const rivalScore = isColoniaLocal ? result.pointsTeam2 : result.pointsTeam1;

                if (coloniaScore > rivalScore) victorias++;
                else if (coloniaScore === rivalScore) empates++;
                else derrotas++;
            }
        });

        const title = isHome ? "Estadísticas en Casa (Esta Temporada)" : "Estadísticas de Visitante (Esta Temporada)";

        return `
            <strong style="color: #c60c30; font-size: 1.1em;">${stadiumName}</strong>
            <hr style="margin: 4px 0;">
            <strong>${title}</strong><br>
            Partidos: <strong>${partidos}</strong><br>
            Victorias: <strong style="color: green;">${victorias}</strong><br>
            Empates: <strong style="color: grey;">${empates}</strong><br>
            Derrotas: <strong style="color: red;">${derrotas}</strong>
        `;
    }


    // --- Funciones Públicas (Las que usa app.js) ---

    /**
     * Inicializa el mapa. Se llama UNA VEZ al cargar la página.
     */
    async function initMap(containerId) {
        await loadStadiumCoordinates();
        map = L.map(containerId).setView([51.1657, 10.4515], 6);

        // Mapa limpio de CARTO
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // HOME_STADIUM_NAME es la constante global de index.html
        if (stadiumCoords[HOME_STADIUM_NAME]) {
            const homeCoords = stadiumCoords[HOME_STADIUM_NAME];
            const redIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            homeStadiumMarker = L.marker([homeCoords.lat, homeCoords.lon], { icon: redIcon })
                .addTo(map)
                // ¡CAMBIO! Usamos bindTooltip para el hover.
                // Lo dejamos con un texto simple al inicio. Se actualizará con estadísticas.
                .bindTooltip(`<b>${HOME_STADIUM_NAME}</b><br>¡Hogar del 1. FC Köln!`, {
                    sticky: true // El tooltip sigue al ratón
                });
        }
    }

    /**
     * Actualiza los marcadores del mapa para una temporada específica.
     */
    function updateMapData(seasonData) {
        if (!map) return;

        // 1. Borrar los marcadores de la temporada anterior
        clearMarkers();

        // 2. ¡NUEVO! Actualizar el tooltip del ESTADIO LOCAL con las estadísticas de casa
        if (homeStadiumMarker) {
            // HOME_STADIUM_NAME es la constante global
            const homeStatsHTML = getStatsForStadium(HOME_STADIUM_NAME, seasonData, true);
            homeStadiumMarker.setTooltipContent(homeStatsHTML); // Actualiza el contenido del tooltip
        }

        // 3. Obtener una lista única de estadios de esa temporada (visitantes)
        const stadiumSet = new Set();
        seasonData.forEach(match => {
            const stadiumName = match.location?.locationStadium;
            // HOME_STADIUM_NAME es la constante global
            if (stadiumName && stadiumName !== HOME_STADIUM_NAME) {
                stadiumSet.add(stadiumName);
            }
        });

        // 4. Añadir nuevos marcadores para cada estadio visitante
        stadiumSet.forEach(stadiumName => {
            const coords = stadiumCoords[stadiumName];
            
            if (coords) {
                // ¡NUEVO! Obtener las estadísticas para este estadio
                const statsHTML = getStatsForStadium(stadiumName, seasonData, false);

                const marker = L.marker([coords.lat, coords.lon])
                    .addTo(map)
                    // ¡CAMBIO! Usamos bindTooltip con las estadísticas en lugar de bindPopup
                    .bindTooltip(statsHTML, {
                        sticky: true // El tooltip sigue al ratón
                    });
                
                currentMarkers.push(marker);
            } else {
                console.warn(`Coordenadas no encontradas para: "${stadiumName}". Añadir a /data/stadium_locations.json`);
            }
        });
    }

    /**
     * Arregla el renderizado del mapa cuando la pestaña se hace visible.
     */
    function refreshMap() {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
                console.log("Tamaño del mapa recalculado.");
            }, 10);
        }
    }

    // Exponer las funciones públicas
    return {
        initMap,
        updateMapData,
        refreshMap
    };

})(); // Fin del módulo mapModule