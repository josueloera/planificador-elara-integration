// src/planner_logic.js
import { dosificacionAnual } from './data_dosificacion';

/**
 * Calcula el plan para la fecha actual.
 * Si la fecha está dentro del rango normal (Sept-Julio) y hay proyecto, lo muestra.
 * Si la fecha es posterior a la última semana registrada (ej. fin de ciclo), 
 * aplica lógica de repaso reiniciando desde la semana 1.
 */
export function obtenerPlanSemanal(grado, fechaActual) {
  const hoy = new Date(fechaActual);
  hoy.setHours(0, 0, 0, 0);

  // 1. Intentar encontrar proyecto exacto por fecha
  const proyectosDelDia = dosificacionAnual.filter(item => {
    const inicio = new Date(item.fechaInicio);
    const fin = new Date(item.fechaFin);
    // Ajustar fin del día para incluir todo el último día
    fin.setHours(23, 59, 59, 999);
    // Ajustar inicio del día para evitar problemas de zona horaria
    inicio.setHours(0, 0, 0, 0);
    
    // El proyecto es válido si el grado coincide Y la fecha actual está entre inicio y fin
    return item.grado === parseInt(grado) && hoy >= inicio && hoy <= fin;
  });

  if (proyectosDelDia.length > 0) {
    return proyectosDelDia;
  }

  // 2. Si no hay proyecto, verificamos si es Vacaciones o Fin de Ciclo (Repaso)
  // Obtenemos todos los proyectos del grado ordenados por fecha
  const proyectosGrado = dosificacionAnual
    .filter(p => p.grado === parseInt(grado))
    .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

  if (proyectosGrado.length === 0) {
    return [{
      campo: "Sin Información",
      proyecto: "No hay base de datos para este grado.",
      pda: "Verifica el archivo data_dosificacion.js"
    }];
  }

  const ultimaFechaRegistro = new Date(proyectosGrado[proyectosGrado.length - 1].fechaFin);
  const primeraFechaRegistro = new Date(proyectosGrado[0].fechaInicio);

  // Caso A: Estamos en periodo vacacional o hueco dentro del ciclo (ej. primera sem enero)
  // Si la fecha actual es mayor a la primera fecha Y menor a la última, pero no encontró nada arriba, es un hueco (vacaciones).
  if (hoy > primeraFechaRegistro && hoy < ultimaFechaRegistro) {
     return [{
       campo: "Receso / Sin Actividad Programada",
       proyecto: "Periodo sin proyecto asignado en la dosificación.",
       pda: "Revisar calendario oficial o realizar repaso del bloque anterior."
     }];
  }

  // Caso B: Se acabaron los PDAs (Estamos después de la última fecha registrada) -> Lógica de REPASO
  if (hoy > ultimaFechaRegistro) {
    // Calculamos cuántas semanas han pasado desde el fin del ciclo para rotar el repaso
    const milisegundosPorSemana = 1000 * 60 * 60 * 24 * 7;
    const diferenciaTiempo = hoy - ultimaFechaRegistro;
    const semanasPasadas = Math.floor(diferenciaTiempo / milisegundosPorSemana);
    
    // Usamos el operador módulo (%) para volver al principio
    // Si hay 40 proyectos y estamos en la semana "extra" 1, mostramos el proyecto 0 (el primero del año).
    const indiceRepaso = semanasPasadas % proyectosGrado.length;
    
    const proyectoRepaso = proyectosGrado[indiceRepaso];
    
    return [{
      ...proyectoRepaso,
      nota: "Modo Repaso (Ciclo finalizado)" // Bandera opcional para UI
    }];
  }

  // Caso C: Antes del inicio del ciclo
  return [{
    campo: "Próximamente",
    proyecto: "El ciclo escolar aún no comienza.",
    pda: "Preparar materiales para el inicio de clases."
  }];
}