/**
 * ARCHIVO: js/map.js (Versión 2.1 - MEJORADA)
 * ------------------------------------------
 * MEJORA: Infiere el estadio del partido si no está presente,
 * permitiendo que se muestren muchos más marcadores.
 */

const mapModule = (() => {

    // --- Variables Privadas del Módulo ---
    let map;
    let stadiumCoords = {};
    let stadiumToTeam = {};
    let currentMarkers = [];
    let homeStadiumMarker;
    let onMarkerClickCallback;
    let iconRed, iconBlue; // Iconos del mapa

    // --- Funciones Privadas (Ayudantes) ---

    async function loadMapData() {
        try {
            // Cargar ambos archivos JSON en paralelo
            const [coordsResponse, teamMapResponse] = await Promise.all([
                fetch('data/stadium_locations.json'), //
                fetch('data/stadium_to_team.json')
            ]);
            if (!coordsResponse.ok) throw new Error('No se pudo cargar stadium_locations.json');
            if (!teamMapResponse.ok) throw new Error('No se pudo cargar stadium_to_team.json');

            stadiumCoords = await coordsResponse.json();
            stadiumToTeam = await teamMapResponse.json();
            
            console.log("Coordenadas de estadios cargadas.");
            console.log("Mapeo Estadio->Equipo cargado.");

        } catch (error) {
            console.error("Error fatal cargando datos del mapa:", error);
            document.getElementById('map-container').innerHTML = `<p style="color: red;">Error: No se pudo cargar el archivo de coordenadas de estadios.</p>`;
        }
    }

    function clearMarkers() {
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];
    }

    /**
     * ¡NUEVO! Ayudante para buscar en el JSON de coordenadas.
     * Maneja nombres alternativos (ej. "Signal Iduna Park" vs "Westfalenstadion").
     */
    function findCoords(stadiumName) {
        if (stadiumCoords[stadiumName]) return stadiumCoords[stadiumName];
        
        // Buscar por si el nombre incluye una clave (ej. "wohninvest Weserstadion" incluye "Weserstadion")
        const partialKey = Object.keys(stadiumCoords).find(key => stadiumName.includes(key));
        if (partialKey) return stadiumCoords[partialKey];
        
        return null;
    }

    /**
     * Calcula las estadísticas del Köln en un estadio específico.
     */
    function getStatsForStadium(stadiumName, rivalName, filteredMatches, isHome = false) {
        let partidos = 0, victorias = 0, empates = 0, derrotas = 0;

        // TEAM_NAME es la constante global de index.html
        const matchesAtStadium = filteredMatches.filter(match => {
            // Inferir el estadio del partido
            const matchStadium = getStadiumName(match); 
            // Comparar con el nombre del estadio del marcador
            return matchStadium === stadiumName;
        });

        matchesAtStadium.forEach(match => {
            const result = ui.getFinalResult(match); // Usar la función global de ui.js
            if (result) {
                partidos++;
                const isColoniaLocal = match.team1.teamName === TEAM_NAME;
                const coloniaScore = isColoniaLocal ? result.pointsTeam1 : result.pointsTeam2;
                const rivalScore = isColoniaLocal ? result.pointsTeam2 : result.pointsTeam1;

                if (typeof coloniaScore !== 'number' || typeof rivalScore !== 'number') return;

                if (coloniaScore > rivalScore) victorias++;
                else if (coloniaScore === rivalScore) empates++;
                else derrotas++;
            }
        });

        const title = isHome ? "Estadísticas en Casa" : "Estadísticas de Visitante";
        const rivalHTML = isHome ? "¡Hogar del 1. FC Köln!" : `Casa de: <strong>${rivalName}</strong>`;

        return `
            <strong style="color: #c60c30; font-size: 1.1em;">${stadiumName}</strong><br>
            <span style="font-size: 0.9em;">${rivalHTML}</span>
            <hr style="margin: 4px 0;">
            <strong>${title} (Rango Sel.)</strong><br>
            Partidos: <strong>${partidos}</strong><br>
            Balance (V-E-D): 
            <strong style="color: green;">${victorias}</strong> - 
            <strong style="color: grey;">${empates}</strong> - 
            <strong style="color: red;">${derrotas}</strong>
            <br><em style="font-size: 0.8em; color: #555;">Clic para ver H2H vs ${rivalName}</em>
        `;
    }

    /**
     * ¡NUEVO! Lógica de inferencia de estadio para el mapa.
     */
    function getStadiumName(match) {
        const originalStadium = match.location?.locationStadium;
        if (originalStadium && originalStadium.trim() !== "" && originalStadium.trim() !== "Desconocido") {
            return originalStadium.trim();
        }
        
        const isHome = match.team1.teamName === TEAM_NAME;
        if (isHome) {
            return HOME_STADIUM_NAME;
        } else {
            const rivalName = match.team1.teamName;
            // Búsqueda inversa: Encontrar el estadio (key) que coincida con el nombre del rival (value)
            const stadium = Object.keys(stadiumToTeam).find(key => stadiumToTeam[key] === rivalName);
            return stadium || null; // Devolver null si no se encuentra
        }
    }


    // --- Funciones Públicas (Las que usa app.js) ---

    async function initMap(containerId, onClickCallback) {
        onMarkerClickCallback = onClickCallback;
        await loadMapData();
        
        map = L.map(containerId).setView([51.1657, 10.4515], 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd', maxZoom: 19
        }).addTo(map);

        // Crear los iconos una vez
        iconRed = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });
        iconBlue = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        // Añadir el marcador del estadio local
        const homeCoords = findCoords(HOME_STADIUM_NAME);
        if (homeCoords) {
            homeStadiumMarker = L.marker([homeCoords.lat, homeCoords.lon], { icon: iconRed })
                .addTo(map)
                .bindTooltip(`<b>${HOME_STADIUM_NAME}</b><br>Cargando...`, { sticky: true });
            
            homeStadiumMarker.on('click', () => {
                if (onMarkerClickCallback) onMarkerClickCallback(TEAM_NAME);
            });
        }
    }

    /**
     * Actualiza los marcadores del mapa basado en una lista de partidos filtrada.
     */
    function updateMapData(filteredMatches) {
        if (!map) return;
        clearMarkers();

        // 1. Actualizar el tooltip del ESTADIO LOCAL
        if (homeStadiumMarker) {
            const homeStatsHTML = getStatsForStadium(HOME_STADIUM_NAME, TEAM_NAME, filteredMatches, true);
            homeStadiumMarker.setTooltipContent(homeStatsHTML);
        }

        // 2. Agrupar partidos por estadio visitante (¡LÓGICA MEJORADA!)
        const stadiumsVisited = {};
        filteredMatches.forEach(match => {
            const isHome = match.team1.teamName === TEAM_NAME;
            if (isHome) return; // Solo nos importan los partidos de visitante

            // Inferir el estadio del rival
            const rivalName = match.team1.teamName;
            const stadiumName = getStadiumName(match);

            if (stadiumName) {
                if (!stadiumsVisited[stadiumName]) {
                    // Si es la primera vez que vemos este estadio, guardar su info
                    stadiumsVisited[stadiumName] = { 
                        rivalName: rivalName,
                        matches: []
                    };
                }
                stadiumsVisited[stadiumName].matches.push(match);
            }
        });

        // 3. Añadir nuevos marcadores para cada estadio visitante
        for (const stadiumName in stadiumsVisited) {
            const { rivalName, matches } = stadiumsVisited[stadiumName];
            const coords = findCoords(stadiumName); // Usar el buscador mejorado
            
            if (coords) {
                const statsHTML = getStatsForStadium(stadiumName, rivalName, matches, false);

                const marker = L.marker([coords.lat, coords.lon], { icon: iconBlue })
                    .addTo(map)
                    .bindTooltip(statsHTML, { sticky: true });
                
                marker.on('click', () => {
                    if (onMarkerClickCallback) onMarkerClickCallback(rivalName);
                });
                
                currentMarkers.push(marker);
            } else {
                console.warn(`Coordenadas no encontradas para: "${stadiumName}" (Rival: ${rivalName}).`);
            }
        }
    }

    function refreshMap() {
        if (map) {
            setTimeout(() => { map.invalidateSize(); }, 10);
        }
    }

    // Exponer las funciones públicas
    return {
        initMap,
        updateMapData,
        refreshMap
    };

})(); // Fin del módulo mapModule