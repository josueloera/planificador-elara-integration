import sqlite3

DB_NAME = "nem_primaria.db"

def actualizar_planeacion_v2():
    print("🔧 Actualizando tabla de Planeación (Desglosada)...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. Borramos la tabla vieja (cuidado: se borrarán las planeaciones de prueba)
    cursor.execute("DROP TABLE IF EXISTS planeaciones")

    # 2. Creamos la nueva tabla con campos separados por día y momento
    cursor.execute("""
    CREATE TABLE planeaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grado INTEGER,
        semana INTEGER,
        
        -- LUNES
        lunes_inicio TEXT, lunes_desarrollo TEXT, lunes_cierre TEXT,
        -- MARTES
        martes_inicio TEXT, martes_desarrollo TEXT, martes_cierre TEXT,
        -- MIÉRCOLES
        miercoles_inicio TEXT, miercoles_desarrollo TEXT, miercoles_cierre TEXT,
        -- JUEVES
        jueves_inicio TEXT, jueves_desarrollo TEXT, jueves_cierre TEXT,
        -- VIERNES
        viernes_inicio TEXT, viernes_desarrollo TEXT, viernes_cierre TEXT,
        
        -- GENERALES
        recursos TEXT,
        evaluacion TEXT,
        adecuaciones TEXT,

        UNIQUE(grado, semana)
    )
    """)

    conn.commit()
    conn.close()
    print("✅ ¡Tabla de Planeación V2 lista!")

if __name__ == "__main__":
    actualizar_planeacion_v2()