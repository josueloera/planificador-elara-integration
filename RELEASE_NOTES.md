# Planificador Docente 1.0.5

- ALUMNO muestra en Primaria únicamente el grupo activo de Mi Grupo, incluyendo bases antiguas; no incluye alumnos huérfanos ni de otros grupos. Secundaria conserva la búsqueda por grado entre sus grupos.
- Fotos compartidas entre gafetes y ALUMNO, guardadas antes de confirmar la carga y adaptadas a 800 píxeles. Las fotos no guardadas por versiones antiguas deben volver a cargarse.
- Seguimiento con calendario mensual: presente, retardo, falta, justificado y días sin registro. Cada día abre sus trabajos QR, evaluaciones e incidencias, respetando alumno, grupo y ciclo.
- Exportación e impresión de ficha también incluyen los trabajos QR.
- Se conservan las bases existentes. Windows instala la actualización al cerrar; macOS requiere instalación manual mientras no haya firma de Apple.

# 1.0.4 — ALUMNO y expediente escolar

Nuevo acceso ALUMNO con búsqueda, foto y ficha compartida con Bitácora, tutor y contacto de emergencia, calificaciones trimestrales con QR, expediente de documentos y seguimiento. Exportación ZIP e impresión de ficha completa. QR pasa a la parte superior junto a Evaluación.

Los documentos se almacenan en SQLite. La migración conserva los datos anteriores; los homónimos permanecen separados por grupo/materia. Véase ALUMNO.md para límites y uso.

Actualización estable para Windows y macOS, publicada con sus archivos de actualización y verificación de integridad. Windows descarga la actualización y la instala al cerrar la aplicación. En macOS, la instalación automática requiere la firma de Apple; sin ella, se utiliza el instalador manual.

# Planificador Docente 1.0.3

- Opción para ocultar el icono de ELARA y sus consejos desde el propio asistente o desde Ajustes Ciclo. La preferencia se conserva al reiniciar.
- Opción independiente para desactivar únicamente los consejos automáticos.
- Las calificaciones de Control QR se muestran en la fecha de cada trabajo o asistencia. Cambiar de día ya no repite el promedio del ciclo escolar.
- Promedios diarios separados por alumno, grupo y campo formativo en Primaria, y por materia o módulo en Secundaria.
- Registrar, corregir o eliminar un registro QR actualiza únicamente su día. Los días sin registros quedan vacíos y los ceros sí cuentan.
- Los reportes trimestrales combinan las notas QR y manuales de cada día con los porcentajes configurados y promedian los días evaluados.
- Las importaciones de rangos conservan las fechas originales de los registros.
- Pruebas de evaluación diaria ejecutadas antes de generar los instaladores de Windows y macOS.

Los vínculos QR existentes siguen funcionando. Se conservan las bases de datos, calificaciones manuales y licencias de los docentes.

Para volver a mostrar ELARA, abre **Ajustes Ciclo → Asistente ELARA → Mostrar el icono de ELARA**.

# Planificador Docente 1.0.2

- Vinculación permanente de trabajos y asistencia de Control QR con los criterios de Evaluación.
- Cálculo automático con todos los registros del ciclo escolar configurado.
- Actualización al registrar, corregir o eliminar trabajos y al cambiar asistencias.
- Vínculos separados por grupo, materia o módulo, conservados al cerrar la aplicación.
- Historial abierto por defecto para todo el ciclo y reportes trimestrales delimitados a su periodo.
- Criterios automáticos identificados en Evaluación, con opción para desvincularlos.
- Conservación del calendario elegido por el docente al reiniciar.

Para activar la actualización automática, vincula los criterios una vez desde Evaluación o el historial de Control QR. Los vínculos pueden configurarse incluso sin registros.


# Planificador Docente 1.0.1

- Corregida la exportación del evaluador QR hacia el evaluador por grupo, materia y fecha.
- Los criterios de evaluación y las asistencias respetan la materia o módulo activo.
- Reexportar actualiza los registros existentes sin duplicarlos.
- Corregidos los mensajes de exportación y la carga de criterios al cambiar de materia o fechas.
- Publicación estable con archivos de actualización y comprobación de integridad.

Las bases de datos existentes de los docentes se conservan.
