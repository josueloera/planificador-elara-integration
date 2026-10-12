export const actividadAsignada = (actividad, alumnoId) => !Array.isArray(actividad?.alumno_ids)
  || actividad.alumno_ids.some(id => String(id) === String(alumnoId));

export function tareasAsignadas(actividades, alumnoId) {
  return actividades.filter(a => actividadAsignada(a, alumnoId));
}
