from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine
from scipy.stats import poisson
import numpy as np
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

# 1. Configuración de la API
app = FastAPI(
    title="Football Probability Engine API",
    description="Motor estadístico en tiempo real con PostgreSQL y Poisson.",
    version="1.1.0"
)

# Agregar middleware para permitir CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Conexión a PostgreSQL
DB_URL = "postgresql://postgres:Maneiro44.@localhost:5432/football_predict_db"
engine = create_engine(DB_URL)

# Promedios globales fijos de la liga
AVG_HOME_LEAGUE = 1.53
AVG_AWAY_LEAGUE = 1.15

# 3. Modelos de Datos (Pydantic)


class PartidoRequest(BaseModel):
    equipo_local: str
    equipo_visitante: str


class PrediccionResponse(BaseModel):
    local: str
    visitante: str
    goles_esperados_local: float
    goles_esperados_visitante: float
    prob_victoria_local: str
    prob_empate: str
    prob_victoria_visitante: str
    top_marcadores: list  # <--- Agregamos este campo para que FastAPI permita enviar la lista

    prob_over_25: str
    prob_under_25: str
    prob_btts_si: str
    prob_btts_no: str
    distribucion_local: list
    distribucion_visitante: list
# --- RUTAS DE REFINAMIENTO ---

# 4. Listar todos los equipos (Para menús desplegables)


@app.get("/equipos")
def listar_equipos():
    try:
        query = "SELECT equipo FROM team_strengths ORDER BY equipo ASC"
        df_equipos = pd.read_sql_query(query, engine)
        return {"equipos": df_equipos['equipo'].tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Obtener historial reciente (Para dar contexto visual)


@app.get("/historial/{nombre_equipo}")
def obtener_historial(nombre_equipo: str):
    try:
        # Nota: Usamos comillas dobles para nombres de columnas con mayúsculas en PostgreSQL
        query = f"""
            SELECT "Equipo_Local", "Equipo_Visitante", "Goles_Local", "Goles_Visitante", "Resultado_Real"
            FROM raw_matches
            WHERE "Equipo_Local" = '{nombre_equipo}' OR "Equipo_Visitante" = '{nombre_equipo}'
            LIMIT 5
        """
        df_historial = pd.read_sql_query(query, engine)

        if df_historial.empty:
            raise HTTPException(
                status_code=404, detail="No se encontró historial para este equipo.")

        return {
            "equipo": nombre_equipo,
            "ultimos_partidos": df_historial.to_dict('records')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINT PRINCIPAL ---

# 6. Predicción de resultados


@app.post("/predecir", response_model=PrediccionResponse)
def predecir_resultado(partido: PartidoRequest):
    try:
        query = f"SELECT * FROM team_strengths WHERE equipo IN ('{partido.equipo_local}', '{partido.equipo_visitante}')"
        df_fuerzas = pd.read_sql_query(query, engine)

        if len(df_fuerzas) < 2:
            raise HTTPException(
                status_code=404, detail="Uno o ambos equipos no se encontraron en la base de datos.")

        # Asignamos variables de fuerza
        f_atq_local = df_fuerzas[df_fuerzas['equipo'] ==
                                 partido.equipo_local]['home_attack_strength'].values[0]
        f_def_local = df_fuerzas[df_fuerzas['equipo'] ==
                                 partido.equipo_local]['home_defense_strength'].values[0]
        f_atq_vis = df_fuerzas[df_fuerzas['equipo'] ==
                               partido.equipo_visitante]['away_attack_strength'].values[0]
        f_def_vis = df_fuerzas[df_fuerzas['equipo'] ==
                               partido.equipo_visitante]['away_defense_strength'].values[0]

        # Cálculo de Lambdas (Goles esperados)
        lam_local = f_atq_local * f_def_vis * AVG_HOME_LEAGUE
        lam_vis = f_atq_vis * f_def_local * AVG_AWAY_LEAGUE

        # Matriz de Poisson para probabilidades
        max_goles = 5
        prob_local_arr = [poisson.pmf(i, lam_local)
                          for i in range(max_goles + 1)]
        prob_vis_arr = [poisson.pmf(j, lam_vis) for j in range(max_goles + 1)]
        matriz_prob = np.outer(prob_local_arr, prob_vis_arr)

        p_empate = np.sum(np.diag(matriz_prob))
        p_victoria_local = np.sum(np.tril(matriz_prob, -1))
        p_victoria_vis = np.sum(np.triu(matriz_prob, 1))

        p_empate = np.sum(np.diag(matriz_prob))
        p_victoria_local = np.sum(np.tril(matriz_prob, -1))
        p_victoria_vis = np.sum(np.triu(matriz_prob, 1))

        # --- NUEVO: Cálculo de Mercados Derivados ---
        p_under_25 = 0
        p_over_25 = 0
        p_btts_si = 0

        for i in range(max_goles + 1):
            for j in range(max_goles + 1):
                prob = matriz_prob[i, j]

                # Mercado Over/Under 2.5 Goles
                if i + j > 2.5:
                    p_over_25 += prob
                else:
                    p_under_25 += prob

                # Mercado Ambos Equipos Anotan (BTTS)
                if i > 0 and j > 0:
                    p_btts_si += prob

        p_btts_no = 1 - p_btts_si

        # --- NUEVO: Cálculo de marcadores exactos ---
        resultados_exactos = []
        for i in range(max_goles + 1):
            for j in range(max_goles + 1):
                prob = matriz_prob[i, j]
                resultados_exactos.append({
                    "marcador": f"{i}-{j}",
                    "probabilidad": f"{prob * 100:.2f}%",
                    "valor_num": float(prob)
                })

        # Ordenamos la lista de mayor a menor probabilidad y nos quedamos con los 5 primeros
        top_resultados = sorted(
            resultados_exactos, key=lambda x: x['valor_num'], reverse=True)[:5]

        # Devolvemos la respuesta incluyendo la nueva clave
        return {
            "local": partido.equipo_local,
            "visitante": partido.equipo_visitante,
            "goles_esperados_local": round(lam_local, 2),
            "goles_esperados_visitante": round(lam_vis, 2),
            "prob_victoria_local": f"{p_victoria_local * 100:.2f}%",
            "prob_empate": f"{p_empate * 100:.2f}%",
            "prob_victoria_visitante": f"{p_victoria_vis * 100:.2f}%",
            "top_marcadores": top_resultados,
            "prob_over_25": f"{p_over_25 * 100:.2f}%",
            "prob_under_25": f"{p_under_25 * 100:.2f}%",
            "prob_btts_si": f"{p_btts_si * 100:.2f}%",
            "prob_btts_no": f"{p_btts_no * 100:.2f}%",
            "distribucion_local": [round(p * 100, 2) for p in prob_local_arr],
            "distribucion_visitante": [round(p * 100, 2) for p in prob_vis_arr]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
