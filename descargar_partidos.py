import requests
import json
import os

# Configuración del equipo
TEAM_ID = 65  # 1. FC Köln
LEAGUE_SHORTCUTS = ["bl1", "bl2"]  # Buscar primero en Bundesliga 1, luego 2 si no hay datos

# Carpeta donde se guardarán los archivos
OUTPUT_DIR = "partidos_koln"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Temporadas que quieres guardar
SEASONS = range(2000, 2025)  # Ejemplo: de la 2000 a la 2024/25

def fetch_matches(season, league):
    """Obtiene todos los partidos de la temporada para la liga especificada"""
    url = f"https://api.openligadb.de/getmatchdata/{league}/{season}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error al obtener datos de la temporada {season} en {league}")
        return []

def filter_koln_matches(matches):
    """Filtra los partidos donde juega el 1. FC Köln"""
    koln_matches = []
    for match in matches:
        team1_id = match.get("team1", {}).get("teamId")
        team2_id = match.get("team2", {}).get("teamId")
        if team1_id == TEAM_ID or team2_id == TEAM_ID:
            koln_matches.append(match)
    return koln_matches

def save_matches(season, matches):
    """Guarda los partidos en un archivo JSON"""
    filename = os.path.join(OUTPUT_DIR, f"koln_{season}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(matches, f, ensure_ascii=False, indent=2)
    print(f"Guardados {len(matches)} partidos de la temporada {season} en {filename}")

def main():
    for season in SEASONS:
        print(f"Procesando temporada {season}...")
        koln_matches = []
        for league in LEAGUE_SHORTCUTS:
            matches = fetch_matches(season, league)
            koln_matches = filter_koln_matches(matches)
            if koln_matches:
                break  # Si encontramos partidos, no seguimos buscando
        if koln_matches:
            save_matches(season, koln_matches)
        else:
            print(f"No se encontraron partidos del Köln en la temporada {season}")

if __name__ == "__main__":
    main()
