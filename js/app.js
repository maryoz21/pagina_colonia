/**
 * ARCHIVO: js/app.js
 * ------------------
 * Este es el archivo principal (el "cerebro").
 * Se encarga de:
 * 1. Iniciar la aplicación cuando la página carga.
 * 2. Cargar TODOS los datos de los JSON en memoria.
 * 3. Configurar los event listeners (clics en pestañas, cambios en <select>).
 * 4. Llamar a las funciones de los otros archivos (ui.js, map.js, rivals.js).
 */

// Constante global para nuestro equipo
const TEAM_NAME = "1. FC Köln";

// Objeto global para guardar todos los datos cargados
// Tendrá la forma: { 2000: [...partidos], 2001: [...partidos], ... }
const allMatchData = {};

// --- INICIO DE LA APLICACIÓN ---

// Espera a que todo el HTML esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', init);

/**
 * Función de Inicialización Principal
 */
async function init() {
    console.log("Iniciando aplicación...");
    
    // Referencias a los elementos principales del DOM
    const seasonSelect = document.getElementById('season-select');
    const rivalSelect = document.getElementById('rival-select');
    
    // Pestañas de Navegación
    const navSeason = document.getElementById('nav-season');
    const navRivals = document.getElementById('nav-rivals');
    const navMap = document.getElementById('nav-map');

    // Vistas (los contenedores de contenido)
    const viewSeason = document.getElementById('view-season');
    const viewRivals = document.getElementById('view-rivals');
    const viewMap = document.getElementById('view-map');

    try {
        // 1. Cargar todos los datos de los JSON en la variable global
        await loadAllData();
        
        // 2. Poblar los menús <select>
        populateSeasonSelect(seasonSelect);
        populateRivalSelect(rivalSelect);
        
        // 3. Inicializar el mapa (lo creamos una vez)
        // (Llamará a una función que crearemos en map.js)
        mapModule.initMap('map-container');

        // 4. Configurar los Event Listeners
        setupEventListeners(
            seasonSelect, 
            rivalSelect, 
            navSeason, 
            navRivals, 
            navMap,
            viewSeason,
            viewRivals,
            viewMap
        );

        // 5. Cargar la vista por defecto (la última temporada)
        const defaultSeason = seasonSelect.value;
        updateSeasonView(defaultSeason);
        
        console.log("Aplicación inicializada correctamente.");

    } catch (error) {
        console.error("Error fatal durante la inicialización:", error);
        document.querySelector('.container').innerHTML = "<h1>Error al cargar los datos.</h1><p>Por favor, asegúrate de que la carpeta 'partidos_koln' exista y estés ejecutando un servidor local.</p>";
    }
}

/**
 * Carga todos los archivos JSON (de 2000 a 2024) en la variable global 'allMatchData'
 */
