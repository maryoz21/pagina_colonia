import os
import json
from datetime import datetime

# --- Configuración ---
# Debe coincidir con la carpeta del script anterior
OUTPUT_DIR = "partidos_koln"
TEAM_NAME = "1. FC Köln"
# ---------------------

def format_date(date_str):
    """Convierte la fecha de la API (ISO 8601) a un formato legible (AAAA-MM-DD)"""
    try:
        # Parsea la fecha ISO, p.ej. "2023-08-19T18:30:00" o "2023-08-19T18:30:00Z"
        date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return date_obj.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return date_str # Devuelve la original si hay un error

def get_final_result(match):
    """Obtiene el marcador final (Tipo 2 en OpenLigaDB)"""
    for result in match.get("matchResults", []):
        # El tipo '2' es el resultado final (tiempo reglamentario)
        if result.get("resultTypeID") == 2:
            return f"{result.get('pointsTeam1')} - {result.get('pointsTeam2')}"
    return "N/A" # Si el partido no se ha jugado

def print_match_summary(match):
    """Imprime los detalles de un solo partido"""
    
    # 1. Equipos y Rival
    team1_name = match.get("team1", {}).get("teamName")
    team2_name = match.get("team2", {}).get("teamName")

    if team1_name == TEAM_NAME:
        estatus = "Local"
        rival = team2_name
    else:
        estatus = "Visitante"
        rival = team1_name

    # 2. Fecha y Resultado
    fecha = format_date(match.get("matchDateTime"))
    resultado = get_final_result(match)
    
    print(f"  {fecha} | {team1_name} vs {team2_name} | ({estatus} vs {rival})")
    print(f"    Resultado Final: {resultado}")

    # 3. Goleadores
    goles = match.get("goals", [])
    if not goles:
        print("    Goles: (No hay datos de goles)")
        return

    print("    Goles:")
    for goal in goles:
        goleador = goal.get("goalGetterName", "Desconocido")
        # Marcador en el momento del gol
        marcador = f"{goal.get('scoreTeam1')}-{goal.get('scoreTeam2')}"
        print(f"    - {goleador} (marcador: {marcador})")


def main():
    if not os.path.exists(OUTPUT_DIR):
        print(f"Error: El directorio '{OUTPUT_DIR}' no existe.")
        print("Asegúrate de haber ejecutado el primer script (el de descarga) primero.")
        return

    # 1. Encontrar todos los archivos JSON de partidos
    match_files = []
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith("koln_") and f.endswith(".json"):
            match_files.append(f)
            
    # 2. Ordenarlos por temporada (alfabéticamente funciona bien aquí)
    match_files.sort()

    print("=== RESUMEN DE PARTIDOS DEL 1. FC KÖLN ===")

    # 3. Procesar cada archivo (temporada)
    for filename in match_files:
        season = filename.replace("koln_", "").replace(".json", "")
        print("\n" + "="*40)
        print(f"     TEMPORADA {season}/{int(season) + 1}")
        print("="*40)

        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, "r", encoding="utf-8") as f:
            matches = json.load(f)
            
            # Ordenar los partidos de esa temporada por fecha
            matches.sort(key=lambda x: x.get("matchDateTime", ""))
            
            for match in matches:
                print_match_summary(match)
                print("-" * 20) # Separador entre partidos

if __name__ == "__main__":
    main()