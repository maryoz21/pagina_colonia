/**
 * ARCHIVO: js/rivals.js
 * ---------------------
 * Este es el módulo de la pestaña "Contra Rivales".
 * Se encarga de:
 * 1. Filtrar todos los partidos jugados contra un rival específico.
 * 2. Calcular y mostrar las estadísticas H2H (Head-to-Head).
 * 3. Mostrar una tabla con el historial de partidos contra ese rival.
 */

// Usamos el mismo patrón módulo (IIFE) para crear un objeto global 'rivalsModule'
const rivalsModule = (() => {

    // --- Funciones Privadas (Ayudantes) ---

    /**
     * Obtiene el resultado final (Tipo 2) de un partido.
     * @param {object} match - El objeto del partido de la API.
     * @returns {object|null} El objeto del resultado final, o null si no existe.
     */
    function getFinalResult(match) {
        return match.matchResults.find(r => r.resultTypeID === 2) || null;
    }

    /**
     * Formatea una fecha ISO (de la API) a un formato legible.
     * @param {string} dateString - La fecha en formato ISO.
     * @returns {string} Fecha formateada (p.ej. "19/08/2023")
     */
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * Filtra todos los partidos contra un rival específico de entre todos los datos.
     * @param {string} rivalName - El nombre del rival.
     * @param {object} allData - El objeto 'allMatchData' con todas las temporadas.
     * @returns {Array} Una lista de todos los partidos jugados contra ese rival.
     */
    function filterMatchesByRival(rivalName, allData) {
        const rivalMatches = [];
        // TEAM_NAME es la constante global definida en app.js
        
        for (const season in allData) {
            for (const match of allData[season]) {
                const team1 = match.team1.teamName;
                const team2 = match.team2.teamName;

                if ((team1 === TEAM_NAME && team2 === rivalName) || (team1 === rivalName && team2 === TEAM_NAME)) {
                    rivalMatches.push(match);
                }
            }
        }
        // Ordenar por fecha, del más reciente al más antiguo
        rivalMatches.sort((a, b) => new Date(b.matchDateTime) - new Date(a.matchDateTime));
        return rivalMatches;
    }

    // --- Función Pública (La que usa app.js) ---

    /**
     * Calcula y muestra todos los datos H2H contra un rival.
     * @param {string} rivalName - El nombre del rival seleccionado.
     * @param {object} allData - El objeto 'allMatchData' global.
     * @param {HTMLElement} statsContainer - El <div> para las cajas de estadísticas.
     * @param {HTMLElement} tableBody - El <tbody> para la tabla de partidos.
     */
    function displayRivalData(rivalName, allData, statsContainer, tableBody) {
        
        // 1. Obtener todos los partidos contra este rival
        const rivalMatches = filterMatchesByRival(rivalName, allData);

        // 2. Calcular estadísticas H2H
        let partidos = 0;
        let victorias = 0;
        let empates = 0;
        let derrotas = 0;
        let golesFavor = 0;
        let golesContra = 0;

        rivalMatches.forEach(match => {
            const result = getFinalResult(match);
            if (result) {
                partidos++;
                const isColoniaLocal = match.team1.teamName === TEAM_NAME;
                const coloniaScore = isColoniaLocal ? result.pointsTeam1 : result.pointsTeam2;
                const rivalScore = isColoniaLocal ? result.pointsTeam2 : result.pointsTeam1;

                golesFavor += coloniaScore;
                golesContra += rivalScore;

                if (coloniaScore > rivalScore) victorias++;
                else if (coloniaScore === rivalScore) empates++;
                else derrotas++;
            }
        });

        // 3. Dibujar las cajas de estadísticas H2H
        statsContainer.innerHTML = `
            <div class="stat-box"><strong>${partidos}</strong><h3>Partidos Jugados</h3></div>
            <div class="stat-box" style="color: green;"><strong>${victorias}</strong><h3>Victorias (Köln)</h3></div>
            <div class="stat-box" style="color: grey;"><strong>${empates}</strong><h3>Empates</h3></div>
            <div class="stat-box" style="color: red;"><strong>${derrotas}</strong><h3>Derrotas (Köln)</h3></div>
            <div class="stat-box"><strong>${golesFavor}</strong><h3>Goles a favor</h3></div>
            <div class="stat-box"><strong>${golesContra}</strong><h3>Goles en contra</h3></div>
        `;

        // 4. Dibujar la tabla de partidos H2H
        tableBody.innerHTML = ''; // Limpiar
        
        // Si no hay tabla en el HTML de rivales, creamos una dinámicamente
        // (En nuestro index.html ya la definimos, pero esto es más robusto)
        let tableHeader = `
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Local</th>
                    <th>Marcador</th>
                    <th>Visitante</th>
                    <th>Estadio</th>
                </tr>
            </thead>`;
        
        let tableRows = '';
        
        if (rivalMatches.length === 0) {
            tableRows = '<tr><td colspan="5">No se encontraron partidos contra este rival.</td></tr>';
        } else {
            rivalMatches.forEach(match => {
                const result = getFinalResult(match);
                const score = result ? `${result.pointsTeam1} - ${result.pointsTeam2}` : 'Pendiente';
                const stadium = match.location?.locationStadium || 'Desconocido';

                // Determinar clase de fila
                let rowClass = '';
                if (result) {
                    const isColoniaLocal = match.team1.teamName === TEAM_NAME;
                    const coloniaScore = isColoniaLocal ? result.pointsTeam1 : result.pointsTeam2;
                    const rivalScore = isColoniaLocal ? result.pointsTeam2 : result.pointsTeam1;

                    if (coloniaScore > rivalScore) rowClass = 'victoria';
                    else if (coloniaScore === rivalScore) rowClass = 'empate';
                    else rowClass = 'derrota';
                }

                tableRows += `
                    <tr class="${rowClass}">
                        <td>${formatDate(match.matchDateTime)}</td>
                        <td class="team">${match.team1.teamName}</td>
                        <td class="score">${score}</td>
                        <td class="team">${match.team2.teamName}</td>
                        <td class="stadium">${stadium}</td>
                    </tr>
                `;
            });
        }
        
        // Asumimos que el elemento que nos pasan es la tabla completa 
        // (según nuestro HTML, es 'rival-matches-table')
        const tableElement = document.getElementById('rival-matches-table');
        tableElement.innerHTML = tableHeader + `<tbody>${tableRows}</tbody>`;
    }

    // Exponer la función pública
    return {
        displayRivalData
    };

})(); // Fin del módulo rivalsModule