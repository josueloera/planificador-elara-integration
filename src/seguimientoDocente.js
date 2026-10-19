export function contextoDocente(variante, grupo, grado, ciclo) {
  if (!grupo?.id) return null;
  return JSON.stringify([variante, String(grupo.escuela_id ?? grupo.escuela ?? ''), String(grupo.id), Number(grado), String(grupo.disciplina_id ?? 'primaria'), String(grupo.ciclo_escolar || ''), String(ciclo.fechaInicioStr)]);
}
export const claveDocente = (tipo, contexto) => `docente:v1:${tipo}:${contexto}`;
export async function leerDocumento(ipc, clave, fallback) {
  const config = await ipc.invoke('get-config');
  if (!config[clave]) return fallback;
  return JSON.parse(config[clave]);
}
export async function guardarDocumento(ipc, clave, valor) {
  const result = await ipc.invoke('save-config', clave, JSON.stringify(valor));
  if (result === false || result?.error) throw new Error(result?.error || 'No se pudo guardar.');
}
export function notasDelPeriodo(config, contexto, alumno, periodo, campo) {
  const prefix = claveDocente('observacion', contexto) + ':';
  return Object.entries(config).filter(([key]) => key.startsWith(prefix)).map(([, value]) => {
    try { return JSON.parse(value); } catch { return null; }
  }).filter(n => n && String(n.alumnoId) === String(alumno) && n.fecha >= periodo.inicio && n.fecha <= periodo.fin && (!campo || n.campo === campo))
    .sort((a,b) => a.fecha.localeCompare(b.fecha) || a.campo.localeCompare(b.campo));
}
export function moverPda(plan, origen, index, destino, posicion) {
  const next = plan.map(s => ({...s, pdas: [...(s.pdas || [])]}));
  const from = next.find(s => String(s.id) === String(origen));
  const to = next.find(s => String(s.id) === String(destino));
  if (!from || !to || index < 0 || index >= from.pdas.length) throw new Error('Movimiento inválido.');
  const [item] = from.pdas.splice(index, 1);
  to.pdas.splice(posicion == null ? to.pdas.length : Math.max(0, Math.min(posicion, to.pdas.length)), 0, item);
  return next;
}
