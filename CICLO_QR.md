# Evaluación diaria de Control QR durante el ciclo escolar

## Activación

1. Selecciona el grupo y su materia o módulo.
2. Revisa el inicio del ciclo y los trimestres en **Configuración del ciclo escolar**.
3. En **Evaluación → Vincular Control QR**, elige **Trabajos** o **Asistencia** y su criterio de destino.
4. Guarda el vínculo una vez por criterio y ciclo. También puedes hacerlo desde **Control QR → Historial**.

En Primaria, los trabajos se filtran por el campo formativo del criterio. La asistencia general del grupo puede vincularse a los criterios de asistencia de varias materias desde el historial.

En Secundaria, cada grupo representa su asignatura, tutoría o taller. Los datos y vínculos se mantienen separados por grupo.

## Funcionamiento

- Cada registro conserva su fecha original. Al elegir una fecha en Evaluación se muestran únicamente las notas de ese día, tanto QR como manuales.
- Por ejemplo, dos trabajos de la misma materia con 8 y 10 el lunes producen 9 el lunes; un trabajo con 6 el martes produce 6 el martes. El miércoles queda vacío si no hay registros.
- Agregar, corregir o eliminar trabajos o asistencias actualiza el día correspondiente en tiempo real. No se repite el promedio del ciclo en todas las fechas.
- Los vínculos existentes siguen funcionando y se conservan al cerrar la app; no hace falta volver a vincularlos.
- Los trabajos sin calificación no se cuentan como cero. Un cero registrado sí se muestra y se incluye en el promedio.
- Los criterios vinculados se corrigen desde Control QR. **Desvincular** permite volver a usar sus notas manuales guardadas.
- Cada criterio tiene una fuente: trabajos o asistencia. Volver a vincularlo cambia la fuente sin duplicar el vínculo.
- Cambiar de ciclo mantiene separados los vínculos de años distintos.

## Cálculo

Trabajos: promedio de las calificaciones numéricas de cada alumno, fecha y materia o grupo.

Asistencia: calificación de cada fecha, con presente = 1, retardo = 0.5, justificado = 0.8 y falta = 0, multiplicada por la escala elegida.

El reporte trimestral combina las notas manuales y QR del mismo día usando los porcentajes de los criterios; después promedia los días que tienen calificaciones. Solo incluye fechas dentro del trimestre y del ciclo configurado. Los días vacíos no cuentan como cero.

## Conservación de registros

No se crean tablas ni se migran bases de datos. Las notas automáticas se consultan por fecha desde los registros QR originales y los vínculos de la configuración existente. Las importaciones manuales de rangos también conservan la fecha de cada registro.

Los trabajos, asistencias y notas manuales anteriores permanecen disponibles. Al desvincular un criterio vuelven a mostrarse sus notas manuales guardadas.

## Visibilidad de ELARA

Puedes ocultar el icono y los consejos con el botón **Ocultar ELARA** junto al icono o desde su chat. Para volver a mostrarlo, abre **Ajustes Ciclo → Asistente ELARA → Mostrar el icono de ELARA**. También puedes desactivar solo los consejos automáticos. La preferencia se guarda al instante y se conserva al reiniciar.

## Verificación de la lógica diaria

Ejecuta `node --test scripts/test-evaluation-daily.cjs` desde la raíz del proyecto. Las pruebas usan SQLite en memoria y no abren bases de datos del usuario.
