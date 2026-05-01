import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from scipy.stats import poisson

# 1. Configuración y Conexión
DB_URL = "postgresql://postgres:Maneiro44.@localhost:5432/football_predict_db"
engine = create_engine(DB_URL)

AVG_HOME_LEAGUE = 1.53
AVG_AWAY_LEAGUE = 1.15
RHO = -0.06


def ajuste_dixon_coles(x, y, lam_l, lam_v, rho):
    if x == 0 and y == 0:
        return 1 - (lam_l * lam_v * rho)
    elif x == 1 and y == 0:
        return 1 + (lam_l * rho)
    elif x == 0 and y == 1:
        return 1 + (lam_v * rho)
    elif x == 1 and y == 1:
        return 1 - rho
    return 1


print("📊 Iniciando Motor de Backtesting Actuarial...")

# 2. Extraer datos históricos
# Asumimos que tienes una tabla o vista con los resultados reales y las fuerzas de los equipos.
# Si tus nombres de tablas son diferentes, el script te avisará.
try:
    query = """
    SELECT 
        "Equipo_Local", "Equipo_Visitante", 
        "Goles_Local", "Goles_Visitante"
    FROM raw_matches 
    WHERE "Goles_Local" IS NOT NULL; -- Solo partidos ya jugados
    """
    df = pd.read_sql(query, engine)
    print(f"✅ Se cargaron {len(df)} partidos para la simulación.")
except Exception as e:
    print("⚠️ Error al leer la base de datos. Verifica el nombre de tu tabla de partidos.")
    print("Detalle:", e)
    exit()

# Variables para el reporte final
aciertos_1x2 = 0
aciertos_over = 0
partidos_evaluados = 0
capital_inicial = 1000.0
capital_actual = capital_inicial

print("⚙️ Ejecutando simulaciones paramétricas...\n")

print("⚙️ Ejecutando simulaciones con Lambdas Dinámicos y Filtro EV...\n")

# Diccionarios para guardar el histórico de goles de cada equipo en tiempo real
goles_anotados_local = {}
goles_recibidos_local = {}
goles_anotados_vis = {}
goles_recibidos_vis = {}
partidos_jugados_local = {}
partidos_jugados_vis = {}

for index, row in df.iterrows():
    local = row['Equipo_Local']
    vis = row['Equipo_Visitante']
    goles_l_real = row['Goles_Local']
    goles_v_real = row['Goles_Visitante']

    # Inicializar equipos en los diccionarios si no existen
    for equipo in [local, vis]:
        if equipo not in goles_anotados_local:
            goles_anotados_local[equipo] = 0
            goles_recibidos_local[equipo] = 0
            goles_anotados_vis[equipo] = 0
            goles_recibidos_vis[equipo] = 0
            partidos_jugados_local[equipo] = 0
            partidos_jugados_vis[equipo] = 0

    # 1. CALCULAR LAMBDA DINÁMICO (Con los datos ANTERIORES a este partido)
    # Requerimos al menos 5 partidos de historial para generar un Lambda confiable
    if partidos_jugados_local[local] >= 5 and partidos_jugados_vis[vis] >= 5:

        fuerza_ataque_l = (
            goles_anotados_local[local] / partidos_jugados_local[local]) / AVG_HOME_LEAGUE
        fuerza_defensa_v = (
            goles_recibidos_vis[vis] / partidos_jugados_vis[vis]) / AVG_HOME_LEAGUE
        lam_local = fuerza_ataque_l * fuerza_defensa_v * AVG_HOME_LEAGUE

        fuerza_ataque_v = (
            goles_anotados_vis[vis] / partidos_jugados_vis[vis]) / AVG_AWAY_LEAGUE
        fuerza_defensa_l = (
            goles_recibidos_local[local] / partidos_jugados_local[local]) / AVG_AWAY_LEAGUE
        lam_vis = fuerza_ataque_v * fuerza_defensa_l * AVG_AWAY_LEAGUE

        # 2. Generar Matriz Poisson + Dixon Coles
        max_goles = 5
        p_l = [poisson.pmf(i, lam_local) for i in range(max_goles + 1)]
        p_v = [poisson.pmf(j, lam_vis) for j in range(max_goles + 1)]
        matriz = np.outer(p_l, p_v)

        for x in range(2):
            for y in range(2):
                matriz[x,
                       y] *= ajuste_dixon_coles(x, y, lam_local, lam_vis, RHO)
        matriz /= np.sum(matriz)

        p_empate = np.sum(np.diag(matriz))
        p_local = np.sum(np.tril(matriz, -1))
        p_vis = np.sum(np.triu(matriz, 1))

        # 3. GESTIÓN DE RIESGO: Filtro de Valor Esperado (EV)
        # Simulamos que la "casa de apuestas" calcula sus cuotas con un modelo ingenuo estático
        p_l_naive = [poisson.pmf(i, AVG_HOME_LEAGUE)
                     for i in range(max_goles + 1)]
        p_v_naive = [poisson.pmf(j, AVG_AWAY_LEAGUE)
                     for j in range(max_goles + 1)]
        matriz_naive = np.outer(p_l_naive, p_v_naive)
        p_local_naive = np.sum(np.tril(matriz_naive, -1))

        # La casa ofrece su cuota restando su margen de ganancia (overround del 5%)
        cuota_simulada_local = (1 / p_local_naive) * \
            0.95 if p_local_naive > 0 else 0

        # Buscamos la ineficiencia: Comparamos NUESTRA probabilidad dinámica contra SU cuota ingenua
        ev_local = (p_local * cuota_simulada_local) - 1

        # Si nuestro modelo dinámico detecta que el local es mucho más fuerte de lo que cree la casa:
        if ev_local > 0.05:
            partidos_evaluados += 1
            inversion = 10.0  # Flat Betting estratégico

            if goles_l_real > goles_v_real:
                aciertos_1x2 += 1
                capital_actual += inversion * \
                    (cuota_simulada_local - 1)  # Ganancia neta
            else:
                capital_actual -= inversion  # Pérdida total

    # ACTUALIZAR HISTORIAL (Para que el modelo aprenda para el siguiente partido)
    goles_anotados_local[local] += goles_l_real
    goles_recibidos_local[local] += goles_v_real
    partidos_jugados_local[local] += 1

    goles_anotados_vis[vis] += goles_v_real
    goles_recibidos_vis[vis] += goles_l_real
    partidos_jugados_vis[vis] += 1

# 3. Reporte de Resultados
if partidos_evaluados > 0:
    roi = ((capital_actual - capital_inicial) / capital_inicial) * 100
else:
    roi = 0

print("==================================================")
print(" 📈 REPORTE DE BACKTESTING (MODELO DINÁMICO)")
print("==================================================")
print(f"Total de Partidos Procesados: {len(df)}")
print(f"Apuestas Ejecutadas (Filtro EV+): {partidos_evaluados}")
if partidos_evaluados > 0:
    print(
        f"Winrate Estratégico: {aciertos_1x2} ({(aciertos_1x2/partidos_evaluados)*100:.2f}%)")
print("--------------------------------------------------")
print(" 💰 ANÁLISIS FINANCIERO (Riesgo Controlado)")
print(f"Capital Inicial: ${capital_inicial:.2f}")
print(f"Capital Final:   ${capital_actual:.2f}")
print(f"ROI Acumulado:   {roi:.2f}%")
print("==================================================")

if roi > 0:
    print("✅ Veredicto: El modelo presenta Esperanza Matemática Positiva. Es rentable.")
else:
    print("❌ Veredicto: El mercado venció al modelo. Se requiere mayor calibración.")
