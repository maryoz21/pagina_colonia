/**
 * ARCHIVO: js/rivals.js (Versión 2.1 - MEJORADA)
 * ---------------------------------------------
 * MEJORA: La tabla H2H ahora también infiere el nombre del estadio.
 */

const rivalsModule = (() => {

    // --- Funciones Privadas (Ayudantes) ---
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
    }

    /**
     * ¡NUEVO! Ayudante para inferir el estadio (duplicado de ui.js para este módulo)
     */
    function getStadiumName(match, stadiumMap) {
        const originalStadium = match.location?.locationStadium;
        if (originalStadium && originalStadium.trim() !== "" && originalStadium.trim() !== "Desconocido") {
            return originalStadium.trim();
        }
        
        // TEAM_NAME y HOME_STADIUM_NAME son globales de index.html
        const isHome = match.team1.teamName === TEAM_NAME;
        
        if (isHome) {
            return HOME_STADIUM_NAME;
        } else {
            const rivalName = match.team1.teamName;
            const stadium = Object.keys(stadiumMap).find(key => stadiumMap[key] === rivalName);
            return stadium || "Estadio Desconocido";
        }
    }

    // --- Función Pública (Llamada por app.js) ---

    /**
     * Calcula y muestra todos los datos H2H para una lista de partidos pre-filtrada.
     * @param {Array} filteredMatches - La lista de partidos ya filtrada.
     * @param {HTMLElement} statsContainer - El <div> para las cajas de estadísticas.
     * @param {HTMLElement} tableElement - El <table> para la tabla de partidos.
     * @param {object} stadiumMap - El mapa de estadio->equipo.
     */
    function displayRivalData(filteredMatches, statsContainer, tableElement, stadiumMap) {
        
        // 1. Calcular estadísticas H2H
        let partidos = 0, victorias = 0, empates = 0, derrotas = 0, golesFavor = 0, golesContra = 0;

        filteredMatches.forEach(match => {
            const result = ui.getFinalResult(match); // Usa la función pública de ui.js
            if (result) {
                partidos++;
                const isColoniaLocal = match.team1.teamName === TEAM_NAME;
                const coloniaScore = isColoniaLocal ? result.pointsTeam1 : result.pointsTeam2;
                const rivalScore = isColoniaLocal ? result.pointsTeam2 : result.pointsTeam1;

                if (typeof coloniaScore === 'number') golesFavor += coloniaScore;
                if (typeof rivalScore === 'number') golesContra += rivalScore;

                if (coloniaScore > rivalScore) victorias++;
                else if (coloniaScore === rivalScore) empates++;
                else derrotas++;
            }
        });

        // 2. Dibujar las cajas de estadísticas H2H
        statsContainer.innerHTML = `
            <div class="stat-box"><strong>${partidos}</strong><h3>Partidos Jugados</h3></div>
            <div class="stat-box victoria"><strong>${victorias}</strong><h3>Victorias (Köln)</h3></div>
            <div class="stat-box empate"><strong>${empates}</strong><h3>Empates</h3></div>
            <div class="stat-box derrota"><strong>${derrotas}</strong><h3>Derrotas (Köln)</h3></div>
            <div class="stat-box"><strong>${golesFavor}</strong><h3>Goles a favor</h3></div>
            <div class="stat-box"><strong>${golesContra}</strong><h3>Goles en contra</h3></div>
        `;

        // 3. Dibujar la tabla de partidos H2H
        let tableHeader = `
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Temp.</th>
                    <th>Jor.</th>
                    <th>Local</th>
                    <th>Marcador</th>
                    <th>Visitante</th>
                    <th>Estadio</th>
                </tr>
            </thead>`;
        
        let tableRows = '';
        
        if (filteredMatches.length === 0) {
            tableRows = '<tr><td colspan="7">No se encontraron partidos con los filtros seleccionados.</td></tr>';
        } else {
            // Ordenar por fecha, del más reciente al más antiguo
            const sortedMatches = [...filteredMatches].sort((a, b) => new Date(b.matchDateTime) - new Date(a.matchDateTime));

            sortedMatches.forEach(match => {
                const result = ui.getFinalResult(match);
                const score = result ? `${result.pointsTeam1} - ${result.pointsTeam2}` : 'Pendiente';
                
                // *** ¡LÓGICA MEJORADA! ***
                const stadium = getStadiumName(match, stadiumMap);
                const season = match.leagueSeason;
                const matchday = match.group.groupName.replace(' Spieltag', '. Jor');

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
                        <td>${season}/${season+1}</td>
                        <td>${matchday}</td>
                        <td class="team">${match.team1.teamName}</td>
                        <td class="score">${score}</td>
                        <td class="team">${match.team2.teamName}</td>
                        <td class="stadium">${stadium}</td>
                    </tr>
                `;
            });
        }
        
        tableElement.innerHTML = tableHeader + `<tbody>${tableRows}</tbody>`;
    }

    // Exponer la función pública
    return {
        displayRivalData
    };

})(); // Fin del módulo rivalsModule