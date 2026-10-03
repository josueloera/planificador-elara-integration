# Evaluación automática de Control QR durante el ciclo escolar

## Activación

1. Selecciona el grupo y su materia o módulo.
2. Revisa las fechas en **Configuración del ciclo escolar**. El inicio del ciclo y el último fin de trimestre determinan el rango.
3. En **Evaluación → Vincular Control QR**, elige **Trabajos** o **Asistencia** y su criterio de destino.
4. Guarda el vínculo una vez por criterio y ciclo. También puedes hacerlo desde **Control QR → Historial**.

En Primaria, los trabajos se filtran por el campo formativo del criterio. La asistencia del grupo puede vincularse a los criterios de asistencia de varias materias usando la opción correspondiente del historial.

En Secundaria, cada grupo representa su asignatura, tutoría o taller. Los datos y vínculos se mantienen separados por grupo.

## Funcionamiento

- El criterio QR muestra los registros comprendidos en todo el ciclo configurado, independientemente de la fecha de las notas manuales.
- Agregar, corregir o eliminar un trabajo cambia su promedio. Cambiar una asistencia actualiza su calificación.
- Los vínculos se conservan al cerrar la app y pueden guardarse antes del primer registro.
- Sin registros válidos, el criterio muestra una celda vacía. Una calificación cero se muestra como cero.
- Los criterios automáticos se corrigen desde Control QR. Usa **Desvincular** para volver a introducir sus notas manualmente.
- Cada criterio tiene una fuente: trabajos o asistencia. Volver a vincular el mismo criterio cambia su fuente y no crea otra vinculación.
- Ajustar las fechas dentro del mismo ciclo actualiza el rango utilizado. Configurar otro ciclo permite establecer vínculos nuevos sin borrar los anteriores.

## Cálculo

Trabajos: promedio de las calificaciones numéricas registradas de esa materia y grupo. Los trabajos sin calificación no se cuentan como cero.

Asistencia: se conserva el cálculo anterior: presente = 1, retardo = 0.5, justificado = 0.8 y falta = 0, dividido entre los días registrados y multiplicado por la escala elegida.

El reporte trimestral calcula las fuentes QR únicamente dentro del trimestre solicitado. Cuando existen criterios automáticos, combina el promedio del periodo de cada criterio manual con los valores QR y sus porcentajes. Sin vínculos QR, conserva el cálculo anterior de promedios diarios.

## Conservación de registros

No se crean tablas ni se migran bases de datos. Los vínculos se guardan en la tabla de configuración existente, separados por grupo y ciclo. Los promedios automáticos se calculan desde sus registros originales; no se copian diariamente a la tabla de notas.

Los registros de trabajos, asistencias y notas manuales anteriores permanecen disponibles. Al desvincular un criterio vuelven a mostrarse sus notas manuales guardadas.
