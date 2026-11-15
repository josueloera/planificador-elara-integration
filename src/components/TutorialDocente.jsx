import React, { useState } from 'react';

const GUIA_INICIAL = [
  ['Prepara el grupo', 'Abre Mi grupo y crea o selecciona el grupo que atenderás. Elige el grado y la sección antes de capturar información.'],
  ['Configura el ciclo escolar', 'En Ajustes del ciclo define el nombre del ciclo, la fecha de inicio y los datos de escuela y docente. Guarda los cambios.'],
  ['Define trimestres y fechas', 'En la configuración del ciclo revisa los tres periodos. Ajusta nombre, fecha inicial y final de cada trimestre según el calendario de tu escuela.'],
  ['Agrega a tus alumnos', 'En Mi grupo registra la lista del grupo. Puedes capturar alumnos uno por uno o usar la opción de importación disponible en esa pantalla. Verifica que cada alumno quede en el grupo correcto.'],
  ['Completa sus datos', 'Abre Alumnos para agregar o corregir los datos de cada estudiante y consultar su perfil. Captura solo la información necesaria para tu trabajo escolar.'],
  ['Organiza la evaluación', 'En Evaluación elige grupo, campo formativo y fecha. Abre la configuración de criterios, agrega los que usarás y asigna sus porcentajes; revisa que el total corresponda a tu forma de evaluar.'],
  ['Vincula códigos QR', 'En Exámenes crea la evaluación y genera o imprime sus hojas QR. En Control QR vincula el código con el grupo, la evaluación y los alumnos; realiza una lectura de prueba y confirma sus resultados antes de usarla con todo el grupo.'],
  ['Empieza el trabajo diario', 'Registra asistencia y actividades, captura resultados en Evaluación y consulta el reporte trimestral. Planeación, Dosificador y Proyectos te ayudan a preparar el trabajo del ciclo.'],
];

const GUIAS = {
  GRUPO: ['Selecciona el grado y la sección que vas a trabajar.', 'Agrega o importa la lista del grupo y comprueba que los nombres estén completos.', 'Abre la ficha de cada alumno para completar sus datos.', 'Usa el grupo activo en Evaluación, asistencia y reportes.'],
  ALUMNO: ['Busca al alumno por nombre dentro del grupo activo.', 'Abre su perfil y completa o corrige los datos necesarios.', 'Consulta sus calificaciones y expediente desde las secciones disponibles.', 'Guarda cada cambio antes de salir.'],
  CONFIG: ['Escribe los datos de escuela y docente.', 'Define la fecha de inicio y el ciclo escolar.', 'Revisa las fechas de inicio y fin de cada trimestre.', 'Guarda y confirma que el calendario corresponda a tu ciclo.'],
  EVAL: ['Elige grupo, campo formativo y fecha de evaluación.', 'Configura criterios y porcentajes antes de capturar calificaciones.', 'Registra las calificaciones; revisa la fecha y el alumno en cada fila.', 'Consulta el promedio y corrige cualquier dato antes de cerrar el periodo.'],
  ASISTENCIA_QR: ['Selecciona el grupo y abre el lector QR.', 'Escanea el código del alumno o de la actividad.', 'Confirma que el nombre y la fecha sean correctos.', 'Revisa los registros en Control QR y corrige los pendientes.'],
  EXAMSCAN: ['Crea el examen y agrega preguntas con sus respuestas correctas.', 'Genera e imprime las hojas de respuesta QR.', 'Asigna la hoja al alumno y confirma el grupo.', 'Escanea las respuestas y revisa las marcas dudosas antes de guardar.'],
  TRIMESTRAL: ['Elige el grupo y el trimestre que deseas revisar.', 'Comprueba que las fechas del periodo estén configuradas.', 'Revisa resultados y alumnos con información pendiente.', 'Exporta o imprime el reporte cuando los datos estén completos.'],
  CTE: ['Abre o crea la sesión de Consejo Técnico Escolar.', 'Agrega acuerdos, responsables y fechas de seguimiento.', 'Adjunta evidencias o notas de avance.', 'Revisa los pendientes antes de cerrar la sesión.'],
  LAN: ['Conecta ambos dispositivos a la misma red wifi.', 'Inicia la transferencia en el dispositivo que enviará los datos.', 'En el otro dispositivo elige recibir y sigue el código o instrucciones mostradas.', 'Confirma que la transferencia terminó y revisa los grupos recibidos.'],
  ANALITICO: ['Selecciona grado y grupo.', 'Registra el diagnóstico y las necesidades del contexto.', 'Vincula los contenidos y PDA pertinentes.', 'Guarda y revisa el programa analítico antes de exportarlo.'],
  PLANNER: ['Selecciona semana, grupo y proyecto de trabajo.', 'Distribuye actividades de inicio, desarrollo y cierre.', 'Agrega materiales, evaluación y adecuaciones necesarias.', 'Guarda e imprime o exporta la planeación.'],
  DOSIF: ['Selecciona grado y periodo del ciclo.', 'Distribuye contenidos o PDA en las semanas disponibles.', 'Comprueba que la secuencia y las fechas sean correctas.', 'Guarda los cambios y exporta la dosificación si la necesitas.'],
  CALENDARIO: ['Navega al mes del ciclo que quieres consultar.', 'Revisa fechas escolares y eventos registrados.', 'Activa la edición para agregar o ajustar un evento cuando corresponda.', 'Guarda y verifica que aparezca en la fecha correcta.'],
  COMISIONES: ['Agrega la comisión con descripción, tipo y fecha.', 'Registra responsables y acuerdos en el detalle disponible.', 'Actualiza su avance al realizar cada tarea.', 'Revisa la lista de pendientes para dar seguimiento.'],
  PROYECTOS: ['Crea un proyecto e indica nombre, metodología y duración.', 'Vincula los PDA relacionados con el propósito del proyecto.', 'Completa las actividades y fases con materiales y evidencias.', 'Guarda y consulta el proyecto desde esta pantalla.'],
  BITACORA: ['Selecciona al alumno relacionado con el registro.', 'Agrega la observación o incidencia con fecha y detalles claros.', 'Guarda el seguimiento y consulta el historial del alumno.', 'Actualiza el registro cuando haya nuevos acuerdos o avances.'],
  MATERIALES: ['Elige el tipo de material o recurso que necesitas.', 'Selecciona grado y tema o contenido.', 'Revisa las preguntas o actividades generadas antes de utilizarlas.', 'Guarda o imprime el material desde las opciones de la pantalla.'],
};

