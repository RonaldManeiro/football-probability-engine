"use client";

import { useState, useEffect } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

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

  // Estados para gestión de riesgo
  const [kellyCuota, setKellyCuota] = useState("");
  const [kellySeleccion, setKellySeleccion] = useState("local");

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
    setKellyCuota("");

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

  // --- INTERPRETACIONES POTENCIADAS ---

  const generarInterpretacionPrincipal = () => {
    if (!resultado) return "";
    const pLocal = parseFloat(resultado.prob_victoria_local);
    const pVis = parseFloat(resultado.prob_victoria_visitante);
    const pEmpate = parseFloat(resultado.prob_empate);

    if (pLocal > 55) return `Fuerte favoritismo para ${resultado.local}. La distribución bivariada sugiere que el mercado local está infravalorado si la cuota supera ${(100 / pLocal).toFixed(2)}.`;
    if (pVis > 55) return `Predominancia del visitante (${resultado.visitante}). Existe una ventaja estadística clara; se recomienda buscar cuotas mayores a ${(100 / pVis).toFixed(2)}.`;
    if (pEmpate > 30) return `Alta probabilidad de tablas. La convergencia de los Lambdas indica un equilibrio táctico donde el empate es el resultado de mayor estabilidad estadística.`;
    return `Partido de alta varianza. No hay un sesgo significativo hacia ningún bando; se recomienda analizar mercados secundarios o esperar confirmación de alineaciones.`;
  };

  const generarInterpretacionGrafico = () => {
    if (!resultado) return "";
    const goalLocal = resultado.distribucion_local.indexOf(Math.max(...resultado.distribucion_local));
    const goalVis = resultado.distribucion_visitante.indexOf(Math.max(...resultado.distribucion_visitante));

    let desc = `Análisis de Densidad: El pico de probabilidad (moda) para ${resultado.local} se ubica en los ${goalLocal} goles, mientras que para ${resultado.visitante} es de ${goalVis} goles. `;
    
    if (Math.abs(goalLocal - goalVis) >= 2) {
      desc += "La separación de las áreas bajo la curva confirma una disparidad técnica notable en la eficiencia goleadora esperada.";
    } else {
      desc += "El solapamiento masivo de las áreas de densidad sugiere que cualquier desviación mínima en la ejecución podría alterar el resultado final.";
    }
    return desc;
  };

  const generarInterpretacionMarcadores = () => {
    if (!resultado || !resultado.top_marcadores) return "";
    const top1 = resultado.top_marcadores[0];
    return `La matriz de Poisson identifica al ${top1.marcador} como el marcador de máxima verosimilitud (${top1.probabilidad}). Este resultado actúa como el centro de gravedad de la distribución bivariada para este encuentro.`;
  };

  const generarInterpretacionAlternativos = () => {
    if (!resultado) return "";
    const pOver = parseFloat(resultado.prob_over_25);
    const pBtts = parseFloat(resultado.prob_btts_si);

    let conclusion = pOver > 55 ? "Inercia hacia un partido de alta anotación (Over 2.5). " : "Tendencia a un juego táctico y defensivo (Under 2.5). ";
    conclusion += pBtts > 55 ? "La correlación de ataques sugiere que ambos equipos vulnerarán la defensa rival." : "La probabilidad indica que al menos uno de los guardametas mantendrá su arco en cero.";
    return conclusion;
  };

  const generarInterpretacionHistorial = () => {
    if (!historialLocal.length || !historialVis.length) return "Faltan datos.";
    const getStats = (h, e) => {
      let a = 0, r = 0;
      h.forEach(p => {
        if (p.Equipo_Local === e) { a += p.Goles_Local; r += p.Goles_Visitante; } 
        else { a += p.Goles_Visitante; r += p.Goles_Local; }
      });
      return { a, r };
    };
    const sL = getStats(historialLocal, resultado.local);
    const sV = getStats(historialVis, resultado.visitante);
    
    return `${resultado.local} llega con ${sL.a} goles a favor y ${sL.r} en contra en sus últimos 5 juegos. ${resultado.visitante} registra ${sV.a} anotados y ${sV.r} recibidos. Esta inercia real valida los parámetros λ del modelo.`;
  };

  // --- GESTIÓN DE RIESGO REPARADA ---
  const calcularRiesgo = () => {
    if (!resultado || !kellyCuota || isNaN(kellyCuota) || kellyCuota <= 1) return null;
    let probString = "0";
    if (kellySeleccion === "local") probString = resultado.prob_victoria_local;
    if (kellySeleccion === "empate") probString = resultado.prob_empate;
    if (kellySeleccion === "visitante") probString = resultado.prob_victoria_visitante;

    const p = parseFloat(probString) / 100;
    const cuota = parseFloat(kellyCuota);
    const ev = (p * cuota) - 1;
    let kelly = ((p * (cuota - 1)) - (1 - p)) / (cuota - 1);
    if (kelly < 0) kelly = 0;

    return {
      ev: (ev * 100).toFixed(2),
      kelly: (kelly * 100).toFixed(2),
      recomendacion: ev > 0 
        ? "✅ Valor Positivo Detectado. El mercado está subestimando la probabilidad real."
        : "❌ Esperanza Matemática Negativa. No se recomienda invertir en este mercado."
    };
  };

  const riesgoStats = calcularRiesgo();

  const dataGrafico = resultado ? [0, 1, 2, 3, 4, 5].map(i => ({
    goles: `${i}`,
    Local: resultado.distribucion_local[i],
    Visitante: resultado.distribucion_visitante[i]
  })) : [];

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
    listItem: darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100",
    kellyBg: darkMode ? "bg-slate-800/60 border-slate-600" : "bg-blue-50 border-blue-100"
  };

  return (
    <main className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${theme.bgMain}`}>
      
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-4 right-4 md:top-6 md:right-6 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-lg z-50 ${darkMode ? "bg-slate-800 text-yellow-400 border border-slate-600 hover:bg-slate-700" : "bg-white text-slate-700 border border-gray-300 hover:bg-gray-50"}`}
      >
        {darkMode ? "☀️ Claro" : "🌙 Oscuro"}
      </button>

      <div className="max-w-7xl mx-auto relative pt-8 md:pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
            <header className="mb-2 text-center lg:text-left">
              <h1 className={`text-4xl lg:text-5xl font-black tracking-tight mb-2 transition-colors ${theme.textTitle}`}>
                Premier League Predictor
              </h1>
              <p className={`font-medium transition-colors ${theme.textSubtitle}`}>Modelo de Poisson Bivariado</p>
              <a href="/Analisis_Poisson_Predictor.pdf" download
                className={`inline-flex items-center justify-center gap-2 mt-5 px-5 py-2.5 rounded-xl font-bold text-sm border ${darkMode ? "bg-slate-800/50 text-blue-400 border-blue-500/30 hover:bg-slate-800" : "bg-blue-50 text-blue-700 border-blue-200"}`}
              >
                📄 Descargar Documentación
              </a>
            </header>

            <div className={`rounded-2xl p-6 md:p-8 border transition-all duration-300 ${theme.cardBg}`}>
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${theme.label}`}>Equipo Local</label>
                  <select className={`w-full p-4 rounded-xl border focus:outline-none transition-colors ${theme.inputBg}`}
                    value={local} onChange={(e) => setLocal(e.target.value)}>
                    <option value="">-- Selecciona Local --</option>
                    {equipos.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${theme.label}`}>Equipo Visitante</label>
                  <select className={`w-full p-4 rounded-xl border focus:outline-none transition-colors ${theme.inputBg}`}
                    value={visitante} onChange={(e) => setVisitante(e.target.value)}>
                    <option value="">-- Selecciona Visitante --</option>
                    {equipos.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-10">
                <button onClick={calcularPrediccion} disabled={cargando}
                  className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg disabled:bg-blue-800">
                  {cargando ? "Analizando..." : "Ejecutar Análisis"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 mt-4 lg:mt-0">
            {!resultado ? (
              <div className={`rounded-2xl p-8 border flex flex-col items-center justify-center min-h-[500px] text-center ${theme.cardBg}`}>
                <div className="text-6xl mb-6 opacity-40">⚽</div>
                <h2 className={`text-2xl font-bold mb-3 ${theme.textTitle}`}>Panel de Análisis Estadístico</h2>
                <p className={`${theme.textSubtitle}`}>Selecciona equipos para inicializar el modelo.</p>
              </div>
            ) : (
              <div className={`animate-fade-in rounded-2xl p-6 md:p-8 border transition-all duration-300 ${theme.cardBg}`}>
                <div className={`flex justify-start overflow-x-auto gap-4 md:gap-8 mb-8 border-b pb-2 ${darkMode ? "border-slate-700" : "border-gray-200"}`}>
                  <button onClick={() => setTabActiva("prediccion")} className={`pb-2 px-2 font-semibold transition-all ${tabActiva === "prediccion" ? theme.tabActive : theme.tabInactive}`}>Análisis Principal</button>
                  <button onClick={() => setTabActiva("marcadores")} className={`pb-2 px-2 font-semibold transition-all ${tabActiva === "marcadores" ? theme.tabActive : theme.tabInactive}`}>Marcadores Exactos</button>
                  <button onClick={() => setTabActiva("alternativos")} className={`pb-2 px-2 font-semibold transition-all ${tabActiva === "alternativos" ? theme.tabActive : theme.tabInactive}`}>Mercados Alternativos</button>
                  <button onClick={() => setTabActiva("historial")} className={`pb-2 px-2 font-semibold transition-all ${tabActiva === "historial" ? theme.tabActive : theme.tabInactive}`}>Forma Histórica</button>
                </div>

                {tabActiva === "prediccion" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className={`flex justify-between items-center p-6 rounded-xl border ${theme.boxVS}`}>
                      <div className="text-center w-1/3">
                        <p className="text-xs font-medium text-slate-400">Goles Esperados (λ)</p>
                        <p className="text-4xl font-black text-blue-500">{resultado.goles_esperados_local}</p>
                        <p className="text-sm font-bold mt-2 uppercase">{resultado.local}</p>
                      </div>
                      <div className="text-center w-1/3 font-black text-2xl text-slate-700">VS</div>
                      <div className="text-center w-1/3">
                        <p className="text-xs font-medium text-slate-400">Goles Esperados (λ)</p>
                        <p className="text-4xl font-black text-red-500">{resultado.goles_esperados_visitante}</p>
                        <p className="text-sm font-bold mt-2 uppercase">{resultado.visitante}</p>
                      </div>
                    </div>

                    <div className={`p-6 rounded-xl border ${darkMode ? "bg-slate-900/40 border-slate-700" : "bg-gray-50"}`}>
                      <h3 className="text-sm font-bold uppercase tracking-widest mb-6 opacity-70">Distribución de Probabilidad por Gol</h3>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dataGrafico}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#cbd5e1"} />
                            <XAxis dataKey="goles" stroke={darkMode ? "#94a3b8" : "#64748b"} />
                            <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} unit="%" />
                            <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", borderColor: "#3b82f6" }} />
                            <Legend />
                            <Area type="monotone" dataKey="Local" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                            <Area type="monotone" dataKey="Visitante" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-sm mt-4 italic opacity-80 border-t border-slate-700/30 pt-3">{generarInterpretacionGrafico()}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                      <div className={`p-6 rounded-xl border ${theme.boxLocal}`}><p className="text-xs font-bold mb-2 uppercase opacity-80">Victoria Local</p><p className="text-4xl font-black">{resultado.prob_victoria_local}</p></div>
                      <div className={`p-6 rounded-xl border ${theme.boxEmpate}`}><p className="text-xs font-bold mb-2 uppercase opacity-80">Empate</p><p className="text-4xl font-black">{resultado.prob_empate}</p></div>
                      <div className={`p-6 rounded-xl border ${theme.boxVis}`}><p className="text-xs font-bold mb-2 uppercase opacity-80">Victoria Visitante</p><p className="text-4xl font-black">{resultado.prob_victoria_visitante}</p></div>
                    </div>

                    <div className={`rounded-xl p-8 border ${theme.veredictoBg}`}>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">🤖 Veredicto Principal</h3>
                      <p className="leading-relaxed text-lg">{generarInterpretacionPrincipal()}</p>
                    </div>

                    <div className={`rounded-xl p-6 md:p-8 border mt-4 ${theme.kellyBg}`}>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">⚖️ Gestión de Riesgo (Kelly)</h3>
                      <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                        <div className="w-full md:w-1/2">
                          <label className="block text-xs font-bold mb-2 uppercase opacity-70">Mercado</label>
                          <select className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 transition-colors ${theme.inputBg}`} value={kellySeleccion} onChange={(e) => setKellySeleccion(e.target.value)}>
                            <option value="local">Victoria: {resultado.local}</option>
                            <option value="empate">Empate</option>
                            <option value="visitante">Victoria: {resultado.visitante}</option>
                          </select>
                        </div>
                        <div className="w-full md:w-1/2">
                          <label className="block text-xs font-bold mb-2 uppercase opacity-70">Cuota Ofrecida (Decimal)</label>
                          <input type="number" step="0.01" placeholder="Ej: 2.10" className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 transition-colors ${theme.inputBg}`} value={kellyCuota} onChange={(e) => setKellyCuota(e.target.value)} />
                        </div>
                      </div>
                      {riesgoStats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-500/20">
                          <div><p className="text-xs uppercase font-bold opacity-60">Valor Esperado (EV)</p><p className={`text-3xl font-black ${parseFloat(riesgoStats.ev) > 0 ? "text-green-500" : "text-red-500"}`}>{parseFloat(riesgoStats.ev) > 0 ? "+" : ""}{riesgoStats.ev}%</p></div>
                          <div><p className="text-xs uppercase font-bold opacity-60">Inversión Sugerida</p><p className="text-3xl font-black text-blue-500">{riesgoStats.kelly}% <span className="text-sm font-medium opacity-50">del Bank</span></p></div>
                          <div className="md:col-span-2"><p className={`text-sm font-semibold p-3 rounded-lg ${parseFloat(riesgoStats.ev) > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{riesgoStats.recomendacion}</p></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tabActiva === "marcadores" && (
                  <div className="space-y-8 animate-fade-in">
                    <div className={`border rounded-xl p-8 ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50"}`}>
                      {resultado.top_marcadores.map((m, i) => (
                        <div key={i} className={`flex items-center justify-between p-4 mb-3 rounded-xl border ${theme.listItem}`}>
                          <span className="text-2xl font-mono font-black w-20 text-center">{m.marcador}</span>
                          <div className="flex-1 mx-8 h-3 bg-slate-700 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: m.probabilidad }}></div></div>
                          <span className="text-xl font-bold text-blue-500">{m.probabilidad}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`rounded-xl p-8 border ${theme.veredictoBg}`}>
                      <h3 className="text-lg font-bold mb-3">📊 Análisis de Scorelines</h3>
                      <p className="leading-relaxed text-lg">{generarInterpretacionMarcadores()}</p>
                    </div>
                  </div>
                )}

                {tabActiva === "alternativos" && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`p-8 rounded-xl border ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50"}`}>
                        <h4 className="text-center font-bold mb-6 text-blue-400 uppercase tracking-widest">Goles Totales (2.5)</h4>
                        <div className="space-y-6">
                          <div><div className="flex justify-between mb-2"><span>Over 2.5</span><span>{resultado.prob_over_25}</span></div><div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden"><div className="bg-green-500 h-full" style={{width: resultado.prob_over_25}}></div></div></div>
                          <div><div className="flex justify-between mb-2"><span>Under 2.5</span><span>{resultado.prob_under_25}</span></div><div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden"><div className="bg-yellow-500 h-full" style={{width: resultado.prob_under_25}}></div></div></div>
                        </div>
                      </div>
                      <div className={`p-8 rounded-xl border ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50"}`}>
                        <h4 className="text-center font-bold mb-6 text-red-400 uppercase tracking-widest">Ambos Anotan (BTTS)</h4>
                        <div className="space-y-6">
                          <div><div className="flex justify-between mb-2"><span>Sí</span><span>{resultado.prob_btts_si}</span></div><div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{width: resultado.prob_btts_si}}></div></div></div>
                          <div><div className="flex justify-between mb-2"><span>No</span><span>{resultado.prob_btts_no}</span></div><div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden"><div className="bg-slate-500 h-full" style={{width: resultado.prob_btts_no}}></div></div></div>
                        </div>
                      </div>
                    </div>
                    <div className={`rounded-xl p-8 border ${theme.veredictoBg}`}>
                      <h3 className="text-lg font-bold mb-3">📈 Veredicto de Mercados Alternativos</h3>
                      <p className="leading-relaxed text-lg">{generarInterpretacionAlternativos()}</p>
                    </div>
                  </div>
                )}

                {tabActiva === "historial" && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`rounded-xl p-6 border ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50"}`}>
                        <h4 className="font-bold mb-6 flex justify-between"><span>Últimos 5</span><span className="text-blue-500 uppercase text-xs">Local</span></h4>
                        <ul className="space-y-3">
                          {historialLocal.map((p, i) => (
                            <li key={i} className={`flex justify-between p-3 rounded-lg border ${theme.listItem}`}>
                              <span className="truncate w-24">{p.Equipo_Local}</span><span className="font-black text-lg">{p.Goles_Local} - {p.Goles_Visitante}</span><span className="truncate w-24 text-right">{p.Equipo_Visitante}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={`rounded-xl p-6 border ${darkMode ? "bg-slate-800/40 border-slate-700" : "bg-gray-50"}`}>
                        <h4 className="font-bold mb-6 flex justify-between"><span>Últimos 5</span><span className="text-red-500 uppercase text-xs">Visitante</span></h4>
                        <ul className="space-y-3">
                          {historialVis.map((p, i) => (
                            <li key={i} className={`flex justify-between p-3 rounded-lg border ${theme.listItem}`}>
                              <span className="truncate w-24">{p.Equipo_Local}</span><span className="font-black text-lg">{p.Goles_Local} - {p.Goles_Visitante}</span><span className="truncate w-24 text-right">{p.Equipo_Visitante}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className={`rounded-xl p-8 border ${theme.veredictoBg}`}>
                      <h3 className="text-lg font-bold mb-3">📈 Análisis de Forma Reciente</h3>
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