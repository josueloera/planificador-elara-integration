// Tipos válidos en el app: CLASES, CTE, VACACIONES, DESCARGA, SUSPENSION
const DEFAULT_FECHA_INICIO = "2026-08-31";

const DEFAULT_PERIODOS = {
  1: { nombre: "1er Trimestre", inicio: "2026-08-31", fin: "2026-11-30" },
  2: { nombre: "2do Trimestre", inicio: "2026-12-01", fin: "2027-03-19" },
  3: { nombre: "3er Trimestre", inicio: "2027-03-22", fin: "2027-07-09" }
};

function parseYmd(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatYmd(date) {
  return date.toISOString().slice(0, 10);
}

function addRange(events, start, end, type, includeWeekends = true) {
  const cursor = parseYmd(start);
  const last = parseYmd(end);
  while (cursor <= last) {
    const day = cursor.getUTCDay();
    if (includeWeekends || (day !== 0 && day !== 6)) {
      events[formatYmd(cursor)] = type;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

function buildSepCalendarEvents2026_2027() {
  const events = {};

  // Agosto 2026
  addRange(events, "2026-08-01", "2026-08-23", "VACACIONES");
  addRange(events, "2026-08-24", "2026-08-28", "CTE", false);   // CTE Intensivo
  addRange(events, "2026-08-29", "2026-08-30", "VACACIONES");
  events["2026-08-31"] = "CLASES";   // Inicio de clases

  // Septiembre 2026
  events["2026-09-16"] = "SUSPENSION"; // Independencia
  events["2026-09-25"] = "CTE";

  // Octubre - Noviembre 2026
  events["2026-10-30"] = "CTE";
  events["2026-11-02"] = "SUSPENSION"; // Día de muertos
  events["2026-11-13"] = "DESCARGA";   // Registro de calificaciones (Azul)
  events["2026-11-16"] = "SUSPENSION"; // Revolución
  addRange(events, "2026-11-23", "2026-11-26", "DESCARGA", false); // Entrega de boletas (Delineado)
  events["2026-11-27"] = "CTE";

  // Diciembre 2026 - Enero 2027 (vacaciones)
  addRange(events, "2026-12-21", "2027-01-05", "VACACIONES", false);
  events["2026-12-25"] = "SUSPENSION";
  events["2027-01-01"] = "SUSPENSION";
  events["2027-01-06"] = "SUSPENSION";
  events["2027-01-29"] = "CTE";

  // Febrero 2027
  events["2027-02-01"] = "SUSPENSION"; // Constitución
  // Se remueve el rango de preinscripciones como suspensión (son clases normales)
  events["2027-02-26"] = "CTE";

  // Marzo 2027
  events["2027-03-05"] = "DESCARGA";   // Registro (Azul)
  events["2027-03-15"] = "SUSPENSION"; // Juárez
  addRange(events, "2027-03-16", "2027-03-19", "DESCARGA", false); // Entrega de boletas (Delineado)
  addRange(events, "2027-03-22", "2027-04-02", "VACACIONES", false); // Semana Santa
  events["2027-04-30"] = "CTE";

  // Mayo 2027
  events["2027-05-05"] = "SUSPENSION";
  events["2027-05-28"] = "CTE";

  // Junio 2027
  events["2027-06-25"] = "CTE";

  // Julio 2027 (cierre)
  events["2027-07-02"] = "DESCARGA"; // Registro (Azul)
  events["2027-07-07"] = "DESCARGA"; // Entrega de boletas (Delineado)
  events["2027-07-08"] = "DESCARGA"; // Entrega de boletas (Delineado)
  events["2027-07-09"] = "CLASES";  // Último día
  addRange(events, "2027-07-10", "2027-07-31", "VACACIONES");

  return events;
}

/**
 * Siembra eventos del ciclo 2026-2027 solo si no existen aún.
 * Solo usa tipos reconocidos por el app: CLASES, CTE, VACACIONES, DESCARGA, SUSPENSION
 */
function seedSepCalendar2026_2027(db) {
  db.get(
    "SELECT fecha FROM eventos_oficiales WHERE fecha >= '2026-08-01' LIMIT 1",
    [],
    (err, row) => {
      if (row) {
        console.log("[Seed] Eventos 2026-2027 ya existen, omitiendo seed.");
        return;
      }

      console.log("[Seed] Sembrando eventos 2026-2027...");
      const events = buildSepCalendarEvents2026_2027();
      const stmt = db.prepare("INSERT OR REPLACE INTO eventos_oficiales (fecha, tipo) VALUES (?, ?)");
      for (const [fecha, tipo] of Object.entries(events)) {
        stmt.run(fecha, tipo);
      }
      stmt.finalize(() => {
        console.log("[Seed] Eventos 2026-2027 sembrados.");
      });
    }
  );
}

module.exports = {
  DEFAULT_FECHA_INICIO,
  DEFAULT_PERIODOS,
  buildSepCalendarEvents2026_2027,
  seedSepCalendar2026_2027
};
