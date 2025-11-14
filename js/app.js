/**
 * ARCHIVO: js/app.js (Versión 2.0)
 * ---------------------------------
 * El "cerebro" de la aplicación. Maneja el estado, la carga de datos
 * y la orquestación de todos los módulos (ui, rivals, map).
 * * Depende de:
 * - ui.js
 * - rivals.js
 * - map.js
 * - Constantes TEAM_NAME y HOME_STADIUM_NAME (definidas en index.html)
 */

// --- Variables Globales del Módulo ---

// Almacén principal de datos.
// Forma: { 2000: [partidos...], 2001: [partidos...], ... }
const allMatchData = {}; 

// Almacén para el mapeo de Estadio -> Equipo
// Forma: { "RheinEnergieStadion": "1. FC Köln", ... }
let stadiumToTeamMap = {};

// Objeto para cachear los elementos del DOM y no buscarlos constantemente
const DOM = {};

// --- Inicio de la Aplicación ---

document.addEventListener('DOMContentLoaded', initApp);

/**
 * 1. Función de Inicialización Principal
 * Se llama cuando el DOM está listo.
 */
async function initApp() {
    console.log("Iniciando Dashboard v2.0...");
    
    // 1. Cachear todos los elementos del DOM para un acceso rápido
    cacheDOMElements();

    try {
        // 2. Cargar todos los datos (partidos JSON y mapas de estadios)
        await loadAllData();
        
        // 3. Rellenar los menús <select> (temporadas y rivales)
        populateAllSelects();
        
        // 4. Inicializar el mapa de Leaflet
        // Pasamos 'handleMarkerClick' como la función a la que llamará el mapa
        mapModule.initMap('map-container', handleMarkerClick); 

        // 5. Configurar todos los event listeners para filtros y pestañas
        setupEventListeners();

        // 6. Cargar la vista por defecto (Pestaña "Resumen de Temporada")
        updateSeasonView();
        
        console.log("Aplicación inicializada correctamente.");

    } catch (error) {
        console.error("Error fatal durante la inicialización:", error);
        DOM.mainContainer.innerHTML = `<h1>Error al cargar los datos.</h1><p>Por favor, asegúrate de que las carpetas 'partidos_koln' y 'data' existan y estés ejecutando un servidor local.</p>`;
    }
}

/**
 * 2. Carga de Datos
 * Carga todos los JSON de partidos y el JSON de mapeo de estadios.
 */
async function loadAllData() {
    console.log("Cargando todos los datos...");
    const seasons = Array.from({length: 25}, (_, i) => 2000 + i); // 2000 a 2024

    // Tarea 1: Cargar todos los JSON de partidos
    const matchDataPromises = seasons.map(season =>
        fetch(`partidos_koln/koln_${season}.json`)
            .then(response => {
                if (!response.ok) return; // Ignora temporadas que no existen
                return response.json();
            })
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
            stadiumToTeamMap = data;
            console.log("Mapa Estadio->Equipo cargado.");
        });

    // Esperar a que ambas tareas (todos los partidos y el mapa de estadios) terminen
    await Promise.all([...matchDataPromises, stadiumMapPromise]);
    
    console.log("Datos cargados en 'allMatchData':", allMatchData);
}

/**
 * 3. Rellenado de Selectores
 * Rellena todos los <select> de la página.
 */
function populateAllSelects() {
    const loadedSeasons = Object.keys(allMatchData).sort((a, b) => b - a); // Más nuevo primero
    const allSelects = [
        DOM.seasonSelect, DOM.rivalFrom, DOM.rivalTo, DOM.mapFrom, DOM.mapTo
    ];

    // Rellenar todos los selectores de temporada
    allSelects.forEach(select => {
        if (!select) return;
        select.innerHTML = ''; // Limpiar
        loadedSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = `${season}/${parseInt(season) + 1}`;
            select.appendChild(option);
        });
    });

    // Configurar valores por defecto para los rangos
    DOM.rivalFrom.value = loadedSeasons[loadedSeasons.length - 1]; // Más antiguo
    DOM.rivalTo.value = loadedSeasons[0]; // Más nuevo
    DOM.mapFrom.value = loadedSeasons[loadedSeasons.length - 1]; // Más antiguo
    DOM.mapTo.value = loadedSeasons[0]; // Más nuevo
    
    // Rellenar el selector de rivales
    populateRivalSelect();
}

function populateRivalSelect() {
    const rivalSet = new Set();
    for (const season in allMatchData) {
        allMatchData[season].forEach(match => {
            const team1 = match.team1.teamName;
            const team2 = match.team2.teamName;
            // TEAM_NAME es global desde index.html
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
 * Asigna todos los listeners para pestañas y filtros.
 */
function setupEventListeners() {
    // Listeners de las Pestañas de Navegación
    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.dataset.view;
            switchView(viewName);
        });
    });

    // Listeners para la Pestaña "Temporada"
    DOM.seasonSelect.addEventListener('change', updateSeasonView);

    // Listeners para la Pestaña "Rivales" (cualquier filtro actualiza la vista)
    DOM.rivalsFilterBar.addEventListener('change', updateRivalsView);

    // Listeners para la Pestaña "Mapa" (cualquier filtro actualiza la vista)
    DOM.mapFrom.addEventListener('change', updateMapView);
    DOM.mapTo.addEventListener('change', updateMapView);
}

/**
 * 5. Orquestadores de Vistas
 * Estas funciones leen los filtros y llaman a los módulos
 * de renderizado (ui, rivals, map) con los datos filtrados.
 */

