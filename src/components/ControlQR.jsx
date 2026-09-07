import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { exportarAsistenciaExcel, exportarTrabajosExcel } from '../utils/excelExporter';

const CAMPOS_FORMATIVOS = [
  'LENGUAJES',
  'SABERES Y PENSAMIENTO CIENTÍFICO',
  'ÉTICA, NATURALEZA Y SOCIEDADES',
  'DE LO HUMANO Y LO COMUNITARIO'
];

export default function ControlQR({
  grupoActual,
  alumnos = [],
  criterios = [],
  fechaEval,
  ipcRenderer,
  showToast,
  onAttendanceUpdated,
  onGradeSaved,
  onDateChanged
}) {
  const [activeTab, setActiveTab] = useState('ESCANER'); // 'ESCANER', 'ASISTENCIA', 'EVALUACION', 'HISTORIAL', 'GAFETES'
  const [modoEscaneo, setModoEscaneo] = useState('ASISTENCIA'); // 'ASISTENCIA' o 'TRABAJO'
  
  // Fecha seleccionada para visualización y registro diario
  const [fechaActualQR, setFechaActualQR] = useState(fechaEval || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (fechaEval && fechaEval !== fechaActualQR) {
      setFechaActualQR(fechaEval);
    }
  }, [fechaEval]);

  // Conexión Móvil
  const [localIp, setLocalIp] = useState('127.0.0.1');
  const [wsPort, setWsPort] = useState(3000);
  const [listaIps, setListaIps] = useState([]);
  const [subtipoAsistencia, setSubtipoAsistencia] = useState('PRESENTE'); // 'PRESENTE', 'RETARDO', 'FALTA', 'JUSTIFICADO'
  
  // Evaluación de Trabajos Diarios y Selección Ágil de Tareas
  const [campoSeleccionado, setCampoSeleccionado] = useState(CAMPOS_FORMATIVOS[0]);
  const [criterioSeleccionado, setCriterioSeleccionado] = useState(null);
  const [calificacionActual, setCalificacionActual] = useState(10);
  const [tituloTrabajo, setTituloTrabajo] = useState('Tarea 1');
  const [tareaAnterior, setTareaAnterior] = useState(null);
  const [listaTareasPersonalizadas, setListaTareasPersonalizadas] = useState(['Tarea 1', 'Tarea 2', 'Tarea 3', 'Tarea 4', 'Tarea 5']);
  const [vistaModoEvaluacion, setVistaModoEvaluacion] = useState('MATRIZ'); // 'MATRIZ' o 'LISTA'

  // Historial en vivo y datos del día
  const [historialEscaneos, setHistorialEscaneos] = useState([]);
  const [ultimoEscaneado, setUltimoEscaneado] = useState(null);
  const [asistenciaDia, setAsistenciaDia] = useState({});
  const [trabajosDia, setTrabajosDia] = useState([]);

  // Perfiles / Fotos de alumnos
  const [perfilesMap, setPerfilesMap] = useState({});

  // Referencia para evitar escaneos duplicados por mantener la cámara sobre el QR
  const lastScanRef = useRef({ code: '', studentId: null, timestamp: 0 });

  // Estados para la pestaña: HISTORIAL Y REPORTES
  const [fechaInicioHistorial, setFechaInicioHistorial] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaFinHistorial, setFechaFinHistorial] = useState(() => new Date().toISOString().split('T')[0]);
  const [subTabHistorial, setSubTabHistorial] = useState('ASISTENCIA'); // 'ASISTENCIA' o 'TRABAJOS'
  const [campoFiltroHistorial, setCampoFiltroHistorial] = useState('TODOS');
  const [vistaModoAsistencia, setVistaModoAsistencia] = useState('RESUMEN'); // 'RESUMEN' o 'MATRIZ'
  const [resumenAsistenciaHist, setResumenAsistenciaHist] = useState([]);
  const [asistenciaRangoDetalle, setAsistenciaRangoDetalle] = useState([]);
  const [resumenTrabajosHist, setResumenTrabajosHist] = useState([]);
  const [trabajosRangoDetalle, setTrabajosRangoDetalle] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Modales de exportación a criterios
  const [showModalExportAsis, setShowModalExportAsis] = useState(false);
  const [showModalExportTrab, setShowModalExportTrab] = useState(false);
  const [criterioDestinoAsis, setCriterioDestinoAsis] = useState('');
  const [criterioDestinoTrab, setCriterioDestinoTrab] = useState('');
  const [escalaDestinoAsis, setEscalaDestinoAsis] = useState(10);

  // Cargar IP local, Asistencias, Trabajos y Perfiles guardados en SQLite para la fecha actual
  const cargarDatosDia = () => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-ws-info').then(info => {
        if (info) {
          if (info.ip) setLocalIp(info.ip);
          if (info.port) setWsPort(info.port);
          if (info.ips) setListaIps(info.ips);
        }
      }).catch(console.error);

      ipcRenderer.invoke('get-local-ip').then(ip => setLocalIp(ip || '127.0.0.1')).catch(console.error);
      ipcRenderer.invoke('get-local-ips').then(ips => setListaIps(ips || [])).catch(console.error);
      
      ipcRenderer.invoke('get-asistencia-fecha', fechaActualQR, grupoActual?.id).then(rows => {
        const map = {};
        (rows || []).forEach(r => { map[r.alumno_id] = r.estado; });
        setAsistenciaDia(map);
      }).catch(console.error);

      ipcRenderer.invoke('get-trabajos-qr', fechaActualQR, grupoActual?.id).then(rows => {
        setTrabajosDia(rows || []);
      }).catch(console.error);

      ipcRenderer.invoke('get-todos-perfiles').then(map => {
        setPerfilesMap(map || {});
      }).catch(console.error);

      ipcRenderer.invoke('get-tareas-lista-grupo', grupoActual?.id).then(lista => {
        if (lista && lista.length > 0) {
          setListaTareasPersonalizadas(prev => Array.from(new Set([...prev, ...lista])));
        }
      }).catch(console.error);
    }
  };

  // Combinar tareas base con las ya registradas en la fecha o en el grupo
  const tareasDisponibles = useMemo(() => {
    const set = new Set(listaTareasPersonalizadas);
    (trabajosDia || []).forEach(t => {
      if (t.nombre_trabajo) set.add(t.nombre_trabajo);
    });
    return Array.from(set);
  }, [listaTareasPersonalizadas, trabajosDia]);

  const cambiarTareaActiva = (nuevaTarea) => {
    if (!nuevaTarea || !nuevaTarea.trim()) return;
    const trimmed = nuevaTarea.trim();
    if (trimmed !== tituloTrabajo) {
      setTareaAnterior(tituloTrabajo);
      setTituloTrabajo(trimmed);
      if (!listaTareasPersonalizadas.includes(trimmed)) {
        setListaTareasPersonalizadas(prev => [...prev, trimmed]);
      }
      if (showToast) showToast(`🎯 Tarea activa: ${trimmed}`);
    }
  };

  const registrarTrabajoAlumnoDirecto = async (alumnoId, alumnoNombre, nombreTarea, nota) => {
    const valNota = parseFloat(nota) || 10;
    const nombreT = nombreTarea || tituloTrabajo;
    
    if (ipcRenderer) {
      try {
        const resTrabajo = await ipcRenderer.invoke('save-trabajo-qr', alumnoId, campoSeleccionado, nombreT, fechaActualQR, valNota, grupoActual?.id);
        setTrabajosDia(prev => {
          const sinEste = prev.filter(t => !(String(t.alumno_id) === String(alumnoId) && t.nombre_trabajo === nombreT));
          return [resTrabajo, ...sinEste];
        });
      } catch (err) {
        console.error("Error guardando trabajo QR en SQLite:", err);
      }
    }

    const nuevoLog = {
      id: Date.now(),
      tipo: 'TRABAJO',
      alumnoId,
      alumno: alumnoNombre,
      campo: campoSeleccionado,
      actividad: nombreT,
      nota: valNota,
      hora: new Date().toLocaleTimeString()
    };

    setUltimoEscaneado(nuevoLog);
    setHistorialEscaneos(prev => [nuevoLog, ...prev.slice(0, 19)]);
    playBeep();
    if (showToast) showToast(`🌟 Trabajo Registrado (${valNota}): ${alumnoNombre} - ${nombreT}`);
  };

  useEffect(() => {
    cargarDatosDia();
  }, [ipcRenderer, fechaActualQR, grupoActual]);

  // Cargar datos históricos para la pestaña HISTORIAL
  const cargarHistorial = async () => {
    if (!ipcRenderer) return;
    setCargandoHistorial(true);
    try {
      const [resAsis, detAsis, resTrab, detTrab] = await Promise.all([
        ipcRenderer.invoke('get-resumen-asistencia', grupoActual?.id, fechaInicioHistorial, fechaFinHistorial),
        ipcRenderer.invoke('get-asistencia-rango', grupoActual?.id, fechaInicioHistorial, fechaFinHistorial),
        ipcRenderer.invoke('get-resumen-trabajos', grupoActual?.id, fechaInicioHistorial, fechaFinHistorial, campoFiltroHistorial),
        ipcRenderer.invoke('get-trabajos-rango', grupoActual?.id, fechaInicioHistorial, fechaFinHistorial, campoFiltroHistorial)
      ]);
      setResumenAsistenciaHist(resAsis || []);
      setAsistenciaRangoDetalle(detAsis || []);
      setResumenTrabajosHist(resTrab || []);
      setTrabajosRangoDetalle(detTrab || []);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORIAL') {
      cargarHistorial();
    }
  }, [activeTab, fechaInicioHistorial, fechaFinHistorial, campoFiltroHistorial, grupoActual]);

  // Presets rápidos para fechas de historial
  const setPresetFechas = (tipo) => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    if (tipo === 'SEMANA') {
      const diaSemana = hoy.getDay() || 7; // 1 = lunes, 7 = domingo
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (diaSemana - 1));
      setFechaInicioHistorial(lunes.toISOString().split('T')[0]);
      setFechaFinHistorial(hoyStr);
    } else if (tipo === 'MES') {
      const primeroMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFechaInicioHistorial(primeroMes.toISOString().split('T')[0]);
      setFechaFinHistorial(hoyStr);
    } else if (tipo === '30DIAS') {
      const hace30 = new Date(hoy);
      hace30.setDate(hoy.getDate() - 30);
      setFechaInicioHistorial(hace30.toISOString().split('T')[0]);
      setFechaFinHistorial(hoyStr);
    } else if (tipo === 'CICLO') {
      setFechaInicioHistorial('2026-08-31');
      setFechaFinHistorial(hoyStr);
    }
  };

  // Escuchar escaneos recibidos desde el WebSocket de la App Móvil
  useEffect(() => {
    if (!ipcRenderer) return;

    const handleQrScanned = (event, dataStr) => {
      procesarCodigoEscaneado(dataStr);
    };

    ipcRenderer.on('qr-scanned', handleQrScanned);
    return () => {
      ipcRenderer.removeListener('qr-scanned', handleQrScanned);
    };
  }, [ipcRenderer, modoEscaneo, subtipoAsistencia, campoSeleccionado, criterioSeleccionado, calificacionActual, alumnos, fechaActualQR, grupoActual, tituloTrabajo]);

  // Cargar criterios cuando cambia el campo formativo
  useEffect(() => {
    if (ipcRenderer && grupoActual?.id) {
      ipcRenderer.invoke('get-criterios', grupoActual.id, campoSeleccionado).then(list => {
        if (list && list.length > 0) {
          setCriterioSeleccionado(list[0].id);
        } else {
          setCriterioSeleccionado(null);
        }
      }).catch(console.error);
    }
  }, [ipcRenderer, grupoActual, campoSeleccionado]);

  // Reproducir sonido de confirmación al escanear
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio beep no soportado:', e);
    }
  };

  // Registrar asistencia directamente para un alumno
  const registrarAsistenciaDirecta = async (alumnoId, alumnoNombre, estadoTipo) => {
    setAsistenciaDia(prev => ({ ...prev, [alumnoId]: estadoTipo }));

    if (ipcRenderer) {
      try {
        await ipcRenderer.invoke('save-asistencia-qr', alumnoId, fechaActualQR, estadoTipo, grupoActual?.id);
      } catch (err) {
        console.error("Error guardando asistencia en SQLite:", err);
      }
    }

    if (onAttendanceUpdated) onAttendanceUpdated(alumnoId, fechaActualQR, estadoTipo);

    const nuevoLog = {
      id: Date.now(),
      tipo: 'ASISTENCIA',
      alumno: alumnoNombre,
      estado: estadoTipo,
      hora: new Date().toLocaleTimeString()
    };

    setUltimoEscaneado(nuevoLog);
    setHistorialEscaneos(prev => [nuevoLog, ...prev.slice(0, 19)]);
    if (showToast) showToast(`✅ Asistencia (${estadoTipo}): ${alumnoNombre}`);
  };

  // Procesar código escaneado
  const procesarCodigoEscaneado = async (codigoRaw) => {
    if (!codigoRaw) return;
    const raw = String(codigoRaw).trim();
    const now = Date.now();

    const timeDiff = now - lastScanRef.current.timestamp;
    if (lastScanRef.current.code === raw && timeDiff < 3000) {
      return;
    }
    if (timeDiff < 500) {
      return;
    }

    let studentId = raw;
    let gradeVal = calificacionActual;

    if (raw.includes(':')) {
      const parts = raw.split(':');
      studentId = parts[0].trim();
      if (!isNaN(parseFloat(parts[1]))) {
        gradeVal = parseFloat(parts[1]);
      }
    }

    if (studentId.startsWith('ALU-')) {
      studentId = studentId.replace('ALU-', '').trim();
    }

    const targetAlumno = alumnos.find(a => String(a.id) === String(studentId) || a.nombre.toLowerCase().includes(studentId.toLowerCase()));

    if (!targetAlumno) {
      if (showToast) showToast(`❌ Alumno no encontrado para el código: "${raw}"`);
      return;
    }

    const targetAlumnoId = targetAlumno.id;
    const nombreMostrar = targetAlumno.nombre;

    if (lastScanRef.current.studentId === targetAlumnoId && timeDiff < 3000) {
      return;
    }

    lastScanRef.current = { code: raw, studentId: targetAlumnoId, timestamp: now };
    playBeep();

    if (modoEscaneo === 'ASISTENCIA') {
      await registrarAsistenciaDirecta(targetAlumnoId, nombreMostrar, subtipoAsistencia);
    } else {
      let resTrabajo = null;
      if (ipcRenderer) {
        try {
          resTrabajo = await ipcRenderer.invoke('save-trabajo-qr', targetAlumnoId, campoSeleccionado, tituloTrabajo, fechaActualQR, gradeVal, grupoActual?.id);
          setTrabajosDia(prev => {
            const sinEste = prev.filter(t => !(String(t.alumno_id) === String(targetAlumnoId) && t.nombre_trabajo === tituloTrabajo));
            return [resTrabajo, ...sinEste];
          });
        } catch (err) {
          console.error("Error guardando trabajo QR en SQLite:", err);
        }
      }

      const nuevoLog = {
        id: Date.now(),
        tipo: 'TRABAJO',
        alumnoId: targetAlumnoId,
        alumno: nombreMostrar,
        campo: campoSeleccionado,
        actividad: tituloTrabajo,
        nota: gradeVal,
        hora: new Date().toLocaleTimeString()
      };

      setUltimoEscaneado(nuevoLog);
      setHistorialEscaneos(prev => [nuevoLog, ...prev.slice(0, 19)]);
      if (showToast) showToast(`🌟 Trabajo Registrado (${gradeVal}): ${nombreMostrar} - ${tituloTrabajo}`);
    }
  };

  // Eliminar un trabajo de la lista del día
  const eliminarTrabajo = async (id) => {
    if (ipcRenderer) {
      await ipcRenderer.invoke('delete-trabajo-qr', id);
      setTrabajosDia(prev => prev.filter(t => t.id !== id));
      setTrabajosRangoDetalle(prev => prev.filter(t => t.id !== id));
      if (showToast) showToast('🗑️ Trabajo eliminado');
    }
  };

  // Guardar/Actualizar Foto de perfil de un alumno desde los gafetes
  const handleUploadFoto = (alumnoId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Photo = e.target.result;
      const perfilActual = perfilesMap[alumnoId] || {};
      const perfilNuevo = { ...perfilActual, alumno_id: alumnoId, foto_url: base64Photo };
      
      setPerfilesMap(prev => ({ ...prev, [alumnoId]: perfilNuevo }));

      if (ipcRenderer) {
        await ipcRenderer.invoke('save-perfil', perfilNuevo);
        if (showToast) showToast('📸 Foto actualizada para el gafete');
      }
    };
    reader.readAsDataURL(file);
  };

  // Cálculo de promedios diarios por alumno
  const calcularPromedioAlumno = (alumnoId) => {
    const trabajosAlumno = trabajosDia.filter(t => String(t.alumno_id) === String(alumnoId));
    if (trabajosAlumno.length === 0) return null;
    const suma = trabajosAlumno.reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
    return (suma / trabajosAlumno.length).toFixed(1);
  };

  // Exportar Asistencias a Excel
  const handleExportarAsistenciaExcel = () => {
    const matrizDias = {};
    const setFechas = new Set();
    (asistenciaRangoDetalle || []).forEach(r => {
      if (!matrizDias[r.alumno_id]) matrizDias[r.alumno_id] = {};
      matrizDias[r.alumno_id][r.fecha] = r.estado;
      setFechas.add(r.fecha);
    });
    const fechasUnicas = Array.from(setFechas).sort();

    exportarAsistenciaExcel({
      grupoNombre: grupoActual ? `${grupoActual.grado}° ${grupoActual.seccion}` : 'General',
      fechaInicio: fechaInicioHistorial,
      fechaFin: fechaFinHistorial,
      resumenAlumnos: resumenAsistenciaHist,
      matrizDias,
      fechasUnicas
    });
    if (showToast) showToast('📥 Archivo Excel de Asistencia generado con éxito');
  };

  // Exportar Trabajos a Excel
  const handleExportarTrabajosExcel = () => {
    exportarTrabajosExcel({
      grupoNombre: grupoActual ? `${grupoActual.grado}° ${grupoActual.seccion}` : 'General',
      fechaInicio: fechaInicioHistorial,
      fechaFin: fechaFinHistorial,
      campo: campoFiltroHistorial,
      trabajos: trabajosRangoDetalle,
      resumenAlumnos: resumenTrabajosHist
    });
    if (showToast) showToast('📥 Archivo Excel de Trabajos generado con éxito');
  };

  // Transferir Asistencia a Criterio en Evaluaciones Personalizadas
  const ejecutarExportacionAsistenciaACriterio = async () => {
    if (!criterioDestinoAsis) {
      if (showToast) showToast('⚠️ Por favor selecciona un criterio de destino.');
      return;
    }
    try {
      const count = await ipcRenderer.invoke(
        'importar-asistencia-a-criterio',
        Number(criterioDestinoAsis),
        fechaInicioHistorial,
        fechaFinHistorial,
        grupoActual?.id,
        Number(escalaDestinoAsis) || 10,
        fechaActualQR
      );
      setShowModalExportAsis(false);
      if (showToast) showToast(`✅ ¡${count} calificaciones de asistencia exportadas a la evaluación!`);
      if (typeof onGradeSaved === 'function') onGradeSaved();
    } catch (err) {
      console.error(err);
      if (showToast) showToast('❌ Error al exportar asistencia a evaluación.');
    }
  };

  // Transferir Promedios de Trabajos a Criterio en Evaluaciones Personalizadas
  const ejecutarExportacionTrabajosACriterio = async () => {
    if (!criterioDestinoTrab) {
      if (showToast) showToast('⚠️ Por favor selecciona un criterio de destino.');
      return;
    }
    try {
      const count = await ipcRenderer.invoke(
        'importar-promedios-qr-a-criterio',
        Number(criterioDestinoTrab),
        fechaInicioHistorial,
        fechaFinHistorial,
        campoFiltroHistorial,
        grupoActual?.id,
        fechaActualQR
      );
      setShowModalExportTrab(false);
      if (showToast) showToast(`✅ ¡${count} promedios de trabajos exportados a la evaluación!`);
      if (typeof onGradeSaved === 'function') onGradeSaved();
    } catch (err) {
      console.error(err);
      if (showToast) showToast('❌ Error al exportar promedios de trabajos.');
    }
  };

  const wsUrl = `ws://${localIp}:${wsPort}`;

  // Cálculo de estadísticas globales para el historial de asistencia
  const totalDiasHist = new Set(asistenciaRangoDetalle.map(a => a.fecha)).size;
  const promedioAsisGlobal = resumenAsistenciaHist.length > 0
    ? (resumenAsistenciaHist.reduce((acc, a) => acc + (a.porcentaje || 0), 0) / resumenAsistenciaHist.length).toFixed(1)
    : 0;

  // Cálculo de estadísticas globales para el historial de trabajos
  const promedioTrabajosGlobal = resumenTrabajosHist.filter(t => t.promedio !== null).length > 0
    ? (resumenTrabajosHist.filter(t => t.promedio !== null).reduce((acc, t) => acc + t.promedio, 0) / resumenTrabajosHist.filter(t => t.promedio !== null).length).toFixed(1)
    : '-';

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', color: '#2d3748' }}>
      {/* ESTILOS DE IMPRESIÓN PARA GAFETES */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .gafetes-print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
            page-break-inside: avoid;
          }
          .gafete-card {
            border: 3px solid #1a365d !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* HEADER PRINCIPAL DE CONTROL QR */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a202c', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📱 Control de Asistencia y Trabajos por Código QR
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <span style={{ color: '#718096', fontSize: '14px' }}>
              Grupo Activo: <strong>{grupoActual ? `${grupoActual.grado}° ${grupoActual.seccion}` : 'General'}</strong>
            </span>
            <span style={{ color: '#cbd5e0' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#2b6cb0' }}>📅 Fecha Activa:</label>
              <input
                type="date"
                value={fechaActualQR}
                onChange={e => {
                  setFechaActualQR(e.target.value);
                  if (typeof onDateChanged === 'function') onDateChanged(e.target.value);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e0',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#2d3748',
                  background: '#f7fafc',
                  cursor: 'pointer'
                }}
              />
              <button
                onClick={() => {
                  const hoy = new Date().toISOString().split('T')[0];
                  setFechaActualQR(hoy);
                  if (typeof onDateChanged === 'function') onDateChanged(hoy);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e0',
                  background: '#edf2f7',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Hoy
              </button>
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN QR */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ESCANER', label: '📷 Escáner y Móvil' },
            { id: 'ASISTENCIA', label: '📋 Lista de Asistencia' },
            { id: 'EVALUACION', label: '📝 Evaluación Trabajos' },
            { id: 'HISTORIAL', label: '📊 Historial y Reportes' },
            { id: 'GAFETES', label: '🎫 Gafetes QR' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                backgroundColor: activeTab === tab.id ? '#3182ce' : '#edf2f7',
                color: activeTab === tab.id ? '#ffffff' : '#4a5568',
                boxShadow: activeTab === tab.id ? '0 2px 4px rgba(49, 130, 206, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* VISTA 1: ESCÁNER Y VINCULACIÓN MÓVIL */}
      {activeTab === 'ESCANER' && (
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* PANEL IZQUIERDO: CONFIGURACIÓN DE MODO Y VINCULACIÓN */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, color: '#2b6cb0' }}>🎯 Modo de Captura Activo</h3>

            {/* SELECCIÓN MODO ASISTENCIA VS TRABAJO */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setModoEscaneo('ASISTENCIA')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: modoEscaneo === 'ASISTENCIA' ? '#38a169' : '#edf2f7',
                  color: modoEscaneo === 'ASISTENCIA' ? '#ffffff' : '#4a5568'
                }}
              >
                ✅ Pase de Asistencia
              </button>
              <button
                onClick={() => setModoEscaneo('TRABAJO')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: modoEscaneo === 'TRABAJO' ? '#dd6b20' : '#edf2f7',
                  color: modoEscaneo === 'TRABAJO' ? '#ffffff' : '#4a5568'
                }}
              >
                📝 Revisión de Trabajos
              </button>
            </div>

            {/* OPCIONES DE ASISTENCIA */}
            {modoEscaneo === 'ASISTENCIA' && (
              <div style={{ backgroundColor: '#f0fff4', padding: '16px', borderRadius: '8px', border: '1px solid #c6f6d5', marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#22543d' }}>
                  Estado al escanear el QR:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'PRESENTE', label: 'Presente (Asistencia)' },
                    { id: 'RETARDO', label: 'Retardo' },
                    { id: 'FALTA', label: 'Falta' },
                    { id: 'JUSTIFICADO', label: 'Justificado' }
                  ].map(op => (
                    <button
                      key={op.id}
                      onClick={() => setSubtipoAsistencia(op.id)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        border: subtipoAsistencia === op.id ? '2px solid #22543d' : '1px solid #cbd5e0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: subtipoAsistencia === op.id ? '#38a169' : '#ffffff',
                        color: subtipoAsistencia === op.id ? '#ffffff' : '#2d3748'
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* OPCIONES DE EVALUACIÓN DE TRABAJO */}
            {modoEscaneo === 'TRABAJO' && (
              <div style={{ backgroundColor: '#fffaf0', padding: '16px', borderRadius: '10px', border: '1px solid #feebc8', marginBottom: '20px' }}>
                {/* INDICADOR DE TAREA ACTIVA Y BOTÓN DE RETORNO A TAREA PREVIA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#744210' }}>
                      🎯 Tarea Activa al Escanear:
                    </span>
                    <span style={{
                      backgroundColor: '#dd6b20',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      boxShadow: '0 2px 4px rgba(221, 107, 32, 0.3)'
                    }}>
                      📝 {tituloTrabajo}
                    </span>
                  </div>

                  {/* BOTÓN VOLVER A TAREA PREVIA (ALUMNO ADELANTADO -> REGRESAR AL RESTO) */}
                  {tareaAnterior && tareaAnterior !== tituloTrabajo && (
                    <button
                      onClick={() => cambiarTareaActiva(tareaAnterior)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#ebf8ff',
                        border: '1px solid #bee3f8',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#2b6cb0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Regresar a calificar ${tareaAnterior} para el resto de los alumnos`}
                    >
                      <span>◀ Regresar a:</span>
                      <strong>{tareaAnterior}</strong>
                    </button>
                  )}
                </div>

                {/* SELECTOR RÁPIDO DE TAREAS (CHIPS / BOTONES DIRECTOS) */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '6px', color: '#975a16' }}>
                    ⚡ Seleccionar Tarea Rápida (1 clic para cambiar):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {tareasDisponibles.map(tarea => {
                      const isActiva = tarea === tituloTrabajo;
                      const entregas = (trabajosDia || []).filter(t => t.nombre_trabajo === tarea).length;
                      return (
                        <button
                          key={tarea}
                          onClick={() => cambiarTareaActiva(tarea)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: isActiva ? '2px solid #dd6b20' : '1px solid #cbd5e0',
                            backgroundColor: isActiva ? '#dd6b20' : '#ffffff',
                            color: isActiva ? '#ffffff' : '#4a5568',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: isActiva ? '0 2px 5px rgba(221, 107, 32, 0.35)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{tarea}</span>
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: isActiva ? 'rgba(255,255,255,0.35)' : '#edf2f7',
                            color: isActiva ? '#ffffff' : '#718096',
                            padding: '1px 5px',
                            borderRadius: '10px'
                          }}>
                            {entregas}/{alumnos.length}
                          </span>
                        </button>
                      );
                    })}

                    {/* BOTÓN PARA AÑADIR OTRA TAREA */}
                    <button
                      onClick={() => {
                        const num = tareasDisponibles.length + 1;
                        const nombreDefecto = `Tarea ${num}`;
                        const nombre = window.prompt("Nombre de la nueva tarea o actividad:", nombreDefecto);
                        if (nombre && nombre.trim()) {
                          cambiarTareaActiva(nombre.trim());
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px dashed #dd6b20',
                        backgroundColor: '#fffaf0',
                        color: '#c05621',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ➕ Nueva Tarea
                    </button>
                  </div>
                </div>

                {/* ENTRADA EDITABLE MANUAL PARA NOMBRE PERSONALIZADO */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '4px', color: '#744210' }}>
                      O escribe / edita el nombre de la actividad:
                    </label>
                    <input
                      type="text"
                      value={tituloTrabajo}
                      onChange={(e) => {
                        setTituloTrabajo(e.target.value);
                        if (!listaTareasPersonalizadas.includes(e.target.value) && e.target.value.trim().length > 2) {
                          setListaTareasPersonalizadas(prev => [...prev, e.target.value]);
                        }
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box', fontSize: '13px' }}
                      placeholder="Ej. Ejercicios pág. 45, Maqueta, Resumen"
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '4px', color: '#744210' }}>
                      Campo Formativo:
                    </label>
                    <select
                      value={campoSeleccionado}
                      onChange={(e) => setCampoSeleccionado(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '12px' }}
                    >
                      {CAMPOS_FORMATIVOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* SELECTOR DE CALIFICACIÓN */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#744210' }}>
                      Calificación a asignar al escanear:
                    </label>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#dd6b20', backgroundColor: '#feebc8', padding: '2px 8px', borderRadius: '6px' }}>
                      Nota: {calificacionActual}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[10, 9, 8, 7, 6, 5].map(nota => (
                      <button
                        key={nota}
                        onClick={() => setCalificacionActual(nota)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          backgroundColor: calificacionActual === nota ? '#dd6b20' : '#ffffff',
                          color: calificacionActual === nota ? '#ffffff' : '#744210',
                          border: calificacionActual === nota ? '1px solid #dd6b20' : '1px solid #cbd5e0',
                          boxShadow: calificacionActual === nota ? '0 2px 4px rgba(221, 107, 32, 0.3)' : 'none'
                        }}
                      >
                        {nota}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VINCULACIÓN CON LA APP MÓVIL APK */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#4a5568' }}>📲 Conectar Celular / App Móvil</h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#718096' }}>
                Abre la aplicación móvil de escaneo en tu Android o iOS y escanea este código para sincronizar:
              </p>
              
              <div style={{ display: 'inline-block', padding: '10px', backgroundColor: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '10px' }}>
                <QRCodeSVG value={wsUrl} size={150} />
              </div>
              <p style={{ margin: '8px 0 10px 0', fontFamily: 'monospace', fontWeight: 'bold', color: '#2b6cb0', fontSize: '14px' }}>
                {wsUrl}
              </p>

              <div style={{ backgroundColor: '#fffaf0', padding: '12px 14px', borderRadius: '8px', border: '1px solid #feebc8', textAlign: 'left', fontSize: '12px', color: '#744210', marginTop: '10px' }}>
                <strong>⚠️ Si la App APK no conecta:</strong>
                <ol style={{ margin: '6px 0 0 0', paddingLeft: '16px', lineHeight: '1.4' }}>
                  <li>Asegúrate de que la PC y el Celular estén en el <strong>mismo Wi-Fi</strong>.</li>
                  <li>Si cambiaste de red, abre el escáner de la app e ingresa la IP: <strong style={{ background: '#fbd38d', padding: '1px 5px', borderRadius: '3px' }}>{localIp}</strong> y puerto: <strong style={{ background: '#fbd38d', padding: '1px 5px', borderRadius: '3px' }}>{wsPort}</strong>.</li>
                  <li>Si tu Windows Firewall bloquea la conexión, asegúrate de permitir el acceso a redes Privadas.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: ULTIMO ESCANEO Y HISTORIAL EN VIVO */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, color: '#2b6cb0' }}>⚡ Estado y Lecturas Recientes</h3>

            {/* ÚLTIMO ALUMNO ESCANEADO Y GESTIÓN DE TAREAS */}
            {ultimoEscaneado ? (() => {
              const aluActual = alumnos.find(a => 
                (ultimoEscaneado.alumnoId && String(a.id) === String(ultimoEscaneado.alumnoId)) ||
                (ultimoEscaneado.alumno && a.nombre.toLowerCase().trim() === ultimoEscaneado.alumno.toLowerCase().trim())
              );
              const trabajosEsteAlumno = aluActual ? (trabajosDia || []).filter(t => String(t.alumno_id) === String(aluActual.id)) : [];
              const tareasPendientes = aluActual ? tareasDisponibles.filter(td => !trabajosEsteAlumno.some(t => t.nombre_trabajo === td)) : [];

              return (
                <div style={{ backgroundColor: '#ebf8ff', padding: '16px', borderRadius: '10px', borderLeft: '6px solid #3182ce', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2b6cb0', textTransform: 'uppercase' }}>
                      Última Lectura Recibida ({ultimoEscaneado.hora})
                    </span>
                    {aluActual && perfilesMap[aluActual.id]?.foto_url && (
                      <img src={perfilesMap[aluActual.id].foto_url} alt="Foto" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3182ce' }} />
                    )}
                  </div>

                  <h2 style={{ margin: '6px 0', color: '#1a202c', fontSize: '18px' }}>{ultimoEscaneado.alumno}</h2>
                  
                  <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '10px' }}>
                    <span>Modo: <strong>{ultimoEscaneado.tipo}</strong></span>
                    {ultimoEscaneado.estado && <span style={{ marginLeft: '10px' }}>Estado: <strong>{ultimoEscaneado.estado}</strong></span>}
                    {ultimoEscaneado.nota !== undefined && <span style={{ marginLeft: '10px' }}>Calificación: <strong style={{ color: '#276749' }}>{ultimoEscaneado.nota}</strong> ({ultimoEscaneado.actividad})</span>}
                  </div>

                  {/* DESGLOSE DE TAREAS ENTREGADAS HOY POR ESTE ALUMNO */}
                  {modoEscaneo === 'TRABAJO' && aluActual && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #bee3f8' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2b6cb0', marginBottom: '6px' }}>
                        📋 Tareas registradas hoy para este alumno ({trabajosEsteAlumno.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {trabajosEsteAlumno.length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#718096' }}>Sin tareas registradas hoy</span>
                        ) : (
                          trabajosEsteAlumno.map(t => (
                            <span
                              key={t.id}
                              style={{
                                backgroundColor: '#c6f6d5',
                                color: '#22543d',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              ✅ {t.nombre_trabajo}: <strong>{t.valor}</strong>
                            </span>
                          ))
                        )}
                      </div>

                      {/* TAREAS PENDIENTES / CALIFICAR TRABAJOS ADELANTADOS EN 1 CLIC */}
                      {tareasPendientes.length > 0 && (
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #bee3f8' }}>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#744210', marginBottom: '6px' }}>
                            ⭐ ¿Este alumno se adelantó con más tareas? Califica con 1 clic:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {tareasPendientes.map(tp => (
                              <div key={tp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffaf0', padding: '4px 8px', borderRadius: '6px', border: '1px solid #feebc8' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#744210' }}>📝 {tp}</span>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  {[10, 9, 8, 7, 6, 5].map(n => (
                                    <button
                                      key={n}
                                      onClick={() => registrarTrabajoAlumnoDirecto(aluActual.id, aluActual.nombre, tp, n)}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #dd6b20',
                                        backgroundColor: '#ffffff',
                                        color: '#dd6b20',
                                        fontWeight: 'bold',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                      }}
                                      title={`Registrar ${tp} con nota ${n}`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })() : (
              <div style={{ padding: '20px', backgroundColor: '#f7fafc', borderRadius: '8px', textAlign: 'center', color: '#a0aec0', marginBottom: '20px' }}>
                Esperando primer escaneo desde la App Móvil o PC...
              </div>
            )}

            {/* SIMULADOR DE ESCANEO DESDE COMPUTADORA */}
            <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '15px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#718096', display: 'block', marginBottom: '6px' }}>
                Simular o Escanear con Cámara Web / Lector USB de PC:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  id="selectSimular"
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                >
                  <option value="">-- Seleccionar Alumno --</option>
                  {alumnos.map(a => <option key={a.id} value={`ALU-${a.id}`}>{a.nombre}</option>)}
                </select>
                <button
                  onClick={() => {
                    const el = document.getElementById('selectSimular');
                    if (el && el.value) procesarCodigoEscaneado(el.value);
                  }}
                  style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Registrar
                </button>
              </div>
            </div>

            {/* HISTORIAL DE ACTIVIDAD RECIENTE */}
            <h4 style={{ margin: '0 0 10px 0', color: '#4a5568' }}>📜 Historial de la Sesión</h4>
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #edf2f7', borderRadius: '8px' }}>
              {historialEscaneos.length === 0 ? (
                <div style={{ padding: '15px', textAlign: 'center', fontSize: '13px', color: '#a0aec0' }}>Sin lecturas en esta sesión</div>
              ) : (
                historialEscaneos.map((item) => (
                  <div key={item.id} style={{ padding: '10px 14px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{item.alumno}</strong>
                      <div style={{ fontSize: '12px', color: '#718096' }}>
                        {item.tipo} {item.estado ? `• ${item.estado}` : ''} {item.nota ? `• Nota: ${item.nota}` : ''} {item.actividad ? `• ${item.actividad}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#a0aec0' }}>{item.hora}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: LISTA DE ASISTENCIA COMPLETA DEL DÍA */}
      {activeTab === 'ASISTENCIA' && (
        <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#2b6cb0' }}>📋 Registro de Asistencia del Día ({fechaActualQR})</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>
                Marca la asistencia individualmente o mediante escaneo QR. Cambia la fecha en el encabezado para consultar cualquier día.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setActiveTab('HISTORIAL')}
                style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📊 Ver Historial Completo y Excel
              </button>
              <button
                onClick={() => window.print()}
                style={{ padding: '8px 16px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0' }}>
                <th style={{ padding: '12px' }}>#</th>
                <th style={{ padding: '12px' }}>Nombre del Alumno</th>
                <th style={{ padding: '12px' }}>Estado Asistencia</th>
                <th style={{ padding: '12px' }}>Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a, idx) => {
                const est = asistenciaDia[a.id] || 'SIN REGISTRO';
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#718096' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.nombre}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: est === 'PRESENTE' ? '#c6f6d5' : est === 'RETARDO' ? '#fefcbf' : est === 'FALTA' ? '#fed7d7' : est === 'JUSTIFICADO' ? '#bee3f8' : '#edf2f7',
                        color: est === 'PRESENTE' ? '#22543d' : est === 'RETARDO' ? '#744210' : est === 'FALTA' ? '#742a2a' : est === 'JUSTIFICADO' ? '#2a4365' : '#4a5568'
                      }}>
                        {est}
                      </span>
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                      {['PRESENTE', 'RETARDO', 'FALTA', 'JUSTIFICADO'].map(tipo => {
                        const isSelected = est === tipo;
                        return (
                          <button
                            key={tipo}
                            onClick={() => registrarAsistenciaDirecta(a.id, a.nombre, tipo)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: isSelected ? '2px solid transparent' : '1px solid #cbd5e0',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: isSelected ? 'bold' : '600',
                              backgroundColor: isSelected
                                ? (tipo === 'PRESENTE' ? '#38a169' : tipo === 'RETARDO' ? '#d69e2e' : tipo === 'FALTA' ? '#e53e3e' : '#3182ce')
                                : '#ffffff',
                              color: isSelected ? '#ffffff' : '#4a5568',
                              boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.12)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Marcar {tipo}
                          </button>
                        );
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VISTA 3: EVALUACIÓN DE TRABAJOS DEL DÍA */}
      {activeTab === 'EVALUACION' && (
        <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#276749' }}>📝 Registro y Promedio de Trabajos del Día ({fechaActualQR})</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>
                Visualiza el avance de las tareas, revisa qué alumnos van adelantados y califica directamente en la matriz.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* TOGGLE VISTA MATRIZ VS LISTA */}
              <div style={{ display: 'flex', backgroundColor: '#edf2f7', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e0' }}>
                <button
                  onClick={() => setVistaModoEvaluacion('MATRIZ')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    backgroundColor: vistaModoEvaluacion === 'MATRIZ' ? '#276749' : 'transparent',
                    color: vistaModoEvaluacion === 'MATRIZ' ? '#ffffff' : '#4a5568'
                  }}
                >
                  📊 Matriz de Tareas
                </button>
                <button
                  onClick={() => setVistaModoEvaluacion('LISTA')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    backgroundColor: vistaModoEvaluacion === 'LISTA' ? '#276749' : 'transparent',
                    color: vistaModoEvaluacion === 'LISTA' ? '#ffffff' : '#4a5568'
                  }}
                >
                  📄 Lista Individual
                </button>
              </div>

              <button
                onClick={() => setActiveTab('HISTORIAL')}
                style={{ padding: '8px 14px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                📊 Ver Historial y Reportes Excel
              </button>
            </div>
          </div>

          {vistaModoEvaluacion === 'MATRIZ' ? (
            /* VISTA MATRIZ COMPARATIVA DE TAREAS */
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0', textAlign: 'left' }}>
                    <th style={{ padding: '10px', width: '35px' }}>#</th>
                    <th style={{ padding: '10px', minWidth: '180px' }}>Nombre del Alumno</th>
                    {tareasDisponibles.map(tar => (
                      <th key={tar} style={{ padding: '10px', textAlign: 'center', minWidth: '95px' }}>
                        <div style={{ fontWeight: 'bold', color: tar === tituloTrabajo ? '#dd6b20' : '#2d3748' }}>
                          {tar}
                        </div>
                        <small style={{ color: '#718096', fontSize: '10px' }}>
                          {(trabajosDia || []).filter(t => t.nombre_trabajo === tar).length}/{alumnos.length}
                        </small>
                      </th>
                    ))}
                    <th style={{ padding: '10px', textAlign: 'center', minWidth: '90px' }}>Promedio</th>
                    <th style={{ padding: '10px', textAlign: 'center', minWidth: '110px' }}>Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((a, idx) => {
                    const trabajosEsteAlu = (trabajosDia || []).filter(t => String(t.alumno_id) === String(a.id));
                    const prom = calcularPromedioAlumno(a.id);
                    const totalEntregas = trabajosEsteAlu.length;
                    const esAdelantado = totalEntregas >= tareasDisponibles.length && tareasDisponibles.length > 1;

                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid #edf2f7', backgroundColor: esAdelantado ? '#f7fafc' : 'white' }}>
                        <td style={{ padding: '10px', color: '#718096', fontWeight: 'bold' }}>{idx + 1}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {perfilesMap[a.id]?.foto_url && (
                            <img src={perfilesMap[a.id].foto_url} alt="Foto" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                          )}
                          <span>{a.nombre}</span>
                        </td>

                        {/* CELDAS POR CADA TAREA */}
                        {tareasDisponibles.map(tar => {
                          const reg = trabajosEsteAlu.find(t => t.nombre_trabajo === tar);
                          return (
                            <td key={tar} style={{ padding: '8px', textAlign: 'center' }}>
                              {reg ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontWeight: 'bold',
                                      fontSize: '12px',
                                      backgroundColor: reg.valor >= 8 ? '#c6f6d5' : '#feebc8',
                                      color: reg.valor >= 8 ? '#22543d' : '#744210'
                                    }}
                                  >
                                    {reg.valor}
                                  </span>
                                  <button
                                    onClick={() => eliminarTrabajo(reg.id)}
                                    style={{ border: 'none', background: 'transparent', color: '#e53e3e', cursor: 'pointer', fontSize: '11px', padding: '1px' }}
                                    title="Eliminar calificación"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', gap: '2px' }}>
                                  {[10, 8, 6].map(quickNota => (
                                    <button
                                      key={quickNota}
                                      onClick={() => registrarTrabajoAlumnoDirecto(a.id, a.nombre, tar, quickNota)}
                                      style={{
                                        padding: '2px 5px',
                                        borderRadius: '4px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#edf2f7',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        color: '#4a5568'
                                      }}
                                      title={`Asignar ${quickNota} a ${a.nombre} en ${tar}`}
                                    >
                                      +{quickNota}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* PROMEDIO */}
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: prom ? (prom >= 8 ? '#22543d' : '#744210') : '#a0aec0' }}>
                          {prom || '-'}
                        </td>

                        {/* BADGE DE PROGRESO */}
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {esAdelantado ? (
                            <span style={{ backgroundColor: '#e9d8fd', color: '#553c9e', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                              🚀 ¡Adelantado!
                            </span>
                          ) : totalEntregas > 0 ? (
                            <span style={{ backgroundColor: '#feebc8', color: '#744210', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                              {totalEntregas}/{tareasDisponibles.length} tareas
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#edf2f7', color: '#a0aec0', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* VISTA LISTA INDIVIDUAL ORIGINAL */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* TABLA DE TRABAJOS INDIVIDUALES ESCANEADOS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#2b6cb0' }}>📌 Trabajos de esta Fecha ({trabajosDia.length})</h4>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {trabajosDia.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>
                      No hay trabajos registrados en esta fecha ({fechaActualQR}). Usa la pestaña Escáner o selecciona otra fecha en el encabezado.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Alumno</th>
                          <th style={{ padding: '8px' }}>Actividad</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Nota</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trabajosDia.map(t => {
                          const alu = alumnos.find(a => String(a.id) === String(t.alumno_id));
                          return (
                            <tr key={t.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>{alu ? alu.nombre : `ID ${t.alumno_id}`}</td>
                              <td style={{ padding: '8px', color: '#4a5568' }}>{t.nombre_trabajo} <br/><small style={{ color: '#718096' }}>{t.campo}</small></td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#276749' }}>{t.valor}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  onClick={() => eliminarTrabajo(t.id)}
                                  style={{ border: 'none', background: '#fed7d7', color: '#9b2c2c', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold' }}
                                  title="Eliminar este trabajo"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* TABLA RESUMEN DE PROMEDIOS DEL DÍA */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#f0fff4' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#22543d' }}>📊 Promedio del Día por Alumno</h4>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#c6f6d5', borderBottom: '2px solid #9ae6b4', textAlign: 'left', color: '#22543d' }}>
                        <th style={{ padding: '8px' }}>Alumno</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Trabajos</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnos.map(a => {
                        const count = trabajosDia.filter(t => String(t.alumno_id) === String(a.id)).length;
                        const prom = calcularPromedioAlumno(a.id);
                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{a.nombre}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{count}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: prom ? (prom >= 8 ? '#22543d' : '#744210') : '#a0aec0' }}>
                              {prom || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 4: HISTORIAL Y REPORTES EN EXCEL (NUEVA VISTA COMPLETA) */}
      {activeTab === 'HISTORIAL' && (
        <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {/* HEADER DEL HISTORIAL Y FILTROS DE FECHAS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1a365d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Historiales y Reportes Consolidados
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>
                Consulta todas las asistencias y trabajos guardados por rango de fechas, genera reportes oficiales en Excel y expórtalos a tus evaluaciones personalizadas.
              </p>
            </div>

            {/* SELECTOR DE RANGO DE FECHAS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', backgroundColor: '#f7fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a5568' }}>Desde:</span>
                <input
                  type="date"
                  value={fechaInicioHistorial}
                  onChange={e => setFechaInicioHistorial(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '12px', fontWeight: 'bold' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a5568' }}>Hasta:</span>
                <input
                  type="date"
                  value={fechaFinHistorial}
                  onChange={e => setFechaFinHistorial(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '12px', fontWeight: 'bold' }}
                />
              </div>

              {/* BOTONES PRESET */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setPresetFechas('SEMANA')}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e0', background: '#edf2f7', fontSize: '11px', cursor: 'pointer' }}
                >
                  Esta Semana
                </button>
                <button
                  onClick={() => setPresetFechas('MES')}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e0', background: '#edf2f7', fontSize: '11px', cursor: 'pointer' }}
                >
                  Mes Actual
                </button>
                <button
                  onClick={() => setPresetFechas('30DIAS')}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e0', background: '#edf2f7', fontSize: '11px', cursor: 'pointer' }}
                >
                  Últimos 30d
                </button>
                <button
                  onClick={() => setPresetFechas('CICLO')}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e0', background: '#edf2f7', fontSize: '11px', cursor: 'pointer' }}
                >
                  Ciclo Completo
                </button>
              </div>
            </div>
          </div>

          {/* SUB-PESTAÑAS DEL HISTORIAL: ASISTENCIA VS TRABAJOS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSubTabHistorial('ASISTENCIA')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor: subTabHistorial === 'ASISTENCIA' ? '#2b6cb0' : '#edf2f7',
                  color: subTabHistorial === 'ASISTENCIA' ? '#ffffff' : '#4a5568'
                }}
              >
                📅 Reporte de Asistencia
              </button>
              <button
                onClick={() => setSubTabHistorial('TRABAJOS')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  backgroundColor: subTabHistorial === 'TRABAJOS' ? '#276749' : '#edf2f7',
                  color: subTabHistorial === 'TRABAJOS' ? '#ffffff' : '#4a5568'
                }}
              >
                📝 Reporte de Trabajos
              </button>
            </div>

            {/* BOTONES DE ACCIÓN (EXCEL Y EXPORTAR A CRITERIO) */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {subTabHistorial === 'ASISTENCIA' ? (
                <>
                  <button
                    onClick={handleExportarAsistenciaExcel}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2b6cb0',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(43, 108, 176, 0.3)'
                    }}
                  >
                    📥 Descargar Excel de Asistencia (.xls)
                  </button>
                  <button
                    onClick={() => setShowModalExportAsis(true)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#6b46c1',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(107, 70, 193, 0.3)'
                    }}
                  >
                    📤 Exportar a Criterio de Evaluación
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleExportarTrabajosExcel}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#276749',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(39, 103, 73, 0.3)'
                    }}
                  >
                    📥 Descargar Excel de Trabajos (.xls)
                  </button>
                  <button
                    onClick={() => setShowModalExportTrab(true)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#6b46c1',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(107, 70, 193, 0.3)'
                    }}
                  >
                    📤 Exportar Promedios a Evaluación
                  </button>
                </>
              )}
            </div>
          </div>

          {/* CONTENIDO 1: REPORTE DE ASISTENCIA */}
          {subTabHistorial === 'ASISTENCIA' && (
            <div>
              {/* TARJETAS DE MÉTRICAS GLOBALES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#ebf8ff', padding: '16px', borderRadius: '10px', borderLeft: '5px solid #3182ce' }}>
                  <div style={{ fontSize: '12px', color: '#2b6cb0', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Alumnos</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a365d', marginTop: '4px' }}>{alumnos.length}</div>
                </div>
                <div style={{ backgroundColor: '#f0fff4', padding: '16px', borderRadius: '10px', borderLeft: '5px solid #38a169' }}>
                  <div style={{ fontSize: '12px', color: '#22543d', fontWeight: 'bold', textTransform: 'uppercase' }}>Días con Pase de Lista</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#22543d', marginTop: '4px' }}>{totalDiasHist}</div>
                </div>
                <div style={{ backgroundColor: '#faf5ff', padding: '16px', borderRadius: '10px', borderLeft: '5px solid #805ad5' }}>
                  <div style={{ fontSize: '12px', color: '#553c9a', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Registros en Rango</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#553c9a', marginTop: '4px' }}>{asistenciaRangoDetalle.length}</div>
                </div>
                <div style={{ backgroundColor: '#fffff0', padding: '16px', borderRadius: '10px', borderLeft: '5px solid #d69e2e' }}>
                  <div style={{ fontSize: '12px', color: '#744210', fontWeight: 'bold', textTransform: 'uppercase' }}>% Asistencia Promedio</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#744210', marginTop: '4px' }}>{promedioAsisGlobal}%</div>
                </div>
              </div>

              {/* SELECTOR ENTRE RESUMEN Y MATRIZ DETALLADA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setVistaModoAsistencia('RESUMEN')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: vistaModoAsistencia === 'RESUMEN' ? '#3182ce' : '#ffffff',
                      color: vistaModoAsistencia === 'RESUMEN' ? '#ffffff' : '#4a5568'
                    }}
                  >
                    Resumen con Porcentajes
                  </button>
                  <button
                    onClick={() => setVistaModoAsistencia('MATRIZ')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e0',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: vistaModoAsistencia === 'MATRIZ' ? '#3182ce' : '#ffffff',
                      color: vistaModoAsistencia === 'MATRIZ' ? '#ffffff' : '#4a5568'
                    }}
                  >
                    Matriz Completa Día a Día
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: '#718096' }}>
                  {resumenAsistenciaHist.length} alumnos registrados en este periodo
                </span>
              </div>

              {/* VISTA 1: TABLA RESUMEN CON PORCENTAJES */}
              {vistaModoAsistencia === 'RESUMEN' && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0' }}>
                        <th style={{ padding: '12px', width: '40px' }}>#</th>
                        <th style={{ padding: '12px' }}>Nombre del Alumno</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Días Registrados</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#22543d' }}>Presentes</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#744210' }}>Retardos</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#742a2a' }}>Faltas</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#2a4365' }}>Justificados</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>% Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargandoHistorial ? (
                        <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#718096' }}>Cargando historial de asistencias...</td></tr>
                      ) : resumenAsistenciaHist.length === 0 ? (
                        <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#a0aec0' }}>No hay registros de asistencia en el rango de fechas seleccionado.</td></tr>
                      ) : (
                        resumenAsistenciaHist.map((alu, idx) => {
                          const pct = alu.porcentaje || 0;
                          const bgBadge = pct >= 85 ? '#c6f6d5' : pct >= 70 ? '#fefcbf' : '#fed7d7';
                          const colorBadge = pct >= 85 ? '#22543d' : pct >= 70 ? '#744210' : '#742a2a';
                          return (
                            <tr key={alu.alumno_id} style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ padding: '10px', fontWeight: 'bold', color: '#718096' }}>{idx + 1}</td>
                              <td style={{ padding: '10px', fontWeight: 'bold' }}>{alu.alumno_nombre}</td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>{alu.total_dias}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#22543d' }}>{alu.presentes}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#744210' }}>{alu.retardos}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#742a2a' }}>{alu.faltas}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#2a4365' }}>{alu.justificados}</td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  fontWeight: '800',
                                  fontSize: '12px',
                                  backgroundColor: bgBadge,
                                  color: colorBadge
                                }}>
                                  {pct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VISTA 2: MATRIZ DÍA A DÍA */}
              {vistaModoAsistencia === 'MATRIZ' && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
                  {(() => {
                    const setFechas = new Set();
                    const matriz = {};
                    (asistenciaRangoDetalle || []).forEach(r => {
                      setFechas.add(r.fecha);
                      if (!matriz[r.alumno_id]) matriz[r.alumno_id] = {};
                      matriz[r.alumno_id][r.fecha] = r.estado;
                    });
                    const fechasArr = Array.from(setFechas).sort();

                    if (fechasArr.length === 0) {
                      return <div style={{ padding: '30px', textAlign: 'center', color: '#a0aec0' }}>No hay días registrados en este rango.</div>;
                    }

                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0' }}>
                            <th style={{ padding: '8px', position: 'sticky', left: 0, background: '#edf2f7', zIndex: 2 }}>Alumno</th>
                            {fechasArr.map(f => (
                              <th key={f} style={{ padding: '8px', textAlign: 'center', minWidth: '70px', fontSize: '11px' }}>
                                {f.substring(5)}
                              </th>
                            ))}
                            <th style={{ padding: '8px', textAlign: 'center', background: '#e2e8f0' }}>% Asis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumenAsistenciaHist.map(alu => {
                            const pct = alu.porcentaje || 0;
                            return (
                              <tr key={alu.alumno_id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                <td style={{ padding: '8px', fontWeight: 'bold', position: 'sticky', left: 0, background: '#ffffff', zIndex: 1, whiteSpace: 'nowrap' }}>
                                  {alu.alumno_nombre}
                                </td>
                                {fechasArr.map(f => {
                                  const est = (matriz[alu.alumno_id] && matriz[alu.alumno_id][f]) || '-';
                                  let bg = '#ffffff';
                                  let color = '#a0aec0';
                                  let letra = '-';
                                  if (est === 'PRESENTE') { bg = '#c6f6d5'; color = '#22543d'; letra = 'P'; }
                                  else if (est === 'RETARDO') { bg = '#fefcbf'; color = '#744210'; letra = 'R'; }
                                  else if (est === 'FALTA') { bg = '#fed7d7'; color = '#742a2a'; letra = 'F'; }
                                  else if (est === 'JUSTIFICADO') { bg = '#bee3f8'; color = '#2a4365'; letra = 'J'; }
                                  return (
                                    <td key={f} style={{ padding: '6px', textAlign: 'center', backgroundColor: bg, color: color, fontWeight: 'bold' }}>
                                      {letra}
                                    </td>
                                  );
                                })}
                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', background: '#f7fafc' }}>
                                  {pct.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO 2: REPORTE DE TRABAJOS Y ACTIVIDADES */}
          {subTabHistorial === 'TRABAJOS' && (
            <div>
              {/* FILTRO DE CAMPO FORMATIVO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: '#f0fff4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #c6f6d5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#22543d' }}>Filtrar por Campo Formativo:</label>
                  <select
                    value={campoFiltroHistorial}
                    onChange={e => setCampoFiltroHistorial(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #9ae6b4', fontSize: '13px', fontWeight: 'bold', color: '#22543d' }}
                  >
                    <option value="TODOS">Todos los Campos Formativos</option>
                    {CAMPOS_FORMATIVOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: '13px', color: '#22543d', fontWeight: 'bold' }}>
                  Total Trabajos Registrados: {trabajosRangoDetalle.length} • Promedio General: {promedioTrabajosGlobal}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* TABLA 1: RESUMEN DE PROMEDIOS POR ALUMNO */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#276749' }}>📊 Promedio Consolidado por Alumno</h4>
                  <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0', textAlign: 'left' }}>
                          <th style={{ padding: '10px' }}>#</th>
                          <th style={{ padding: '10px' }}>Alumno</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Total Trabajos</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenTrabajosHist.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#a0aec0' }}>Sin trabajos registrados en el periodo.</td></tr>
                        ) : (
                          resumenTrabajosHist.map((alu, idx) => {
                            const prom = alu.promedio;
                            const bg = prom !== null ? (prom >= 8.5 ? '#c6f6d5' : prom >= 6.0 ? '#fefcbf' : '#fed7d7') : '#edf2f7';
                            const color = prom !== null ? (prom >= 8.5 ? '#22543d' : prom >= 6.0 ? '#744210' : '#742a2a') : '#a0aec0';
                            return (
                              <tr key={alu.alumno_id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold', color: '#718096' }}>{idx + 1}</td>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{alu.alumno_nombre}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{alu.total_trabajos}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                  <span style={{ padding: '4px 10px', borderRadius: '12px', fontWeight: '800', backgroundColor: bg, color: color }}>
                                    {prom !== null ? prom.toFixed(1) : '-'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLA 2: BITÁCORA DETALLADA DE TRABAJOS */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#2b6cb0' }}>📌 Bitácora de Trabajos Realizados ({trabajosRangoDetalle.length})</h4>
                  <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#edf2f7', borderBottom: '2px solid #cbd5e0', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Fecha</th>
                          <th style={{ padding: '8px' }}>Alumno</th>
                          <th style={{ padding: '8px' }}>Actividad</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Nota</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Borrar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trabajosRangoDetalle.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#a0aec0' }}>Sin trabajos registrados.</td></tr>
                        ) : (
                          trabajosRangoDetalle.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ padding: '8px', color: '#718096', whiteSpace: 'nowrap' }}>{t.fecha}</td>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>{t.alumno_nombre}</td>
                              <td style={{ padding: '8px' }}>
                                {t.nombre_trabajo}
                                <br/>
                                <small style={{ color: '#718096' }}>{t.campo}</small>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#276749' }}>{t.valor}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  onClick={() => eliminarTrabajo(t.id)}
                                  style={{ border: 'none', background: '#fed7d7', color: '#9b2c2c', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontWeight: 'bold' }}
                                  title="Eliminar este trabajo"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 5: GENERADOR E IMPRESIÓN DE GAFETES QR */}
      {activeTab === 'GAFETES' && (
        <div>
          <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1a365d' }}>🎫 Gafetes Oficiales con Código QR</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>
                Imprime los gafetes en tamaño credencial. Los alumnos pueden portarlos en su mica para pase de asistencia y entrega de trabajos.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              style={{ padding: '10px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🖨️ Imprimir Gafetes
            </button>
          </div>

          <div className="gafetes-print-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {alumnos.map(a => {
              const perfil = perfilesMap[a.id] || {};
              return (
                <div
                  key={a.id}
                  className="gafete-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #2b6cb0',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {/* CABECERA OFICIAL */}
                  <div style={{ width: '100%', textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#2b6cb0', textTransform: 'uppercase' }}>
                      NUEVA ESCUELA MEXICANA
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1a202c' }}>
                      {grupoActual ? `${grupoActual.grado}° Grado Grupo "${grupoActual.seccion}"` : 'Educación Básica'}
                    </div>
                  </div>

                  {/* FOTO DEL ALUMNO O PLACEHOLDER */}
                  <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #3182ce', marginBottom: '10px', backgroundColor: '#edf2f7' }}>
                    {perfil.foto_url ? (
                      <img src={perfil.foto_url} alt={a.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '32px', color: '#a0aec0' }}>
                        👤
                      </div>
                    )}
                    <label
                      className="no-print"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        backgroundColor: '#3182ce',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="Cambiar Foto"
                    >
                      📷
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadFoto(a.id, e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {/* NOMBRE DE ALUMNO DESTACADO */}
                  <div style={{ width: '100%', textAlign: 'center', margin: '6px 0 12px 0' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a202c', lineHeight: '1.2', textTransform: 'uppercase' }}>
                      {a.nombre}
                    </div>
                  </div>

                  {/* CÓDIGO QR Y MATRÍCULA */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f7fafc', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '80%' }}>
                    <QRCodeSVG value={`ALU-${a.id}`} size={115} />
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#2b6cb0', marginTop: '6px' }}>
                      ID: ALU-{a.id}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: EXPORTAR ASISTENCIA A CRITERIO DE EVALUACIÓN */}
      {showModalExportAsis && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '480px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a365d' }}>📤 Exportar Asistencia a Evaluación</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#718096' }}>
              Calcula automáticamente el porcentaje de asistencia de cada alumno en el periodo seleccionado (<strong>{fechaInicioHistorial} al {fechaFinHistorial}</strong>) y guarda la nota en tu criterio de evaluación.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
                Selecciona el Criterio de Destino:
              </label>
              <select
                value={criterioDestinoAsis}
                onChange={e => setCriterioDestinoAsis(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px' }}
              >
                <option value="">-- Elige un Criterio (ej. Asistencia 10%) --</option>
                {criterios.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.porcentaje}%) {c.campo ? `[${c.campo}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
                Escala Máxima de Calificación:
              </label>
              <select
                value={escalaDestinoAsis}
                onChange={e => setEscalaDestinoAsis(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px' }}
              >
                <option value={10}>Base 10 (100% Asistencia = 10, 80% = 8.0)</option>
                <option value={100}>Base 100 (100% Asistencia = 100, 80% = 80)</option>
              </select>
            </div>

            <div style={{ backgroundColor: '#ebf8ff', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#2b6cb0', marginBottom: '16px' }}>
              ℹ️ Los registros diarios de asistencia no se borran; quedan intactos en tu historial para futuras consultas o reportes.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowModalExportAsis(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#edf2f7', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarExportacionAsistenciaACriterio}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#38a169', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Confirmar y Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EXPORTAR PROMEDIO DE TRABAJOS A CRITERIO DE EVALUACIÓN */}
      {showModalExportTrab && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '480px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a365d' }}>📤 Exportar Promedio de Trabajos a Evaluación</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#718096' }}>
              Promedia todos los trabajos registrados en el periodo (<strong>{fechaInicioHistorial} al {fechaFinHistorial}</strong>) y vuelca la calificación al criterio seleccionado.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
                Filtro de Campo Formativo:
              </label>
              <select
                value={campoFiltroHistorial}
                onChange={e => setCampoFiltroHistorial(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px' }}
              >
                <option value="TODOS">Todos los Trabajos (Promedio General)</option>
                {CAMPOS_FORMATIVOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#2d3748', marginBottom: '6px' }}>
                Selecciona el Criterio de Destino:
              </label>
              <select
                value={criterioDestinoTrab}
                onChange={e => setCriterioDestinoTrab(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px' }}
              >
                <option value="">-- Elige un Criterio (ej. Trabajos en clase 30%) --</option>
                {criterios.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.porcentaje}%) {c.campo ? `[${c.campo}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ backgroundColor: '#f0fff4', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#22543d', marginBottom: '16px' }}>
              ℹ️ Cada trabajo registrado individualmente permanece guardado en SQLite. No se sobrescribe ni se pierde ningún detalle histórico.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowModalExportTrab(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#edf2f7', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarExportacionTrabajosACriterio}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#276749', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Confirmar y Exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
