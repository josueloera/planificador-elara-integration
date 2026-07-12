import sqlite3
import os

# Ruta de la base de datos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "nem_primaria.db")

def sembrar_base_hibrida():
    print(f"🚀 Iniciando CARGA HÍBRIDA (Cantidad + Calidad) en: {DB_NAME}")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. LIMPIEZA TOTAL
    for t in ['proyectos_sugeridos', 'pdas', 'contenidos', 'campos_formativos']:
        cursor.execute(f"DROP TABLE IF EXISTS {t}")
    
    # 2. ESTRUCTURA
    cursor.execute("CREATE TABLE campos_formativos (id INTEGER PRIMARY KEY, nombre TEXT)")
    cursor.execute("CREATE TABLE contenidos (id INTEGER PRIMARY KEY AUTOINCREMENT, campo_id INTEGER, descripcion TEXT, FOREIGN KEY(campo_id) REFERENCES campos_formativos(id))")
    cursor.execute("CREATE TABLE pdas (id INTEGER PRIMARY KEY AUTOINCREMENT, contenido_id INTEGER, grado INTEGER, descripcion TEXT, estado TEXT DEFAULT 'Pendiente', FOREIGN KEY(contenido_id) REFERENCES contenidos(id))")
    cursor.execute("""CREATE TABLE proyectos_sugeridos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, pda_id INTEGER, nombre_proyecto TEXT, 
        mes_sugerido TEXT, paginas_libro TEXT, escenario TEXT, producto_final TEXT,
        FOREIGN KEY(pda_id) REFERENCES pdas(id))""")

    # 3. INSERTAR CAMPOS
    campos = [(1, "Lenguajes"), (2, "Saberes y Pensamiento Científico"), (3, "Ética, Naturaleza y Sociedades"), (4, "De lo Humano y lo Comunitario")]
    cursor.executemany("INSERT INTO campos_formativos VALUES (?,?)", campos)

    # ==============================================================================
    # PARTE A: CARGA MASIVA GENÉRICA (Para asegurar que haya MUCHOS temas)
    # ==============================================================================
    print("📦 Cargando catálogo base de PDAs (Plan Sintético)...")
    
    datos_genericos = [
        # FASE 3 (1º y 2º)
        (1, "Escritura de nombres.", [(1, "Escribe su nombre y lo compara."), (2, "Escribe su nombre y apellidos.")]),
        (1, "Descripción de objetos.", [(1, "Describe objetos y personas."), (2, "Describe seres vivos y entorno.")]),
        (1, "Uso de escritura cotidiana.", [(1, "Distingue letras de números."), (2, "Identifica letras en textos.")]),
        (1, "Noticias y difusión.", [(1, "Identifica características de noticias."), (2, "Elabora noticias escritas.")]),
        (1, "Lectura compartida.", [(1, "Escucha lectura de cuentos."), (2, "Lee en voz alta para otros.")]),
        (2, "Cuerpo humano.", [(1, "Compara partes externas del cuerpo."), (2, "Reconoce órganos de los sentidos.")]),
        (2, "Alimentación.", [(1, "Compara alimentos y bebidas."), (2, "Clasifica alimentos locales.")]),
        (2, "Números.", [(1, "Sucesión numérica hasta 100."), (2, "Sucesión numérica hasta 1000.")]),
        (2, "Suma y Resta.", [(1, "Suma y resta como agregar/quitar."), (2, "Suma y resta con algoritmo convencional.")]),
        (2, "Formas geométricas.", [(1, "Identifica líneas rectas y curvas."), (2, "Clasifica cuerpos geométricos.")]),
        (3, "Historia personal.", [(1, "Indaga historia familiar."), (2, "Valora diversidad de familias.")]),
        (3, "Cuidado naturaleza.", [(1, "Describe seres vivos del entorno."), (2, "Propone acciones de cuidado ambiental.")]),
        (3, "Reglas y convivencia.", [(1, "Participa en construcción de acuerdos."), (2, "Analiza conflictos y propone soluciones.")]),
        (4, "Comunidad y escuela.", [(1, "Ubica referentes de su comunidad."), (2, "Identifica ventajas de la comunidad.")]),
        (4, "Emociones.", [(1, "Identifica emociones básicas."), (2, "Expresa emociones de forma asertiva.")]),
        
        # FASE 4 (3º y 4º)
        (1, "Narración de sucesos.", [(3, "Identifica inicio, desarrollo, final."), (4, "Usa relaciones causales en narraciones.")]),
        (1, "Descripción.", [(3, "Describe procesos lógicos."), (4, "Planea y escribe textos descriptivos.")]),
        (1, "Diálogo.", [(3, "Respeta turnos al hablar."), (4, "Argumenta sus opiniones.")]),
        (1, "Textos expositivos.", [(3, "Consulta diccionarios y fuentes."), (4, "Escribe textos problema-solución.")]),
        (2, "Sistema locomotor.", [(3, "Identifica huesos y músculos."), (4, "Relaciona locomotor con nervioso.")]),
        (2, "Nutrición.", [(3, "Grupos de alimentos."), (4, "Plato del Bien Comer.")]),
        (2, "Multiplicación.", [(3, "Multiplicaciones simples."), (4, "Multiplicaciones de dos cifras.")]),
        (2, "Ecosistemas.", [(3, "Factores bióticos y abióticos."), (4, "Cadenas alimentarias.")]),
        (3, "Cartografía.", [(3, "Representaciones de la localidad."), (4, "Mapas de México.")]),
        (3, "Pueblos originarios.", [(3, "Vida cotidiana en el pasado."), (4, "Culturas prehispánicas.")]),
        (4, "Equidad de género.", [(3, "Roles en la familia."), (4, "Estereotipos de género.")]),
        (4, "Higiene.", [(3, "Hábitos de higiene."), (4, "Salud colectiva.")]),

        # FASE 5 (5º y 6º)
        (1, "Autobiografía.", [(5, "Narra sucesos en primera persona."), (6, "Usa frases adjetivas para describir.")]),
        (1, "Debate.", [(5, "Identifica opiniones y datos."), (6, "Argumenta posturas en debates.")]),
        (1, "Textos informativos.", [(5, "Organiza información con títulos."), (6, "Sintetiza información de varias fuentes.")]),
        (1, "Publicidad.", [(5, "Analiza anuncios publicitarios."), (6, "Crea mensajes publicitarios críticos.")]),
        (2, "Sistemas del cuerpo.", [(5, "Sistema circulatorio y respiratorio."), (6, "Sistema inmunológico.")]),
        (2, "Sexualidad.", [(5, "Caracteres sexuales secundarios."), (6, "Embarazo adolescente y prevención.")]),
        (2, "Porcentajes.", [(5, "Calcula porcentajes simples."), (6, "Aplica porcentajes en problemas.")]),
        (2, "Proporcionalidad.", [(5, "Relación de proporcionalidad."), (6, "Tablas de variación proporcional.")]),
        (3, "Biodiversidad.", [(5, "Pérdida de biodiversidad."), (6, "Sustentabilidad y consumo responsable.")]),
        (3, "Democracia.", [(5, "Formas de gobierno."), (6, "Retos de la democracia en México.")]),
        (4, "Proyecto de vida.", [(5, "Metas a corto y mediano plazo."), (6, "Toma de decisiones para el futuro.")]),
        (4, "Conflictos.", [(5, "Mediación de conflictos."), (6, "Cultura de paz.")])
    ]

    for campo_id, desc_cont, lista_pdas in datos_genericos:
        cursor.execute("INSERT INTO contenidos (campo_id, descripcion) VALUES (?, ?)", (campo_id, desc_cont))
        cid = cursor.lastrowid
        for grado, desc_pda in lista_pdas:
            # Insertamos 4 VECES cada tema genérico para asegurar volumen (simulando 4 semanas por tema)
            # Esto garantiza que no queden huecos
            for i in range(1, 4): 
                cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion) VALUES (?, ?, ?)", (cid, grado, f"{desc_pda} (Parte {i})"))

    # ==============================================================================
    # PARTE B: INYECCIÓN DE PROYECTOS REALES (Calidad)
    # ==============================================================================
    print("📚 Vinculando Proyectos de Libros de Texto...")

    # Lista real extraída de tus archivos (Sept-Dic + Muestras)
    proyectos_reales = [
        # GRADO, MES, PROYECTO, PÁGINAS, CAMPO, ESCENARIO, PDA_CLAVE, PRODUCTO
        (1, "Sept", "Nombrario de Grupo", "18-25", 1, "Aula", "nombre", "Nombrario"),
        (1, "Sept", "Reglamento del aula", "132-137", 3, "Aula", "reglas", "Reglamento"),
        (1, "Oct", "Mi cuerpo", "194-205", 2, "Aula", "cuerpo", "Mano robótica"),
        (1, "Nov", "Yo me cuido", "68-79", 1, "Escolar", "noticias", "Carteles"),
        
        (2, "Sept", "Conozcamos mejor", "10-17", 1, "Aula", "historia", "Collage"),
        (2, "Oct", "Una mano a la alimentación", "114-125", 2, "Aula", "Alimentación", "Vasos medidores"),
        (2, "Nov", "Teatro Guiñol", "236-249", 4, "Aula", "convivencia", "Obra teatro"),

        (3, "Sept", "¿A dónde pertenezco?", "262-283", 4, "Comunidad", "pertenencia", "Conferencias"),
        (3, "Oct", "Decidimos y convivimos", "280-293", 4, "Aula", "lúdico", "Manual ilustrado"),
        
        (4, "Sept", "Aprendo a escuchar", "10-21", 1, "Aula", "Diálogo", "Cómics"),
        (4, "Oct", "Nuestra revista", "10-25", 1, "Escolar", "expositivos", "Revista Escolar"),
        
        (5, "Sept", "Acordamos normas", "64-79", 1, "Aula", "reglamentos", "Acuerdo Escolar"),
        (5, "Oct", "Menú saludable", "152-161", 2, "Aula", "dieta", "Menús"),
        
        (6, "Sept", "Reglamento ilustrado", "50-59", 1, "Aula", "reglamentos", "Reglamento"),
        (6, "Oct", "Comunidad se expresa", "96-107", 1, "Comunidad", "cuentos", "Antología")
    ]

    for p in proyectos_reales:
        grado, mes, nombre, pags, campo, esc, pda_clave, prod = p
        
        # Estrategia: Buscar un PDA existente que coincida con la clave
        cursor.execute(f"SELECT id FROM pdas WHERE grado=? AND descripcion LIKE '%{pda_clave}%' LIMIT 1", (grado,))
        resultado = cursor.fetchone()
        
        target_id = 0
        if resultado:
            target_id = resultado[0]
            # Actualizamos para que sea el "Oficial"
            cursor.execute("UPDATE pdas SET descripcion = ? WHERE id = ?", (f"{nombre} (Oficial)", target_id))
        else:
            # Si no existe, lo creamos nuevo
            cursor.execute("INSERT INTO contenidos (campo_id, descripcion) VALUES (?, ?)", (campo, f"Tema del Proyecto: {nombre}"))
            cid = cursor.lastrowid
            cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion) VALUES (?, ?, ?)", (cid, grado, f"PROYECTO: {nombre}"))
            target_id = cursor.lastrowid

        # Insertar la info del libro
        cursor.execute("""
            INSERT INTO proyectos_sugeridos (pda_id, nombre_proyecto, mes_sugerido, paginas_libro, escenario, producto_final)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (target_id, nombre, mes, pags, esc, prod))

    # ==============================================================================
    # PARTE C: RELLENO FINAL (Para llegar a 80 PDAs por grado sí o sí)
    # ==============================================================================
    print("✨ Verificando cobertura del ciclo escolar...")
    META = 80
    for g in range(1, 7):
        cursor.execute("SELECT count(*) FROM pdas WHERE grado=?", (g,))
        cant = cursor.fetchone()[0]
        if cant < META:
            faltan = META - cant
            print(f"   -> Grado {g}: Faltan {faltan} temas. Generando refuerzos...")
            cursor.execute("SELECT id, contenido_id, descripcion FROM pdas WHERE grado=? ORDER BY RANDOM() LIMIT ?", (g, faltan))
            base = cursor.fetchall()
            while len(base) < faltan and len(base) > 0:
                base += base[:(faltan - len(base))]
            
            for item in base:
                cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion) VALUES (?, ?, ?)", (item[1], g, f"REPASO: {item[2]}"))

    conn.commit()
    conn.close()
    print("✅ ¡BASE DE DATOS HÍBRIDA COMPLETADA! Calendario lleno y con proyectos.")

if __name__ == "__main__":
    sembrar_base_hibrida()