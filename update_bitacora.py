import sqlite3

DB_NAME = "nem_primaria.db"

def actualizar_bitacora():
    print(f"📂 Actualizando {DB_NAME} para Bitácora...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. Tabla de PERFIL DETALLADO (Datos médicos, padres, etc.)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS perfiles_alumnos (
        alumno_id INTEGER PRIMARY KEY,
        nombre_padres TEXT,
        telefonos TEXT,
        tipo_sangre TEXT,
        alergias TEXT,
        adaptaciones TEXT,
        direccion TEXT,
        contacto_emergencia TEXT,
        FOREIGN KEY(alumno_id) REFERENCES alumnos(id)
    )
    """)

    # 2. Tabla de INCIDENCIAS (Reportes por fecha)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alumno_id INTEGER,
        fecha TEXT,
        situacion TEXT,
        involucrados TEXT,
        medidas TEXT,
        FOREIGN KEY(alumno_id) REFERENCES alumnos(id)
    )
    """)

    conn.commit()
    conn.close()
    print("✅ ¡Tablas de Bitácora creadas con éxito!")

if __name__ == "__main__":
    actualizar_bitacora()