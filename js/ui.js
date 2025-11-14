/**
 * ARCHIVO: js/ui.js
 * -----------------
 * Este es el módulo de la Interfaz de Usuario (UI).
 * NO carga datos ni maneja clics (eso lo hace app.js).
 * Su ÚNICO trabajo es recibir datos y "dibujar" el HTML.
 * * Expone un objeto global 'ui' con métodos para ser llamados
 * desde app.js.
 */

// Usamos un Patrón Módulo "IIFE" (Immediately Invoked Function Expression)
// Esto crea un objeto global 'ui' y mantiene el resto de variables privadas.
const ui = (() => {

    // --- Funciones Privadas (Ayudantes) ---

    /**
     * Obtiene el resultado final (Tipo 2) de un partido.
     * @param {object} match - El objeto del partido de la API.
     * @returns {object|null} El objeto del resultado final, o null si no existe.
     */
    function getFinalResult(match) {
        // El tipo '2' es el resultado final (tiempo reglamentario)
        return match.matchResults.find(r => r.resultTypeID === 2) || null;
    }

    /**
     * Formatea una fecha ISO (de la API) a un formato legible.
     * @param {string} dateString - La fecha en formato ISO (p.ej. "2023-08-19T18:30:00")
     * @returns {string} Fecha formateada (p.ej. "19/08/2023")
     */
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // --- Funciones Públicas (Las que usa app.js) ---

    /**
     * Dibuja las cajas de estadísticas de la temporada.
     * @param {Array} seasonData - Array de partidos de la temporada.
     * @param {HTMLElement} container - El elemento <div> donde se insertará el HTML.
     */
    function displayStats(seasonData, container) {
        let partidos = 0;
        let victorias = 0;
        let empates = 0;
        let derrotas = 0;
        let golesFavor = 0;
        let golesContra = 0;

        seasonData.forEach(match => {
            const result = getFinalResult(match);

            // Solo contamos partidos con resultado final (ya jugados)
            if (result) {
                partidos++;
                const team1Score = result.pointsTeam1;
                const team2Score = result.pointsTeam2;
                // TEAM_NAME es la constante global definida en app.js
                const isColoniaLocal = match.team1.teamName === TEAM_NAME;

                const coloniaScore = isColoniaLocal ? team1Score : team2Score;
                const rivalScore = isColoniaLocal ? team2Score : team1Score;

                golesFavor += coloniaScore;
                golesContra += rivalScore;

                if (coloniaScore > rivalScore) victorias++;
                else if (coloniaScore === rivalScore) empates++;
                else derrotas++;
            }
        });

        // Generar el HTML
        container.innerHTML = `
            <div class="stat-box"><strong>${partidos}</strong><h3>Partidos Jugados</h3></div>
            <div class="stat-box" style="color: green;"><strong>${victorias}</strong><h3>Victorias</h3></div>
            <div class="stat-box" style="color: grey;"><strong>${empates}</strong><h3>Empates</h3></div>
            <div class="stat-box" style="color: red;"><strong>${derrotas}</strong><h3>Derrotas</h3></div>
            <div class="stat-box"><strong>${golesFavor}</strong><h3>Goles a favor</h3></div>
            <div class="stat-box"><strong>${golesContra}</strong><h3>Goles en contra</h3></div>
        `;
    }

    /**
     * Dibuja la tabla de partidos de la temporada.
     * @param {Array} seasonData - Array de partidos de la temporada.
     * @param {HTMLElement} tableBody - El elemento <tbody> donde se insertarán las filas.
     */
    function displayMatchesTable(seasonData, tableBody) {
        // Limpiar la tabla anterior
        tableBody.innerHTML = '';

        if (seasonData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No hay partidos registrados para esta temporada.</td></tr>';
            return;
        }
        
        // Ordenar partidos por fecha (ascendente)
        const sortedData = [...seasonData].sort((a, b) => new Date(a.matchDateTime) - new Date(b.matchDateTime));

        sortedData.forEach(match => {
            const tr = document.createElement('tr');
            const result = getFinalResult(match);

            const score = result ? `${result.pointsTeam1} - ${result.pointsTeam2}` : 'Pendiente';
            const stadium = match.location?.locationStadium || 'Desconocido';

            // Determinar clase de fila (victoria, empate, derrota)
            let rowClass = '';
            if (result) {
                const isColoniaLocal = match.team1.teamName === TEAM_NAME;
                const coloniaScore = isColoniaLocal ? result.pointsTeam1 : result.pointsTeam2;
                const rivalScore = isColoniaLocal ? result.pointsTeam2 : result.pointsTeam1;

                if (coloniaScore > rivalScore) rowClass = 'victoria';
                else if (coloniaScore === rivalScore) rowClass = 'empate';
                else rowClass = 'derrota';
            }

            tr.className = rowClass;
            tr.innerHTML = `
                <td>${formatDate(match.matchDateTime)}</td>
                <td class="team">${match.team1.teamName}</td>
                <td class="score">${score}</td>
                <td class="team">${match.team2.teamName}</td>
                <td class="stadium">${stadium}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Exponer las funciones públicas para que app.js pueda usarlas
    return {
        displayStats,
        displayMatchesTable
    };

})(); // Fin del módulo ui