import sqlite3

DB_NAME = "nem_primaria.db"

def reiniciar_criterios():
    print("🔧 Reparando tabla de Criterios...")
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        # 1. Borrar la tabla vieja si existe (para quitar errores)
        cursor.execute("DROP TABLE IF EXISTS criterios")

        # 2. Crear la tabla nueva desde cero
        cursor.execute("""
        CREATE TABLE criterios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            porcentaje INTEGER DEFAULT 0
        )
        """)

        # 3. Agregar unos ejemplos para verificar que funcione
        cursor.execute("INSERT INTO criterios (nombre, porcentaje) VALUES ('Asistencia', 10)")
        cursor.execute("INSERT INTO criterios (nombre, porcentaje) VALUES ('Participación', 20)")
        cursor.execute("INSERT INTO criterios (nombre, porcentaje) VALUES ('Trabajo en Clase', 70)")

        conn.commit()
        conn.close()
        print("✅ ¡LISTO! Tabla de criterios creada y probada con éxito.")
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    reiniciar_criterios()