async function loadAllData() {
    console.log("Cargando todos los datos...");
    const seasons = [];
    for (let year = 2000; year <= 2024; year++) {
        seasons.push(year);
    }

    // Creamos un array de "promesas" (peticiones de red)
    const fetchPromises = seasons.map(season =>
        fetch(`partidos_koln/koln_${season}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`No se encontró koln_${season}.json`);
                }
                return response.json();
            })
            .then(data => {
                // Guardamos los datos en nuestro objeto global
                if (data.length > 0) {
                    allMatchData[season] = data;
                }
            })
            .catch(error => {
                // Si un archivo de temporada no existe (p.ej. aún no se ha jugado),
                // simplemente lo ignoramos en lugar de detener la app.
                console.warn(error.message);
            })
    );

    // Esperamos a que TODAS las peticiones terminen
    await Promise.all(fetchPromises);
    console.log("Datos cargados en 'allMatchData':", allMatchData);
}

/**
 * Rellena el <select> de temporadas con los datos cargados
 */
function populateSeasonSelect(selectElement) {
    const seasons = Object.keys(allMatchData).sort((a, b) => b - a); // Ordenar descendente (más nuevo primero)
    
    selectElement.innerHTML = ''; // Limpiar opciones
    seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = `${season}/${parseInt(season) + 1}`;
        selectElement.appendChild(option);
    });
}

/**
 * Rellena el <select> de rivales con los datos cargados
 */
function populateRivalSelect(selectElement) {
    const rivalSet = new Set(); // Un Set evita duplicados

    // Iteramos por todos los partidos de todas las temporadas
    for (const season in allMatchData) {
        for (const match of allMatchData[season]) {
            const team1 = match.team1.teamName;
            const team2 = match.team2.teamName;
            
            // Añadimos al Set al equipo que NO sea el Köln
            if (team1 === TEAM_NAME) {
                rivalSet.add(team2);
            } else {
                rivalSet.add(team1);
            }
        }
    }

    const sortedRivals = [...rivalSet].sort(); // Convertir a array y ordenar alfabéticamente
    
    selectElement.innerHTML = '';
    sortedRivals.forEach(rival => {
        const option = document.createElement('option');
        option.value = rival;
        option.textContent = rival;
        selectElement.appendChild(option);
    });
}

/**
 * Configura todos los manejadores de eventos (clics y cambios)
 */
function setupEventListeners(seasonSelect, rivalSelect, navSeason, navRivals, navMap, viewSeason, viewRivals, viewMap) {
    
    // --- Eventos de Pestañas de Navegación ---
    
    navSeason.addEventListener('click', () => {
        switchView('season', [viewSeason, viewRivals, viewMap], [navSeason, navRivals, navMap]);
    });
    
    navRivals.addEventListener('click', () => {
        switchView('rivals', [viewSeason, viewRivals, viewMap], [navSeason, navRivals, navMap]);
        // Cargar datos del rival si es la primera vez
        if (!rivalSelect.dataset.loaded) {
            handleRivalChange(rivalSelect);
            rivalSelect.dataset.loaded = "true";
        }
    });

    navMap.addEventListener('click', () => {
        switchView('map', [viewSeason, viewRivals, viewMap], [navSeason, navRivals, navMap]);
        // El mapa necesita recalcular su tamaño cuando se hace visible
        // (Llamará a una función que crearemos en map.js)
        mapModule.refreshMap();
    });

    // --- Eventos de <select> ---
    
    seasonSelect.addEventListener('change', (event) => {
        updateSeasonView(event.target.value);
    });
    
    rivalSelect.addEventListener('change', (event) => {
        handleRivalChange(event.target);
    });
}

/**
 * Función genérica para cambiar entre las vistas (pestañas)
 */
function switchView(viewToShow, allViews, allNavButtons) {
    // Ocultar todas las vistas
    allViews.forEach(view => view.classList.remove('active'));
    // Quitar 'active' de todos los botones
    allNavButtons.forEach(btn => btn.classList.remove('active'));

    // Mostrar la vista y el botón correctos
    document.getElementById(`view-${viewToShow}`).classList.add('active');
    document.getElementById(`nav-${viewToShow}`).classList.add('active');
}

/**
 * Se llama cuando el <select> de temporada cambia.
 * Actualiza la tabla de partidos, las estadísticas y el mapa.
 */
function updateSeasonView(season) {
    console.log(`Actualizando vista para la temporada ${season}`);
    const data = allMatchData[season] || [];
    
    // 1. Llamar a ui.js para dibujar las estadísticas
    // (Esta función la crearemos en ui.js)
    ui.displayStats(data, document.getElementById('stats-container'));
    
    // 2. Llamar a ui.js para dibujar la tabla de partidos
    // (Esta función la crearemos en ui.js)
    ui.displayMatchesTable(data, document.getElementById('matches-table'));
    
    // 3. Llamar a map.js para actualizar los marcadores del mapa
    // (Esta función la crearemos en map.js)
    mapModule.updateMapData(data);
}

/**
 * Se llama cuando el <select> de rival cambia.
 */
function handleRivalChange(selectElement) {
    const rivalName = selectElement.value;
    console.log(`Actualizando vista para el rival ${rivalName}`);
    
    // 1. Llamar a rivals.js para calcular y mostrar las estadísticas H2H
    // (Esta función la crearemos en rivals.js)
    rivalsModule.displayRivalData(
        rivalName, 
        allMatchData,
        document.getElementById('rival-stats-container'),
        document.getElementById('rival-matches-table') // Pasamos la tabla
    );
}

// --- NOTA IMPORTANTE ---
// Este archivo NO FUNCIONARÁ por sí solo. Depende de que existan
// los objetos `ui`, `mapModule` y `rivalsModule`,
// que definiremos en los siguientes archivos.