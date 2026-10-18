import { useState } from 'react';
import './LegalInfo.css';

export default function LegalInfo() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="legal-info-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">
      Privacidad y licencia
    </button>
    {open && <div className="legal-info-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="legal-info-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-info-title">
        <header><h2 id="legal-info-title">Aviso de privacidad, uso y licencia</h2><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">Ã—</button></header>
        <div className="legal-info-content">
          <h3>Responsable</h3>
          <p><strong>Josue Jovanny Loera Ramirez</strong>, responsable del tratamiento de datos personales de Planificador Docente ELARA. RFC: <strong>LORJ880920UG1</strong>. Domicilio: <strong>20 de Noviembre 2, Valle de Allende, Chihuahua, C.P. 33910</strong>. Contacto para privacidad y solicitudes: <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a>.</p>
          <h3>Datos y finalidades</h3>
          <p>La aplicaciÃ³n permite que el docente capture y administre datos de cuenta o licencia, escuelas, grupos, alumnos y expedientes acadÃ©micos, incluidos nombres, fotografÃ­as, planeaciones, asistencia, evaluaciones y documentos. Los campos de salud pueden contener datos personales sensibles. Se usan para organizar la actividad docente, generar planeaciones y reportes, y conservar o exportar la informaciÃ³n que el usuario registre.</p>
          <h3>Almacenamiento y comunicaciones</h3>
          <p>La informaciÃ³n acadÃ©mica se guarda localmente en el dispositivo y en los respaldos o exportaciones que el usuario elija. No se sincroniza con ELARA por defecto. Las funciones de inteligencia artificial transmiten al proveedor configurado el texto y contexto que el usuario envÃ­a; evita incluir datos identificables o sensibles de estudiantes. Las exportaciones se guardan en el destino que el usuario elija. El responsable no recibe automÃ¡ticamente el contenido local de la aplicaciÃ³n.</p>
          <h3>Datos sensibles y de menores</h3>
          <p>Captura solo los datos necesarios y asegÃºrate de contar con autorizaciÃ³n y facultades para tratarlos, especialmente si pertenecen a menores o incluyen informaciÃ³n de salud. La escuela y el docente deben observar las obligaciones que les correspondan. El responsable de la aplicaciÃ³n no determina la base legal del registro que haga cada docente.</p>
          <h3>Derechos y contacto</h3>
          <p>Para ejercer derechos de acceso, rectificaciÃ³n, cancelaciÃ³n u oposiciÃ³n, revocar el consentimiento o consultar este aviso, escribe a <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a> o presenta una solicitud en el domicilio indicado. Incluye un medio para responder y describe tu solicitud; no envÃ­es datos sensibles por correo salvo que sea necesario y uses medidas adecuadas. Se atenderÃ¡ conforme a la legislaciÃ³n aplicable.</p>
          <h3>Licencia y propiedad intelectual</h3>
          <p>El instalador concede el uso de la aplicaciÃ³n conforme a la licencia autorizada; no concede propiedad ni licencia independiente sobre el cÃ³digo fuente, marcas o materiales. La copia, distribuciÃ³n, publicaciÃ³n, modificaciÃ³n o explotaciÃ³n fuera de esa licencia puede afectar derechos aplicables. El empaquetado busca disuadir la inspecciÃ³n casual, pero ningÃºn instalador impide tÃ©cnicamente toda extracciÃ³n o anÃ¡lisis. La aplicaciÃ³n no sustituye las obligaciones profesionales, escolares ni legales del usuario.</p>
          <p className="legal-info-version">Aviso actualizado para la versiÃ³n 1.0.21. Este aviso describe las funciones actuales de almacenamiento local y servicios opcionales; consulta al responsable para dudas o solicitudes.</p>
        </div>
        <footer><button type="button" onClick={() => setOpen(false)}>Cerrar</button></footer>
      </section>
    </div>}
  </>;
}
