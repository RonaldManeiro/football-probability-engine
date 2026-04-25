"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [equipos, setEquipos] = useState([]);
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  
  const [resultado, setResultado] = useState(null);
  const [historialLocal, setHistorialLocal] = useState([]);
  const [historialVis, setHistorialVis] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [tabActiva, setTabActiva] = useState("prediccion");

  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/equipos")
      .then((res) => res.json())
      .then((data) => setEquipos(data.equipos))
      .catch((error) => console.error("Error:", error));
  }, []);

  const calcularPrediccion = async () => {
    if (!local || !visitante) {
      alert("⚠️ Por favor selecciona ambos equipos.");
      return;
    }
    if (local === visitante) {
      alert("⚠️ Un equipo no puede jugar contra sí mismo.");
      return;
    }

    setCargando(true);
    setResultado(null);

    try {
      const resPred = await fetch("http://127.0.0.1:8000/predecir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipo_local: local, equipo_visitante: visitante }),
      });
      const dataPred = await resPred.json();

      const [resHistLocal, resHistVis] = await Promise.all([
        fetch(`http://127.0.0.1:8000/historial/${local}`),
        fetch(`http://127.0.0.1:8000/historial/${visitante}`)
      ]);
      
      const dataHL = await resHistLocal.json();
      const dataHV = await resHistVis.json();
      
      setResultado(dataPred);
      setHistorialLocal(dataHL.ultimos_partidos || []);
      setHistorialVis(dataHV.ultimos_partidos || []);
      setTabActiva("prediccion");

    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al conectar con el motor.");
    }
    setCargando(false);
  };

  const generarInterpretacionPrincipal = () => {
    if (!resultado) return "";
    const pLocal = parseFloat(resultado.prob_victoria_local);
    const pVis = parseFloat(resultado.prob_victoria_visitante);
    const pEmpate = parseFloat(resultado.prob_empate);

    if (pLocal > 55) return `Fuerte favoritismo para ${resultado.local}. El modelo estadístico sugiere apostar al Local solo si la cuota ofrecida por la casa es superior a ${(100 / pLocal).toFixed(2)}.`;
    if (pVis > 55) return `Fuerte favoritismo para el visitante (${resultado.visitante}). Se recomienda buscar cuotas mayores a ${(100 / pVis).toFixed(2)} para obtener Valor Esperado positivo.`;
    if (pEmpate > 30) return `Partido sumamente cerrado. La distribución de Poisson indica una alta probabilidad de Empate o un partido de pocos goles. Riesgo elevado.`;
    return `Ligera ventaja para el favorito, pero sin el margen estadístico suficiente para representar una apuesta segura. Se recomienda evitar este mercado o buscar mercados de "Total de Goles".`;
  };

  const generarInterpretacionMarcadores = () => {
    if (!resultado || !resultado.top_marcadores) return "";
    const top1 = resultado.top_marcadores[0];
    const top2 = resultado.top_marcadores[1];
    const golesTop1 = top1.marcador.split('-').reduce((a, b) => parseInt(a) + parseInt(b), 0);

    if (golesTop1 > 2) return `El marcador más probable es ${top1.marcador} (${top1.probabilidad}). La tendencia apunta a un partido de alta anotación (Over 2.5), lo que sugiere aprovechar mercados de goles totales en lugar de buscar un ganador fijo.`;
    if (golesTop1 === 0) return `El marcador más probable es ${top1.marcador} (${top1.probabilidad}). Se anticipa un encuentro extremadamente cerrado y defensivo. El mercado de "Ambos Anotan: No" podría tener un buen valor esperado.`;
    return `El resultado esperado es ${top1.marcador} con ${top1.probabilidad} de probabilidad, seguido muy de cerca por el ${top2.marcador}. Se perfila un encuentro de marcador muy ajustado (Under 2.5 goles).`;
  };

  const generarInterpretacionHistorial = () => {
    if (!historialLocal.length || !historialVis.length) return "Faltan datos históricos para generar el análisis.";

    const getStats = (historial, equipo) => {
      let golesAnotados = 0, golesRecibidos = 0;
      historial.forEach(p => {
        if (p.Equipo_Local === equipo) { golesAnotados += p.Goles_Local; golesRecibidos += p.Goles_Visitante; } 
        else { golesAnotados += p.Goles_Visitante; golesRecibidos += p.Goles_Local; }
      });
      return { golesAnotados, golesRecibidos };
    };

    const statsLocal = getStats(historialLocal, resultado.local);
    const statsVis = getStats(historialVis, resultado.visitante);
    const difLocal = statsLocal.golesAnotados - statsLocal.golesRecibidos;
    const difVis = statsVis.golesAnotados - statsVis.golesRecibidos;

    let conclusion = `En sus últimos 5 partidos, ${resultado.local} ha anotado ${statsLocal.golesAnotados} goles y recibido ${statsLocal.golesRecibidos}. Por su parte, ${resultado.visitante} suma ${statsVis.golesAnotados} goles a favor y ${statsVis.golesRecibidos} en contra. `;

    if (difLocal > 0 && difVis <= 0) conclusion += `La inercia ofensiva favorece claramente al equipo local.`;
    else if (difVis > 0 && difLocal <= 0) conclusion += `El visitante llega con una inercia mucho más sólida y mejor diferencial.`;
    else if (difLocal > 0 && difVis > 0) conclusion += `Ambos equipos llegan en buena racha goleadora, reforzando la posibilidad de un partido abierto.`;
    else conclusion += `Ambos conjuntos muestran un diferencial negativo reciente, evidenciando problemas defensivos o sequía goleadora.`;

    return conclusion;
  };

  const theme = {
    bgMain: darkMode ? "bg-gradient-to-br from-slate-900 to-slate-950 text-slate-200" : "bg-gray-50 text-slate-800",
    textTitle: darkMode ? "text-blue-400" : "text-blue-900",
    textSubtitle: darkMode ? "text-slate-400" : "text-gray-600",
    cardBg: darkMode ? "bg-slate-800/90 border-slate-700 shadow-2xl" : "bg-white border-gray-100 shadow-xl",
    inputBg: darkMode ? "bg-slate-700 border-slate-600 text-white focus:ring-blue-500" : "bg-white border-gray-300 text-slate-800 focus:ring-blue-500",
    label: darkMode ? "text-slate-300" : "text-gray-700",
    boxVS: darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200",
    boxLocal: darkMode ? "bg-blue-900/30 border-blue-800/50 text-blue-300" : "bg-blue-50 border-blue-100 text-blue-800",
    boxEmpate: darkMode ? "bg-slate-700/50 border-slate-600 text-slate-300" : "bg-gray-50 border-gray-200 text-gray-700",
    boxVis: darkMode ? "bg-red-900/30 border-red-800/50 text-red-300" : "bg-red-50 border-red-100 text-red-800",
    veredictoBg: darkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-800 border-slate-700 text-white",
    tabActive: "border-b-2 border-blue-500 text-blue-500",
    tabInactive: darkMode ? "text-slate-500 hover:text-slate-300" : "text-gray-500 hover:text-blue-500",
    listItem: darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
  };

  return (
    <main className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${theme.bgMain}`}>
      
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-4 right-4 md:top-6 md:right-6 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-lg z-50 ${darkMode ? "bg-slate-800 text-yellow-400 border border-slate-600 hover:bg-slate-700 hover:scale-105" : "bg-white text-slate-700 border border-gray-300 hover:bg-gray-50 hover:scale-105"}`}
      >
        {darkMode ? "☀️ Claro" : "🌙 Oscuro"}
      </button>

      <div className="max-w-7xl mx-auto relative pt-8 md:pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMNA IZQUIERDA: CONTROLES */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
            <header className="mb-2 text-center lg:text-left">
              <h1 className={`text-4xl lg:text-5xl font-black tracking-tight mb-2 transition-colors ${theme.textTitle}`}>
                Premier League<br className="hidden lg:block" /> Predictor
              </h1>
              <p className={`font-medium transition-colors ${theme.textSubtitle}`}>Modelo de Poisson Bivariado</p>
              
              {/* --- NUEVO BOTÓN DE DESCARGA PDF --- */}
              <a 
                href="/Analisis_Poisson_Predictor.pdf" 
                download="Analisis_Poisson_Predictor.pdf"
                className={`inline-flex items-center justify-center gap-2 mt-5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${darkMode ? "bg-slate-800/50 text-blue-400 border-blue-500/30 hover:bg-slate-800" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}`}
              >
                📄 Descargar Documentación
              </a>
            </header>

            <div className={`rounded-2xl p-6 md:p-8 border transition-all duration-300 ${theme.cardBg}`}>
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${theme.label}`}>Equipo Local</label>
                  <select className={`w-full p-4 rounded-xl border focus:ring-2 focus:outline-none transition-colors ${theme.inputBg}`}
                    value={local} onChange={(e) => setLocal(e.target.value)}>
                    <option value="">-- Selecciona Local --</option>
                    {equipos.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${theme.label}`}>Equipo Visitante</label>
                  <select className={`w-full p-4 rounded-xl border focus:ring-2 focus:outline-none transition-colors ${theme.inputBg}`}
                    value={visitante} onChange={(e) => setVisitante(e.target.value)}>
                    <option value="">-- Selecciona Visitante --</option>
                    {equipos.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="mt-10">
                <button onClick={calcularPrediccion} disabled={cargando}
                  className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg disabled:bg-blue-800 disabled:text-blue-400 disabled:cursor-not-allowed">
                  {cargando ? "Analizando..." : "Ejecutar Análisis"}
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: RESULTADOS */}
          <div className="lg:col-span-8 mt-4 lg:mt-0">
            {!resultado ? (
              // ESTADO VACÍO
              <div className={`rounded-2xl p-8 border flex flex-col items-center justify-center min-h-[500px] text-center transition-all duration-300 ${theme.cardBg}`}>
                <div className="text-6xl mb-6 opacity-40">⚽</div>
                <h2 className={`text-2xl font-bold mb-3 ${theme.textTitle}`}>Panel de Análisis Estadístico</h2>
                <p className={`${theme.textSubtitle} max-w-md mx-auto leading-relaxed`}>
                  Selecciona el equipo local y visitante en el panel de control para inicializar el modelo. Las probabilidades y proyecciones se generarán automáticamente.
                </p>
              </div>
            ) : (
              // RESULTADOS
              <div className={`animate-fade-in rounded-2xl p-6 md:p-8 border transition-all duration-300 ${theme.cardBg}`}>
                <div className={`flex justify-start overflow-x-auto gap-4 md:gap-8 mb-8 border-b pb-2 ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
                  <button onClick={() => setTabActiva("prediccion")} className={`pb-2 px-2 font-semibold whitespace-nowrap transition-all ${tabActiva === "prediccion" ? theme.tabActive : theme.tabInactive}`}>Probabilidades 1X2</button>
                  <button onClick={() => setTabActiva("marcadores")} className={`pb-2 px-2 font-semibold whitespace-nowrap transition-all ${tabActiva === "marcadores" ? theme.tabActive : theme.tabInactive}`}>Marcadores Exactos</button>
                  <button onClick={() => setTabActiva("historial")} className={`pb-2 px-2 font-semibold whitespace-nowrap transition-all ${tabActiva === "historial" ? theme.tabActive : theme.tabInactive}`}>Forma Histórica</button>
                </div>

                {tabActiva === "prediccion" && (
                  <div className="space-y-8 animate-fade-in">
                    <div className={`flex justify-between items-center p-6 rounded-xl border transition-colors ${theme.boxVS}`}>
                      <div className="text-center w-1/3">
                        <p className={`text-xs md:text-sm font-medium mb-1 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Goles Esperados (λ)</p>
                        <p className="text-3xl md:text-5xl font-black text-blue-500">{resultado.goles_esperados_local}</p>
                        <p className="text-sm font-bold mt-2 uppercase tracking-wide">{resultado.local}</p>
                      </div>
                      <div className={`text-center w-1/3 font-black text-2xl md:text-3xl ${darkMode ? "text-slate-700" : "text-gray-300"}`}>VS</div>
                      <div className="text-center w-1/3">
                        <p className={`text-xs md:text-sm font-medium mb-1 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Goles Esperados (λ)</p>
                        <p className="text-3xl md:text-5xl font-black text-red-500">{resultado.goles_esperados_visitante}</p>
                        <p className="text-sm font-bold mt-2 uppercase tracking-wide">{resultado.visitante}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                      <div className={`p-6 rounded-xl border transition-colors ${theme.boxLocal}`}>
                        <p className="text-xs font-bold mb-2 uppercase tracking-wider opacity-80">Victoria Local</p>
                        <p className="text-4xl font-black">{resultado.prob_victoria_local}</p>
                      </div>
                      <div className={`p-6 rounded-xl border transition-colors ${theme.boxEmpate}`}>
                        <p className="text-xs font-bold mb-2 uppercase tracking-wider opacity-80">Empate</p>
                        <p className="text-4xl font-black">{resultado.prob_empate}</p>
                      </div>
                      <div className={`p-6 rounded-xl border transition-colors ${theme.boxVis}`}>
                        <p className="text-xs font-bold mb-2 uppercase tracking-wider opacity-80">Victoria Visitante</p>
                        <p className="text-4xl font-black">{resultado.prob_victoria_visitante}</p>
                      </div>
                    </div>

                    <div className={`rounded-xl p-8 border transition-colors ${theme.veredictoBg}`}>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-3">
                        <span className="text-xl">🤖</span> Veredicto del Modelo
                      </h3>
                      <p className="leading-relaxed text-lg">{generarInterpretacionPrincipal()}</p>
                    </div>
                  </div>
                )}

                {tabActiva === "marcadores" && (
                  <div className="space-y-8 animate-fade-in">
                    <div className={`border rounded-xl p-8 transition-colors ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                      <h3 className={`text-xl font-bold mb-8 text-center ${darkMode ? "text-slate-200" : "text-gray-800"}`}>Proyección de Resultados Exactos</h3>
                      <div className="space-y-5 max-w-2xl mx-auto">
                        {resultado.top_marcadores.map((m, i) => (
                          <div key={i} className={`flex items-center justify-between p-4 md:p-5 rounded-xl shadow-sm border transition-colors ${theme.listItem}`}>
                            <span className={`text-3xl font-mono font-black w-20 text-center ${darkMode ? "text-slate-100" : "text-gray-800"}`}>{m.marcador}</span>
                            <div className={`flex-1 mx-4 md:mx-8 h-4 rounded-full overflow-hidden ${darkMode ? "bg-slate-700" : "bg-gray-200"}`}>
                              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: m.probabilidad }}></div>
                            </div>
                            <span className="text-xl font-bold text-blue-500 w-24 text-right">{m.probabilidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className={`rounded-xl p-8 border transition-colors ${theme.veredictoBg}`}>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-3">
                        <span className="text-xl">📊</span> Análisis de Marcadores
                      </h3>
                      <p className="leading-relaxed text-lg">{generarInterpretacionMarcadores()}</p>
                    </div>
                  </div>
                )}

                {tabActiva === "historial" && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`rounded-xl p-6 border transition-colors ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                        <h4 className={`font-bold mb-6 flex justify-between items-center ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                          <span>Últimos 5 Partidos</span>
                          <span className="text-blue-500 uppercase tracking-wider text-xs bg-blue-500/10 px-3 py-1 rounded-full">Local</span>
                        </h4>
                        <ul className="space-y-3 text-sm">
                          {historialLocal.map((partido, i) => (
                            <li key={i} className={`flex justify-between items-center p-3 md:p-4 rounded-lg shadow-sm border transition-colors ${theme.listItem}`}>
                              <span className="truncate w-24 md:w-32 font-medium">{partido.Equipo_Local}</span>
                              <span className="font-black tracking-widest text-lg">{partido.Goles_Local} - {partido.Goles_Visitante}</span>
                              <span className="truncate w-24 md:w-32 text-right font-medium">{partido.Equipo_Visitante}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={`rounded-xl p-6 border transition-colors ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
                        <h4 className={`font-bold mb-6 flex justify-between items-center ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                          <span>Últimos 5 Partidos</span>
                          <span className="text-red-500 uppercase tracking-wider text-xs bg-red-500/10 px-3 py-1 rounded-full">Visitante</span>
                        </h4>
                        <ul className="space-y-3 text-sm">
                          {historialVis.map((partido, i) => (
                            <li key={i} className={`flex justify-between items-center p-3 md:p-4 rounded-lg shadow-sm border transition-colors ${theme.listItem}`}>
                              <span className="truncate w-24 md:w-32 font-medium">{partido.Equipo_Local}</span>
                              <span className="font-black tracking-widest text-lg">{partido.Goles_Local} - {partido.Goles_Visitante}</span>
                              <span className="truncate w-24 md:w-32 text-right font-medium">{partido.Equipo_Visitante}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className={`rounded-xl p-8 border transition-colors ${theme.veredictoBg}`}>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-3">
                        <span className="text-xl">📈</span> Análisis de Forma Reciente
                      </h3>
                      <p className="leading-relaxed text-lg">{generarInterpretacionHistorial()}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}