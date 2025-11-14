import requests
import json
import os
import time

# --- Configuración ---
TEAM_ID = 65  # 1. FC Köln
LEAGUE_SHORTCUTS = ["bl1", "bl2"]  # Buscar primero en Bundesliga 1, luego 2
OUTPUT_DIR = "partidos_koln"
# Rango de 2000 a 2024 (para incluir la temporada 2024/25)
SEASONS = range(2000, 2025)

def fetch_matches(season, league):
    """
    Obtiene todos los partidos de la temporada para la liga especificada
    con manejo de errores mejorado.
    """
    url = f"https://api.openligadb.de/getmatchdata/{league}/{season}"
    print(f"  -> Buscando en {league} {season}...")
    
    try:
        # 1. Añadido un timeout de 10 segundos
        response = requests.get(url, timeout=10)
        
        # 2. Comprobar si hay errores HTTP (ej. 404, 500)
        response.raise_for_status()
        
        # 3. ¡IMPORTANTE! Comprobar si la respuesta está vacía ANTES de decodificar
        #    La API devuelve "" para temporadas sin datos (como 2001), 
        #    lo que causaría un error de JSON.
        if not response.text:
            print(f"  -> {league} {season}: No hay datos (respuesta vacía).")
            return []
            
        # 4. Decodificar el JSON
        return response.json()

    except requests.exceptions.HTTPError as errh:
        print(f"  -> Error HTTP en {league} {season}: {errh}")
    except requests.exceptions.ConnectionError as errc:
        print(f"  -> Error de conexión en {league} {season}: {errc}")
    except requests.exceptions.Timeout as errt:
        print(f"  -> Timeout en {league} {season}: {errt}")
    except requests.exceptions.RequestException as err:
        print(f"  -> Error grave en {league} {season}: {err}")
    except json.JSONDecodeError:
        print(f"  -> {league} {season}: Error al decodificar JSON (respuesta no válida de la API).")
        
    return [] # Devuelve lista vacía en caso de cualquier error

def filter_koln_matches(matches):
    """Filtra los partidos donde juega el 1. FC Köln"""
    koln_matches = []
    
    # Comprobación de seguridad por si la API no devuelve una lista
    if not matches or not isinstance(matches, list):
        return []
        
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
    print(f"  -> ¡ÉXITO! Guardados {len(matches)} partidos de la temporada {season} en {filename}")

def main():
    start_time = time.time()
    print("=== Iniciando descarga de partidos del 1. FC Köln (2000-2024) ===")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    total_files = 0
    
    for season in SEASONS:
        print(f"\nProcesando temporada {season}...")
        koln_matches = []
        
        for league in LEAGUE_SHORTCUTS:
            matches = fetch_matches(season, league)
            koln_matches = filter_koln_matches(matches)
            
            if koln_matches:
                print(f"  -> Partidos encontrados en {league}.")
                break  # Si encontramos partidos (ej. en bl1), no buscamos en bl2
        
        if koln_matches:
            save_matches(season, koln_matches)
            total_files += 1
        else:
            print(f"  -> No se encontraron partidos del Köln en la temporada {season} (en {', '.join(LEAGUE_SHORTCUTS)}).")

    end_time = time.time()
    print("\n" + "="*30)
    print(f"=== Descarga completada ===")
    print(f"Archivos JSON creados: {total_files}")
    print(f"Tiempo total: {end_time - start_time:.2f} segundos")
    print(f"Datos guardados en la carpeta: '{OUTPUT_DIR}'")

if __name__ == "__main__":
    main()