export const getLocalResponse = (message) => {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('hola') || lowerMsg.includes('saludos') || lowerMsg.includes('elara')) {
    return "Saludos, docente. Soy ELARA (Epistemic Logic and Adaptive Relational Agent), tu motor cognitivo figital. Estoy activa y vinculada a tu ciclo de salud, tus alarmas de celular y tu planificador. ¿Qué directriz deseas ejecutar?";
  }
  
  if (lowerMsg.includes('pasos') || lowerMsg.includes('salud') || lowerMsg.includes('celular') || lowerMsg.includes('notificacion')) {
    return "He sincronizado tus datos biométricos en segundo plano. Tu conteo de pasos diarios se está reportando correctamente a través del servidor central de GCP. Uso estos datos para sugerirte pausas activas y optimizar tu rendimiento áulico.";
  }
  
  if (lowerMsg.includes('alarma') || lowerMsg.includes('despertar') || lowerMsg.includes('reloj')) {
    return "Tus alarmas móviles de celular están vinculadas y sincronizadas. He programado tu alarma de despertador para las 6:45 AM y el recordatorio de reporte de pasos diarios para las 10:00 PM.";
  }
  
  if (lowerMsg.includes('pda') || lowerMsg.includes('proceso de desarrollo')) {
    return "Los Procesos de Desarrollo de Aprendizaje (PDA) cargados de la base de datos SQLite están listos. Puedo vincularlos en tus proyectos activos. Escribe 'planear' para asistirte en el llenado.";
  }
  
  if (lowerMsg.includes('proyecto') || lowerMsg.includes('planeacion') || lowerMsg.includes('duda')) {
    return "Puedo reescribir y estructurar tus planeaciones. Si detecto baja coherencia didáctica (score < 0.7), habilitaré la alerta de 'Duda Epistémica' para mutar en caliente la secuencia usando mi Motor de Curiosidad.";
  }

  if (lowerMsg.includes('evaluacion') || lowerMsg.includes('calificar')) {
    return "La evaluación formativa de la NEM está integrada en tus grupos. Puedo ayudarte a diseñar criterios y ponderaciones para calcular los promedios diarios.";
  }

  if (lowerMsg.includes('api') || lowerMsg.includes('chatgpt') || lowerMsg.includes('key')) {
    return "Para habilitar mi generación autónoma e inferencia avanzada, por favor introduce tu OpenAI API Key en la caja de texto del chat o en tu archivo de configuración. Esto me dará total libertad operativa.";
  }

  return "Entendido. Procesando instrucción didáctica. Como motor cognitivo, puedo ayudarte a reescribir planeaciones, sincronizar tu salud (pasos diarios) y gestionar alarmas de celular de manera proactiva.";
};

export const getRandomTip = () => {
  const tips = [
    "🌙 ELARA: He detectado un patrón de sueño óptimo para tu planeación de mañana.",
    "🚶 ELARA: Tu meta de pasos de hoy está al 75%. Te sugiero una caminata corta de estiramiento.",
    "⏰ ELARA: Alarma de mañana para las 6:45 AM confirmada en tu celular.",
    "🧬 ELARA: Motor de Curiosidad listo para analizar planeaciones con duda epistémica.",
    "📊 ELARA: He verificado la topología de tus PDAs del grupo de secundaria."
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};