// Se llama al cambiar el <select> de la pestaña "Temporada"
function updateSeasonView() {
    const selectedSeason = DOM.seasonSelect.value;
    const seasonData = allMatchData[selectedSeason] || [];
    
    console.log(`Actualizando vista de temporada para ${selectedSeason}`);
    
    // Llamar a ui.js para dibujar estadísticas y tabla
    ui.displaySeasonStats(seasonData, DOM.statsContainerSeason);
    ui.displaySeasonMatches(seasonData, DOM.matchesTableSeason);
}

// Se llama al cambiar CUALQUIER filtro de la pestaña "Rivales"
function updateRivalsView() {
    // 1. Obtener todos los valores de los filtros
    const filters = {
        rival: DOM.rivalSelect.value,
        from: parseInt(DOM.rivalFrom.value),
        to: parseInt(DOM.rivalTo.value),
        location: document.querySelector('input[name="rival-location"]:checked').value,
        result: document.querySelector('input[name="rival-result"]:checked').value
    };
    console.log("Actualizando vista de rivales con filtros:", filters);

    // 2. Obtener los datos filtrados usando el motor de filtrado
    const filteredMatches = filterMatches(filters);
    
    // 3. Llamar a rivals.js para dibujar estadísticas y tabla H2H
    rivalsModule.displayRivalData(
        filteredMatches,
        DOM.statsContainerRivals,
        DOM.matchesTableRivals
    );
}

// Se llama al cambiar CUALQUIER filtro de la pestaña "Mapa"
function updateMapView() {
    // 1. Obtener todos los valores de los filtros
    const filters = {
        from: parseInt(DOM.mapFrom.value),
        to: parseInt(DOM.mapTo.value)
        // No se necesita rival, local/visitante, etc. El mapa los muestra TODOS.
    };
    console.log(`Actualizando vista de mapa para ${filters.from}-${filters.to}`);

    // 2. Obtener los datos filtrados
    const filteredMatches = filterMatches(filters);

    // 3. Llamar a map.js para actualizar los marcadores
    mapModule.updateMapData(filteredMatches);
}

/**
 * 6. Lógica de Interacción (Clic en Mapa)
 * Se llama desde map.js cuando el usuario hace clic en un marcador.
 */
function handleMarkerClick(stadiumName) {
    console.log(`Clic en el marcador del estadio: ${stadiumName}`);
    // 1. Encontrar el nombre del equipo para este estadio
    const rivalName = stadiumToTeamMap[stadiumName];

    if (rivalName && rivalName !== TEAM_NAME) {
        // 2. Cambiar a la pestaña "Rivales"
        switchView('rivals');
        
        // 3. Establecer el <select> de rivales al equipo correcto
        DOM.rivalSelect.value = rivalName;
        
        // 4. Copiar el rango de fechas del mapa a los filtros de rivales
        DOM.rivalFrom.value = DOM.mapFrom.value;
        DOM.rivalTo.value = DOM.mapTo.value;
        
        // 5. Borrar otros filtros (local/visitante, V/E/D)
        document.getElementById('rival-loc-all').checked = true;
        document.getElementById('rival-res-all').checked = true;
        
        // 6. Actualizar la vista de rivales
        updateRivalsView();
    } else if (rivalName === TEAM_NAME) {
        // Si hace clic en el estadio local, ir a la pestaña de temporada
        switchView('season');
    }
}

/**
 * 7. Motor de Filtrado
 * Función principal para filtrar 'allMatchData' basado en los controles.
 * @param {object} filters - Objeto con {from, to, rival, location, result}
 * @returns {Array} - Un array plano de partidos que coinciden.
 */
function filterMatches(filters) {
    const { from, to, rival, location, result } = filters;
    const filteredMatches = [];
    
    // 1. Iterar solo sobre las temporadas dentro del rango
    for (let year = from; year <= to; year++) {
        if (!allMatchData[year]) continue; // Omitir si no hay datos para ese año

        // 2. Iterar sobre los partidos de esa temporada
        for (const match of allMatchData[year]) {
            
            // 3. Filtrar por Rival (si se especifica)
            if (rival) {
                const team1 = match.team1.teamName;
                const team2 = match.team2.teamName;
                if (team1 !== rival && team2 !== rival) {
                    continue; // Saltar si el rival no está en este partido
                }
            }

            // 4. Filtrar por Localización (si se especifica)
            const isHome = match.team1.teamName === TEAM_NAME;
            if (location === 'home' && !isHome) continue;
            if (location === 'away' && isHome) continue;

            // 5. Filtrar por Resultado (si se especifica)
            if (result && result !== 'all') {
                const finalResult = ui.getFinalResult(match); // Usamos la función de ui.js
                if (!finalResult) continue; // Omitir partidos sin resultado

                const coloniaScore = isHome ? finalResult.pointsTeam1 : finalResult.pointsTeam2;
                const rivalScore = isHome ? finalResult.pointsTeam2 : finalResult.pointsTeam1;

                if (result === 'W' && coloniaScore <= rivalScore) continue;
                if (result === 'D' && coloniaScore !== rivalScore) continue;
                if (result === 'L' && coloniaScore >= rivalScore) continue;
            }
            
            // Si pasa todos los filtros, añadirlo a la lista
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
    // Ocultar todas las vistas y desactivar todos los botones
    DOM.views.forEach(v => v.classList.remove('active'));
    DOM.navButtons.forEach(b => b.classList.remove('active'));

    // Mostrar la vista y el botón correctos
    document.getElementById(`view-${viewName}`).classList.add('active');
    document.getElementById(`nav-${viewName}`).classList.add('active');
    
    // Si la vista es el mapa, refrescar su tamaño
    if (viewName === 'map') {
        mapModule.refreshMap();
    }
}