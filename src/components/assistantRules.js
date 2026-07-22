export const getLocalResponse = (message) => {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('hola') || lowerMsg.includes('saludos') || lowerMsg.includes('elara')) {
    return "¡Saludos, docente! Soy ELARA, tu Asistente Pedagógica de la NEM. Estoy configurada de manera privada en tu equipo para asistirte en planeaciones, evaluación formativa y dosificación curricular. ¿En qué te puedo apoyar hoy?";
  }
  
  if (lowerMsg.includes('privad') || lowerMsg.includes('usuario') || lowerMsg.includes('homolog') || lowerMsg.includes('segurid')) {
    return "Tu información de planeación, alumnos y registros escolares es 100% privada y almacenada localmente en tu base de datos SQLite aislada en este equipo. Tu cuenta no mezcla datos con otros usuarios.";
  }
  
  if (lowerMsg.includes('pda') || lowerMsg.includes('proceso de desarrollo')) {
    return "Los Procesos de Desarrollo de Aprendizaje (PDA) de la SEP para tu grado están cargados y listos en la base de datos local. Puedes seleccionarlos en tus planeaciones y proyectos.";
  }
  
  if (lowerMsg.includes('proyecto') || lowerMsg.includes('planeacion') || lowerMsg.includes('llena')) {
    return "Puedo redactar y estructurar tus planeaciones semanales y completar las fases de tus proyectos didácticos NEM. Escribe 'llena la planeacion' o 'llena el proyecto abierto' para ejecutar la redacción automatizada.";
  }

  if (lowerMsg.includes('evaluacion') || lowerMsg.includes('calificar')) {
    return "La evaluación formativa de la NEM está integrada en tus grupos. Puedo ayudarte a diseñar criterios y ponderaciones para calcular los promedios diarios.";
  }

  if (lowerMsg.includes('api') || lowerMsg.includes('chatgpt') || lowerMsg.includes('key')) {
    return "Para habilitar mi generación autónoma e inferencia avanzada de OpenAI, por favor introduce tu API Key en la pantalla de Licencia o Configuración.";
  }

  return "Entendido. Procesando instrucción didáctica. Como tu Asistente Pedagógica privada, puedo redactar planeaciones semanales, organizar materiales didácticos y gestionar la evaluación formativa de tus alumnos.";
};

export const getRandomTip = () => {
  const tips = [
    "💡 ELARA: Recuerda que puedes cambiar el Grado de Primaria (1º a 6º) directamente en la barra superior de Planeación.",
    "📋 ELARA: Si deseas completar tu planeación semanal de Lunes a Viernes de inmediato, pídemelo en el chat diciéndome 'llena la planeacion'.",
    "📚 ELARA: Tus planeaciones y proyectos se guardan localmente de forma privada en tu base de datos SQLite.",
    "🧬 ELARA: Motor pedagógico listo para apoyarte con los aprendizajes PDA de la Nueva Escuela Mexicana (NEM).",
    "🖨️ ELARA: Puedes imprimir o guardar en PDF tu planeación completa con formato oficial de la SEP desde el botón de impresora."
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};
