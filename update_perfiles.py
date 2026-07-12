import sqlite3

DB_NAME = "nem_primaria.db"

def actualizar_perfiles():
    print("🔧 Actualizando estructura de Perfiles...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. Borramos la tabla anterior para recrearla limpia
    cursor.execute("DROP TABLE IF EXISTS perfiles_alumnos")

    # 2. Creamos la nueva tabla con campos separados
    cursor.execute("""
    CREATE TABLE perfiles_alumnos (
        alumno_id INTEGER PRIMARY KEY,
        
        -- DATOS MAMÁ
        nombre_mama TEXT,
        tel_mama TEXT,
        
        -- DATOS PAPÁ
        nombre_papa TEXT,
        tel_papa TEXT,
        
        -- MÉDICOS Y OTROS
        tipo_sangre TEXT,
        alergias TEXT,
        adaptaciones TEXT,
        direccion TEXT,
        
        -- EMERGENCIA DETALLADA
        emergencia_nombre TEXT,
        emergencia_parentezco TEXT,
        emergencia_telefono TEXT,

        FOREIGN KEY(alumno_id) REFERENCES alumnos(id)
    )
    """)

    conn.commit()
    conn.close()
    print("✅ ¡Tabla de Perfiles actualizada con éxito!")

if __name__ == "__main__":
    actualizar_perfiles()