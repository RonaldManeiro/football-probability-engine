CREATE OR REPLACE VIEW team_strengths AS
WITH league_avg AS (
    -- 1. Calculamos el promedio global de goles de toda la liga
    SELECT 
        AVG("Goles_Local") AS avg_home_goals_league,
        AVG("Goles_Visitante") AS avg_away_goals_league
    FROM raw_matches
),
home_stats AS (
    -- 2. Calculamos el desempeño promedio de cada equipo jugando de LOCAL
    SELECT 
        "Equipo_Local" AS equipo,
        AVG("Goles_Local") AS avg_goals_scored_home,
        AVG("Goles_Visitante") AS avg_goals_conceded_home
    FROM raw_matches
    GROUP BY "Equipo_Local"
),
away_stats AS (
    -- 3. Calculamos el desempeño promedio de cada equipo jugando de VISITANTE
    SELECT 
        "Equipo_Visitante" AS equipo,
        AVG("Goles_Visitante") AS avg_goals_scored_away,
        AVG("Goles_Local") AS avg_goals_conceded_away
    FROM raw_matches
    GROUP BY "Equipo_Visitante"
)
-- 4. Unimos todo y calculamos las "Fuerzas" (Strengths) dividiendo el promedio del equipo entre el global
SELECT 
    h.equipo,
    
    -- Fuerza de Ataque (>1 es mejor, <1 es peor)
    (h.avg_goals_scored_home / l.avg_home_goals_league) AS home_attack_strength,
    (a.avg_goals_scored_away / l.avg_away_goals_league) AS away_attack_strength,
    
    -- Fuerza de Defensa (<1 es mejor, >1 es peor)
    (h.avg_goals_conceded_home / l.avg_away_goals_league) AS home_defense_strength,
    (a.avg_goals_conceded_away / l.avg_home_goals_league) AS away_defense_strength

FROM home_stats h
JOIN away_stats a ON h.equipo = a.equipo
CROSS JOIN league_avg l
ORDER BY home_attack_strength DESC;