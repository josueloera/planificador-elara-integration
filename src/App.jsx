import SortableMenu from './components/SortableMenu';
import GoogleSync from './components/GoogleSync';
const CTE = lazy(() => import('./components/CTE'));
const LanTransfer = lazy(() => import('./components/LanTransfer'));
import { contextoDocente, claveDocente, leerDocumento } from './seguimientoDocente';
const ObservacionesDia = lazy(() => import('./components/ObservacionesDia').then(m => ({default:m.ObservacionesDia})));
const ObservacionesTrimestre = lazy(() => import('./components/ObservacionesDia').then(m => ({default:m.ObservacionesTrimestre})));
const DosificadorEditable = lazy(() => import('./components/DosificadorEditable'));
const ProgramaAnalitico = lazy(() => import('./components/ProgramaAnalitico'));
import LegalInfo from './components/LegalInfo';
const PlaneacionApartados = lazy(() => import('./components/PlaneacionApartados'));
const ExportDocument = lazy(() => import('./components/ExportDocument'));
const Incidencias = lazy(() => import('./components/Incidencias'));
const exportarPlanoPdf = async data => (await import('./utils/planeacionDocument')).exportarPlanoPdf(data);
const exportarPlanoWord = async data => (await import('./utils/planeacionDocument')).exportarPlanoWord(data);
import { useState, useEffect, useCallback, memo, useMemo, useRef, lazy, Suspense } from 'react';
import './App.css';
import { cargarReporteTrimestral } from './android/quarterlyReport.js';

// --- IMPORTACIONES (Si alguna falla, el código tiene protección) ---
import { obtenerPlanSemanal } from './planner_logic';
const GeneradorMaterial = lazy(() => import('./components/GeneradorMaterial'));
import Licencia from './components/Licencia';
const ConfiguracionCiclo = lazy(() => import('./components/ConfiguracionCiclo'));
const DashboardGrupos = lazy(() => import('./components/DashboardGrupos'));
const Alumno = lazy(() => import('./components/Alumno'));
const ControlQR = lazy(() => import('./components/ControlQR'));
import { EstadoEvaluacionQR, VincularEvaluacionQR } from './components/EvaluacionAutomatica';
import { mezclarNotasAutomaticas, promedioPeriodo } from './evaluacionAutomatica';

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

