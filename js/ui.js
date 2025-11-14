/**
 * ARCHIVO: js/ui.js (Versión 2.1 - MEJORADA)
 * -----------------------------------------
 * MEJORA: Las tablas ahora infieren el nombre del estadio si
 * no está presente en los datos del partido, usando el stadiumToTeamMap.
 */

const ui = (() => {

    // --- Funciones Privadas (Ayudantes) ---
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
    }

    /**
     * ¡NUEVO! Ayudante para inferir el estadio.
     * @param {object} match - El objeto del partido.
     * @param {object} stadiumMap - El mapa de estadio->equipo.
     * @returns {string} El nombre del estadio.
     */
    function getStadiumName(match, stadiumMap) {
        // 1. Probar el dato original
        const originalStadium = match.location?.locationStadium;
        if (originalStadium && originalStadium.trim() !== "" && originalStadium.trim() !== "Desconocido") {
            return originalStadium.trim();
        }

        // 2. Si falla, inferir
        // TEAM_NAME y HOME_STADIUM_NAME son globales de index.html
        const isHome = match.team1.teamName === TEAM_NAME;
        
        if (isHome) {
            return HOME_STADIUM_NAME; // Siempre es el estadio local
        } else {
            // Es partido fuera. Buscar el estadio del rival (team1)
            const rivalName = match.team1.teamName;
            
            // Buscar en el mapa qué estadio pertenece a ese rival
            // (Esta es una búsqueda "inversa" clave-valor)
            const stadium = Object.keys(stadiumMap).find(key => stadiumMap[key] === rivalName);
            
            return stadium || "Estadio Desconocido"; // Fallback final
        }
    }


    // --- Funciones Públicas (Exportadas) ---

    /**
     * Obtiene el resultado final (Tipo 2 o 0).
     */
    function getFinalResult(match) {
        if (!match || !match.matchResults || match.matchResults.length === 0) return null;
        
        let finalResult = match.matchResults.find(r => r.resultTypeID === 2); // Moderno
        if (finalResult) return finalResult;

        finalResult = match.matchResults.find(r => r.resultTypeID === 0); // Antiguo
        if (finalResult) return finalResult;

        if (match.matchResults.length === 1 && match.matchResults[0].resultTypeID !== 1) {
            return match.matchResults[0];
        }
        return null;
    }

    /**
     * Dibuja las cajas de estadísticas para la vista "Temporada".
     * (Sin cambios en la lógica interna)
     */
    function displaySeasonStats(seasonData, container) {
        let partidos = 0, victorias = 0, empates = 0, derrotas = 0, golesFavor = 0, golesContra = 0;

        seasonData.forEach(match => {
            const result = getFinalResult(match);
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

        container.innerHTML = `
            <div class="stat-box"><strong>${partidos}</strong><h3>Partidos Jugados</h3></div>
            <div class="stat-box victoria"><strong>${victorias}</strong><h3>Victorias</h3></div>
            <div class="stat-box empate"><strong>${empates}</strong><h3>Empates</h3></div>
            <div class="stat-box derrota"><strong>${derrotas}</strong><h3>Derrotas</h3></div>
            <div class="stat-box"><strong>${golesFavor}</strong><h3>Goles a favor</h3></div>
            <div class="stat-box"><strong>${golesContra}</strong><h3>Goles en contra</h3></div>
        `;
    }

    /**
     * Dibuja la tabla de partidos para la vista "Temporada".
     * @param {Array} seasonData - Array de partidos.
     * @param {HTMLElement} tableBody - El <tbody>.
     * @param {object} stadiumMap - El mapa de estadio->equipo.
     */
    function displaySeasonMatches(seasonData, tableBody, stadiumMap) {
        tableBody.innerHTML = '';
        if (seasonData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No hay partidos registrados.</td></tr>';
            return;
        }
        
        const sortedData = [...seasonData].sort((a, b) => new Date(a.matchDateTime) - new Date(b.matchDateTime));

        sortedData.forEach(match => {
            const tr = document.createElement('tr');
            const result = getFinalResult(match);
            const score = result ? `${result.pointsTeam1} - ${result.pointsTeam2}` : 'Pendiente';
            
            // *** ¡LÓGICA MEJORADA! ***
            const stadium = getStadiumName(match, stadiumMap);
            
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

            tr.className = rowClass;
            tr.innerHTML = `
                <td>${formatDate(match.matchDateTime)}</td>
                <td>${matchday}</td>
                <td class="team">${match.team1.teamName}</td>
                <td class="score">${score}</td>
                <td class="team">${match.team2.teamName}</td>
                <td class="stadium">${stadium}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Exponer las funciones públicas
    return {
        getFinalResult, // ¡Ahora es pública!
        displaySeasonStats,
        displaySeasonMatches
    };

})(); // Fin del módulo ui