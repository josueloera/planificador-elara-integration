export const EVENTO_PREFERENCIAS_ELARA = 'elara-preferencias-cambiadas';

export function leerPreferenciasElara() {
  return {
    visible: localStorage.getItem('elara_hidden') !== 'true',
    consejos: localStorage.getItem('elara_tips_hidden') !== 'true'
  };
}

export function guardarPreferenciasElara(preferencias) {
  localStorage.setItem('elara_hidden', String(!preferencias.visible));
  localStorage.setItem('elara_tips_hidden', String(!preferencias.consejos));
  window.dispatchEvent(new Event(EVENTO_PREFERENCIAS_ELARA));
}
