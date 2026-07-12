import sqlite3
import pandas as pd
conn = sqlite3.connect('nem_universal.db')
query = """
SELECT DISTINCT d.id, d.nombre 
FROM disciplinas d
JOIN contenidos c ON c.disciplina_id = d.id
JOIN pdas p ON p.contenido_id = c.id
WHERE p.grado = 1
ORDER BY d.nombre ASC
"""
print("Grado 1:", len(pd.read_sql_query(query, conn)))
print(pd.read_sql_query(query, conn).head())
