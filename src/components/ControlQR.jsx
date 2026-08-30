import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const CAMPOS_FORMATIVOS = [
  'LENGUAJES',
  'SABERES Y PENSAMIENTO CIENTÍFICO',
  'ÉTICA, NATURALEZA Y SOCIEDADES',
  'DE LO HUMANO Y LO COMUNITARIO'
];

export default function ControlQR({ grupoActual, alumnos = [], criterios = [], fechaEval, ipcRenderer, showToast, onAttendanceUpdated, onGradeSaved }) {
  const [activeTab, setActiveTab] = useState('ESCANER'); // 'ESCANER', 'ASISTENCIA', 'EVALUACION', 'GAFETES'
  const [modoEscaneo, setModoEscaneo] = useState('ASISTENCIA'); // 'ASISTENCIA' o 'TRABAJO'
  
  // Conexión Móvil
  const [localIp, setLocalIp] = useState('127.0.0.1');
  const [wsPort, setWsPort] = useState(3000);
  const [listaIps, setListaIps] = useState([]);
  const [subtipoAsistencia, setSubtipoAsistencia] = useState('PRESENTE'); // 'PRESENTE', 'RETARDO', 'FALTA'
  
  // Evaluación de Trabajos
  const [campoSeleccionado, setCampoSeleccionado] = useState(CAMPOS_FORMATIVOS[0]);
  const [criterioSeleccionado, setCriterioSeleccionado] = useState(null);
  const [calificacionActual, setCalificacionActual] = useState(10);
  const [tituloTrabajo, setTituloTrabajo] = useState('Actividad 1');

  // Historial y Trabajos del Día
  const [historialEscaneos, setHistorialEscaneos] = useState([]);
  const [ultimoEscaneado, setUltimoEscaneado] = useState(null);
  const [asistenciaDia, setAsistenciaDia] = useState({});
  const [trabajosDia, setTrabajosDia] = useState([]);

  // Perfiles / Fotos de alumnos
  const [perfilesMap, setPerfilesMap] = useState({});

  // Referencia para evitar escaneos duplicados por mantener la cámara sobre el QR
  const lastScanRef = useRef({ code: '', studentId: null, timestamp: 0 });

  // Cargar IP local, Asistencias, Trabajos y Perfiles guardados en SQLite
  const cargarDatos = () => {
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
      
      ipcRenderer.invoke('get-asistencia-fecha', fechaEval, grupoActual?.id).then(rows => {
        const map = {};
        (rows || []).forEach(r => { map[r.alumno_id] = r.estado; });
        setAsistenciaDia(map);
      }).catch(console.error);

      ipcRenderer.invoke('get-trabajos-qr', fechaEval, grupoActual?.id).then(rows => {
        setTrabajosDia(rows || []);
      }).catch(console.error);

      ipcRenderer.invoke('get-todos-perfiles').then(map => {
        setPerfilesMap(map || {});
      }).catch(console.error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [ipcRenderer, fechaEval, grupoActual]);

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
  }, [ipcRenderer, modoEscaneo, subtipoAsistencia, campoSeleccionado, criterioSeleccionado, calificacionActual, alumnos, fechaEval, grupoActual, tituloTrabajo]);

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

  // Registrar asistencia directamente para un alumno (usado en escaneo o en botones de acciones rápidas)
  const registrarAsistenciaDirecta = async (alumnoId, alumnoNombre, estadoTipo) => {
    setAsistenciaDia(prev => ({ ...prev, [alumnoId]: estadoTipo }));

    if (ipcRenderer) {
      try {
        await ipcRenderer.invoke('save-asistencia-qr', alumnoId, fechaEval, estadoTipo, grupoActual?.id);
      } catch (err) {
        console.error("Error guardando asistencia en SQLite:", err);
      }
    }

    if (onAttendanceUpdated) onAttendanceUpdated(alumnoId, fechaEval, estadoTipo);

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

  // Procesar código escaneado (Formatos: "ALU-101", "101", "101:10", "Juan Pérez")
  const procesarCodigoEscaneado = async (codigoRaw) => {
    if (!codigoRaw) return;
    const raw = String(codigoRaw).trim();
    const now = Date.now();

    // Filtro para omitir escaneos duplicados en menos de 3.0 segundos
    const timeDiff = now - lastScanRef.current.timestamp;
    if (lastScanRef.current.code === raw && timeDiff < 3000) {
      console.log(`[ControlQR] Escaneo duplicado omitido de "${raw}" (${timeDiff}ms)`);
      return;
    }
    if (timeDiff < 500) {
      console.log(`[ControlQR] Escaneo demasiado rápido omitido (${timeDiff}ms)`);
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

    // Filtro adicional por ID del alumno (si la cámara emite frames continuos)
    if (lastScanRef.current.studentId === targetAlumnoId && timeDiff < 3000) {
      console.log(`[ControlQR] Alumno duplicado omitido ID ${targetAlumnoId} (${timeDiff}ms)`);
      return;
    }

    // Registrar en la referencia inmediatamente antes del procesamiento asíncrono
    lastScanRef.current = { code: raw, studentId: targetAlumnoId, timestamp: now };

    playBeep();

    if (modoEscaneo === 'ASISTENCIA') {
      await registrarAsistenciaDirecta(targetAlumnoId, nombreMostrar, subtipoAsistencia);
    } else {
      // Modo Trabajos: Almacenar en la tabla de trabajos QR diarios
      if (ipcRenderer) {
        try {
          const nuevoTrabajo = await ipcRenderer.invoke('save-trabajo-qr', targetAlumnoId, campoSeleccionado, tituloTrabajo, fechaEval, gradeVal, grupoActual?.id);
          setTrabajosDia(prev => [nuevoTrabajo, ...prev]);
        } catch (err) {
          console.error("Error guardando trabajo QR en SQLite:", err);
        }
      }

      const nuevoLog = {
        id: Date.now(),
        tipo: 'TRABAJO',
        alumno: nombreMostrar,
        campo: campoSeleccionado,
        actividad: tituloTrabajo,
        nota: gradeVal,
        hora: new Date().toLocaleTimeString()
      };

      setUltimoEscaneado(nuevoLog);
      setHistorialEscaneos(prev => [nuevoLog, ...prev.slice(0, 19)]);
      if (showToast) showToast(`🌟 Trabajo Registrado (${gradeVal}): ${nombreMostrar}`);
    }
  };

  // Eliminar un trabajo de la lista del día
  const eliminarTrabajo = async (id) => {
    if (ipcRenderer) {
      await ipcRenderer.invoke('delete-trabajo-qr', id);
      setTrabajosDia(prev => prev.filter(t => t.id !== id));
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

  const wsUrl = `ws://${localIp}:${wsPort}`;

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
          <p style={{ margin: '4px 0 0 0', color: '#718096', fontSize: '14px' }}>
            Grupo Activo: <strong>{grupoActual ? `${grupoActual.grado}° ${grupoActual.seccion}` : 'General'}</strong> • Fecha: <strong>{fechaEval}</strong>
          </p>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN QR */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ESCANER', label: '📷 Escáner y Móvil' },
            { id: 'ASISTENCIA', label: '📋 Lista de Asistencia' },
            { id: 'EVALUACION', label: '📝 Evaluación Trabajos' },
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
            <h3 style={{ marginTop: 0, color: '#2b6cb0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚙️ Selector de Modo de Escaneo
            </h3>

            {/* SELECCIÓN MODO ASISTENCIA VS TRABAJO */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setModoEscaneo('ASISTENCIA')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: modoEscaneo === 'ASISTENCIA' ? '2px solid #3182ce' : '1px solid #e2e8f0',
                  backgroundColor: modoEscaneo === 'ASISTENCIA' ? '#ebf8ff' : '#f7fafc',
                  color: modoEscaneo === 'ASISTENCIA' ? '#2b6cb0' : '#4a5568',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📋 Modo Asistencia
              </button>
              <button
                onClick={() => setModoEscaneo('TRABAJO')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: modoEscaneo === 'TRABAJO' ? '2px solid #38a169' : '1px solid #e2e8f0',
                  backgroundColor: modoEscaneo === 'TRABAJO' ? '#f0fff4' : '#f7fafc',
                  color: modoEscaneo === 'TRABAJO' ? '#276749' : '#4a5568',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🌟 Modo Evaluar Trabajos
              </button>
            </div>

            {/* CONFIGURACIÓN SEGÚN EL MODO SELECCIONADO */}
            {modoEscaneo === 'ASISTENCIA' ? (
              <div style={{ backgroundColor: '#edf2f7', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Estado a Registrar:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['PRESENTE', 'RETARDO', 'FALTA'].map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setSubtipoAsistencia(tipo)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        backgroundColor: subtipoAsistencia === tipo ? (tipo === 'PRESENTE' ? '#38a169' : tipo === 'RETARDO' ? '#d69e2e' : '#e53e3e') : '#cbd5e0',
                        color: subtipoAsistencia === tipo ? '#ffffff' : '#2d3748'
                      }}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#f0fff4', padding: '15px', borderRadius: '8px', border: '1px solid #c6f6d5', marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Campo Formativo:</label>
                <select
                  value={campoSeleccionado}
                  onChange={(e) => setCampoSeleccionado(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', marginBottom: '10px', fontWeight: 'bold' }}
                >
                  {CAMPOS_FORMATIVOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nombre / Actividad:</label>
                <input
                  type="text"
                  value={tituloTrabajo}
                  onChange={(e) => setTituloTrabajo(e.target.value)}
                  placeholder="Ej: Actividad 1, Lectura..."
                  style={{ width: '95%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', marginBottom: '10px', fontWeight: 'bold' }}
                />

                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Calificación por Escaneo:</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[10, 9, 8, 7, 6, 5].map(grade => (
                    <button
                      key={grade}
                      onClick={() => setCalificacionActual(grade)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        backgroundColor: calificacionActual === grade ? '#276749' : '#c6f6d5',
                        color: calificacionActual === grade ? '#ffffff' : '#22543d'
                      }}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* VINCULACIÓN CON LA APP MÓVIL */}
            <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '20px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>📱 Vincular con Celular (Android / iPhone)</h4>
              <p style={{ fontSize: '13px', color: '#718096', marginBottom: '10px' }}>
                Abre la App <strong>Lector QR Móvil</strong> en tu celular y escanea este código para conectar ambos dispositivos:
              </p>

              {/* SELECCIÓN MANUAL / AUTOMÁTICA DE IP */}
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4a5568' }}>IP Wi-Fi PC:</span>
                {listaIps.length > 1 ? (
                  <select
                    value={localIp}
                    onChange={(e) => setLocalIp(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    {listaIps.map((item, idx) => (
                      <option key={idx} value={item.ip}>{item.name}: {item.ip}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={localIp}
                    onChange={(e) => setLocalIp(e.target.value)}
                    style={{ width: '130px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}
                  />
                )}
              </div>
              
              <div style={{ display: 'inline-block', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '2px solid #cbd5e0' }}>
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

            {/* ÚLTIMO ALUMNO ESCANEADO */}
            {ultimoEscaneado ? (
              <div style={{ backgroundColor: '#ebf8ff', padding: '16px', borderRadius: '10px', borderLeft: '6px solid #3182ce', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2b6cb0', textTransform: 'uppercase' }}>
                  Última Lectura Recibida ({ultimoEscaneado.hora})
                </span>
                <h2 style={{ margin: '6px 0', color: '#1a202c' }}>{ultimoEscaneado.alumno}</h2>
                <div style={{ fontSize: '14px', color: '#4a5568' }}>
                  <span>Modo: <strong>{ultimoEscaneado.tipo}</strong></span>
                  {ultimoEscaneado.estado && <span style={{ marginLeft: '10px' }}>Estado: <strong>{ultimoEscaneado.estado}</strong></span>}
                  {ultimoEscaneado.nota !== undefined && <span style={{ marginLeft: '10px' }}>Calificación: <strong>{ultimoEscaneado.nota}</strong></span>}
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', backgroundColor: '#f7fafc', borderRadius: '8px', textAlign: 'center', color: '#a0aec0', marginBottom: '20px' }}>
                Esperando primer escaneo desde la App Móvil...
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
                    const val = document.getElementById('selectSimular').value;
                    if (val) procesarCodigoEscaneado(val);
                  }}
                  style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Registrar
                </button>
              </div>
            </div>

            {/* HISTORIAL DE ACTIVIDAD RECIEANTE */}
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

      {/* VISTA 2: LISTA DE ASISTENCIA COMPLETA */}
      {activeTab === 'ASISTENCIA' && (
        <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#2b6cb0' }}>📋 Registro de Asistencia del Día ({fechaEval})</h3>
            <button
              onClick={() => window.print()}
              style={{ padding: '8px 16px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🖨️ Imprimir Reporte
            </button>
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
                        backgroundColor: est === 'PRESENTE' ? '#c6f6d5' : est === 'RETARDO' ? '#fefcbf' : est === 'FALTA' ? '#fed7d7' : '#edf2f7',
                        color: est === 'PRESENTE' ? '#22543d' : est === 'RETARDO' ? '#744210' : est === 'FALTA' ? '#742a2a' : '#4a5568'
                      }}>
                        {est}
                      </span>
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                      {['PRESENTE', 'RETARDO', 'FALTA'].map(tipo => {
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
                                ? (tipo === 'PRESENTE' ? '#38a169' : tipo === 'RETARDO' ? '#d69e2e' : '#e53e3e')
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

      {/* VISTA 3: EVALUACIÓN DE TRABAJOS Y RESUMEN PROMEDIADO */}
      {activeTab === 'EVALUACION' && (
        <div className="no-print" style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#276749' }}>📝 Registro y Promedio de Trabajos Diarios</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>
                Los trabajos escaneados se almacenan individualmente aquí sin afectar tu evaluador directo hasta que decidas importarlos.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* TABLA DE TRABAJOS INDIVIDUALES ESCANEADOS HOY */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#2b6cb0' }}>📌 Trabajos Escaneados Hoy ({trabajosDia.length})</h4>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {trabajosDia.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>
                    No hay trabajos registrados el día de hoy. Escanea trabajos desde la pestaña Escáner.
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

            {/* TABLA RESUMEN DE PROMEDIOS DEL DÍA POR ALUMNO */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#f0fff4' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#22543d' }}>📊 Promedio Diarios por Alumno</h4>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#c6f6d5', borderBottom: '2px solid #9ae6b4', textAlign: 'left', color: '#22543d' }}>
                      <th style={{ padding: '8px' }}>Alumno</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Trabajos</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Promedio Hoy</th>
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
        </div>
      )}

      {/* VISTA 4: IMPRESIÓN DE GAFETES QR REDISEÑADOS Y CON FOTO DE ALUMNO */}
      {activeTab === 'GAFETES' && (
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#2b6cb0' }}>🎫 Gafetes QR Imprimibles con Foto y Nombre Amplio</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#718096' }}>
                Haz clic en la foto de cualquier alumno para agregar o cambiar su fotografía oficial.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3182ce',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(49,130,206,0.3)'
              }}
            >
              🖨️ Imprimir Gafetes
            </button>
          </div>

          {/* GRID DE GAFETES */}
          <div className="gafetes-print-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {alumnos.map(a => {
              const perfil = perfilesMap[a.id] || {};
              const fotoUrl = perfil.foto_url;

              return (
                <div
                  key={a.id}
                  className="gafete-card"
                  style={{
                    border: '2px solid #2b6cb0',
                    borderRadius: '14px',
                    padding: '16px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    minHeight: '320px'
                  }}
                >
                  {/* ENCABEZADO DEL GAFETE */}
                  <div style={{ width: '100%', backgroundColor: '#2b6cb0', color: '#ffffff', padding: '6px 0', borderRadius: '8px', textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      PLANIFICADOR DOCENTE
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.9 }}>
                      {grupoActual ? `${grupoActual.grado}° ${grupoActual.seccion}` : 'Primaria'} • Ciclo Escolar
                    </div>
                  </div>

                  {/* FOTO DEL ALUMNO + UPLOADER */}
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        border: '3px solid #3182ce',
                        overflow: 'hidden',
                        backgroundColor: '#edf2f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {fotoUrl ? (
                        <img src={fotoUrl} alt={a.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '40px', color: '#a0aec0' }}>👤</span>
                      )}
                    </div>

                    {/* BOTÓN UPLOADER NO-PRINT */}
                    <label
                      className="no-print"
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        backgroundColor: '#3182ce',
                        color: 'white',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
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

                  {/* NOMBRE DE ALUMNO DESTACADO / AMPLIO */}
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
    </div>
  );
}
