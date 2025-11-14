/**
 * ARCHIVO: js/app.js (Versión 2.1 - CORREGIDA)
 * -------------------------------------------
 * CORRECCIÓN: Arreglado el bug que hacía que la tabla de Rivales (H2H) no se actualizara.
 * MEJORA: Pasa el mapa de estadios (stadiumToTeamMap) a los módulos ui y rivals.
 */

// Almacén principal de datos.
const allMatchData = {}; 

// Almacén para el mapeo de Estadio -> Equipo
let stadiumToTeamMap = {};

// Objeto para cachear los elementos del DOM
const DOM = {};

// --- Inicio de la Aplicación ---

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    console.log("Iniciando Dashboard v2.1...");
    cacheDOMElements();

    try {
        await loadAllData();
        populateAllSelects();
        
        // Pasamos la función 'handleMarkerClick' como callback al mapa
        mapModule.initMap('map-container', handleMarkerClick); 

        setupEventListeners();

        // Cargar la vista por defecto (la última temporada)
        updateSeasonView();
        
        console.log("Aplicación inicializada correctamente.");

    } catch (error) {
        console.error("Error fatal durante la inicialización:", error);
        DOM.mainContainer.innerHTML = `<h1>Error al cargar los datos.</h1><p>Por favor, asegúrate de que las carpetas 'partidos_koln' y 'data' existan y estés ejecutando un servidor local.</p>`;
    }
}

/**
 * 2. Carga de Datos
 */
async function loadAllData() {
    console.log("Cargando todos los datos...");
    const seasons = Array.from({length: 25}, (_, i) => 2000 + i); // 2000 a 2024

    // Tarea 1: Cargar todos los JSON de partidos
    const matchDataPromises = seasons.map(season =>
        fetch(`partidos_koln/koln_${season}.json`)
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (data && data.length > 0) {
                    allMatchData[season] = data;
                }
            })
            .catch(err => console.warn(`No se pudo cargar koln_${season}.json:`, err))
    );

    // Tarea 2: Cargar el JSON de mapeo Estadio -> Equipo
    const stadiumMapPromise = fetch('data/stadium_to_team.json')
        .then(response => {
            if (!response.ok) throw new Error('No se pudo cargar stadium_to_team.json');
            return response.json();
        })
        .then(data => {
            stadiumToTeamMap = data; // Guardar en la variable global
            console.log("Mapa Estadio->Equipo cargado.");
        });

    await Promise.all([...matchDataPromises, stadiumMapPromise]);
    console.log("Datos cargados en 'allMatchData':", allMatchData);
}

/**
 * 3. Rellenado de Selectores
 */
function populateAllSelects() {
    const loadedSeasons = Object.keys(allMatchData).sort((a, b) => b - a);
    const allSelects = [
        DOM.seasonSelect, DOM.rivalFrom, DOM.rivalTo, DOM.mapFrom, DOM.mapTo
    ];

    allSelects.forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        loadedSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = `${season}/${parseInt(season) + 1}`;
            select.appendChild(option);
        });
    });

    // Configurar valores por defecto para los rangos
    const oldestSeason = loadedSeasons[loadedSeasons.length - 1] || "2000";
    const newestSeason = loadedSeasons[0] || "2024";

    DOM.rivalFrom.value = oldestSeason;
    DOM.rivalTo.value = newestSeason;
    DOM.mapFrom.value = oldestSeason;
    DOM.mapTo.value = newestSeason;
    
    populateRivalSelect();
}

function populateRivalSelect() {
    const rivalSet = new Set();
    for (const season in allMatchData) {
        allMatchData[season].forEach(match => {
            const team1 = match.team1.teamName;
            const team2 = match.team2.teamName;
            rivalSet.add(team1 === TEAM_NAME ? team2 : team1);
        });
    }
    
    const sortedRivals = [...rivalSet].sort();
    DOM.rivalSelect.innerHTML = '';
    sortedRivals.forEach(rival => {
        const option = document.createElement('option');
        option.value = rival;
        option.textContent = rival;
        DOM.rivalSelect.appendChild(option);
    });
}

/**
 * 4. Configuración de Eventos
 */
function setupEventListeners() {
    // Listeners de las Pestañas de Navegación
    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.dataset.view;
            switchView(viewName);
        });
    });

    // Pestaña "Temporada"
    DOM.seasonSelect.addEventListener('change', updateSeasonView);

    // Pestaña "Rivales"
    // ¡¡AQUÍ ESTABA EL BUG!!
    // Ahora, CUALQUIER cambio en la barra de filtros llama a updateRivalsView
    DOM.rivalsFilterBar.addEventListener('change', updateRivalsView);

    // Pestaña "Mapa"
    DOM.mapFrom.addEventListener('change', updateMapView);
    DOM.mapTo.addEventListener('change', updateMapView);
}

/**
 * 5. Orquestadores de Vistas
 */

function updateSeasonView() {
    const selectedSeason = DOM.seasonSelect.value;
    const seasonData = allMatchData[selectedSeason] || [];
    console.log(`Actualizando vista de temporada para ${selectedSeason}`);
    
    // MEJORA: Pasar el stadiumToTeamMap a la UI
    ui.displaySeasonStats(seasonData, DOM.statsContainerSeason);
    ui.displaySeasonMatches(seasonData, DOM.matchesTableSeason, stadiumToTeamMap);
}

