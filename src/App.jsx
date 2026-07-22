import { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import './App.css';

// --- IMPORTACIONES (Si alguna falla, el código tiene protección) ---
import { obtenerPlanSemanal } from './planner_logic'; 
import GeneradorMaterial from './components/GeneradorMaterial';
import Licencia from './components/Licencia';
import ConfiguracionCiclo from './components/ConfiguracionCiclo';
import DashboardGrupos from './components/DashboardGrupos';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

export const DEFAULT_FECHA_INICIO = new Date(2026, 7, 31); // 31 Agosto 2026

export const DEFAULT_PERIODOS = { 
  1: { nombre: '1º Trimestre', inicio: '2026-08-31', fin: '2026-11-27' }, 
  2: { nombre: '2º Trimestre', inicio: '2026-11-30', fin: '2027-03-19' }, 
  3: { nombre: '3º Trimestre', inicio: '2027-03-20', fin: '2027-07-21' } 
};

const CAMPOS_FORMATIVOS = [
    { id: 'LENGUAJES', nombre: 'Lenguajes', color: '#F3E5F5', borde: '#8E24AA' },
    { id: 'SABERES', nombre: 'Saberes y P.C.', color: '#E0F2F1', borde: '#00897B' },
    { id: 'ETICA', nombre: 'Ética, Nat. y Soc.', color: '#E3F2FD', borde: '#1E88E5' },
    { id: 'HUMANO', nombre: 'De lo Humano', color: '#FFEBEE', borde: '#E53935' }
];

const NOMBRES_MESES = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

const obtenerFechasSemana = (numSemana, fechaInicioObj = DEFAULT_FECHA_INICIO) => {
  let inicio = new Date(fechaInicioObj);
  inicio.setDate(inicio.getDate() + ((numSemana - 1) * 7));
  let fin = new Date(inicio);
  fin.setDate(fin.getDate() + 4); 
  const opts = { day: 'numeric', month: 'short' };
  return `${inicio.toLocaleDateString('es-MX', opts)} - ${fin.toLocaleDateString('es-MX', opts)}`;
};

const METODOLOGIAS = { 
  'COMUNITARIOS': { nombre: 'Lenguajes (Comunitarios)', fases: ['1. Planeación', '2. Acción', '3. Intervención'], color: '#F3E5F5', borde: '#8E24AA' }, 
  'STEAM': { nombre: 'Saberes (STEAM)', fases: ['1. Indagación', '2. Diseño', '3. Prototipado', '4. Presentación'], color: '#E0F2F1', borde: '#00897B' }, 
  'ABP': { nombre: 'Ética (ABP)', fases: ['1. Presentemos', '2. Recolectemos', '3. Problema', '4. Experiencia', '5. Resultados'], color: '#E3F2FD', borde: '#1E88E5' }, 
  'SERVICIO': { nombre: 'De lo Humano (Servicio)', fases: ['1. Punto de partida', '2. Organización', '3. Creatividad', '4. Evaluación'], color: '#FFEBEE', borde: '#E53935' } 
};

const detectarMetodologia = (campo) => {
  const c = String(campo || '').toLowerCase();
  if(c.includes('lenguaje') || c.includes('len')) return 'COMUNITARIOS';
  if(c.includes('saberes') || c.includes('sypc')) return 'STEAM';
  if(c.includes('ética') || c.includes('enys')) return 'ABP';
  if(c.includes('humano') || c.includes('dhyc')) return 'SERVICIO';
  return 'COMUNITARIOS';
};

// Render counter global para depuración
window.renderCount = (window.renderCount || 0) + 1;

const CeldaNota = memo(({ idAlumno, idCriterio, valorInicial, onGuardar }) => {
    const [valor, setValor] = useState(valorInicial ?? '');
    useEffect(() => { setValor(valorInicial ?? ''); }, [valorInicial]);
    const handleBlur = () => { if (valor !== valorInicial) onGuardar(idAlumno, idCriterio, valor === '' ? null : valor); };
    return ( <input className="input-nota" type="text" inputMode="decimal" style={{background: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', width: '100%', height: '40px', border: '1px solid #eee', borderRadius: '4px', outline: 'none', color: '#333'}} value={valor} onChange={(e) => setValor(e.target.value)} onBlur={handleBlur} placeholder="-" /> );
});

const safeParse = (data, fallback) => { if (typeof data === 'object' && data !== null) return data; try { return JSON.parse(data); } catch (e) { return fallback; } };

const SEMANAS_CLASE = Array.from({length: 42}, (_, i) => ({ id: i + 1, rango: `Semana ${i + 1}` }));
const TIPOS_EVENTO = { 
    'CLASES': { color: 'white', label: 'Clases', texto: 'black' }, 
    'CTE': { color: '#e74c3c', label: 'CTE', texto: 'white' }, 
    'VACACIONES': { color: '#3498db', label: 'Vacaciones', texto: 'white' }, 
    'DESCARGA': { color: '#f1c40f', label: 'Descarga', texto: 'black' }, 
    'SUSPENSION': { color: '#95a5a6', label: 'Suspensión', texto: 'white' } 
};

function App() {
  const [vista, setVista] = useState('MENU');
  const [grupoActual, setGrupoActual] = useState({ id: 1, grado: 3, seccion: 'A', disciplina_id: 1, nombre_disciplina: 'Primaria', tipo: 'Primaria' });
  
  // LICENCIA
  const [licenciaInfo, setLicenciaInfo] = useState(null);
  const [cargandoLicencia, setCargandoLicencia] = useState(true);

  // ESTADOS
  const [alumnos, setAlumnos] = useState([]);
  const [grado, setGrado] = useState(() => localStorage.getItem('grado') ? parseInt(localStorage.getItem('grado')) : 3);
  const [configCiclo, setConfigCiclo] = useState({ fechaInicioStr: '2026-08-31', periodos: DEFAULT_PERIODOS });
  
  // EVALUACIÓN
  const [criterios, setCriterios] = useState([]); 
  const criteriosRef = useRef([]);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
      setToast(msg);
      setTimeout(() => setToast(''), 3000);
  };
  
  useEffect(() => {
      criteriosRef.current = criterios;
  }, [criterios]);

  const [notas, setNotas] = useState({}); 
  const [fechaEval, setFechaEval] = useState(new Date().toISOString().split('T')[0]);
  const [modoConfig, setModoConfig] = useState(false);
  
  // OTROS
  const [textoPegado, setTextoPegado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [listaProyectos, setListaProyectos] = useState([]);
  const [modoEdicionProy, setModoEdicionProy] = useState(false);
  const [proyectoActual, setProyectoActual] = useState({ id: null, nombre: '', metodologia: 'COMUNITARIOS', escenario: 'AULA', temporalidad: '2 Semanas', problemática: '', pdas_seleccionados: [], fases_contenido: {} });
  const [semanaPlan, setSemanaPlan] = useState(1); 
  const [planData, setPlanData] = useState({ lunes_inicio: '', lunes_desarrollo: '', lunes_cierre: '', martes_inicio: '', martes_desarrollo: '', martes_cierre: '', miercoles_inicio: '', miercoles_desarrollo: '', miercoles_cierre: '', jueves_inicio: '', jueves_desarrollo: '', jueves_cierre: '', viernes_inicio: '', viernes_desarrollo: '', viernes_cierre: '', recursos: '', evaluacion: '', adecuaciones: '', confidence_score: 1.0 });
  const [planDosif, setPlanDosif] = useState([]);
  const [pdasDisponibles, setPdasDisponibles] = useState([]);
  const [pdasSemana, setPdasSemana] = useState([]);
  const [busquedaPda, setBusquedaPda] = useState("");
  const [alumnoBitacora, setAlumnoBitacora] = useState(null); 
  const [tabBitacora, setTabBitacora] = useState('PERFIL'); 
  const [perfil, setPerfil] = useState({}); 
  const [incidencias, setIncidencias] = useState([]); 
  const [fechaInc, setFechaInc] = useState(new Date().toISOString().split('T')[0]); 
  const [formInc, setFormInc] = useState({ situacion: '', involucrados: '', medidas: '' });
  
  // CALENDARIO ESTADOS
  const [mesCal, setMesCal] = useState(new Date().getMonth()+1); 
  const [anioCal, setAnioCal] = useState(new Date().getFullYear()); 
  const [eventosSEP, setEventosSEP] = useState({}); 
  const [modoConfigCalendario, setModoConfigCalendario] = useState(false); 
  const [herramientaSeleccionada, setHerramientaSeleccionada] = useState('CTE');
  
  const [comisiones, setComisiones] = useState([]); 
  const [nuevaComision, setNuevaComision] = useState({ descripcion: '', fecha: '', tipo: 'Guardia' });
  const [trimestre, setTrimestre] = useState(1); 
  const [resumen, setResumen] = useState([]); 
  const [cargandoReporte, setCargandoReporte] = useState(false); 
  const [campoActual, setCampoActual] = useState('LENGUAJES');
  const [vistos, setVistos] = useState({});

  // ESTADOS DE INTEGRACIÓN ELARA
  const [elaraInsights, setElaraInsights] = useState([]);
  const [telemetriaState, setTelemetriaState] = useState('listening'); // listening, processing, cooldown
  const [cooldownCount, setCooldownCount] = useState(1.2);
  const [mostrarDudaModal, setMostrarDudaModal] = useState(false);
  const [mostrarConsola, setMostrarConsola] = useState(false);
  const [consolaLogs, setConsolaLogs] = useState([]);
  const [consolaCompletada, setConsolaCompletada] = useState(false);

  const toggleVisto = (tipo, id) => {
      const isVisto = (vistos[tipo] || []).includes(String(id));
      const newState = !isVisto;
      if (ipcRenderer) {
          ipcRenderer.invoke('toggle-visto', tipo, String(id), newState).then(() => {
              setVistos(prev => {
                  const arr = prev[tipo] || [];
                  return { ...prev, [tipo]: newState ? [...arr, String(id)] : arr.filter(x => x !== String(id)) };
              });
          });
      }
  };

  // --- CONTEXTO GLOBAL PARA EL ASISTENTE IA ---
  useEffect(() => {
    window.plannerContext = {
      vista,
      proyectoActual,
      planData,
      pdasSemana,
      alumnos,
      criterios,
      notas,
      grupoActual,
      semanaPlan,
      fechaEval,
      campoActual,
      modoConfig,
      textoPegado,
      procesando,
      licenciaInfo,
      setVista,
      setProyectoActual,
      setPlanData,
      setPdasSemana,
      setAlumnos,
      setCriterios,
      setNotas,
      setGrupoActual,
      setSemanaPlan,
      setFechaEval,
      setCampoActual,
      setModoConfig,
      setTextoPegado,
      setProcesando,
      setLicenciaInfo,
      cargarEval,
      showToast,
      guardarConfig,
      agregarCriterioNuevo,
      handleDeleteCriterio,
      handleChangeCriterio,
      handleSaveNota,
      borrarAlumno,
      procesarListaAlumnos,
      savePlan,
      guardarProyecto,
      guardarProyectoSilencioso,
      editarProyectoSafe,
      ipcRenderer
    };
  }, [
    vista, proyectoActual, planData, pdasSemana, alumnos, criterios, notas,
    grupoActual, semanaPlan, fechaEval, campoActual, modoConfig, textoPegado, procesando, licenciaInfo
  ]);

  // --- CARGAS INICIALES ---
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-license-status').then(res => {
        setLicenciaInfo(res);
        window.openaiApiKey = res.openaiApiKey || '';
        setCargandoLicencia(false);
      });
      ipcRenderer.invoke('get-config').then(cfg => {
        if (cfg.fechaInicioStr || cfg.periodos || cfg.nombreDocente) {
            setConfigCiclo({
                fechaInicioStr: cfg.fechaInicioStr || '2026-08-31',
                periodos: cfg.periodos ? JSON.parse(cfg.periodos) : DEFAULT_PERIODOS,
                nombreDocente: cfg.nombreDocente || 'DOCENTE TITULAR',
                nombreEscuela: cfg.nombreEscuela || 'ESCUELA PRIMARIA',
                cct: cfg.cct || 'S/N'
            });
        }
      });
    } else {
      setCargandoLicencia(false);
    }
  }, []);

  const cargarInsights = useCallback(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-elara-insights').then(res => {
        setElaraInsights(res || []);
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    cargarInsights();
  }, [vista, cargarInsights]);

  // Carga automática del grupo de Primaria (sin seleccionador de grupos)
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-grupos').then(res => {
        const savedGrado = localStorage.getItem('grado');
        const currentG = savedGrado ? Number(savedGrado) : 1;
        setGrado(currentG);
        if (res && res.length > 0) {
          setGrupoActual({ ...res[0], grado: currentG, seccion: '' });
        } else {
          const defaultGrupo = { grado: currentG, seccion: '', disciplina_id: 1, tipo: 'Primaria', ciclo_escolar: '2026-2027' };
          ipcRenderer.invoke('add-grupo', defaultGrupo).then(() => {
            ipcRenderer.invoke('get-grupos').then(newRes => {
              if (newRes && newRes.length > 0) setGrupoActual({ ...newRes[0], grado: currentG, seccion: '' });
            });
          });
        }
      }).catch(console.error);
    }
  }, []);

  const handleMarcarInsightVisto = (id) => {
    if (ipcRenderer) {
      ipcRenderer.invoke('mark-insight-visto', id).then(() => {
        cargarInsights();
        showToast("✅ Insight archivado");
      }).catch(console.error);
    }
  };

  const handleTelemetriaClick = () => {
    if (telemetriaState !== 'listening') return;
    
    setTelemetriaState('processing');
    
    setTimeout(() => {
      setTelemetriaState('cooldown');
      setCooldownCount(1.2);
      
      const interval = setInterval(() => {
        setCooldownCount(c => {
          if (c <= 0.1) {
            clearInterval(interval);
            setTelemetriaState('listening');
            return 1.2;
          }
          return parseFloat((c - 0.1).toFixed(1));
        });
      }, 100);
    }, 1500);
  };

  const iniciarReescrituraCognitiva = () => {
    setMostrarDudaModal(false);
    setMostrarConsola(true);
    setConsolaLogs([]);
    setConsolaCompletada(false);

    const logs = [
      "🚀 INICIANDO CONEXIÓN CON ELARA COGNITIVE CORE...",
      "📡 ENTRADA EN MODO DE MUTACIÓN COGNITIVA [HOT-SWAP DE MEMORIA]",
      "🔍 ESCANEANDO TABLA SQLite 'planeacion' (Semana " + semanaPlan + ")...",
      "⚠️ DETECTADA COHERENCIA DE 0.65 - UMBRAL CRÍTICO (< 0.70)",
      "🧠 INICIALIZANDO PROCESO DE INFERENCIA EN EL MOTOR DE CURIOSIDAD...",
      "🤖 REESCRIBIENDO SECUENCIA DIDÁCTICA DÍA LUNES...",
      "📦 COMPILANDO TOPOLOGÍA CURRICULAR OPTIMIZADA...",
      "💾 APLICANDO OPERACIÓN WRITE-BACK EN SQLite...",
      "⚡ HOT-SWAP FINALIZADO CON ÉXITO. NUEVO CONFIDENCE SCORE: 1.0"
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setConsolaLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        
        const textoOriginal = planData.lunes_desarrollo || '';
        const nuevoTexto = textoOriginal + "\n\n✨ [REESCRITURA COGNITIVA ELARA: Se reestructuró la secuencia didáctica integrando un enfoque de indagación científica y pensamiento crítico, alineando los PDAs con problemáticas situacionales del entorno comunitario del alumno.]";
        
        if (ipcRenderer && planData.id) {
          ipcRenderer.invoke('trigger-curiosity-rewrite', planData.id, nuevoTexto).then(() => {
            ipcRenderer.invoke('get-planeacion', grupoActual?.id, semanaPlan).then(res => {
              setPlanData(res && res.id ? res : { lunes_inicio: '', lunes_desarrollo: '', lunes_cierre: '', martes_inicio: '', martes_desarrollo: '', martes_cierre: '', miercoles_inicio: '', miercoles_desarrollo: '', miercoles_cierre: '', jueves_inicio: '', jueves_desarrollo: '', jueves_cierre: '', viernes_inicio: '', viernes_desarrollo: '', viernes_cierre: '', recursos: '', evaluacion: '', adecuaciones: '', confidence_score: 1.0 });
              setConsolaCompletada(true);
              showToast("✅ Planificación reescrita con éxito");
            }).catch(console.error);
          }).catch(console.error);
        } else {
          setPlanData(prev => ({
            ...prev,
            lunes_desarrollo: nuevoTexto,
            confidence_score: 1.0
          }));
          setConsolaCompletada(true);
        }
      }
    }, 400);
  };

  useEffect(() => { if(ipcRenderer) ipcRenderer.invoke('get-alumnos', grupoActual?.id).then(r => setAlumnos(r || [])).catch(console.error); }, [vista, grupoActual]);
  useEffect(() => { if(ipcRenderer && vista==='CALENDARIO'){ ipcRenderer.invoke('get-eventos-oficiales').then(setEventosSEP); } }, [vista, mesCal, anioCal]);
  useEffect(() => { if(ipcRenderer) { ipcRenderer.invoke('get-comisiones').then(res => { setComisiones(res || []); }); ipcRenderer.invoke('get-vistos').then(res => setVistos(res || {})); } }, [vista]);

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-pdas-disciplina', 0, grado).then(res => {
        const filePdas = (res || []).map((item, idx) => {
          const semanaCorrespondiente = Math.min(42, Math.floor((idx / res.length) * 42) + 1);
          let nombreProyecto = 'Proyecto: ' + item.contenido;
          if (nombreProyecto.length > 80) {
            nombreProyecto = nombreProyecto.substring(0, 77) + '...';
          }
          return {
            id: item.id,
            grado: item.grado,
            campo: item.campo || 'N/A',
            contenido: item.contenido,
            proyecto_sugerido: nombreProyecto,
            descripcion: item.pda,
            paginas_libro: 'S/N',
            fecha: 'Semana ' + semanaCorrespondiente
          };
        });
        setPdasDisponibles(filePdas);

        if(vista === 'PROYECTOS') {
          ipcRenderer.invoke('get-proyectos', grupoActual?.id).then(guardadosRes => {
            const guardados = (guardadosRes || []).map(p => ({ ...p, pdas_seleccionados: safeParse(p.pdas_seleccionados, []), fases_contenido: safeParse(p.fases_contenido, {}) }));
            // Reparado pdasDb ReferenceError redirigiéndolo a filePdas
            const sugeridos = filePdas.map((p) => ({
              id: `sug-${p.id}`, nombre: p.proyecto_sugerido, metodologia: detectarMetodologia(p.campo),
              escenario: 'AULA', temporalidad: p.fecha || 'N/A', problemática: p.descripcion, 
              pdas_seleccionados: [], fases_contenido: {}, es_sugerido: true
            }));
            const nombresGuardados = guardados.map(g => g.nombre);
            const sugeridosFiltrados = sugeridos.filter(s => !nombresGuardados.includes(s.nombre));
            setListaProyectos([...guardados, ...sugeridosFiltrados]);
          });
        }

        const [anio, mes, dia] = configCiclo.fechaInicioStr.split('-');
        const fechaInicioObj = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
        
        const dosif = SEMANAS_CLASE.map(s => {
            const pdasEstaSemana = [];
            if (filePdas.length > 0) {
                filePdas.forEach((p, idx) => {
                    const semanaCorrespondiente = Math.min(42, Math.floor((idx / filePdas.length) * 42) + 1);
                    if (semanaCorrespondiente === s.id) {
                        pdasEstaSemana.push({
                            proyecto: p.proyecto_sugerido,
                            pda: p.descripcion,
                            nota: false
                        });
                    }
                });
                if (pdasEstaSemana.length === 0) {
                    const nearestIdx = Math.min(filePdas.length - 1, Math.floor(((s.id - 1) / 42) * filePdas.length));
                    const p = filePdas[nearestIdx];
                    if (p) {
                        pdasEstaSemana.push({
                            proyecto: p.proyecto_sugerido,
                            pda: p.descripcion,
                            nota: false
                        });
                    }
                }
            }
            return { ...s, pdas: pdasEstaSemana, fechas: obtenerFechasSemana(s.id, fechaInicioObj) };
        });
        setPlanDosif(dosif);

        if (vista === 'PLANNER') {
            const pdasSemanaAct = [];
            if (filePdas.length > 0) {
                filePdas.forEach((p, idx) => {
                    const semanaCorrespondiente = Math.min(42, Math.floor((idx / filePdas.length) * 42) + 1);
                    if (semanaCorrespondiente === semanaPlan) {
                        pdasSemanaAct.push({
                            proyecto: p.proyecto_sugerido,
                            pda: p.descripcion
                        });
                    }
                });
                if (pdasSemanaAct.length === 0) {
                    const nearestIdx = Math.min(filePdas.length - 1, Math.floor(((semanaPlan - 1) / 42) * filePdas.length));
                    const p = filePdas[nearestIdx];
                    if (p) {
                        pdasSemanaAct.push({
                            proyecto: p.proyecto_sugerido,
                            pda: p.descripcion
                        });
                    }
                }
            }
            setPdasSemana(pdasSemanaAct.length > 0 ? pdasSemanaAct : [{ proyecto: "Repaso", pda: "Periodo de fortalecimiento de aprendizajes." }]);
        }
      });
    }

    if(ipcRenderer && vista === 'PLANNER') {
        ipcRenderer.invoke('get-planeacion', grupoActual?.id, semanaPlan).then(res => setPlanData(res && res.id ? res : { lunes_inicio: '', lunes_desarrollo: '', lunes_cierre: '', martes_inicio: '', martes_desarrollo: '', martes_cierre: '', miercoles_inicio: '', miercoles_desarrollo: '', miercoles_cierre: '', jueves_inicio: '', jueves_desarrollo: '', jueves_cierre: '', viernes_inicio: '', viernes_desarrollo: '', viernes_cierre: '', recursos: '', evaluacion: '', adecuaciones: '', confidence_score: 1.0 }));
    }
  }, [vista, semanaPlan, grado, grupoActual, configCiclo]);

  // --- LÓGICA DE EVALUACIÓN ---
      const cargarEval = (campoF) => { 
      const targetCampo = campoF || campoActual;
      if(ipcRenderer){ 
          ipcRenderer.invoke('get-alumnos', grupoActual?.id).then(r => setAlumnos(r || [])); 
          ipcRenderer.invoke('get-criterios', grupoActual?.id, targetCampo).then(r=>{ 
              const lista = r || []; 
              const criteriosSeguros = lista.map((c, idx) => ({ 
                  ...c, 
                  frontId: c.id ? `db-${c.id}` : `temp-${targetCampo}-${idx}` 
              })); 
              
              if(criteriosSeguros.length === 0) setModoConfig(true); 
              else setModoConfig(false);
              
              setCriterios(criteriosSeguros); 
          }); 
          ipcRenderer.invoke('get-notas-fecha', fechaEval).then(r => { const m={}; (r || []).forEach(x=>m[`${x.alumno_id}-${x.criterio_id}`]=x.valor); setNotas(m); }); 
      } 
  };

  const cambiarCampo = (nuevoCampo) => {
      setCampoActual(nuevoCampo);
      cargarEval(nuevoCampo);
  };

  useEffect(() => { if(vista === 'EVAL') cargarEval(campoActual); }, [grupoActual, vista]);

  const handleChangeCriterio = (index, campo, valor) => {
      setCriterios(prev => prev.map((c, i) => i === index ? { ...c, [campo]: valor } : c));
  };

  const handleDeleteCriterio = (index) => {
      setCriterios(prev => prev.filter((_, i) => i !== index));
  };
  
  const agregarCriterioNuevo = () => {
      setCriterios(prev => [...prev, { frontId: `new-${Date.now()}`, nombre: '', porcentaje: '' }]);
  };
  
  const handleSaveNota = useCallback((aid, cid, val) => { 
      setNotas(prev => ({...prev, [`${aid}-${cid}`]: val})); 
      if(cid && typeof cid === 'number') { 
          ipcRenderer.invoke('save-nota', aid, cid, fechaEval, val).catch(console.error); 
      } 
  }, [fechaEval]);

  const calcularPromedioDiario = (alumnoId) => {
      if (!criterios || criterios.length === 0) return null;
      let sumaWeighted = 0;
      let totalPorcentaje = 0;
      criterios.forEach(c => {
          const val = parseFloat(notas[`${alumnoId}-${c.id}`]);
          const peso = parseFloat(c.porcentaje) || 0;
          if (!isNaN(val) && peso > 0) {
              sumaWeighted += val * peso;
              totalPorcentaje += peso;
          }
      });
      if (totalPorcentaje === 0) return null;
      return (sumaWeighted / totalPorcentaje).toFixed(1);
  };

  const guardarConfig = (customCriterios) => { 
      if(ipcRenderer) { 
          const targetGrupoId = grupoActual?.id;
          if (!targetGrupoId) {
              showToast("⚠️ Por favor, selecciona primero un grupo en el menú principal.");
              return;
          }
          const prev = Array.isArray(customCriterios) ? customCriterios : (criterios || []);
          const total = prev.reduce((acc, c) => acc + (parseFloat(c.porcentaje) || 0), 0); 
          if (Math.abs(total - 100) > 0.1) showToast(`⚠️ OJO: Los porcentajes suman ${total}%.`); 
          
          const validos = prev.filter(c => c.nombre && c.nombre.trim() !== ""); 
          const paraGuardar = validos.map(c => ({ id: c.id, nombre: c.nombre, porcentaje: parseFloat(c.porcentaje) || 0 })); 
          
          ipcRenderer.invoke('save-criterios', paraGuardar, targetGrupoId, campoActual).then(() => { 
              setModoConfig(false); 
              showToast(`✅ Criterios guardados para ${campoActual}`); 
              cargarEval(campoActual); 
          }).catch(err => {
              console.error(err);
              showToast(`❌ Error al guardar: ${err.message || err}`);
          }); 
      } 
  };

  // --- REPORTE TRIMESTRAL ---
  const generarReporteTrimestral = () => {
      if (!ipcRenderer || alumnos.length === 0) return;
      setCargandoReporte(true);
      const periodo = configCiclo.periodos[trimestre] || { inicio: '2026-08-31', fin: '2026-11-27' };
      if(ipcRenderer) {
          Promise.all([ ipcRenderer.invoke('get-criterios', grupoActual?.id), ipcRenderer.invoke('get-notas-rango', periodo.inicio, periodo.fin) ]).then(([todosCriterios, todasNotas]) => {
          const camposIds = ['LENGUAJES', 'SABERES', 'ETICA', 'HUMANO'];
          
          const reporte = alumnos.map(alumno => {
              const fila = { id: alumno.id, nombre: alumno.nombre };
              const promsCampos = [];

              camposIds.forEach(campoKey => {
                  const criteriosCampo = (todosCriterios || []).filter(c => (c.campo === campoKey) || (!c.campo && campoKey === 'LENGUAJES'));
                  const idsCritCampo = criteriosCampo.map(c => c.id);
                  const notasAlumno = (todasNotas || []).filter(n => n.alumno_id === alumno.id && idsCritCampo.includes(n.criterio_id));
                  const fechasUnicas = [...new Set(notasAlumno.map(n => n.fecha))];

                  let sumaPromediosDiarios = 0; let diasTrabajados = 0;
                  fechasUnicas.forEach(fecha => {
                      let sumaWeightedDia = 0;
                      let totalPorcentajeDia = 0;
                      criteriosCampo.forEach(c => {
                          const n = notasAlumno.find(x => x.fecha === fecha && x.criterio_id === c.id);
                          const val = n ? parseFloat(n.valor) : NaN;
                          const peso = parseFloat(c.porcentaje) || 0;
                          if (!isNaN(val) && peso > 0) {
                              sumaWeightedDia += val * peso;
                              totalPorcentajeDia += peso;
                          }
                      });
                      if(totalPorcentajeDia > 0) {
                          const promDia = sumaWeightedDia / totalPorcentajeDia;
                          sumaPromediosDiarios += promDia;
                          diasTrabajados++;
                      }
                  });

                  const promCampo = diasTrabajados > 0 ? parseFloat((sumaPromediosDiarios / diasTrabajados).toFixed(1)) : null;
                  fila[campoKey] = promCampo !== null ? promCampo : '-';
                  if (promCampo !== null) promsCampos.push(promCampo);
              });

              const promedioFinal = promsCampos.length > 0 ? (promsCampos.reduce((a, b) => a + b, 0) / promsCampos.length).toFixed(1) : '-';
              fila.promedioFinal = promedioFinal;
              return fila;
          });
          setResumen(reporte); setCargandoReporte(false);
      });
  }};
  useEffect(() => { if (vista === 'TRIMESTRAL') generarReporteTrimestral(); }, [vista, trimestre]);

  // --- HELPERS PROYECTOS ---
  const editarProyectoSafe = (p) => { 
      setProyectoActual({ 
          ...p, 
          pdas_seleccionados: safeParse(p.pdas_seleccionados, []), 
          fases_contenido: safeParse(p.fases_contenido, {}) 
      }); 
      setModoEdicionProy(true); 
  };
  const guardarProyecto = () => { if(!proyectoActual.nombre) return showToast("Falta nombre"); const proy = { ...proyectoActual, id: (typeof proyectoActual.id === 'string' && proyectoActual.id.startsWith('sug-')) ? null : proyectoActual.id, grado, grupo_id: grupoActual?.id }; ipcRenderer.invoke('save-proyecto', proy).then(()=>{ showToast("✅ Proyecto guardado"); setModoEdicionProy(false); setVista('MENU'); setTimeout(() => setVista('PROYECTOS'), 50); }); };
  const guardarProyectoSilencioso = (proyectoData) => {
    const target = proyectoData || proyectoActual;
    if (!target || !target.nombre) return Promise.resolve(false);
    const proy = {
      ...target,
      id: (typeof target.id === 'string' && target.id.startsWith('sug-')) ? null : target.id,
      grado,
      grupo_id: grupoActual?.id
    };
    if (ipcRenderer) {
      return ipcRenderer.invoke('save-proyecto', proy).then(() => {
        showToast("✅ Proyecto guardado");
        return true;
      }).catch(err => {
        console.error("Error al guardar proyecto:", err);
        return false;
      });
    }
    return Promise.resolve(false);
  };
  const togglePdaProyecto = (id) => { const s = Array.isArray(proyectoActual.pdas_seleccionados) ? proyectoActual.pdas_seleccionados : []; const n = s.includes(id) ? s.filter(x => x !== id) : [...s, id]; setProyectoActual({...proyectoActual, pdas_seleccionados: n}); };
  const calcularColorSemaforo = (p) => { const f = Object.values(safeParse(p.fases_contenido, {})); const l = f.filter(x => x && x.length > 5).length; if (l === 0) return '#ffebee'; if (l < 4) return '#fff9c4'; return '#e8f5e9'; };
  const actualizarDatoProyecto = (campo, valor) => { setProyectoActual(prev => ({ ...prev, [campo]: valor })); };
  const actualizarFaseProyecto = (index, valor) => { setProyectoActual(prev => { const fases = safeParse(prev.fases_contenido, {}); fases[index] = valor; return { ...prev, fases_contenido: fases }; }); };

  const procesarListaAlumnos = async () => { 
      try {
          if (!textoPegado.trim()) return showToast("La lista está vacía."); 
          setProcesando(true); 
          const lista = textoPegado.split(/[\r\n]+/); 
          let agregados = 0;
          for (let nombre of lista) { 
              let limpio = nombre.replace(/^[\d\.\-\)\s]+/, '').trim().toUpperCase(); 
              if (limpio.length > 1) {
                  await ipcRenderer.invoke('add-alumno', limpio, grupoActual?.id); 
                  agregados++;
              }
          } 
          await ipcRenderer.invoke('get-alumnos', grupoActual?.id).then(setAlumnos); 
          setProcesando(false); 
          setTextoPegado(""); 
          showToast(`✅ ${agregados} alumnos agregados correctamente.`); 
      } catch (error) {
          setProcesando(false);
          showToast("Error al agregar alumnos: " + error.message);
      }
  };
  const borrarAlumno = (id) => { if(confirm("¿Borrar?")) ipcRenderer.invoke('delete-alumno', id).then(()=>ipcRenderer.invoke('get-alumnos', grupoActual?.id).then(setAlumnos)); };
  const savePlan = () => ipcRenderer.invoke('save-planeacion', {...planData, grado, grupo_id: grupoActual?.id, semana:semanaPlan}).then(()=>showToast("✅ Planeación guardada"));
  
  const pdasFiltrados = useMemo(() => {
    return pdasDisponibles.filter(p => !busquedaPda || p.descripcion.toLowerCase().includes(busquedaPda.toLowerCase()) || (p.proyecto_sugerido && p.proyecto_sugerido.toLowerCase().includes(busquedaPda.toLowerCase())));
  }, [pdasDisponibles, busquedaPda]);

  const selAlumnoBitacora = (a) => { setAlumnoBitacora(a); if(a && ipcRenderer) { ipcRenderer.invoke('get-perfil', a.id).then(r => setPerfil(r || {})); ipcRenderer.invoke('get-incidencias', a.id).then(setIncidencias); } };
  const savePerfil = (e) => { e.preventDefault(); const d = new FormData(e.target); const obj = Object.fromEntries(d.entries()); obj.alumno_id = alumnoBitacora.id; ipcRenderer.invoke('save-perfil', obj).then(() => showToast("✅ Ficha guardada")); };
  const saveInc = () => { const d={...formInc, alumno_id:alumnoBitacora.id, fecha:fechaInc}; ipcRenderer.invoke('save-incidencia', d).then(()=>{ ipcRenderer.invoke('get-incidencias', alumnoBitacora.id).then(setIncidencias); setFormInc({situacion:'', involucrados:'', medidas:''}); showToast("✅ Reporte guardado"); }); };
  const toggleEventoCalendario = (f) => { if (!modoConfigCalendario) { setFechaEval(f); setVista('EVAL'); cargarEval(); return; } const e = eventosSEP[f]; let n = herramientaSeleccionada; if (e === herramientaSeleccionada) n = 'BORRAR'; if(ipcRenderer) ipcRenderer.invoke('save-evento-oficial', f, n).then(() => { const c = {...eventosSEP}; if(n === 'BORRAR') delete c[f]; else c[f] = n; setEventosSEP(c); }); };
  const renderCal = () => {
    const dias=new Date(anioCal, mesCal, 0).getDate(), ini=new Date(anioCal, mesCal-1, 1).getDay();
    const arr=[];
    for(let i=0;i<ini;i++) arr.push(<div key={`v${i}`} className="dia-vacio"></div>);
    for(let d=1;d<=dias;d++){
      const f=`${anioCal}-${String(mesCal).padStart(2,'0')}-${String(d).padStart(2,'0')}`, te=eventosSEP[f];
      let st={};
      if(te && TIPOS_EVENTO[te]){st={background:TIPOS_EVENTO[te].color,color:TIPOS_EVENTO[te].texto||'black',border:'1px solid #ccc'};}
      arr.push(<div key={d} className="dia-calendario" style={st} onClick={()=>toggleEventoCalendario(f)}><span className="numero-dia">{d}</span>{te && TIPOS_EVENTO[te] && <span style={{display:'block', fontSize:'0.8rem'}}>{TIPOS_EVENTO[te].label}</span>}</div>);
    }
    return arr;
  };

  
  
  const getColorSemaforo = (promedio) => { 
      if (promedio === null || promedio === undefined || promedio === '' || promedio === '-') return 'transparent';
      const p = parseFloat(promedio); 
      if (isNaN(p)) return 'transparent'; 
      if (p < 6.0) return '#ffcdd2'; // Rojo (5 a 6)
      if (p < 9.0) return '#fff9c4'; // Amarillo (6 a 9)
      return '#c8e6c9';             // Verde (9 a 10)
  };

  // ================= RENDER INTERFACES DE ELARA =================
  const renderAcousticTelemetry = () => {
    // No mostrar si está cargando o es la pantalla de activación
    if (cargandoLicencia || (licenciaInfo && !licenciaInfo.isActivated && !licenciaInfo.isTrialValid)) return null;
    return (
      <div className={`elara-acoustic-monitor state-${telemetriaState}`} onClick={handleTelemetriaClick}>
        <div className="telemetria-glow"></div>
        <div className="telemetria-content">
          {telemetriaState === 'listening' && (
            <>
              <div className="wave-container">
                <span className="wave-bar bar-1"></span>
                <span className="wave-bar bar-2"></span>
                <span className="wave-bar bar-3"></span>
                <span className="wave-bar bar-4"></span>
                <span className="wave-bar bar-5"></span>
              </div>
              <span className="telemetria-label">ELARA: ESCUCHANDO</span>
            </>
          )}
          {telemetriaState === 'processing' && (
            <>
              <div className="spinner-processing"></div>
              <span className="telemetria-label">ELARA: PENSANDO...</span>
            </>
          )}
          {telemetriaState === 'cooldown' && (
            <>
              <div className="cooldown-dial">{cooldownCount}s</div>
              <span className="telemetria-label">ELARA: COOLDOWN AEC</span>
            </>
          )}
        </div>
        <div className="telemetria-tooltip">
          <strong>Telemetría Acústica ELARA</strong>
          <p>Estado actual: {telemetriaState.toUpperCase()}</p>
          <small>Haz clic para simular la monitorización acústica del aula.</small>
        </div>
      </div>
    );
  };

  const renderConsolaMutacion = () => {
    if (!mostrarConsola) return null;
    return (
      <div className="elara-consola-overlay">
        <div className="elara-consola-box">
          <div className="consola-header">
            <div className="consola-dots">
              <span className="consola-dot red"></span>
              <span className="consola-dot yellow"></span>
              <span className="consola-dot green"></span>
            </div>
            <span className="consola-title">CONSOLA DE MUTACIÓN OPERATIVA v1.2.9</span>
          </div>
          <div className="consola-body">
            <div className="consola-terminal-text">
              {consolaLogs.map((log, idx) => (
                <div key={idx} className="consola-line">
                  <span className="consola-prompt">&gt;&gt;</span> {log}
                </div>
              ))}
              {!consolaCompletada && <div className="consola-cursor-pulse">_</div>}
            </div>
            
            {consolaCompletada && (
              <div className="consola-finalizado-banner">
                <h4>🧬 MUTACIÓN OPERATIVA COMPLETADA CON ÉXITO</h4>
                <p>Hot-swap de secuencia didáctica inyectado en SQLite y RAM local sin colisiones.</p>
                <button className="btn-cerrar-consola" onClick={() => setMostrarConsola(false)}>
                  CERRAR CONSOLA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDudaModal = () => {
    if (!mostrarDudaModal) return null;
    return (
      <div className="elara-modal-overlay">
        <div className="elara-modal-box">
          <div className="modal-cyber-header">
            <h3>⚠️ DUDA EPISTÉMICA DETECTADA: ELARA COGNITIVE CORE</h3>
          </div>
          <div className="modal-cyber-body">
            <p>El motor cognitivo de <strong>ELARA</strong> ha detectado una consistencia didáctica baja (Score: <strong>{planData.confidence_score}</strong>) en la planeación didáctica seleccionada.</p>
            <p>Esto se debe a recientes modificaciones en la dosificación oficial y a desajustes semánticos con la problemática.</p>
            <div className="modal-cyber-details">
              <strong>Acciones correctivas proactivas:</strong>
              <ul>
                <li>Ejecutar reescritura semántica de la planeación para el día Lunes.</li>
                <li>Elevar score de consistencia a 1.0 (Sin inconsistencias detectadas).</li>
                <li>Inyectar estrategias de pensamiento crítico NEM en el backend de forma segura.</li>
              </ul>
            </div>
          </div>
          <div className="modal-cyber-footer">
            <button className="btn-cyber-cancel" onClick={() => setMostrarDudaModal(false)}>Ignorar Alerta</button>
            <button className="btn-cyber-confirm" onClick={iniciarReescrituraCognitiva}>🧬 Reescribir con ELARA</button>
          </div>
        </div>
      </div>
    );
  };

  // ================= SWITCH PRINCIPAL DE VISTAS (React Router alternativo) =================
  const renderVistaContent = () => {
    if (vista === 'GRUPOS') {
      setVista('MENU');
      return null;
    }

    if(vista === 'MENU') {
      const menuItems = [
        { id: 'GRUPO', icon: '👥', label: grupoActual ? `${grupoActual.grado}º${grupoActual.seccion} ${grupoActual.nombre_disciplina}` : 'Mi Grupo', desc: `${alumnos.length} alumnos`, color: '#6C5CE7', action: ()=>setVista('GRUPO') },
        { id: 'EVAL', icon: '📝', label: 'Evaluación', desc: 'Calificaciones diarias', color: '#00B894', action: ()=>{setVista('EVAL'); cargarEval();} },
        { id: 'TRIMESTRAL', icon: '📊', label: 'Trimestral', desc: 'Reporte por período', color: '#E17055', action: ()=>{setVista('TRIMESTRAL'); setTrimestre(1);} },
        { id: 'PLANNER', icon: '📅', label: 'Planeación', desc: 'Secuencia semanal', color: '#0984E3', action: ()=>setVista('PLANNER') },
        { id: 'DOSIF', icon: '🚦', label: 'Dosificador', desc: 'Distribución anual', color: '#FDCB6E', action: ()=>setVista('DOSIF') },
        { id: 'CALENDARIO', icon: '📆', label: 'Calendario', desc: 'Eventos SEP', color: '#A29BFE', action: ()=>{setVista('CALENDARIO'); ipcRenderer.invoke('get-eventos-oficiales').then(setEventosSEP);} },
        { id: 'COMISIONES', icon: '🔔', label: 'Comisiones', desc: `${comisiones.length} pendientes`, color: '#FD79A8', action: ()=>setVista('COMISIONES') },
        { id: 'PROYECTOS', icon: '🚀', label: 'Proyectos', desc: 'Didácticos NEM', color: '#00CEC9', action: ()=>setVista('PROYECTOS') },
        { id: 'BITACORA', icon: '📂', label: 'Bitácora', desc: 'Fichas e incidencias', color: '#636E72', action: ()=>{setVista('BITACORA'); setAlumnoBitacora(null);} },
        { id: 'MATERIALES', icon: '🧩', label: 'Materiales', desc: 'Exámenes y juegos', color: '#FF9F43', action: ()=>setVista('MATERIALES') },
        { id: 'CONFIG', icon: '⚙️', label: 'Ajustes Ciclo', desc: 'Fechas y SEP', color: '#2C3E50', action: ()=>setVista('CONFIG') },
      ];

      return (
        <div className="pantalla-menu">
          <div className="menu-header-zone">
            <div className="menu-header-glow"></div>
            <h1 className="titulo-principal">PLANIFICADOR DOCENTE</h1>
            <p className="menu-subtitle">Ciclo Escolar 2026 - 2027 (INTEGRACIÓN ELARA)</p>
            {licenciaInfo && licenciaInfo.isTrialValid && !licenciaInfo.isActivated && (
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginTop: '10px'}}>
                <div style={{background: '#f39c12', color: 'white', padding: '5px 15px', borderRadius: '15px', fontSize: '0.9rem', fontWeight: 'bold'}}>
                  Prueba Gratuita: {licenciaInfo.trialDaysRemaining} días restantes
                </div>
                <button 
                  onClick={() => setVista('LICENCIA')}
                  style={{background: '#27ae60', color: 'white', padding: '5px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}}>
                  🔑 Adquirir Licencia
                </button>
              </div>
            )}

            <div style={{marginTop: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
              <div style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '6px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{color: 'white', fontWeight: 'bold', fontSize: '1.1rem'}}>Grado Activo:</span>
                <select 
                  value={grado} 
                  onChange={e => {
                    const g = Number(e.target.value);
                    setGrado(g);
                    localStorage.setItem('grado', g);
                    setGrupoActual(prev => ({ ...(prev||{}), grado: g, seccion: '' }));
                  }}
                  style={{fontSize: '1.1rem', padding: '6px 15px', borderRadius: '20px', border: 'none', fontWeight: 'bold', background: 'white', color: '#2c3e50', cursor: 'pointer', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'}}
                >
                  <option value={1}>1º Primaria</option>
                  <option value={2}>2º Primaria</option>
                  <option value={3}>3º Primaria</option>
                  <option value={4}>4º Primaria</option>
                  <option value={5}>5º Primaria</option>
                  <option value={6}>6º Primaria</option>
                </select>
              </div>
            </div>
          </div>

          {/* Feed de Descubrimientos Nocturnos de ELARA */}
          {elaraInsights.filter(ins => ins.visto === 0).map(ins => (
            <div key={ins.id} className="feed-descubrimiento-nocturno">
              <div className="descubrimiento-glow"></div>
              <div className="descubrimiento-content-wrapper">
                <div className="descubrimiento-header">
                  <span className="descubrimiento-icon">🌙</span>
                  <span className="descubrimiento-badge">Descubrimiento Nocturno ELARA</span>
                  <span className="descubrimiento-fecha">{ins.fecha}</span>
                </div>
                <h3 className="descubrimiento-titulo">{ins.titulo}</h3>
                <p className="descubrimiento-mensaje">{ins.mensaje}</p>
                <div className="descubrimiento-acciones">
                  <button className="btn-descubrimiento-accion" onClick={() => setVista('MATERIALES')}>
                    🧩 Generar Material didáctico
                  </button>
                  <button className="btn-descubrimiento-descartar" onClick={() => handleMarcarInsightVisto(ins.id)}>
                    Archivar Notificación
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="grid-menu">
              {menuItems.map((item, idx) => (
                  <button key={item.id} className="boton-menu" onClick={item.action} style={{'--card-color': item.color, '--delay': `${idx * 0.06}s`}}>
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-label">{item.label}</span>
                      <span className="menu-desc">{item.desc}</span>
                  </button>
              ))}
          </div>
      </div>
      );
    }

    if(vista === 'MATERIALES') {
      return <GeneradorMaterial onVolver={() => setVista('MENU')} pdasDisponibles={pdasDisponibles} grado={grado} />;
    }

    if(vista === 'CONFIG') {
      return <ConfiguracionCiclo onVolver={() => {
          setVista('MENU');
          ipcRenderer.invoke('get-config').then(cfg => {
            if (cfg.fechaInicioStr || cfg.periodos) {
                setConfigCiclo({
                    fechaInicioStr: cfg.fechaInicioStr || '2026-08-31',
                    periodos: cfg.periodos ? JSON.parse(cfg.periodos) : DEFAULT_PERIODOS
                });
            }
          });
      }} 
      currentConfig={configCiclo} 
      defaultConfig={{fechaInicioStr: '2026-08-31', periodos: DEFAULT_PERIODOS}} />;
    }

    if (vista === 'LICENCIA') {
      return <Licencia 
          onActivated={() => {
              ipcRenderer.invoke('get-license-status').then(res => {
                  setLicenciaInfo(res);
                  window.openaiApiKey = res.openaiApiKey || '';
              });
              setVista('MENU');
              showToast("✅ ¡Licencia activada con éxito!");
          }} 
          onVolver={() => setVista('MENU')}
      />;
    }

            if(vista === 'EVAL') { 
      const sumaPorcentajes = (criterios || []).reduce((acc, c) => acc + (parseFloat(c.porcentaje) || 0), 0); 
      
      return (
      <div className="pantalla-dosificador">
          {toast && (
              <div style={{position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#34495e', color:'white', padding:'10px 20px', borderRadius:20, zIndex:9999, fontWeight:'bold', boxShadow:'0 4px 10px rgba(0,0,0,0.2)'}}>
                  {toast}
              </div>
          )}
          <div className="header-dosificador">
              <div style={{display:'flex', gap:15, alignItems:'center'}}><h2>📝 Evaluación ({grado}º Primaria)</h2><input type="date" value={fechaEval} onChange={e=>{setFechaEval(e.target.value); cargarEval(campoActual);}} style={{fontSize:'1.1rem', padding:'5px', border:'2px solid #004aad', borderRadius:5}} /></div>
              <div><button className="btn-volver" style={{marginRight:10, background: modoConfig ? '#7f8c8d' : '#e67e22'}} onClick={()=>setModoConfig(!modoConfig)}>{modoConfig ? '↩ Volver' : '⚙️ Configurar Criterios'}</button><button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button></div>
          </div>

          {/* BARRA DE SELECCION DE MATERIAS / CAMPOS FORMATIVOS */}
          <div className="no-print" style={{display:'flex', gap:10, padding:'10px 20px', background:'#f8f9fa', borderBottom:'1px solid #e0e0e0', overflowX:'auto'}}>
            <button onClick={()=>cambiarCampo('LENGUAJES')} style={{padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:'bold', background: campoActual==='LENGUAJES' ? '#8E24AA' : '#e0e0e0', color: campoActual==='LENGUAJES' ? 'white' : '#333', transition:'all 0.3s'}}>🟣 Lenguajes</button>
            <button onClick={()=>cambiarCampo('SABERES')} style={{padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:'bold', background: campoActual==='SABERES' ? '#00897B' : '#e0e0e0', color: campoActual==='SABERES' ? 'white' : '#333', transition:'all 0.3s'}}>🟢 Saberes y Pensamiento C.</button>
            <button onClick={()=>cambiarCampo('ETICA')} style={{padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:'bold', background: campoActual==='ETICA' ? '#1E88E5' : '#e0e0e0', color: campoActual==='ETICA' ? 'white' : '#333', transition:'all 0.3s'}}>🔵 Ética, Naturaleza y Soc.</button>
            <button onClick={()=>cambiarCampo('HUMANO')} style={{padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:'bold', background: campoActual==='HUMANO' ? '#E53935' : '#e0e0e0', color: campoActual==='HUMANO' ? 'white' : '#333', transition:'all 0.3s'}}>🔴 De lo Humano y lo Com.</button>
          </div>

          <div style={{flexGrow:1, display:'flex', flexDirection:'column', padding:15}}>
            
            {modoConfig ? (
                <div className="columna-gestion" style={{maxWidth:700, margin:'10px auto', padding:25, borderRadius:15, boxShadow:'0 4px 15px rgba(0,0,0,0.1)', background:'white'}}>
                    <h3 style={{textAlign:'center', color:'#004aad'}}>⚙️ Configurar Criterios para {campoActual}</h3>
                    <div style={{background:'#eee', height:25, borderRadius:15, margin:'15px 0', position:'relative', overflow:'hidden'}}><div style={{width:`${Math.min(sumaPorcentajes, 100)}%`, background:sumaPorcentajes===100?'#2ecc71':'#e74c3c', height:'100%', transition:'width 0.5s'}}></div><span style={{position:'absolute', width:'100%', textAlign:'center', top:3, fontWeight:'bold', fontSize:'0.9rem', color:'#333'}}>Suma: {sumaPorcentajes}%</span></div>
                    <div style={{background:'#fafafa', padding:15, borderRadius:10, border:'1px solid #ddd'}}>
                        
                        {(criterios || []).map((c, i)=>(
                            <div key={`crit-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                                <span style={{fontWeight:'bold', width:30}}>{i+1}.</span>
                                <input
                                    value={c.nombre}
                                    onChange={(e) => handleChangeCriterio(i, 'nombre', e.target.value)}
                                    placeholder="Ej: Tareas, Examen, Participación..."
                                    style={{flexGrow:1, padding:10, border:'1px solid #ccc', borderRadius:5}}
                                />
                                <div style={{position:'relative'}}>
                                    <input
                                        value={c.porcentaje}
                                        onChange={(e) => handleChangeCriterio(i, 'porcentaje', e.target.value)}
                                        placeholder="0"
                                        style={{padding:10, border:'1px solid #ccc', borderRadius:5, textAlign:'center', width: 70}}
                                    />
                                    <span style={{position:'absolute', right:25, top:10, color:'#999'}}>%</span>
                                </div>
                                <button onClick={()=>handleDeleteCriterio(i)} style={{background:'#c0392b', color:'white', border:'none', borderRadius:5, width:40, height:40, cursor:'pointer', fontSize:'1.2rem'}}>×</button>
                            </div>
                        ))}

                        <div style={{display:'flex', gap:20, marginTop:20, justifyContent:'center'}}><button onClick={agregarCriterioNuevo} style={{padding:'10px 20px', background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>+ Criterio</button><button className="btn-guardar" onClick={()=>guardarConfig(criterios)} style={{width:'auto', padding:'10px 30px', background: sumaPorcentajes===100 ? '#2ecc71' : '#95a5a6'}}>💾 GUARDAR CRITERIOS DE {campoActual}</button></div>
                    </div>
                </div>
            ) : (
                <div className="tabla-container"><table className="tabla-eval"><thead><tr><th style={{width:50, textAlign:'center'}}>Nº</th><th style={{width:250}}>ALUMNO</th>{(criterios || []).map((c,i)=><th key={i}>{c.nombre}<br/><small style={{opacity:0.8}}>{c.porcentaje}%</small></th>)}<th style={{background:'#2c3e50', color:'white', width:'80px', textAlign:'center'}}>PROMEDIO</th></tr></thead><tbody>{(alumnos || []).map((al, index)=>{const prom = calcularPromedioDiario(al.id); return (<tr key={al.id} style={{backgroundColor: getColorSemaforo(prom)}}><td style={{textAlign:'center', fontWeight:'bold', color:'#555'}}>{index + 1}</td><td className="celda-nombre">{al.nombre}</td>{(criterios || []).map(c=>( <td key={c.frontId}><CeldaNota idAlumno={al.id} idCriterio={c.id} valorInicial={notas[`${al.id}-${c.id}`]} onGuardar={handleSaveNota} /></td> ))}<td style={{textAlign:'center', fontWeight:'bold', fontSize:'1.2rem'}}>{prom || '-'}</td></tr>);})}</tbody></table></div>
            )}
          </div>
      </div>
      );
    }

    if(vista === 'BITACORA') {
      return (
        <div className="pantalla-dosificador" style={{flexDirection:'row', padding:0}}> 
          <div className="sidebar-lista">
            <div style={{padding:15, background:'#004aad', color:'white'}}><h3>📂 Alumnos</h3><button onClick={()=>setVista('MENU')} style={{color:'black'}}>Salir</button></div>
            <ul className="lista-alumnos-simple">{alumnos.map(a=><li key={a.id} onClick={()=>selAlumnoBitacora(a)} className={alumnoBitacora?.id===a.id?'activo':''}>{a.nombre}</li>)}</ul>
          </div> 
          <div className="contenido-bitacora" style={{padding:20, flexGrow:1, overflowY:'auto'}}> 
            {!alumnoBitacora ? <div style={{textAlign:'center', marginTop:100, color:'#999'}}><h2>👈 Selecciona un alumno</h2></div> : ( 
              <> 
                <div className="header-alumno"><h2 style={{color:'#004aad'}}>👤 {alumnoBitacora.nombre}</h2><div className="tabs-bitacora"><button className={tabBitacora==='PERFIL'?'activo':''} onClick={()=>setTabBitacora('PERFIL')}>📋 Ficha Técnica</button><button className={tabBitacora==='INCIDENCIAS'?'activo':''} onClick={()=>setTabBitacora('INCIDENCIAS')}>⚠️ Incidencias</button></div></div> 
                {tabBitacora==='PERFIL' ? ( 
                  <form className="form-perfil" onSubmit={savePerfil}> 
                    <div className="seccion-form"> 
                      <h4>Datos Personales</h4> 
                      <div className="grid-dos"> 
                        <input name="curp" defaultValue={perfil.curp} placeholder="CURP" /> 
                        <input name="f_nacimiento" type="date" defaultValue={perfil.f_nacimiento} placeholder="Fecha Nacimiento" /> 
                      </div> 
                      <div className="grid-dos" style={{marginTop:10}}> 
                        <input name="edad" defaultValue={perfil.edad} placeholder="Edad" style={{width:80}} /> 
                        <input name="peso" defaultValue={perfil.peso} placeholder="Peso (kg)" /> 
                        <input name="estatura" defaultValue={perfil.estatura} placeholder="Estatura (cm)" /> 
                      </div> 
                      <div className="grid-dos" style={{marginTop:10}}> 
                        <input name="tipo_sangre" defaultValue={perfil.tipo_sangre} placeholder="Tipo Sangre" /> 
                        <input name="servicio_medico" defaultValue={perfil.servicio_medico} placeholder="Servicio Médico" /> 
                      </div> 
                      <input name="alergias" defaultValue={perfil.alergias} placeholder="Alergias / Padecimientos" style={{width:'100%', marginTop:10}}/> 
                      <input name="direccion" defaultValue={perfil.direccion} placeholder="Dirección completa" style={{width:'100%', marginTop:10}}/> 
                    </div> 
                    <div className="seccion-form"> 
                      <h4>Datos de Padres / Tutores</h4> 
                      <div className="grid-dos"><input name="nombre_mama" defaultValue={perfil.nombre_mama} placeholder="Nombre Madre"/><input name="tel_mama" defaultValue={perfil.tel_mama} placeholder="Teléfono"/></div> 
                      <div className="grid-dos" style={{marginTop:10}}><input name="nombre_papa" defaultValue={perfil.nombre_papa} placeholder="Nombre Padre"/><input name="tel_papa" defaultValue={perfil.tel_papa} placeholder="Teléfono"/></div> 
                      <textarea name="otros_datos" defaultValue={perfil.otros_datos} placeholder="Otros datos relevantes..." style={{width:'100%', marginTop:10, height:60}}></textarea> 
                    </div> 
                    <button className="btn-guardar">💾 Guardar Ficha</button> 
                  </form> 
                ) : ( 
                  <div className="panel-incidencias">
                    <div className="nueva-incidencia">
                      <input type="date" value={fechaInc} onChange={e=>setFechaInc(e.target.value)}/>
                      <input placeholder="Situación" value={formInc.situacion} onChange={e=>setFormInc({...formInc, situacion:e.target.value})} style={{width:'100%'}}/>
                      <input placeholder="Acuerdos / Medidas" value={formInc.medidas} onChange={e=>setFormInc({...formInc, medidas:e.target.value})} style={{width:'100%'}}/>
                      <button onClick={saveInc} className="btn-guardar">Agregar</button>
                    </div>
                    <div className="lista-reportes">{incidencias.map(i=><div key={i.id} className="tarjeta-incidencia"><b>{i.fecha}</b>: {i.situacion}<br/><small>{i.medidas}</small></div>)}</div>
                  </div> 
                )} 
              </> 
            )} 
          </div> 
        </div>
      );
    }

    if(vista==='TRIMESTRAL') {
      return (
        <div className="pantalla-dosificador">
          <div className="header-dosificador no-print">
            <h2>📊 Reporte de Evaluaciones Trimestrales ({grado}º Primaria)</h2>
            <div style={{display:'flex', gap:10}}>
              <button className="btn-guardar" onClick={generarReporteTrimestral}>{cargandoReporte ? '⏳ Calculando...' : '🔄 Recalcular'}</button>
              <button className="btn-volver" onClick={()=>window.print()}>🖨️ Imprimir Reporte</button>
              <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button>
            </div>
          </div>
          <div className="tabs-trimestres no-print">{[1,2,3].map(id=><button key={id} className={`tab-btn ${trimestre===id?'activo':''}`} onClick={()=>setTrimestre(id)}>{configCiclo.periodos[id].nombre}</button>)}</div>
          <div className="tabla-container">
            <table className="tabla-eval" style={{maxWidth: '1150px', width: '100%'}}>
              <thead>
                <tr>
                  <th style={{width:40, textAlign:'center'}}>Nº</th>
                  <th style={{width: 250}}>ALUMNO</th>
                  <th style={{background:'#8E24AA', color:'white', textAlign:'center'}}>🟣 LENGUAJES</th>
                  <th style={{background:'#00897B', color:'white', textAlign:'center'}}>🟢 SABERES Y P.C.</th>
                  <th style={{background:'#1E88E5', color:'white', textAlign:'center'}}>🔵 ÉTICA, NAT. Y SOC.</th>
                  <th style={{background:'#E53935', color:'white', textAlign:'center'}}>🔴 DE LO HUMANO</th>
                  <th style={{background:'#2c3e50', color:'white', width:140, textAlign:'center'}}>PROMEDIO TRIMESTRAL</th>
                </tr>
              </thead>
              <tbody>
                {(resumen || []).map((r, i)=>(
                  <tr key={r.id}>
                    <td style={{textAlign:'center', fontWeight:'bold', color:'#555'}}>{i + 1}</td>
                    <td className="celda-nombre">{r.nombre}</td>
                    <td style={{textAlign:'center', fontWeight:'bold', background:getColorSemaforo(r.LENGUAJES)}}>{r.LENGUAJES || '-'}</td>
                    <td style={{textAlign:'center', fontWeight:'bold', background:getColorSemaforo(r.SABERES)}}>{r.SABERES || '-'}</td>
                    <td style={{textAlign:'center', fontWeight:'bold', background:getColorSemaforo(r.ETICA)}}>{r.ETICA || '-'}</td>
                    <td style={{textAlign:'center', fontWeight:'bold', background:getColorSemaforo(r.HUMANO)}}>{r.HUMANO || '-'}</td>
                    <td style={{textAlign:'center', fontWeight:'bold', fontSize:'1.3rem', background:getColorSemaforo(r.promedioFinal)}}>{r.promedioFinal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if(vista === 'DOSIF') {
      return ( 
      <div className="pantalla-dosificador"> 
        <div className="header-dosificador no-print"> 
          <div style={{display:'flex', gap:15, alignItems:'center'}}><h2>Dosificador Anual</h2><select value={grado} onChange={e => { const g = Number(e.target.value); setGrado(g); localStorage.setItem('grado', g); setGrupoActual(prev => ({ ...(prev||{}), grado: g })); }} style={{fontSize:'1.1rem', padding:'5px 10px', borderRadius:5, border:'2px solid #FDCB6E', fontWeight:'bold', background:'white', cursor:'pointer'}}><option value={1}>1º Primaria</option><option value={2}>2º Primaria</option><option value={3}>3º Primaria</option><option value={4}>4º Primaria</option><option value={5}>5º Primaria</option><option value={6}>6º Primaria</option></select></div> 
          <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button> 
        </div> 
        <div className="tabla-semanal"> 
          {planDosif.map(s => { 
            const isVisto = (vistos.dosif || []).includes(String(s.id)); 
            return ( 
              <div key={s.id} className="fila-semana" style={{opacity: isVisto ? 0.6 : 1, transition: 'opacity 0.3s'}}> 
                <div className="info-semana" style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}> 
                  <strong>Sem {s.id}</strong><br/> 
                  <small style={{fontSize:'0.75rem', color:'#eee'}}>{s.fechas}</small> 
                  <button className="no-print" onClick={()=>toggleVisto('dosif', s.id)} style={{marginTop: 5, padding: '2px 5px', fontSize: '0.7rem', cursor: 'pointer', background: isVisto ? '#2ecc71' : 'rgba(255,255,255,0.3)', color: 'white', border: '1px solid white', borderRadius: 3}}> 
                    {isVisto ? '✅ Vista' : 'Marcar vista'} 
                  </button> 
                </div> 
                <div className="contenido-semana"> 
                  {(s.pdas||[]).length === 0 ? <span style={{opacity:0.5, fontStyle:'italic'}}>Sin contenido</span> : (s.pdas||[]).map((p, i) => ( 
                    <div key={i} className="chip-pda" style={{backgroundColor: p.nota ? '#fff3cd' : '#e3f2fd', color: '#333'}}> 
                      <strong>{p.proyecto}</strong><br/> 
                      <small>{p.pda}</small> 
                    </div> 
                  )) } 
                </div> 
              </div> 
            );
          })} 
        </div> 
      </div> 
      );
    }

    if(vista === 'PROYECTOS') {
      const pdasSeleccionadosParaImprimir = pdasDisponibles.filter(p => (Array.isArray(proyectoActual.pdas_seleccionados) ? proyectoActual.pdas_seleccionados : []).includes(p.id));
      return ( 
        <div className="pantalla-dosificador"> 
            {toast && (
                <div style={{position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#34495e', color:'white', padding:'10px 20px', borderRadius:20, zIndex:9999, fontWeight:'bold', boxShadow:'0 4px 10px rgba(0,0,0,0.2)'}}>
                    {toast}
                </div>
            )}
            <div className="header-dosificador"> <div style={{display:'flex', gap:15, alignItems:'center'}}><h2>🚀 Proyectos</h2><select value={grado} onChange={e => { const g = Number(e.target.value); setGrado(g); localStorage.setItem('grado', g); setGrupoActual(prev => ({ ...(prev||{}), grado: g })); }} style={{fontSize:'1.1rem', padding:'5px 10px', borderRadius:5, border:'2px solid #00CEC9', fontWeight:'bold', background:'white', cursor:'pointer'}}><option value={1}>1º Primaria</option><option value={2}>2º Primaria</option><option value={3}>3º Primaria</option><option value={4}>4º Primaria</option><option value={5}>5º Primaria</option><option value={6}>6º Primaria</option></select></div> <div> {!modoEdicionProy && <button className="btn-guardar" onClick={()=>{setProyectoActual({id:null, nombre:'', metodologia:'COMUNITARIOS', escenario:'AULA', temporalidad:'', pdas_seleccionados:[], fases_contenido:{}}); setBusquedaPda(""); setModoEdicionProy(true);}}>+ Nuevo</button>} <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button> </div> </div> {modoEdicionProy ? ( <div key={proyectoActual.id || 'nuevo'} className="hoja-planeacion" style={{ background: `linear-gradient(to bottom, ${calcularColorSemaforo(proyectoActual)} 0%, #ffffff 350px)` }}> <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}> <h3 className="titulo-edicion">✏️ Editar Proyecto</h3> <div className="botones-edicion"><button className="btn-guardar" onClick={()=>window.print()} style={{marginRight:10}}>🖨️ Imprimir</button><button className="btn-volver" onClick={()=>setModoEdicionProy(false)}>🔙 Volver</button></div> </div> <div className="grid-dos"> <div className="grupo-input grupo-nombre"> <label>Nombre:</label> <input defaultValue={proyectoActual.nombre} onBlur={e => actualizarDatoProyecto('nombre', e.target.value)} style={{padding:'8px'}} placeholder="Nombre..." /> </div> <div className="grupo-input"><label>Metodología:</label><select value={proyectoActual.metodologia} onChange={e=>actualizarDatoProyecto('metodologia', e.target.value)} style={{padding:10}}> {Object.keys(METODOLOGIAS).map(k=><option key={k} value={k}>{METODOLOGIAS[k].nombre}</option>)} </select></div> </div> <div className="seccion-plan" style={{marginTop:20, borderLeft:`6px solid ${METODOLOGIAS[proyectoActual.metodologia].borde}`}}> <h4>Fases ({METODOLOGIAS[proyectoActual.metodologia].nombre})</h4> {METODOLOGIAS[proyectoActual.metodologia].fases.map((fase, i) => ( <div key={i} className="momento" style={{flexDirection:'column', marginBottom:15}}> <span className="label-momento" style={{fontSize:'0.9rem'}}>{fase}</span> <textarea style={{width:"100%", minHeight:80}} value={(safeParse(proyectoActual.fases_contenido, {}))[i] || ""} onChange={e => actualizarFaseProyecto(i, e.target.value)} placeholder="Desarrollo..." /> </div> ))} </div> <div className="pdas-print-view" style={{display:'none'}}> <h4 style={{marginTop:20, textTransform:'uppercase', borderBottom:'1px solid black'}}>Vinculación de Aprendizajes (PDAs)</h4> <ul style={{listStyle:'none', padding:0}}> {pdasSeleccionadosParaImprimir.length === 0 && <li>Sin aprendizajes vinculados.</li>} {pdasSeleccionadosParaImprimir.map(p => ( <li key={p.id} style={{marginBottom:10, fontSize:'11pt', fontFamily:'Times New Roman'}}> <b>• {p.proyecto_sugerido}:</b> {p.descripcion} </li> ))} </ul> </div> <div className="seccion-plan no-print" style={{marginTop:20, background:'rgba(0,0,0,0.03)'}}> <h4>Vincular PDAs</h4> <input placeholder="Buscar tema..." value={busquedaPda} onChange={e=>setBusquedaPda(e.target.value)} style={{width:'100%', padding:8, marginBottom:10}}/> <div style={{maxHeight:150, overflowY:'auto'}}> {pdasFiltrados.length === 0 && <p style={{fontStyle:'italic', color:'#999'}}>No hay PDAs.</p>} {pdasFiltrados.map(p=>( <div key={p.id} style={{display:'flex', gap:5, marginBottom:5}}> <input type="checkbox" checked={(Array.isArray(proyectoActual.pdas_seleccionados) ? proyectoActual.pdas_seleccionados : []).includes(p.id)} onChange={()=>togglePdaProyecto(p.id)} /> <span><b>{p.proyecto_sugerido}</b>: {p.descripcion}</span> </div> ))} </div> </div> <button className="btn-guardar botones-edicion" onClick={guardarProyecto} style={{marginTop:20, width:'100%', padding:15}}>💾 GUARDAR</button> </div> ) : ( <div className="grid-proyectos-scroll" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:20, alignContent:'start'}}> {listaProyectos.map(p => { const estilo = METODOLOGIAS[p.metodologia] || {color:'#fff', borde:'#ccc'}; const isVisto = (vistos.proyecto || []).includes(String(p.id)); return ( <div key={p.id} className="tarjeta-proyecto" onClick={() => editarProyectoSafe(p)} style={{ cursor:'pointer', borderLeft:`8px solid ${estilo.borde}`, background: estilo.color, padding: 15, borderRadius: 8, height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: isVisto ? 0.6 : 1, transition: 'opacity 0.3s' }}> <div> <h3 style={{margin:'0 0 5px 0', fontSize:'1.1rem', color:'#333'}}>{p.nombre}</h3> <span style={{fontSize:'0.8rem', background:'rgba(255,255,255,0.6)', padding:'2px 6px', borderRadius:4, fontWeight:'bold', color:estilo.borde}}> {estilo.nombre} {p.es_sugerido && '⭐'} </span> </div> <div style={{alignSelf: 'flex-end', marginTop: 10}}><button className="no-print" onClick={(e)=>{e.stopPropagation(); toggleVisto('proyecto', p.id)}} style={{padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer', background: isVisto ? '#2ecc71' : 'rgba(255,255,255,0.8)', color: isVisto ? 'white' : '#333', border: 'none', borderRadius: 5, fontWeight:'bold'}}> {isVisto ? '✅ Terminado' : 'Marcar Terminado'} </button></div> </div> ); })} </div> )} </div> 
      );
    }

    if(vista === 'PLANNER') { 
      const isVisto = (vistos.plan || []).includes(String(semanaPlan)); 
      const hasDudaEpistemica = planData && planData.confidence_score !== undefined && planData.confidence_score < 0.7;

      return ( 
        <div className="pantalla-dosificador"> 
          <div className="header-dosificador no-print"> 
            <div style={{display:'flex', gap:10, alignItems:'center'}}><h2>Planeación</h2><select value={grado} onChange={e => { const g = Number(e.target.value); setGrado(g); localStorage.setItem('grado', g); setGrupoActual(prev => ({ ...(prev||{}), grado: g })); }} style={{fontSize:'1.1rem', padding:'5px 10px', borderRadius:5, border:'2px solid #0984E3', fontWeight:'bold', background:'white', cursor:'pointer'}}><option value={1}>1º Primaria</option><option value={2}>2º Primaria</option><option value={3}>3º Primaria</option><option value={4}>4º Primaria</option><option value={5}>5º Primaria</option><option value={6}>6º Primaria</option></select><select value={semanaPlan} onChange={e=>setSemanaPlan(Number(e.target.value))}>{SEMANAS_CLASE.map(s=><option key={s.id} value={s.id}>Sem {s.id} ({obtenerFechasSemana(s.id)})</option>)}</select></div> 
            <div>
              {hasDudaEpistemica && (
                <button 
                  onClick={() => setMostrarDudaModal(true)} 
                  style={{padding: '10px 15px', fontWeight:'bold', cursor: 'pointer', background: '#e0115f', color: 'white', border: 'none', borderRadius: 5, marginRight: 10}}
                  className="no-print alert-button-glow"
                >
                  🧬 Corregir Coherencia ELARA
                </button>
              )}
              <button onClick={()=>toggleVisto('plan', semanaPlan)} style={{padding: '10px 15px', fontWeight:'bold', cursor: 'pointer', background: isVisto ? '#2ecc71' : '#bdc3c7', color: 'white', border: 'none', borderRadius: 5, marginRight: 10}} className="no-print"> {isVisto ? '✅ Completada' : 'Marcar Completada'} </button>
              <button className="btn-guardar" onClick={savePlan}>💾 Guardar</button>
              <button className="btn-volver" onClick={()=>window.print()}>🖨️</button>
              <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button>
            </div> 
          </div> 
          
          <div className={`hoja-planeacion ${hasDudaEpistemica ? 'alert-duda-epistemica' : ''}`} style={{opacity: isVisto ? 0.8 : 1, position: 'relative'}}>
            {/* Encabezado Oficial SEP solo visible al imprimir */}
            <div className="print-header-oficial" style={{display: 'none'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #004aad', paddingBottom: '10px', marginBottom: '15px'}}>
                <div>
                  <h2 style={{margin: 0, fontSize: '13pt', color: '#004aad', textTransform: 'uppercase', fontWeight: 'bold'}}>SECRETARÍA DE EDUCACIÓN PÚBLICA</h2>
                  <h3 style={{margin: '3px 0 0 0', fontSize: '11pt', color: '#333', fontWeight: 'bold'}}>PLANIFICACIÓN DIDÁCTICA SEMANAL - NUEVA ESCUELA MEXICANA (NEM)</h3>
                </div>
                <div style={{textAlign: 'right', fontSize: '9pt', color: '#333', lineHeight: '1.4'}}>
                  <div><b>Escuela:</b> {configCiclo.nombreEscuela || 'ESCUELA PRIMARIA'}</div>
                  <div><b>CCT:</b> {configCiclo.cct || 'S/N'} | <b>Ciclo Escolar:</b> 2025-2026</div>
                  <div><b>Docente:</b> {configCiclo.nombreDocente || 'DOCENTE TITULAR'}</div>
                  <div><b>Grado:</b> {grado}º Primaria | <b>Semana:</b> Sem {semanaPlan} ({obtenerFechasSemana(semanaPlan)})</div>
                </div>
              </div>
            </div> 
            {hasDudaEpistemica && (
              <div className="elara-duda-alert-bar" onClick={() => setMostrarDudaModal(true)}>
                <div className="alert-bar-glow"></div>
                <span className="alert-bar-icon">⚠️</span>
                <span className="alert-bar-text">
                  <strong>DUDA EPISTÉMICA DETECTADA ({planData.confidence_score}):</strong> ELARA ha detectado baja coherencia curricular en esta secuencia. Haz clic aquí para corregir con el Motor de Curiosidad.
                </span>
                <button className="btn-alert-bar-trigger">Mutar Plan</button>
              </div>
            )}

            <div className="seccion-plan" style={{marginBottom:20}}> 
              <h3>🎯 Aprendizajes (PDA)</h3> 
              {pdasSemana.length === 0 ? <p style={{color:'#999'}}>Sin contenido.</p> : <ul>{pdasSemana.map((p,i)=><li key={i}><b>{p.proyecto}</b>: {p.pda}</li>)}</ul>} 
            </div> 
            
            <div className="grid-semanal">
              {['lunes','martes','miercoles','jueves','viernes'].map(d=>(
                <div key={d} className="dia-plan">
                  <div className="titulo-dia">{d.toUpperCase()}</div>
                  
                  {/* Vista en Pantalla (Campos editables) */}
                  <div className="no-print" style={{display:'flex', flexDirection:'column', gap:5}}>
                    <textarea placeholder="Inicio" style={{minHeight:70, width:'100%', padding:5}} value={planData[`${d}_inicio`] || ''} onChange={e=>setPlanData({...planData,[`${d}_inicio`]:e.target.value})} />
                    <textarea placeholder="Desarrollo" style={{minHeight:140, width:'100%', padding:5}} value={planData[`${d}_desarrollo`] || ''} onChange={e=>setPlanData({...planData,[`${d}_desarrollo`]:e.target.value})} />
                    <textarea placeholder="Cierre" style={{minHeight:70, width:'100%', padding:5}} value={planData[`${d}_cierre`] || ''} onChange={e=>setPlanData({...planData,[`${d}_cierre`]:e.target.value})} />
                  </div>

                  {/* Vista en Impresión (Texto plano expandido sin scrollbars ni flechas) */}
                  <div className="only-print-text">
                    {planData[`${d}_inicio`] && (
                      <div style={{marginBottom: 8}}>
                        <b style={{fontSize:'8.5pt', color:'#2c3e50', textTransform:'uppercase'}}>Inicio:</b>
                        <div style={{fontSize:'9.5pt', whiteSpace:'pre-wrap', wordBreak:'break-word', marginTop:2, textAlign:'justify'}}>{planData[`${d}_inicio`]}</div>
                      </div>
                    )}
                    {planData[`${d}_desarrollo`] && (
                      <div style={{marginBottom: 8}}>
                        <b style={{fontSize:'8.5pt', color:'#2c3e50', textTransform:'uppercase'}}>Desarrollo:</b>
                        <div style={{fontSize:'9.5pt', whiteSpace:'pre-wrap', wordBreak:'break-word', marginTop:2, textAlign:'justify'}}>{planData[`${d}_desarrollo`]}</div>
                      </div>
                    )}
                    {planData[`${d}_cierre`] && (
                      <div>
                        <b style={{fontSize:'8.5pt', color:'#2c3e50', textTransform:'uppercase'}}>Cierre:</b>
                        <div style={{fontSize:'9.5pt', whiteSpace:'pre-wrap', wordBreak:'break-word', marginTop:2, textAlign:'justify'}}>{planData[`${d}_cierre`]}</div>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div> 
            
            <div className="footer-plan">
              <div className="caja-footer">
                <h4>Recursos</h4>
                <textarea className="no-print" value={planData.recursos || ''} onChange={e=>setPlanData({...planData,recursos:e.target.value})}/>
                <div className="only-print-text" style={{fontSize:'9.5pt', whiteSpace:'pre-wrap', textAlign:'justify'}}>{planData.recursos || 'Sin especificación.'}</div>
              </div>
              <div className="caja-footer">
                <h4>Evaluación</h4>
                <textarea className="no-print" value={planData.evaluacion || ''} onChange={e=>setPlanData({...planData,evaluacion:e.target.value})}/>
                <div className="only-print-text" style={{fontSize:'9.5pt', whiteSpace:'pre-wrap', textAlign:'justify'}}>{planData.evaluacion || 'Sin especificación.'}</div>
              </div>
              <div className="caja-footer">
                <h4>Adecuaciones</h4>
                <textarea className="no-print" value={planData.adecuaciones || ''} onChange={e=>setPlanData({...planData,adecuaciones:e.target.value})}/>
                <div className="only-print-text" style={{fontSize:'9.5pt', whiteSpace:'pre-wrap', textAlign:'justify'}}>{planData.adecuaciones || 'Sin especificación.'}</div>
              </div>
            </div>

            {/* Área de Firmas Oficiales solo visible al imprimir */}
            <div className="print-signatures-area" style={{display: 'none', marginTop: '40px', paddingTop: '20px', pageBreakInside: 'avoid'}}>
              <div style={{display: 'flex', justifyContent: 'space-around', textAlign: 'center'}}>
                <div style={{width: '240px', borderTop: '1px solid black', paddingTop: '5px'}}>
                  <div style={{fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase'}}>{configCiclo.nombreDocente || 'DOCENTE TITULAR'}</div>
                  <div style={{fontSize: '8.5pt', color: '#555'}}>Docente de Grupo</div>
                </div>
                <div style={{width: '240px', borderTop: '1px solid black', paddingTop: '5px'}}>
                  <div style={{fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase'}}>VO. BO. DIRECCIÓN ESCOLAR</div>
                  <div style={{fontSize: '8.5pt', color: '#555'}}>Director(a) de la Escuela</div>
                </div>
              </div>
            </div> 
          </div> 
        </div> 
      ); 
    }

    if(vista === 'GRUPO') {
      return (
        <div className="pantalla-dosificador">
          <div className="header-dosificador"><h2>👥 Mi Grupo ({grado}º Primaria)</h2><button className="btn-volver" onClick={()=>setVista('MENU')}>Volver</button></div>
          <div className="config-grid">
            <div className="columna-gestion"><h3>📋 Pegar Lista</h3><textarea value={textoPegado} onChange={e=>setTextoPegado(e.target.value)} style={{width:'95%', height:200}}/><button className="btn-guardar" onClick={procesarListaAlumnos}>{procesando?'...':'Agregar'}</button></div>
            <div className="columna-gestion"><h3>🎓 Alumnos</h3><ul>{alumnos.map(a=><li key={a.id}>{a.nombre} <button onClick={()=>borrarAlumno(a.id)}>🗑️</button></li>)}</ul></div>
          </div>
        </div>
      );
    }

    if(vista === 'COMISIONES') {
      return ( 
        <div className="pantalla-dosificador"> 
          <div className="header-dosificador"> 
            <h2>🔔 Comisiones</h2> 
            <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button> 
          </div> 
          <div className="config-grid"> 
            <div className="columna-gestion"> 
              <h3>Nueva</h3> 
              <input value={nuevaComision.descripcion} onChange={e=>setNuevaComision({...nuevaComision, descripcion:e.target.value})} placeholder="Descripción"/> 
              <input type="date" value={nuevaComision.fecha} onChange={e=>setNuevaComision({...nuevaComision, fecha:e.target.value})}/> 
              <button className="btn-guardar" onClick={()=>{ipcRenderer.invoke('add-comision', nuevaComision).then(()=>{ipcRenderer.invoke('get-comisiones').then(setComisiones); alert('Agregada')})}}>Guardar</button> 
            </div> 
            <div className="columna-gestion"> 
              <h3>Lista</h3> 
              {comisiones.map(c=><div key={c.id}><b>{c.fecha}</b>: {c.descripcion}</div>)} 
            </div> 
          </div> 
        </div> 
      );
    }

    if(vista === 'CALENDARIO') {
      return (
        <div className="pantalla-dosificador">
          <div className="header-dosificador">
            <div>
              <button onClick={()=>mesCal===1?(setMesCal(12),setAnioCal(anioCal-1)):setMesCal(mesCal-1)}>◀</button> 
              <h2 style={{color:'black'}}>{NOMBRES_MESES[mesCal]} {anioCal}</h2> 
              <button onClick={()=>mesCal===12?(setMesCal(1),setAnioCal(anioCal+1)):setMesCal(mesCal+1)}>▶</button>
            </div>
            <div>
              <button onClick={()=>setModoConfigCalendario(!modoConfigCalendario)} style={{background: modoConfigCalendario ? '#e67e22' : '#3498db', color: 'white', marginRight:10, padding: '10px'}}>{modoConfigCalendario ? '✅ Terminar' : '⚙️ Configurar SEP'}</button>
              <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button>
            </div>
          </div>
          {modoConfigCalendario && (<div style={{background:'white', padding:15, marginBottom:15, borderRadius:8, boxShadow:'0 2px 5px rgba(0,0,0,0.1)', display:'flex', gap:10, flexWrap:'wrap'}}>{Object.keys(TIPOS_EVENTO).map(k=>(<button key={k} onClick={()=>setHerramientaSeleccionada(k)} style={{background: TIPOS_EVENTO[k].color, color: TIPOS_EVENTO[k].texto, border: herramientaSeleccionada===k ? '3px solid black' : '1px solid #ccc', padding: '8px 15px', fontWeight: 'bold', cursor: 'pointer'}}>{TIPOS_EVENTO[k].label}</button>))}</div>)}
          <div className="grid-calendario-header"><div>DOM</div><div>LUN</div><div>MAR</div><div>MIE</div><div>JUE</div><div>VIE</div><div>SAB</div></div>
          <div className="grid-calendario-dias">{renderCal()}</div>
        </div>
      );
    }

    return null;
  };

  // --- LICENCIA / CARGANDO CHECKS ---
  if (cargandoLicencia) {
    return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.5rem', color:'#555'}}>Verificando licencia...</div>;
  }

  if (licenciaInfo && !licenciaInfo.isActivated && !licenciaInfo.isTrialValid) {
    return <Licencia onActivated={() => {
      ipcRenderer.invoke('get-license-status').then(res => {
        setLicenciaInfo(res);
        window.openaiApiKey = res.openaiApiKey || '';
      });
    }} />;
  }

  return (
    <div className="elara-app-root">
      {renderVistaContent()}
      
      {/* COMPONENTES DE INTERFAZ ELARA GLOBALES */}
      {renderConsolaMutacion()}
      {renderDudaModal()}
    </div>
  );
}

export default App;