const CeldaNota = memo(({ idAlumno, idCriterio, valorInicial, onGuardar, soloLectura = false }) => {
    const [valor, setValor] = useState(valorInicial ?? '');
    useEffect(() => { setValor(valorInicial ?? ''); }, [valorInicial]);
    const handleBlur = () => { if (!soloLectura && valor !== valorInicial) onGuardar(idAlumno, idCriterio, valor === '' ? null : valor); };
    return ( <input className="input-nota" readOnly={soloLectura} title={soloLectura ? "Calificación automática de esta fecha. Corrige los registros en Control QR." : undefined} type="text" inputMode="decimal" style={{background: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', width: '100%', height: '40px', border: '1px solid #eee', borderRadius: '4px', outline: 'none', color: '#333'}} value={valor} onChange={(e) => setValor(e.target.value)} onBlur={handleBlur} placeholder="-" /> );
});

const safeParse = (data, fallback) => { if (typeof data === 'object' && data !== null) return data; try { return JSON.parse(data) ?? fallback; } catch (e) { return fallback; } };

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
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
      clearTimeout(toastTimeoutRef.current);
      setToast(msg);
      toastTimeoutRef.current = setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  useEffect(() => {
      criteriosRef.current = criterios;
  }, [criterios]);

  const [notas, setNotas] = useState({});
  const [fechaEval, setFechaEval] = useState(new Date().toISOString().split('T')[0]);
  const [modoConfig, setModoConfig] = useState(false);
  const [showModalImportarQR, setShowModalImportarQR] = useState(false);
  const [evaluacionAutomatica, setEvaluacionAutomatica] = useState(null);

  // OTROS
  const [textoPegado, setTextoPegado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [listaProyectos, setListaProyectos] = useState([]);
  const [modoEdicionProy, setModoEdicionProy] = useState(false);
  const [proyectoActual, setProyectoActual] = useState({ id: null, nombre: '', metodologia: 'COMUNITARIOS', escenario: 'AULA', temporalidad: '2 Semanas', problemática: '', pdas_seleccionados: [], fases_contenido: {} });
  const [semanaPlan, setSemanaPlan] = useState(1);
  const [planData, setPlanData] = useState({ lunes_inicio: '', lunes_desarrollo: '', lunes_cierre: '', martes_inicio: '', martes_desarrollo: '', martes_cierre: '', miercoles_inicio: '', miercoles_desarrollo: '', miercoles_cierre: '', jueves_inicio: '', jueves_desarrollo: '', jueves_cierre: '', viernes_inicio: '', viernes_desarrollo: '', viernes_cierre: '', recursos: '', evaluacion: '', adecuaciones: '' });
  const [planDosif, setPlanDosif] = useState([]);
  const [pdasDisponibles, setPdasDisponibles] = useState([]);
  const [pdasSemana, setPdasSemana] = useState([]);
  const [busquedaPda, setBusquedaPda] = useState("");
  const [alumnoBitacora, setAlumnoBitacora] = useState(null);
  const [tabBitacora, setTabBitacora] = useState('PERFIL');
  const [perfil, setPerfil] = useState({});

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
  const [errorReporte, setErrorReporte] = useState('');
  const [campoActual, setCampoActual] = useState('LENGUAJES');
  const [vistos, setVistos] = useState({});

  // ESTADOS DE INTEGRACIÓN ELARA
  const [updateStatus, setUpdateStatus] = useState(null); // null | { tipo: 'available'|'downloaded', version: '' }

  // ── LISTENER ACTUALIZACIONES AUTOMÁTICAS ──────────────────────────────
  useEffect(() => {
    if (!ipcRenderer) return;
    const onAvailable = (_, version) => setUpdateStatus({ tipo: 'available', version });
    const onDownloaded = (_, version) => setUpdateStatus({ tipo: 'downloaded', version });
    ipcRenderer.on('update-available', onAvailable);
    ipcRenderer.on('update-downloaded', onDownloaded);
    return () => {
      ipcRenderer.removeListener('update-available', onAvailable);
      ipcRenderer.removeListener('update-downloaded', onDownloaded);
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────

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
      grado, grupoActual, semanaPlan, campoActual, planData, pdasSemana,
      modoEdicionProy: vista === 'PROYECTOS', configCiclo,
      metodologias: METODOLOGIAS,
      proyectoActual,
      alumnos,
      criterios,
      notas,
      fechaEval,
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
        setLicenciaInfo(res || { isActivated: true });
        setCargandoLicencia(false);
      }).catch(err => {
        console.error("Error al obtener licencia:", err);
        setLicenciaInfo({ isActivated: true });
        setCargandoLicencia(false);
      });
      ipcRenderer.invoke('get-config').then(cfg => {
        let periodos = DEFAULT_PERIODOS;
        try { if (cfg.periodos) periodos = JSON.parse(cfg.periodos); } catch (error) { console.error('No se pudieron leer los periodos guardados.', error); }
        setConfigCiclo({ fechaInicioStr: cfg.fechaInicioStr || '2026-08-31', periodos,
          nombreDocente: cfg.nombreDocente || '', nombreEscuela: cfg.nombreEscuela || '', cct: cfg.cct || '' });
      });
    } else {
      setCargandoLicencia(false);
    }
  }, []);

  // Carga automática del grupo de Primaria (sin seleccionador de grupos)
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-grupos').then(res => {
        const savedGrado = localStorage.getItem('grado');
        const currentG = savedGrado ? Number(savedGrado) : 1;
        setGrado(currentG);
        if (res && res.length > 0) {
          const grupoGuardado = res.find(g => Number(g.grado) === currentG) || res[0];
          const gradoSeleccionado = currentG;
          setGrado(gradoSeleccionado);
          setGrupoActual({ ...grupoGuardado, grado: gradoSeleccionado });
        } else {
          const defaultGrupo = { grado: currentG, seccion: '', disciplina_id: 1, tipo: 'Primaria', ciclo_escolar: '2026-2027' };
          ipcRenderer.invoke('add-grupo', defaultGrupo).then(() => {
            ipcRenderer.invoke('get-grupos').then(newRes => {
              if (newRes && newRes.length > 0) {
                const grupoCreado = newRes[0];
                const gradoCreado = Number(grupoCreado.grado) || currentG;
                setGrado(gradoCreado);
                setGrupoActual({ ...grupoCreado, grado: gradoCreado });
              }
            });
          });
        }
      }).catch(console.error);
    }
  }, []);

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
          ipcRenderer.invoke('get-proyectos', grupoActual?.id, grado).then(guardadosRes => {
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
            leerDocumento(ipcRenderer, claveDocente('dosificador', contextoDocente('primaria', grupoActual, grado, configCiclo)), null).then(saved => { if (saved) setPdasSemana(saved.find(s => Number(s.id) === Number(semanaPlan))?.pdas || []); }).catch(console.error);
        }
      });
    }

    if(ipcRenderer && vista === 'PLANNER') {
        ipcRenderer.invoke('get-planeacion', grupoActual?.id, semanaPlan, grado).then(res => setPlanData(res && res.id ? res : { lunes_inicio: '', lunes_desarrollo: '', lunes_cierre: '', martes_inicio: '', martes_desarrollo: '', martes_cierre: '', miercoles_inicio: '', miercoles_desarrollo: '', miercoles_cierre: '', jueves_inicio: '', jueves_desarrollo: '', jueves_cierre: '', viernes_inicio: '', viernes_desarrollo: '', viernes_cierre: '', recursos: '', evaluacion: '', adecuaciones: '' }));
    }
  }, [vista, semanaPlan, grado, grupoActual, configCiclo]);

  // --- LÓGICA DE EVALUACIÓN ---
  const cargaEvalRef = useRef(0);
  const cargaReporteRef = useRef(0);
  const grupoEvaluacionRef = useRef(grupoActual?.id);
  grupoEvaluacionRef.current = grupoActual?.id;
  const cargarEval = (campoF, fecha = fechaEval) => {
    const targetCampo = campoF || campoActual;
    const grupoId = grupoActual?.id;
    const request = ++cargaEvalRef.current;
    if (!ipcRenderer || !grupoId) return;
    return Promise.all([
      ipcRenderer.invoke('get-alumnos', grupoId),
      ipcRenderer.invoke('get-criterios', grupoId, targetCampo),
      ipcRenderer.invoke('get-notas-fecha', fecha),
      ipcRenderer.invoke('get-evaluacion-automatica', grupoId, { inicio: fecha, fin: fecha })
    ]).then(([listaAlumnos, listaCriterios, listaNotas, automatica]) => {
      if (request !== cargaEvalRef.current || grupoId !== grupoEvaluacionRef.current) return;
      setAlumnos(listaAlumnos || []);
      const lista = (listaCriterios || []).map((c, idx) => ({
        ...c, frontId: c.id ? `db-${c.id}` : `temp-${targetCampo}-${idx}`
      }));
      setCriterios(lista);
      setModoConfig(lista.length === 0);
      setEvaluacionAutomatica(automatica);
      setNotas(mezclarNotasAutomaticas(listaNotas, automatica, fecha));
    }).catch(err => {
      console.error(err);
      if (request === cargaEvalRef.current && grupoId === grupoEvaluacionRef.current) showToast('❌ No se pudo cargar la evaluación.');
    });
  };

  const cambiarCampo = (nuevoCampo) => {
    setCampoActual(nuevoCampo);
    cargarEval(nuevoCampo);
  };

  useEffect(() => { if (vista === 'EVAL') cargarEval(campoActual); }, [grupoActual?.id, vista, fechaEval, campoActual, configCiclo]);
  useEffect(() => {
    if (vista === 'EVAL' && !modoConfig) cargarEval(campoActual);
  }, [modoConfig]);

  useEffect(() => {
    if (!ipcRenderer) return;
    let timer;
    const actualizar = (_, payload = {}) => {
      if (payload.grupo_id && payload.grupo_id !== grupoActual?.id) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (vista === 'EVAL' && !modoConfig) cargarEval(campoActual);
        if (vista === 'TRIMESTRAL') generarReporteTrimestral();
      }, 100);
    };
    ipcRenderer.on('evaluacion-qr-actualizada', actualizar);
    return () => { clearTimeout(timer); ipcRenderer.removeListener('evaluacion-qr-actualizada', actualizar); };
  }, [grupoActual?.id, vista, fechaEval, campoActual, modoConfig, trimestre, alumnos, configCiclo]);

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
      if (evaluacionAutomatica?.enlaces?.some(e => e.criterio_id === cid)) return;
      setNotas(prev => ({...prev, [`${aid}-${cid}`]: val}));
      if(cid && typeof cid === 'number') {
          ipcRenderer.invoke('save-nota', aid, cid, fechaEval, val).catch(console.error);
      }
  }, [fechaEval, evaluacionAutomatica]);

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
  const generarReporteTrimestral = async () => {
    const request = ++cargaReporteRef.current;
    const grupoId = grupoActual?.id;
    setErrorReporte('');
    setResumen([]);
    if (!ipcRenderer || !grupoId) { setCargandoReporte(false); return; }
    setCargandoReporte(true);
    const periodo = configCiclo.periodos[trimestre] || { inicio: '2026-08-31', fin: '2026-11-27' };
    try {
      const reporte = await cargarReporteTrimestral(ipcRenderer, { grupoId, periodo, variante: 'primaria' });
      if (request !== cargaReporteRef.current) return;
      setResumen(reporte);
    } catch (err) {
      if (request !== cargaReporteRef.current) return;
      setErrorReporte('No se pudo cargar el reporte: ' + err.message);
    } finally {
      if (request === cargaReporteRef.current) setCargandoReporte(false);
    }
  };
  useEffect(() => { if (vista === 'TRIMESTRAL') generarReporteTrimestral(); else ++cargaReporteRef.current; }, [vista, trimestre, grupoActual?.id, configCiclo]);

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

  const selAlumnoBitacora = (a) => { setAlumnoBitacora(a); if(a && ipcRenderer) { ipcRenderer.invoke('get-perfil', a.id).then(r => setPerfil(r || {})); } };
  const savePerfil = (e) => { e.preventDefault(); const d = new FormData(e.target); const obj = Object.fromEntries(d.entries()); obj.alumno_id = alumnoBitacora.id; ipcRenderer.invoke('save-perfil', obj).then(() => showToast("✅ Ficha guardada")); };

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

  // ================= SWITCH PRINCIPAL DE VISTAS (React Router alternativo) =================
  const contextoTrabajo = contextoDocente('primaria', grupoActual, grado, configCiclo);
  const renderVistaContent = () => {
    if (vista === 'GRUPOS') {
      setVista('MENU');
      return null;
    }

    if (vista === 'CTE') return <CTE key={contextoTrabajo} ipc={ipcRenderer} edition='primaria' group={grupoActual} cycle={configCiclo} onBack={()=>setVista('MENU')} />;
    if (vista === 'LAN') return <LanTransfer ipc={ipcRenderer} onBack={()=>setVista('MENU')} />;
    if (vista === 'ANALITICO') return <ProgramaAnalitico key={contextoTrabajo} ipc={ipcRenderer} contexto={contextoTrabajo} variante='primaria' grupo={grupoActual} grado={grado} ciclo={configCiclo} onVolver={()=>setVista('MENU')} />;
    if (vista === 'ALUMNO') return <Alumno ipcRenderer={ipcRenderer} variante='primaria' configCiclo={configCiclo} grupoActual={grupoActual} onVolver={()=>setVista('MENU')} />;
    if(vista === 'MENU') {
      const menuItems = [
        {id:'CTE',icon:'📒',label:'Consejo Técnico Escolar',desc:'Sesiones, acuerdos y evidencias',color:'#3655a2',action:()=>setVista('CTE')},
        {id:'LAN',icon:'🔗',label:'Conectar dispositivos',desc:'Transferir base de datos por wifi',color:'#147768',action:()=>setVista('LAN')},
        { id: 'ANALITICO', icon: '📘', label: 'Programa analítico', desc: 'Diagnóstico, PDA y codiseño', color: '#4338ca', action: ()=>setVista('ANALITICO') },
        { id: 'ALUMNO', icon: '👤', label: 'ALUMNO', desc: 'Perfil, calificaciones y expediente', color: '#147768', action: ()=>setVista('ALUMNO') },
        { id: 'GRUPO', icon: '👥', label: grupoActual ? `${grupoActual.grado}º${grupoActual.seccion} Primaria` : 'Mi Grupo', desc: `${alumnos.length} alumnos`, color: '#6C5CE7', action: ()=>setVista('GRUPO') },
        { id: 'EVAL', icon: '📝', label: 'Evaluación', desc: 'Calificaciones y seguimiento del ciclo', color: '#00B894', action: ()=>{setVista('EVAL'); cargarEval();} },
        { id: 'ASISTENCIA_QR', icon: '📱', label: 'Asistencia QR', desc: 'Escáner y Móvil', color: '#00CEC9', action: ()=>setVista('ASISTENCIA_QR') },
        { id: 'TRIMESTRAL', icon: '📊', label: 'Trimestral', desc: 'Reporte por período', color: '#E17055', action: ()=>{setVista('TRIMESTRAL'); setTrimestre(1);} },
        { id: 'PLANNER', icon: '📅', label: 'Planeación', desc: 'Secuencia semanal', color: '#0984E3', action: ()=>setVista('PLANNER') },
        { id: 'DOSIF', icon: '🚦', label: 'Dosificador', desc: 'Distribución anual', color: '#FDCB6E', action: ()=>setVista('DOSIF') },
        { id: 'CALENDARIO', icon: '📆', label: 'Calendario', desc: 'Eventos SEP', color: '#A29BFE', action: ()=>{setVista('CALENDARIO'); ipcRenderer.invoke('get-eventos-oficiales').then(setEventosSEP);} },
        { id: 'COMISIONES', icon: '🔔', label: 'Comisiones', desc: `${comisiones.length} pendientes`, color: '#FD79A8', action: ()=>setVista('COMISIONES') },
        { id: 'PROYECTOS', icon: '🚀', label: 'Proyectos', desc: 'Didácticos NEM', color: '#00CEC9', action: ()=>setVista('PROYECTOS') },
        { id: 'BITACORA', icon: '📂', label: 'Bitácora', desc: 'Fichas e incidencias', color: '#636E72', action: ()=>{setVista('BITACORA'); setAlumnoBitacora(null);} },
        { id: 'MATERIALES', icon: '🧩', label: 'Materiales', desc: 'Exámenes y juegos', color: '#FF9F43', action: ()=>setVista('MATERIALES') },
        { id: 'CONFIG', icon: '⚙️', label: 'Ajustes Ciclo', desc: 'Fechas y SEP', color: '#2C3E50', action: ()=>setVista('CONFIG') }
      ];

      return (
        <div className="pantalla-menu">
          <div className="menu-header-zone">
            <div className="menu-header-glow"></div>
            <img src="./elara-icon.png" alt="Elara" style={{width:100,height:100,borderRadius:22}} /><h1 className="titulo-principal">ELARA</h1>
            <p className="menu-subtitle">Ciclo Escolar 2026 - 2027 </p>
            {licenciaInfo && (
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginTop: '10px'}}>
                {licenciaInfo.isActivated ? (
                  <div style={{background: '#27ae60', color: 'white', padding: '5px 15px', borderRadius: '15px', fontSize: '0.9rem', fontWeight: 'bold'}}>
                    ✅ Licencia Permanente Activada
                  </div>
                ) : licenciaInfo.isTrialValid ? (
                  <>
                    <div style={{background: '#f39c12', color: 'white', padding: '5px 15px', borderRadius: '15px', fontSize: '0.9rem', fontWeight: 'bold'}}>
                      Prueba Gratuita: {licenciaInfo.trialDaysRemaining} días restantes
                    </div>
                    <button
                      onClick={() => setVista('LICENCIA')}
                      style={{background: '#27ae60', color: 'white', padding: '5px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}}>
                      🔑 Adquirir Licencia
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{background: '#e74c3c', color: 'white', padding: '5px 15px', borderRadius: '15px', fontSize: '0.9rem', fontWeight: 'bold'}}>
                      ⚠️ Licencia Expirada
                    </div>
                    <button
                      onClick={() => setVista('LICENCIA')}
                      style={{background: '#27ae60', color: 'white', padding: '5px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}}>
                      🔑 Activar Licencia
                    </button>
                  </>
                )}
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
                    setGrupoActual(prev => ({ ...(prev||{}), grado: g }));
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

          <SortableMenu items={menuItems} edition="primaria" />
      </div>
      );
    }

    if(vista === 'MATERIALES') {
      return <GeneradorMaterial onVolver={() => setVista('MENU')} pdasDisponibles={pdasDisponibles} grado={grado} />;
    }

    if (vista === 'CONFIG') {
      return <ConfiguracionCiclo onVolver={() => {
        setVista('MENU');
        ipcRenderer.invoke('get-config').then(cfg => {
          let periodos = DEFAULT_PERIODOS;
          try { if (cfg.periodos) periodos = JSON.parse(cfg.periodos); } catch (error) { console.error('No se pudieron leer los periodos guardados.', error); }
          setConfigCiclo({ fechaInicioStr: cfg.fechaInicioStr || '2026-08-31', periodos,
            nombreDocente: cfg.nombreDocente || '', nombreEscuela: cfg.nombreEscuela || '', cct: cfg.cct || '' });
        });
      }} currentConfig={configCiclo} defaultConfig={{fechaInicioStr: '2026-08-31', periodos: DEFAULT_PERIODOS}} />;
    }

    if (vista === 'LICENCIA') {
      return <Licencia
          onActivated={() => {
              ipcRenderer.invoke('get-license-status').then(res => {
                  setLicenciaInfo(res);
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
      <div className="pantalla-dosificador android-evaluation-screen" style={{ height: 'var(--app-height, 100dvh)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {toast && (
              <div style={{position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#34495e', color:'white', padding:'10px 20px', borderRadius:20, zIndex:9999, fontWeight:'bold', boxShadow:'0 4px 10px rgba(0,0,0,0.2)'}}>
                  {toast}
              </div>
          )}
          <div className="header-dosificador" style={{ flexShrink: 0, marginBottom: '12px' }}>{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />}
              <div style={{display:'flex', gap:15, alignItems:'center'}}>
                <h2>📝 Evaluación ({grado}º Primaria)</h2>
                <label style={{fontSize: 12}}>Fecha de evaluación: <input type="date" title="Fecha de las calificaciones del día, tanto QR como manuales." value={fechaEval} onChange={e=>setFechaEval(e.target.value)} style={{fontSize:'1.1rem', padding:'5px', border:'2px solid #004aad', borderRadius:5}} /></label>
              </div>
              <div style={{display:'flex', gap:10}}>
                <button
                  className="btn-volver"
                  style={{background: '#27ae60', color: 'white'}}
                  onClick={() => {
                    if (!criterios || criterios.length === 0) {
                      showToast("⚠️ Primero debes configurar criterios para este Campo Formativo.");
                      return;
                    }
                    setShowModalImportarQR(true);
                  }}
                >
                  🔗 Vincular Control QR
                </button>
                <button className="btn-volver" style={{background: modoConfig ? '#7f8c8d' : '#e67e22'}} onClick={()=>setModoConfig(!modoConfig)}>
                  {modoConfig ? '↩ Volver' : '⚙️ Configurar Criterios'}
                </button>
                <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button>
              </div>
          </div>

          <EstadoEvaluacionQR
            automatica={evaluacionAutomatica} criterios={criterios} ipcRenderer={ipcRenderer}
            grupoId={grupoActual?.id} onChanged={() => cargarEval(campoActual)}
            onError={message => showToast('❌ ' + message)}
          />
          {showModalImportarQR && (
            <VincularEvaluacionQR key={grupoActual?.id + '-' + campoActual}
              criterios={criterios} grupoId={grupoActual?.id} ipcRenderer={ipcRenderer}
              automatica={evaluacionAutomatica} onClose={() => setShowModalImportarQR(false)}
              onDone={async () => {
                await cargarEval(campoActual);
                setShowModalImportarQR(false);
                showToast('✅ Vínculo guardado. Cada nota QR se actualizará en la fecha de su registro.');
              }}
            />
          )}

          {/* BARRA DE SELECCION DE MATERIAS / CAMPOS FORMATIVOS */}
          <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            background: '#ffffff',
            borderRadius: '12px',
            marginBottom: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
            flexShrink: 0,
            zIndex: 30,
            position: 'relative',
            overflowX: 'auto'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#2d3748', whiteSpace: 'nowrap', marginRight: '6px' }}>
              📚 Materias / Campos:
            </span>
            <button
              onClick={()=>cambiarCampo('LENGUAJES')}
              style={{
                padding: '9px 18px',
                borderRadius: 20,
                border: campoActual==='LENGUAJES' ? '2px solid #6b1784' : '1px solid #cbd5e0',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                background: campoActual==='LENGUAJES' ? '#8E24AA' : '#ffffff',
                color: campoActual==='LENGUAJES' ? '#ffffff' : '#2d3748',
                boxShadow: campoActual==='LENGUAJES' ? '0 3px 8px rgba(142,36,170,0.35)' : 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              🟣 Lenguajes
            </button>
            <button
              onClick={()=>cambiarCampo('SABERES')}
              style={{
                padding: '9px 18px',
                borderRadius: 20,
                border: campoActual==='SABERES' ? '2px solid #005b52' : '1px solid #cbd5e0',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                background: campoActual==='SABERES' ? '#00897B' : '#ffffff',
                color: campoActual==='SABERES' ? '#ffffff' : '#2d3748',
                boxShadow: campoActual==='SABERES' ? '0 3px 8px rgba(0,137,123,0.35)' : 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              🟢 Saberes y Pensamiento C.
            </button>
            <button
              onClick={()=>cambiarCampo('ETICA')}
              style={{
                padding: '9px 18px',
                borderRadius: 20,
                border: campoActual==='ETICA' ? '2px solid #1565c0' : '1px solid #cbd5e0',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                background: campoActual==='ETICA' ? '#1E88E5' : '#ffffff',
                color: campoActual==='ETICA' ? '#ffffff' : '#2d3748',
                boxShadow: campoActual==='ETICA' ? '0 3px 8px rgba(30,136,229,0.35)' : 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              🔵 Ética, Naturaleza y Soc.
            </button>
            <button
              onClick={()=>cambiarCampo('HUMANO')}
              style={{
                padding: '9px 18px',
                borderRadius: 20,
                border: campoActual==='HUMANO' ? '2px solid #b71c1c' : '1px solid #cbd5e0',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                background: campoActual==='HUMANO' ? '#E53935' : '#ffffff',
                color: campoActual==='HUMANO' ? '#ffffff' : '#2d3748',
                boxShadow: campoActual==='HUMANO' ? '0 3px 8px rgba(229,57,53,0.35)' : 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              🔴 De lo Humano y lo Com.
            </button>
          </div>

          <div className="android-evaluation-body" style={{flexGrow:1, display:'flex', flexDirection:'column', minHeight: 0, padding: 0, overflow: 'hidden'}}>

            {modoConfig ? (
                <div className="columna-gestion android-criteria-panel" style={{maxWidth:700, margin:'10px auto', padding:25, borderRadius:15, boxShadow:'0 4px 15px rgba(0,0,0,0.1)', background:'white', overflowY: 'auto'}}>
                    <h3 style={{textAlign:'center', color:'#004aad'}}>⚙️ Configurar Criterios para {campoActual}</h3>
                    <div style={{background:'#eee', height:25, borderRadius:15, margin:'15px 0', position:'relative', overflow:'hidden'}}><div style={{width:`${Math.min(sumaPorcentajes, 100)}%`, background:sumaPorcentajes===100?'#2ecc71':'#e74c3c', height:'100%', transition:'width 0.5s'}}></div><span style={{position:'absolute', width:'100%', textAlign:'center', top:3, fontWeight:'bold', fontSize:'0.9rem', color:'#333'}}>Suma: {sumaPorcentajes}%</span></div>
                    <div style={{background:'#fafafa', padding:15, borderRadius:10, border:'1px solid #ddd'}}>

                        {(criterios || []).map((c, i)=>(
                            <div className="android-criterion-row" key={`crit-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
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

                        <div className="android-criteria-actions" style={{display:'flex', gap:20, marginTop:20, justifyContent:'center'}}><button onClick={agregarCriterioNuevo} style={{padding:'10px 20px', background:'#3498db', color:'white', border:'none', borderRadius:5, cursor:'pointer'}}>+ Criterio</button><button className="btn-guardar" onClick={()=>guardarConfig(criterios)} style={{width:'auto', padding:'10px 30px', background: sumaPorcentajes===100 ? '#2ecc71' : '#95a5a6'}}>💾 GUARDAR CRITERIOS DE {campoActual}</button></div>
                    </div>
                </div>
            ) : (
                <div className="tabla-container" style={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                  <table className="tabla-eval">
                    <thead>
                      <tr>
                        <th style={{width:50, textAlign:'center', position: 'sticky', top: 0, zIndex: 10, background: '#1e293b', color: '#ffffff'}}>Nº</th>
                        <th style={{width:250, textAlign: 'left', position: 'sticky', top: 0, zIndex: 10, background: '#1e293b', color: '#ffffff'}}>ALUMNO</th>
                        {(criterios || []).map((c,i)=>(
                          <th key={i} style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1e293b', color: '#ffffff', textAlign: 'center' }}>
                            <span style={{ fontWeight: '800', fontSize: '13px' }}>{c.nombre}</span>
                            <br/>
                            <small style={{ color: '#93c5fd', fontWeight: 'bold' }}>{c.porcentaje}%</small>
                            {evaluacionAutomatica?.enlaces?.some(e => e.criterio_id === c.id) && <div style={{ fontSize: 11, color: '#86efac' }}>QR · ciclo completo</div>}
                          </th>
                        ))}
                        <th style={{background:'#0f172a', color:'#38bdf8', width:'90px', textAlign:'center', position: 'sticky', top: 0, zIndex: 10, fontWeight: '800'}}>PROMEDIO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(alumnos || []).map((al, index)=>{
                        const prom = calcularPromedioDiario(al.id);
                        return (
                          <tr key={al.id} style={{backgroundColor: getColorSemaforo(prom), borderBottom: '1px solid #f1f5f9'}}>
                            <td style={{textAlign:'center', fontWeight:'bold', color:'#64748b'}}>{index + 1}</td>
                            <td className="celda-nombre" style={{ color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', fontSize: '13px', background: '#ffffff', borderRight: '2px solid #cbd5e1' }}>
                              {al.nombre} <ObservacionesDia key={JSON.stringify([contextoTrabajo,al.id,fechaEval,campoActual])} ipc={ipcRenderer} contexto={contextoTrabajo} alumno={al} fecha={fechaEval} campo={campoActual} />
                            </td>
                            {(criterios || []).map(c=>(
                              <td key={c.frontId} style={{ textAlign: 'center' }}>
                                <CeldaNota idAlumno={al.id} idCriterio={c.id} valorInicial={notas[`${al.id}-${c.id}`]} onGuardar={handleSaveNota} soloLectura={evaluacionAutomatica?.enlaces?.some(e => e.criterio_id === c.id)} />
                              </td>
                            ))}
                            <td style={{textAlign:'center', fontWeight:'800', fontSize:'1.2rem', color: '#0f172a'}}>{prom ?? '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                  <Incidencias key={alumnoBitacora.id} ipcRenderer={ipcRenderer} alumnoId={alumnoBitacora.id} />
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    if(vista==='TRIMESTRAL') {
      return (
        <div className="pantalla-dosificador android-quarterly-screen">
          <div className="header-dosificador no-print">{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />}
            <h2>📊 Reporte de Evaluaciones Trimestrales ({grado}º Primaria)</h2>
            <div style={{display:'flex', gap:10}}>
              <button className="btn-guardar" onClick={generarReporteTrimestral}>{cargandoReporte ? '⏳ Calculando...' : '🔄 Recalcular'}</button>
              <button className="btn-volver" onClick={()=>window.print()}>🖨️ Imprimir Reporte</button>
              <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button>
            </div>
          </div>
          <p className="android-quarterly-status" role="status" style={{display: cargandoReporte || errorReporte || resumen.length === 0 ? 'block' : 'none'}}>{cargandoReporte ? 'Cargando alumnos y calificaciones…' : errorReporte || 'No hay alumnos registrados en el grupo seleccionado.'}</p><div className="tabs-trimestres no-print">{[1,2,3].map(id=><button key={id} className={`tab-btn ${trimestre===id?'activo':''}`} onClick={()=>setTrimestre(id)}>{configCiclo.periodos[id].nombre}</button>)}</div>
          <div className="tabla-container" style={{flex:'0 0 auto', minHeight:'auto'}}>
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
        <ObservacionesTrimestre key={contextoTrabajo} ipc={ipcRenderer} contexto={contextoTrabajo} alumnos={resumen || []} periodo={configCiclo.periodos[trimestre]} /></div>
      );
    }

    if(vista === 'DOSIF') {
      return (
      <div className="pantalla-dosificador">
        <div className="header-dosificador no-print">{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />}
          <div style={{display:'flex', gap:15, alignItems:'center'}}><h2>Dosificador Anual</h2><select value={grado} onChange={e => { const g = Number(e.target.value); setGrado(g); localStorage.setItem('grado', g); setGrupoActual(prev => ({ ...(prev||{}), grado: g })); }} style={{fontSize:'1.1rem', padding:'5px 10px', borderRadius:5, border:'2px solid #FDCB6E', fontWeight:'bold', background:'white', cursor:'pointer'}}><option value={1}>1º Primaria</option><option value={2}>2º Primaria</option><option value={3}>3º Primaria</option><option value={4}>4º Primaria</option><option value={5}>5º Primaria</option><option value={6}>6º Primaria</option></select></div>
          <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button>
        </div>
        <DosificadorEditable key={contextoTrabajo} ipc={ipcRenderer} contexto={contextoTrabajo} plan={planDosif} vistos={vistos} toggleVisto={toggleVisto} /></div>
      );
    }

    if(vista === 'PROYECTOS') {
      const pdasSeleccionadosParaImprimir = pdasDisponibles.filter(p => (Array.isArray(proyectoActual.pdas_seleccionados) ? proyectoActual.pdas_seleccionados : []).includes(p.id));
      const datosExportacionProyecto = { tipo: 'Proyecto didáctico', nombre: proyectoActual.nombre, datos: { ...proyectoActual, grado }, apartados: safeParse(proyectoActual.apartados, {}), pdas: pdasSeleccionadosParaImprimir, fases: (METODOLOGIAS[proyectoActual.metodologia]?.fases || []).map((label, index) => ({ label, value: safeParse(proyectoActual.fases_contenido, {})[index] })) };
      return (
        <div className="pantalla-dosificador">
            {toast && (
                <div style={{position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#34495e', color:'white', padding:'10px 20px', borderRadius:20, zIndex:9999, fontWeight:'bold', boxShadow:'0 4px 10px rgba(0,0,0,0.2)'}}>
                    {toast}
                </div>
            )}
            <div className="header-dosificador">{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />} <div style={{display:'flex', gap:15, alignItems:'center'}}><h2>🚀 Proyectos</h2><select value={grado} onChange={e => { const g = Number(e.target.value); setGrado(g); localStorage.setItem('grado', g); setGrupoActual(prev => ({ ...(prev||{}), grado: g })); }} style={{fontSize:'1.1rem', padding:'5px 10px', borderRadius:5, border:'2px solid #00CEC9', fontWeight:'bold', background:'white', cursor:'pointer'}}><option value={1}>1º Primaria</option><option value={2}>2º Primaria</option><option value={3}>3º Primaria</option><option value={4}>4º Primaria</option><option value={5}>5º Primaria</option><option value={6}>6º Primaria</option></select></div> <div> {!modoEdicionProy && <button className="btn-guardar" onClick={()=>{setProyectoActual({id:null, nombre:'', metodologia:'COMUNITARIOS', escenario:'AULA', temporalidad:'', pdas_seleccionados:[], fases_contenido:{}, apartados:{}}); setBusquedaPda(""); setModoEdicionProy(true);}}>+ Nuevo</button>} <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button> </div> </div> {modoEdicionProy ? ( <div key={proyectoActual.id || 'nuevo'} className="hoja-planeacion" style={{ background: `linear-gradient(to bottom, ${calcularColorSemaforo(proyectoActual)} 0%, #ffffff 350px)` }}> <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}> <h3 className="titulo-edicion">✏️ Editar Proyecto</h3> <div className="botones-edicion"><button className="btn-guardar" onClick={()=>exportarPlanoWord(datosExportacionProyecto)} style={{marginRight:10}}>Word</button><button className="btn-guardar" onClick={()=>exportarPlanoPdf(datosExportacionProyecto)}>PDF</button><button className="btn-volver" onClick={()=>setModoEdicionProy(false)}>🔙 Volver</button></div> </div> <div className="grid-dos"> <div className="grupo-input grupo-nombre"> <label>Nombre:</label> <input defaultValue={proyectoActual.nombre} onBlur={e => actualizarDatoProyecto('nombre', e.target.value)} style={{padding:'8px'}} placeholder="Nombre..." /> </div> <div className="grupo-input"><label>Metodología:</label><select value={proyectoActual.metodologia} onChange={e=>actualizarDatoProyecto('metodologia', e.target.value)} style={{padding:10}}> {Object.keys(METODOLOGIAS).map(k=><option key={k} value={k}>{METODOLOGIAS[k].nombre}</option>)} </select></div> </div> <PlaneacionApartados value={safeParse(proyectoActual.apartados, {})} onChange={(key, value) => actualizarDatoProyecto('apartados', {...safeParse(proyectoActual.apartados, {}), [key]: value})} /> <div className="seccion-plan" style={{marginTop:20, borderLeft:`6px solid ${METODOLOGIAS[proyectoActual.metodologia].borde}`}}> <h4>Fases ({METODOLOGIAS[proyectoActual.metodologia].nombre})</h4> {METODOLOGIAS[proyectoActual.metodologia].fases.map((fase, i) => ( <div key={i} className="momento" style={{flexDirection:'column', marginBottom:15}}> <span className="label-momento" style={{fontSize:'0.9rem'}}>{fase}</span> <textarea style={{width:"100%", minHeight:80}} value={(safeParse(proyectoActual.fases_contenido, {}))[i] || ""} onChange={e => actualizarFaseProyecto(i, e.target.value)} placeholder="Desarrollo..." /> </div> ))} </div> <div className="pdas-print-view" style={{display:'none'}}> <h4 style={{marginTop:20, textTransform:'uppercase', borderBottom:'1px solid black'}}>Vinculación de Aprendizajes (PDAs)</h4> <ul style={{listStyle:'none', padding:0}}> {pdasSeleccionadosParaImprimir.length === 0 && <li>Sin aprendizajes vinculados.</li>} {pdasSeleccionadosParaImprimir.map(p => ( <li key={p.id} style={{marginBottom:10, fontSize:'11pt', fontFamily:'Times New Roman'}}> <b>• {p.proyecto_sugerido}:</b> {p.descripcion} </li> ))} </ul> </div> <div className="seccion-plan no-print" style={{marginTop:20, background:'rgba(0,0,0,0.03)'}}> <h4>Vincular PDAs</h4> <input placeholder="Buscar tema..." value={busquedaPda} onChange={e=>setBusquedaPda(e.target.value)} style={{width:'100%', padding:8, marginBottom:10}}/> <div style={{maxHeight:150, overflowY:'auto'}}> {pdasFiltrados.length === 0 && <p style={{fontStyle:'italic', color:'#999'}}>No hay PDAs.</p>} {pdasFiltrados.map(p=>( <div key={p.id} style={{display:'flex', gap:5, marginBottom:5}}> <input type="checkbox" checked={(Array.isArray(proyectoActual.pdas_seleccionados) ? proyectoActual.pdas_seleccionados : []).includes(p.id)} onChange={()=>togglePdaProyecto(p.id)} /> <span><b>{p.proyecto_sugerido}</b>: {p.descripcion}</span> </div> ))} </div> </div> <button className="btn-guardar botones-edicion" onClick={guardarProyecto} style={{marginTop:20, width:'100%', padding:15}}>💾 GUARDAR</button> </div> ) : ( <div className="grid-proyectos-scroll" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:20, alignContent:'start'}}> {listaProyectos.map(p => { const estilo = METODOLOGIAS[p.metodologia] || {color:'#fff', borde:'#ccc'}; const isVisto = (vistos.proyecto || []).includes(String(p.id)); return ( <div key={p.id} className="tarjeta-proyecto" onClick={() => editarProyectoSafe(p)} style={{ cursor:'pointer', borderLeft:`8px solid ${estilo.borde}`, background: estilo.color, padding: 15, borderRadius: 8, height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: isVisto ? 0.6 : 1, transition: 'opacity 0.3s' }}> <div> <h3 style={{margin:'0 0 5px 0', fontSize:'1.1rem', color:'#333'}}>{p.nombre}</h3> <span style={{fontSize:'0.8rem', background:'rgba(255,255,255,0.6)', padding:'2px 6px', borderRadius:4, fontWeight:'bold', color:estilo.borde}}> {estilo.nombre} {p.es_sugerido && '⭐'} </span> </div> <div style={{alignSelf: 'flex-end', marginTop: 10}}><button className="no-print" onClick={(e)=>{e.stopPropagation(); toggleVisto('proyecto', p.id)}} style={{padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer', background: isVisto ? '#2ecc71' : 'rgba(255,255,255,0.8)', color: isVisto ? 'white' : '#333', border: 'none', borderRadius: 5, fontWeight:'bold'}}> {isVisto ? '✅ Terminado' : 'Marcar Terminado'} </button></div> </div> ); })} </div> )} </div>
      );
    }

    if(vista === 'PLANNER') {
      const isVisto = (vistos.plan || []).includes(String(semanaPlan)); const datosExportacionSemana = { tipo: 'Planeación semanal', nombre: `Semana ${semanaPlan}`, datos: { grado, temporalidad: obtenerFechasSemana(semanaPlan) }, apartados: safeParse(planData.apartados, {}), pdas: pdasSemana, dias: ['lunes','martes','miercoles','jueves','viernes'].map(label => ({ label: label.toUpperCase(), inicio: planData[`${label}_inicio`], desarrollo: planData[`${label}_desarrollo`], cierre: planData[`${label}_cierre`] })), extras: { recursos: planData.recursos, evaluacion: planData.evaluacion, adecuaciones: planData.adecuaciones } };

      return (
        <div className="pantalla-dosificador">
          <div className="header-dosificador no-print">{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />}
            <div style={{display:'flex', gap:10, alignItems:'center'}}><h2>Planeación</h2><select value={grado} onChange={e => { const g = Number(e.target.value); setGrado(g); localStorage.setItem('grado', g); setGrupoActual(prev => ({ ...(prev||{}), grado: g })); }} style={{fontSize:'1.1rem', padding:'5px 10px', borderRadius:5, border:'2px solid #0984E3', fontWeight:'bold', background:'white', cursor:'pointer'}}><option value={1}>1º Primaria</option><option value={2}>2º Primaria</option><option value={3}>3º Primaria</option><option value={4}>4º Primaria</option><option value={5}>5º Primaria</option><option value={6}>6º Primaria</option></select><select value={semanaPlan} onChange={e=>setSemanaPlan(Number(e.target.value))}>{SEMANAS_CLASE.map(s=><option key={s.id} value={s.id}>Sem {s.id} ({obtenerFechasSemana(s.id)})</option>)}</select></div>
            <div>
              <button onClick={()=>toggleVisto('plan', semanaPlan)} style={{padding: '10px 15px', fontWeight:'bold', cursor: 'pointer', background: isVisto ? '#2ecc71' : '#bdc3c7', color: 'white', border: 'none', borderRadius: 5, marginRight: 10}} className="no-print"> {isVisto ? '✅ Completada' : 'Marcar Completada'} </button>
              <button className="btn-guardar" onClick={savePlan}>💾 Guardar</button>
              <button className="btn-volver" onClick={()=>exportarPlanoWord(datosExportacionSemana)}>Word</button><button className="btn-volver" onClick={()=>exportarPlanoPdf(datosExportacionSemana)}>PDF</button>
              <button className="btn-volver" onClick={()=>setVista('MENU')}>Salir</button>
            </div>
          </div>

          <div className="hoja-planeacion" style={{opacity: isVisto ? 0.8 : 1, position: 'relative'}}>
<PlaneacionApartados value={safeParse(planData.apartados, {})} onChange={(key, value) => setPlanData(prev => ({...prev, apartados: {...safeParse(prev.apartados, {}), [key]: value}}))} />
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
          <div className="header-dosificador">{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />}<h2>👥 Mi Grupo ({grado}º Primaria)</h2><button className="btn-volver" onClick={()=>setVista('MENU')}>Volver</button></div>
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
          <div className="header-dosificador">{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />}
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

    if (vista === 'ASISTENCIA_QR') {
      return (
        <div className="android-qr-screen" style={{ backgroundColor: '#f4f6f8', minHeight: 'var(--app-height)', padding: '10px 20px' }}>
          {toast && (
            <div role="status" aria-live="polite" style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#34495e', color: 'white', padding: '10px 20px', borderRadius: 20, zIndex: 10000, fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
              {toast}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <button
              onClick={() => setVista('MENU')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2d3748',
                color: '#ffffff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ◀ Volver al Menú Principal
            </button>
          </div>
          <Suspense fallback={<p role="status">Cargando herramientas QR…</p>}><ControlQR
            grupoActual={grupoActual}
            alumnos={alumnos}
            criterios={criterios}
            fechaEval={fechaEval}
            configCiclo={configCiclo}
            ipcRenderer={ipcRenderer}
            onDateChanged={setFechaEval}
            onGradesImported={({ fecha, campo }) => {
              setFechaEval(fecha);
              setCampoActual(campo);
              cargarEval(campo, fecha);
            }}
            showToast={showToast}
            onAttendanceUpdated={() => {
              if (typeof cargarEval === 'function') cargarEval(campoActual);
            }}
            onGradeSaved={(aid, cid, val) => {
              if (aid && cid) {
                handleSaveNota(aid, cid, val);
              }
              if (typeof cargarEval === 'function') {
                cargarEval(campoActual);
              }
            }}
          /></Suspense>
        </div>
      );
    }

    if(vista === 'CALENDARIO') {
      return (
        <div className="pantalla-dosificador">
          <div className="header-dosificador">{['EVAL','TRIMESTRAL','DOSIF','BITACORA','CALENDARIO','COMISIONES'].includes(vista) && <ExportDocument title={({'EVAL':'Evaluación','TRIMESTRAL':'Reporte trimestral','DOSIF':'Dosificación','BITACORA':'Bitácora','CALENDARIO':'Calendario','COMISIONES':'Comisiones'})[vista]} selector=".pantalla-dosificador" table={['EVAL','TRIMESTRAL'].includes(vista)} />}
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
      });
    }} />;
  }

  return (
    <Suspense fallback={<div role="status">Cargando módulo…</div>}>
    <div className="elara-app-root">
      <GoogleSync ipc={ipcRenderer} />{renderVistaContent()}
      {vista === 'MENU' && <LegalInfo />}
      

      {/* COMPONENTES DE INTERFAZ ELARA GLOBALES */}

      {/* BANNER DE ACTUALIZACIÓN AUTOMÁTICA */}
      {updateStatus && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
          background: updateStatus.tipo === 'downloaded' ? 'linear-gradient(135deg,#1a237e,#283593)' : 'linear-gradient(135deg,#1b5e20,#2e7d32)',
          color: '#fff', borderRadius: '12px', padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: '320px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          fontFamily: 'system-ui,sans-serif', fontSize: '13px',
          animation: 'fadeInUp 0.4s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}>
            <span>{updateStatus.tipo === 'downloaded' ? '✅' : '🔄'}</span>
            <span>{updateStatus.tipo === 'downloaded' ? 'Actualización lista' : 'Actualización disponible'}</span>
          </div>
          <div style={{ opacity: 0.85 }}>
            {updateStatus.tipo === 'downloaded'
              ? `v${updateStatus.version} lista. Se instalará cuando cierres la app.`
              : `v${updateStatus.version} descargándose en segundo plano...`}
          </div>
          {updateStatus.tipo === 'downloaded' && (
            <button
              onClick={() => ipcRenderer && ipcRenderer.send('install-update-now')}
              style={{
                marginTop: '4px', background: '#fff', color: '#1a237e',
                border: 'none', borderRadius: '8px', padding: '6px 14px',
                fontWeight: 700, cursor: 'pointer', fontSize: '12px', alignSelf: 'flex-start'
              }}
            >Instalar ahora</button>
          )}
          <button
            onClick={() => setUpdateStatus(null)}
            style={{
              position: 'absolute', top: '8px', right: '10px',
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer', fontSize: '16px', lineHeight: 1
            }}
          >×</button>
        </div>
      )}
    </div>
    </Suspense>
  );
}

export default App;