function updateRivalsView() {
    const filters = {
        rival: DOM.rivalSelect.value,
        from: parseInt(DOM.rivalFrom.value),
        to: parseInt(DOM.rivalTo.value),
        location: document.querySelector('input[name="rival-location"]:checked').value,
        result: document.querySelector('input[name="rival-result"]:checked').value
    };
    console.log("Actualizando vista de rivales con filtros:", filters);

    const filteredMatches = filterMatches(filters);
    
    // MEJORA: Pasar el stadiumToTeamMap a la UI de rivales
    rivalsModule.displayRivalData(
        filteredMatches,
        DOM.statsContainerRivals,
        DOM.matchesTableRivals,
        stadiumToTeamMap // <--- ¡NUEVO!
    );
}

function updateMapView() {
    const filters = {
        from: parseInt(DOM.mapFrom.value),
        to: parseInt(DOM.mapTo.value)
    };
    console.log(`Actualizando vista de mapa para ${filters.from}-${filters.to}`);

    const filteredMatches = filterMatches(filters);

    // map.js ya carga su propio stadiumToTeamMap, solo necesita los partidos
    mapModule.updateMapData(filteredMatches);
}

/**
 * 6. Lógica de Interacción (Clic en Mapa)
 */
function handleMarkerClick(rivalName) {
    console.log(`Clic en el marcador, rival: ${rivalName}`);
    
    if (rivalName && rivalName === TEAM_NAME) {
        // Si hace clic en el estadio local, ir a la pestaña de temporada
        switchView('season');
        // Opcional: centrarse en la temporada actual
        DOM.seasonSelect.value = DOM.mapTo.value; // Sincroniza el selector
        updateSeasonView();
        return;
    }

    if (rivalName) {
        // 1. Cambiar a la pestaña "Rivales"
        switchView('rivals');
        
        // 2. Establecer el <select> de rivales al equipo correcto
        DOM.rivalSelect.value = rivalName;
        
        // 3. Copiar el rango de fechas del mapa a los filtros de rivales
        DOM.rivalFrom.value = DOM.mapFrom.value;
        DOM.rivalTo.value = DOM.mapTo.value;
        
        // 4. Borrar otros filtros
        document.getElementById('rival-loc-all').checked = true;
        document.getElementById('rival-res-all').checked = true;
        
        // 5. Actualizar la vista de rivales
        updateRivalsView();
    }
}

/**
 * 7. Motor de Filtrado (Sin cambios)
 */
function filterMatches(filters) {
    const { from, to, rival, location, result } = filters;
    const filteredMatches = [];
    
    for (let year = from; year <= to; year++) {
        if (!allMatchData[year]) continue;

        for (const match of allMatchData[year]) {
            
            if (rival) {
                const team1 = match.team1.teamName;
                const team2 = match.team2.teamName;
                if (team1 !== rival && team2 !== rival) {
                    continue;
                }
            }

            const isHome = match.team1.teamName === TEAM_NAME;
            if (location === 'home' && !isHome) continue;
            if (location === 'away' && isHome) continue;

            if (result && result !== 'all') {
                const finalResult = ui.getFinalResult(match);
                if (!finalResult) continue; 

                const coloniaScore = isHome ? finalResult.pointsTeam1 : finalResult.pointsTeam2;
                const rivalScore = isHome ? finalResult.pointsTeam2 : finalResult.pointsTeam1;

                if (typeof coloniaScore !== 'number' || typeof rivalScore !== 'number') continue;

                if (result === 'W' && coloniaScore <= rivalScore) continue;
                if (result === 'D' && coloniaScore !== rivalScore) continue;
                if (result === 'L' && coloniaScore >= rivalScore) continue;
            }
            
            filteredMatches.push(match);
        }
    }
    return filteredMatches;
}

/**
 * 8. Funciones de Utilidad del DOM
 */
function cacheDOMElements() {
    DOM.mainContainer = document.querySelector('main.container');
    DOM.navButtons = document.querySelectorAll('.nav-button');
    DOM.views = document.querySelectorAll('.view');
    
    // Pestaña Temporada
    DOM.seasonSelect = document.getElementById('season-select-single');
    DOM.statsContainerSeason = document.getElementById('stats-container-season');
    DOM.matchesTableSeason = document.getElementById('matches-table-season');

    // Pestaña Rivales
    DOM.rivalsFilterBar = document.getElementById('rivals-filter-bar');
    DOM.rivalSelect = document.getElementById('rival-select');
    DOM.rivalFrom = document.getElementById('rival-season-from');
    DOM.rivalTo = document.getElementById('rival-season-to');
    DOM.statsContainerRivals = document.getElementById('stats-container-rivals');
    DOM.matchesTableRivals = document.getElementById('rival-matches-table');
    
    // Pestaña Mapa
    DOM.mapFrom = document.getElementById('map-season-from');
    DOM.mapTo = document.getElementById('map-season-to');
    DOM.mapContainer = document.getElementById('map-container');
}

function switchView(viewName) {
    DOM.views.forEach(v => v.classList.remove('active'));
    DOM.navButtons.forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    document.getElementById(`nav-${viewName}`).classList.add('active');
    
    if (viewName === 'map') {
        mapModule.refreshMap();
    }
}