const TITULOS = {
  GRUPO: 'Mi grupo', ALUMNO: 'Alumnos', CONFIG: 'Ajustes del ciclo', EVAL: 'Evaluación',
  ASISTENCIA_QR: 'Asistencia QR', EXAMSCAN: 'Exámenes QR', TRIMESTRAL: 'Reporte trimestral',
  CTE: 'Consejo Técnico Escolar', LAN: 'Conectar dispositivos', ANALITICO: 'Programa analítico',
  PLANNER: 'Planeación', DOSIF: 'Dosificador', CALENDARIO: 'Calendario', COMISIONES: 'Comisiones',
  PROYECTOS: 'Proyectos', BITACORA: 'Bitácora', MATERIALES: 'Materiales',
};

export default function TutorialDocente({ vista, inicial = false, open = false, onOpen, onClose }) {
  const [paso, setPaso] = useState(0);
  const [mostrar, setMostrar] = useState(false);
  const activo = open || mostrar;
  const titulo = inicial ? 'Primeros pasos en ELARA' : (TITULOS[vista] || 'Esta sección');
  const pasos = inicial ? GUIA_INICIAL.map(([title, text]) => `${title}: ${text}`) : (GUIAS[vista] || [
    `Revisa el grupo, periodo o fecha seleccionados en ${titulo}.`,
    'Completa los datos que solicita la pantalla y revisa la información antes de guardar.',
    'Usa las opciones de consulta o exportación disponibles para dar seguimiento.',
  ]);

  const abrir = () => { setPaso(0); setMostrar(true); onOpen?.(); };
  const cerrar = () => { setMostrar(false); onClose?.(); };

  return <>
    {!inicial && !open && <button type="button" onClick={abrir} aria-label={`Abrir tutorial de ${titulo}`} style={boton}>📘 Tutorial paso a paso</button>}
    {activo && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) cerrar(); }} style={fondo}>
      <section role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo" style={dialogo}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12}}>
          <div><p style={{margin:'0 0 6px', color:'#3b5b9a', fontWeight:700}}>GUÍA PARA DOCENTES</p><h2 id="tutorial-titulo" style={{margin:'0 0 16px'}}>{titulo}</h2></div>
          <button type="button" onClick={cerrar} aria-label="Cerrar tutorial" style={cerrarBtn}>✕</button>
        </div>
        <p aria-live="polite" style={{fontSize:'1.05rem', lineHeight:1.65, minHeight:100}}><strong>{paso + 1}. </strong>{pasos[paso]}</p>
        <p style={{color:'#536174', fontSize:14}}>Paso {paso + 1} de {pasos.length}</p>
        <div style={{display:'flex', justifyContent:'space-between', gap:10}}>
          <button type="button" onClick={() => setPaso(Math.max(0, paso - 1))} disabled={paso === 0} style={secundario}>Anterior</button>
          {paso < pasos.length - 1
            ? <button type="button" onClick={() => setPaso(paso + 1)} style={primario}>Siguiente</button>
            : <button type="button" onClick={cerrar} style={primario}>Terminar</button>}
        </div>
      </section>
    </div>}
  </>;
}

const boton = {position:'fixed', right:18, bottom:18, zIndex:9000, padding:'12px 16px', border:'0', borderRadius:24, color:'#fff', background:'#244b85', boxShadow:'0 4px 14px #0003', fontWeight:700, cursor:'pointer'};
const fondo = {position:'fixed', inset:0, zIndex:10000, display:'grid', placeItems:'center', padding:16, background:'rgba(12,24,44,.62)'};
const dialogo = {width:'min(560px, 100%)', maxHeight:'90dvh', overflowY:'auto', padding:24, borderRadius:18, background:'#fff', color:'#182235', boxShadow:'0 20px 70px #0005', fontFamily:'system-ui,sans-serif'};
const cerrarBtn = {border:0, background:'transparent', padding:8, fontSize:20, cursor:'pointer'};
const primario = {border:0, borderRadius:10, padding:'11px 18px', color:'#fff', background:'#244b85', fontWeight:700, cursor:'pointer'};
const secundario = {...primario, color:'#26344a', background:'#e8edf5'};
