import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "nem_universal.db")
SQL_FILE = r"C:\Users\USER\Downloads\secundaria_fase6_desde_excel.sql"

def main():
    print(f"📥 Importando datos desde: {SQL_FILE}")
    print(f"📦 Destino: {DB_NAME}")
    
    with open(SQL_FILE, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    # Reemplazar INSERT INTO por INSERT OR REPLACE INTO para evitar conflictos
    # con campos_formativos y otras tablas si ya existen.
    sql_script = sql_script.replace("INSERT INTO", "INSERT OR REPLACE INTO")

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    try:
        cursor.executescript(sql_script)
        conn.commit()
        print("✅ Importación completada exitosamente!")
        
        # Validar conteos
        cursor.execute("SELECT COUNT(*) FROM disciplinas")
        print(f"   - Disciplinas: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM contenidos")
        print(f"   - Contenidos: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM pdas")
        print(f"   - PDAs: {cursor.fetchone()[0]}")
        
    except Exception as e:
        print(f"❌ Error durante la importación: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()
