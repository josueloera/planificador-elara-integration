import sqlite3
import os

# Aseguramos que la ruta sea absoluta para evitar confusiones
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "nem_primaria.db")

def sembrar_base_datos_completa():
    print(f"🚀 Iniciando carga MASIVA en: {DB_NAME}")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. LIMPIEZA TOTAL
    cursor.execute("DROP TABLE IF EXISTS pdas")
    cursor.execute("DROP TABLE IF EXISTS contenidos")
    cursor.execute("DROP TABLE IF EXISTS campos_formativos")
    
    # 2. ESTRUCTURA
    cursor.execute("CREATE TABLE IF NOT EXISTS campos_formativos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS contenidos (id INTEGER PRIMARY KEY AUTOINCREMENT, campo_id INTEGER, fase_id INTEGER, descripcion TEXT, FOREIGN KEY(campo_id) REFERENCES campos_formativos(id))")
    cursor.execute("CREATE TABLE IF NOT EXISTS pdas (id INTEGER PRIMARY KEY AUTOINCREMENT, contenido_id INTEGER, grado INTEGER, descripcion TEXT, estado TEXT DEFAULT 'Pendiente', FOREIGN KEY(contenido_id) REFERENCES contenidos(id))")

    # 3. CAMPOS FORMATIVOS
    campos = [(1, "Lenguajes"), (2, "Saberes y Pensamiento Científico"), (3, "Ética, Naturaleza y Sociedades"), (4, "De lo Humano y lo Comunitario")]
    cursor.executemany("INSERT INTO campos_formativos (id, nombre) VALUES (?, ?)", campos)

    # 4. DATOS COMPLETOS (FASES 3, 4 y 5)
    # Formato: (Campo_ID, Fase, "Contenido", [ (Grado, "PDA"), (Grado, "PDA") ])
    
    datos = [
        # ================= FASE 3 (1º y 2º GRADO) =================
        # LENGUAJES
        (1, 3, "Escritura de nombres en la lengua materna.", [
            (1, "Escribe su nombre y lo compara con los nombres de sus compañeros, lo usa para para indicar la autoría de sus trabajos, marcar sus útiles escolares, registrar su asistencia, entre otros."),
            (2, "Escribe su nombre y apellidos y de sus de familiares, profesores, compañeros y otras personas de su entorno para indicar autoría, pertenencia e identidad.")
        ]),
        (1, 3, "Descripción de objetos, personas, seres vivos y lugares.", [
            (1, "Describe de manera oral y/o escrita, en su lengua materna, objetos, personas, seres vivos y lugares que conoce en su contexto real o en la fantasía."),
            (2, "Describe en forma oral y escrita, en su lengua materna, objetos, personas, seres vivos y lugares de su entorno natural y social.")
        ]),
        (1, 3, "Uso de elementos y convenciones de la escritura presentes en la cotidianidad.", [
            (1, "Distingue letras de números, u otros signos o marcas gráficas que identifica y traza en textos de uso cotidiano."),
            (2, "Identifica letras en escritos en español y en lengua(s) indígena(s). Diferencia elementos y convenciones de la escritura.")
        ]),
        (1, 3, "Uso del dibujo y/o la escritura para recordar actividades y acuerdos escolares.", [
            (1, "Escribe y/o dibuja para realizar tareas en casa, recordar mensajes, llevar materiales a clase, registrar acuerdos, etcétera."),
            (2, "Registra por escrito instrucciones breves para realizar actividades en casa, listas de materiales o datos, asentar normas, etcétera.")
        ]),
        (1, 3, "Empleo de instrucciones para participar en juegos, usar o elaborar objetos, preparar alimentos u otros propósitos.", [
            (1, "Sigue instrucciones, orales o escritas, para preparar un alimento sencillo y saludable (receta), utilizar o construir un objeto, participar en un juego."),
            (2, "Realiza actividades a partir de la lectura de instructivos. Explica a sus compañeros el proceso a seguir para uso o construcción de objetos.")
        ]),
        (1, 3, "Identificación del sentido, utilidad y elaboración de avisos, carteles, anuncios publicitarios y letreros en la vida cotidiana.", [
            (1, "Identifica la intención comunicativa de letreros, carteles, avisos y otros textos públicos que se encuentran en su contexto escolar y comunitario."),
            (2, "Define el sentido comunicativo de anuncios publicitarios, que se encuentran en su contexto escolar y, en general, comunitario.")
        ]),
        (1, 3, "Elaboración y difusión de noticias en la escuela y el resto de la comunidad.", [
            (1, "Identifica las características de una noticia y sus funciones. Reflexiona sobre la importancia de la veracidad en las noticias."),
            (2, "Indaga sobre hechos relevantes para su comunidad y elabora noticias escritas sobre estos, con o sin ilustraciones.")
        ]),
        (1, 3, "Producción de textos dirigidos a autoridades y personas de la comunidad.", [
            (1, "Identifica necesidades de la escuela y de la localidad a partir de preguntas, comentarios u observaciones que involucran a compañeros, familiares, vecinos, profesores, autoridades y otros."),
            (2, "Indaga sobre necesidades, intereses y actividades de la escuela, así como sobre la forma en que personas de la comunidad pueden participar a favor de éstos.")
        ]),
        (1, 3, "Lectura, escritura y otros tipos de comunicación que ocurren en el contexto familiar.", [
            (1, "Explora portadores de texto que se encuentran en su ambiente familiar, si alguien los usa, con qué propósitos en qué lengua están, así como su soporte."),
            (2, "Realiza actividades de escritura con su familia y registra con quién escribe, qué escribe, para qué escriben, en qué lengua escribieron y con qué soporte.")
        ]),
        (1, 3, "Comunicación a distancia con familiares u otras personas.", [
            (1, "Participa con ideas en la elaboración de un texto para alguien que vive en otro lugar, a través del dictado a su docente."),
            (2, "Conoce diversas formas de comunicación a distancia, explica de manera inicial cómo se realizan y utiliza al menos una forma de comunicación a distancia.")
        ]),
        # SABERES Y PENSAMIENTO CIENTÍFICO (FASE 3)
        (2, 3, "Cuerpo humano: estructura externa, acciones para su cuidado y sus cambios como parte del crecimiento.", [
            (1, "Compara, representa y nombra, en su lengua materna, las partes externas del cuerpo humano, explica su funcionamiento; propone y practica acciones para cuidarlo."),
            (2, "Reconoce y describe los órganos de los sentidos y su función; explica y representa acciones que ponen en riesgo la integridad de los órganos de los sentidos.")
        ]),
        (2, 3, "Beneficios del consumo de alimentos saludables, de agua simple potable, y de la práctica de actividad física.", [
            (1, "Indaga, registra y compara el tipo de bebidas y alimentos (frutas, verduras, cereales, tubérculos, leguminosas y de origen animal), la frecuencia y cantidad que consume."),
            (2, "Compara y registra el tipo y la cantidad de alimentos que consumen niñas y niños respecto a los adultos y de acuerdo con la actividad física que realizan.")
        ]),
        (2, 3, "Características del entorno natural y sociocultural.", [
            (1, "Distingue, describe y registra, en su lengua materna, las características del entorno natural: plantas, animales, cuerpos de agua, si hace frío o calor, frecuencia de lluvias, sequías."),
            (2, "Observa, compara y describe las características naturales de diferentes lugares de México como desiertos, selvas, arrecifes de coral, manglares, entre otros.")
        ]),
        (2, 3, "Impacto de las actividades humanas en el entorno natural, así como acciones y prácticas socioculturales para su cuidado.", [
            (1, "Identifica actividades personales, familiares y de la comunidad que impactan en la naturaleza y en la salud de las personas, las registra y clasifica como positivas o negativas."),
            (2, "Describe y representa el efecto que tienen en plantas, animales, agua, suelo y aire, las actividades humanas al satisfacer necesidades.")
        ]),
        (2, 3, "Objetos del entorno: características, propiedades, estados físicos y usos en la vida cotidiana.", [
            (1, "Observa, manipula y compara diversos objetos a partir de características como: color, tamaño, olor, textura, material de qué están hechos (madera, vidrio, metal, plástico)."),
            (2, "Experimenta y compara la temperatura de diversos objetos con el uso de sus sentidos y del termómetro para proponer una escala en la que ubiquen los objetos de los más fríos a los más calientes.")
        ]),
        (2, 3, "Efectos de la aplicación de fuerzas: movimiento y deformación.", [
            (1, "Observa de manera directa o en diversos medios, la trayectoria (recta, curva, circular) y rapidez (rápido o lento) de diferentes animales al desplazarse."),
            (2, "Experimenta con objetos de diversos materiales para identificar cómo se deforman al empujarlos, jalarlos, ejercer una presión sobre ellos o hacerlos chocar.")
        ]),
        (2, 3, "Características del sonido y la luz.", [
            (1, "Indaga y describe los sonidos producidos en su entorno; experimenta con diversos objetos o instrumentos musicales, para identificar la fuente sonora."),
            (2, "Explora su entorno para distinguir y registrar fuentes naturales y artificiales de luz y su aprovechamiento en actividades cotidianas.")
        ]),
        (2, 3, "Estudio de los números.", [
            (1, "Expresa oralmente la sucesión numérica en su lengua materna y en español, primero hasta 20, luego hasta 40, posteriormente hasta 60 y finalmente hasta 120 elementos."),
            (2, "Expresa oralmente la sucesión numérica hasta 1000, en español y hasta donde sea posible en su lengua materna, de manera ascendente y descendente.")
        ]),
        (2, 3, "Construcción de la noción de suma y resta como operaciones inversas.", [
            (1, "Reconoce, a partir de la resolución de situaciones que implican agregar, quitar, juntar, comparar y completar, que la suma es el total de dos o más cantidades y la resta, como la pérdida."),
            (2, "Representa con diferentes expresiones aditivas (suma y resta) cantidades menores a 1000. Resuelve problemas que implican avanzar (suma) y retroceder (resta) en la recta numérica.")
        ]),
        (2, 3, "Cuerpos geométricos y sus características.", [
            (1, "Observa y manipula objetos de su entorno para identificar y describir líneas rectas o curvas, caras planas o curvas; los representa mediante diversos procedimientos."),
            (2, "Clasifica objetos de su entorno o cuerpos geométricos de acuerdo con distintos criterios (caras planas o curvas, caras iguales); los construye usando cajas, bloques o cubos.")
        ]),
        # ÉTICA, NATURALEZA Y SOCIEDADES (FASE 3)
        (3, 3, "Historia personal y familiar, diversidad de familias y el derecho a pertenecer a una.", [
            (1, "Indaga en diversas fuentes orales, escritas, digitales, objetos y testimonios, para construir la historia personal y familiar."),
            (2, "Valora la diversidad de familias y promueve el respeto entre las y los integrantes de esta, para el cuidado de sí, de su familia y de las familias de su comunidad.")
        ]),
        (3, 3, "Valoración de la naturaleza: Respeto, cuidado y empatía hacia la naturaleza.", [
            (1, "Describe la existencia de otros seres vivos y componentes de la naturaleza presentes en el lugar donde vive."),
            (2, "Se reconoce a sí mismo o a sí misma como parte del lugar donde vive y en relación con otros seres vivos y componentes de la naturaleza.")
        ]),
        (3, 3, "Impacto de las actividades humanas en la naturaleza y sustentabilidad.", [
            (1, "Describe las actividades que se realizan de manera cotidiana en su casa, escuela y comunidad, e identifica en cada caso, la relación que dicha actividad guarda con la naturaleza."),
            (2, "Relaciona las actividades humanas con la naturaleza, al identificar aquellas que pueden tener un efecto negativo, planteando la posibilidad de realizar cambios.")
        ]),
        (3, 3, "Construcción de la paz mediante el diálogo: situaciones de conflicto como parte de la interacción humana.", [
            (1, "Analiza situaciones de conflicto como parte de la interacción de los seres humanos, e identifica los que ha enfrentado o ha observado en su casa, en el aula, la escuela y la comunidad."),
            (2, "Analiza situaciones de conflicto en su casa, el aula, la escuela y la comunidad; habla de ellas, distingue a las personas participantes y afectadas, así como el motivo del conflicto.")
        ]),
        (3, 3, "Democracia como forma de vida: Construcción participativa de normas, reglas y acuerdos.", [
            (1, "Participa en la revisión y construcción de acuerdos y reglas que regulan la convivencia en la familia y el grupo escolar."),
            (2, "Participa en la revisión y construcción de acuerdos, reglas y normas que sirven para atender necesidades compartidas, alcanzar metas comunes y resolver conflictos.")
        ]),
        (3, 3, "Historia de la vida cotidiana: cambios en el tiempo y el espacio ocurridos en la comunidad.", [
            (1, "Indaga en fuentes, orales, escritas, fotográficas, testimonios, digitales, los cambios en la vida cotidiana en el tiempo y el espacio ocurridos en la comunidad."),
            (2, "Indaga en fuentes orales, escritas, fotográficas, testimonios, digitales, los cambios y permanencias en la vida cotidiana en el tiempo y el espacio ocurridos en la comunidad.")
        ]),
        # DE LO HUMANO Y LO COMUNITARIO (FASE 3)
        (4, 3, "La comunidad como el espacio en el que se vive y se encuentra la escuela.", [
            (1, "Ubica algunos referentes del lugar donde vive y se encuentra la escuela. Platica sobre las características geográficas, climáticas, ambientales, socioculturales."),
            (2, "Identifica las ventajas que conlleva: la seguridad, el intercambio, el sentido de pertenencia, la afectividad, entre otras, el ser parte de una comunidad.")
        ]),
        (4, 3, "Actitudes y prácticas que prevalecen entre los hombres y las mujeres en la familia, la escuela y la comunidad.", [
            (1, "Platica acerca de la organización de las responsabilidades y tareas en su familia."),
            (2, "Analiza las situaciones acerca de la participación de hombres y mujeres, en las actividades familiares, incluyendo el sostenimiento económico.")
        ]),
        (4, 3, "Historia personal y familiar.", [
            (1, "Platica sobre sucesos de su historia personal y familiar y los ordena en antes, después y ahora."),
            (2, "Escribe acerca de sucesos de su historia personal y familiar y los apoya con dibujos, fotografías o imágenes, ordenados cronológicamente.")
        ]),
        (4, 3, "Sentido de pertenencia a la familia y la comunidad.", [
            (1, "Identifica aspectos de la historia familiar y de la comunidad compartidos."),
            (2, "Entrevista a familiares o integrantes de su comunidad acerca de los aspectos que se comparten entre todas y todos.")
        ]),
        (4, 3, "Formas de ser, pensar, actuar y relacionarse.", [
            (1, "Reconoce y descubre características y cambios (corporales, gustos, intereses, necesidades y capacidades) que lo diferencian y hacen único."),
            (2, "Explora sus posibilidades y las de otras personas para mostrar empatía acerca de las situaciones y condiciones que inciden en el desarrollo personal y colectivo.")
        ]),
        
        # ================= FASE 4 (3º y 4º GRADO) =================
        # LENGUAJES
        (1, 4, "Narración de sucesos del pasado y del presente.", [
            (3, "Identifica y comprende la función y las características principales de la narración. Reconoce y usa las estructuras narrativas: lineal, circular, in media res."),
            (4, "Reconoce y usa diversos estilos, recursos y estrategias narrativas. Establece relaciones causales y temporales entre acontecimientos.")
        ]),
        (1, 4, "Descripción de personas, lugares, hechos y procesos.", [
            (3, "Comprende, a partir de la lectura de textos descriptivos, que hay formas detalladas para describir a las personas y los lugares."),
            (4, "Planea, escribe, revisa y corrige textos donde describe, de manera lógica, procesos con los que tiene cierta familiaridad.")
        ]),
        (1, 4, "Diálogo para la toma de acuerdos y el intercambio de opiniones.", [
            (3, "Reconoce y usa pautas que norman los intercambios orales, como respetar el turno para hacer uso de la palabra, prestar atención, adecuar el volumen de voz."),
            (4, "Indica de manera respetuosa cuando no ha comprendido las opiniones o ideas de otros. Utiliza información de varias fuentes orales y escritas.")
        ]),
        (1, 4, "Comprensión y producción de textos expositivos (problema-solución, comparación-contraste, causa-consecuencia y enumeración).", [
            (3, "Recurre a diversos soportes que contienen textos expositivos, para ampliar sus conocimientos sobre algún tema, así como a diccionarios para consultar definiciones."),
            (4, "Identifica los efectos de una situación o fenómeno planteados en la información que presenta un texto expositivo. Planea, escribe, revisa y corrige sus propios textos expositivos.")
        ]),
        (1, 4, "Búsqueda y manejo reflexivo de información.", [
            (3, "Formula preguntas para realizar la búsqueda de información y las responde luego de localizar la información correspondiente."),
            (4, "Elabora preguntas para localizar la información que requiere y reflexiona sobre el uso de acentos gráficos en palabras que se usan para preguntar.")
        ]),
        (1, 4, "Comprensión y producción de textos instructivos para realizar actividades escolares y participar en diversos juegos.", [
            (3, "Identifica y reflexiona sobre la función de los textos instructivos y sus características genéricas: organización de los datos; uso de numerales."),
            (4, "Analiza las características de diversos textos instructivos, como reglamentos, recetas médicas y de cocina, indicaciones para participar en un juego de mesa o de patio.")
        ]),
        (1, 4, "Exposición sobre temas diversos.", [
            (3, "Reconoce características de la oralidad: recursos expresivos (estilo) y paralingüísticos o no lingüísticos, como movimiento corporal y gestos."),
            (4, "Expone sobre diversos temas, considerando: Planear su exposición, realizar apuntes, mantener el interés del auditorio.")
        ]),
        # SABERES Y PENSAMIENTO CIENTÍFICO (FASE 4)
        (2, 4, "Estructura y funcionamiento del cuerpo humano: sistemas locomotor y digestivo.", [
            (3, "Identifica y describe que el sistema locomotor está conformado por el sistema óseo y el sistema muscular, y sus funciones."),
            (4, "Identifica y describe la estructura y funciones del sistema digestivo, así como su relación con el sistema circulatorio.")
        ]),
        (2, 4, "Alimentación saludable, con base en el Plato del Bien Comer.", [
            (3, "Explica la importancia del consumo de una alimentación higiénica y variada que incluya verduras y frutas; cereales y tubérculos; leguminosas y alimentos de origen animal."),
            (4, "Indaga y describe los nutrimentos que proporcionan los alimentos que consume, y contrasta con el Plato del Bien Comer.")
        ]),
        (2, 4, "Interacciones entre plantas, animales y el entorno natural: nutrición y locomoción.", [
            (3, "Indaga y describe la locomoción de animales, a partir de reconocer las formas en las que se mueven y desplazan en la búsqueda de alimento, agua o refugio."),
            (4, "Identifica y clasifica animales, con base en su tipo de alimentación: herbívoros, carnívoros y omnívoros, y su relación con el lugar donde viven.")
        ]),
        (2, 4, "Relaciones entre los factores físicos y biológicos que conforman los ecosistemas.", [
            (3, "Describe la importancia del aire, el agua, el suelo y el Sol para todos los seres vivos, a partir de representar las relaciones que establecen."),
            (4, "Identifica, representa y explica las interacciones entre los factores biológicos y los factores físicos en la conformación de los ecosistemas.")
        ]),
        (2, 4, "Impacto de las actividades humanas en la naturaleza y en la salud.", [
            (3, "Indaga el impacto de las actividades humanas del entorno natural del lugar donde vive, y establece relaciones causa-efecto en la naturaleza."),
            (4, "Indaga y describe los problemas de contaminación de agua, aire y suelo, y generación de residuos sólidos en su comunidad.")
        ]),
        (2, 4, "Propiedades de los materiales: masa y longitud; relación entre estados físicos y la temperatura.", [
            (3, "Describe la masa y la longitud como propiedades medibles de los materiales, a partir de experimentar con distintos objetos y materiales."),
            (4, "Describe y representa los cambios físicos del ciclo del agua: evaporación, condensación, solidificación, y su relación con la variación de la temperatura.")
        ]),
        (2, 4, "Estudio de los números.", [
            (3, "Expresa oralmente la sucesión numérica hasta cuatro cifras, en español y hasta donde sea posible, en su lengua materna, de manera ascendente y descendente."),
            (4, "Expresa oralmente la sucesión numérica hasta cinco cifras, en español y hasta donde sea posible, en su lengua materna, de manera ascendente y descendente.")
        ]),
        (2, 4, "Suma y resta, su relación como operaciones inversas.", [
            (3, "Resuelve situaciones problemáticas vinculadas a su contexto que implican sumas de números naturales de hasta tres cifras utilizando el algoritmo convencional."),
            (4, "Resuelve situaciones problemáticas vinculadas a su contexto que implican sumas o restas de números naturales de hasta cuatro cifras utilizando los algoritmos convencionales.")
        ]),
        (2, 4, "Multiplicación y división, su relación como operaciones inversas.", [
            (3, "Resuelve multiplicaciones cuyo producto es un número natural de tres cifras, mediante diversos procedimientos (suma de multiplicaciones parciales, multiplicaciones por 10, 20, 30)."),
            (4, "Resuelve situaciones problemáticas vinculadas a su contexto que implican multiplicaciones de números naturales de hasta tres por dos cifras.")
        ]),
        # ÉTICA, NATURALEZA Y SOCIEDADES (FASE 4)
        (3, 4, "Representaciones cartográficas de la localidad y/o comunidad.", [
            (3, "Elabora representaciones cartográficas de la localidad o pueblo donde vive, considerando los puntos cardinales dentro de la entidad."),
            (4, "Elabora representaciones cartográficas de la entidad y el territorio nacional, considerando los puntos cardinales.")
        ]),
        (3, 4, "Valoración de los ecosistemas: Características del territorio como espacio de vida.", [
            (3, "Indaga sobre los ecosistemas locales y sus características, y los concibe como espacios vivos y complejos de la naturaleza."),
            (4, "Representa la visión de su comunidad respecto a su relación con la naturaleza y las tradiciones culturales construidas.")
        ]),
        (3, 4, "Interculturalidad y sustentabilidad: Formas en las que los pueblos originarios y otras culturas se relacionan con la naturaleza.", [
            (3, "Conoce y analiza otras cosmovisiones o formas de relación de la sociedad con la naturaleza de pueblos originarios, campesinos y de otras culturas del país."),
            (4, "Indaga y analiza formas diversas en que las mujeres contribuyen en el cuidado y la preservación del ambiente y la salud.")
        ]),
        (3, 4, "Caracterización y localización del territorio donde vive, la entidad y México.", [
            (3, "Identifica las características de la comunidad y la entidad como suelo, clima, animales y plantas, cuerpos de agua, relieve."),
            (4, "Localiza y reconoce características del territorio de México, como suelo, clima, regiones naturales, relieve, cuerpos de agua, extensión, límites.")
        ]),
        (3, 4, "La vida cotidiana antes de la primera invasión europea y en el México colonial.", [
            (3, "Indaga en fuentes primarias o secundarias sobre pueblos originarios que habitaron lo que hoy es el territorio nacional, antes de la primera invasión europea."),
            (4, "Indaga en fuentes primarias o secundarias sobre la invasión española, y analiza algunos de sus impactos en las poblaciones originarias.")
        ]),
        # DE LO HUMANO Y LO COMUNITARIO (FASE 4)
        (4, 4, "La comunidad como el espacio en el que se vive y se encuentra la escuela.", [
            (3, "Indaga acerca de ideas, conocimientos, prácticas culturales, formas de organización y acuerdos familiares, escolares y comunitarios."),
            (4, "Reconoce ideas, conocimientos, prácticas culturales y formas de organización, para explicar el significado que tienen en la familia, la escuela y la comunidad.")
        ]),
        (4, 4, "La escuela como espacio de convivencia, colaboración y aprendizaje.", [
            (3, "Participa en la organización del aula y en la generación de normas, para el uso y disfrute de los materiales de apoyo."),
            (4, "Participa en la toma de decisiones sobre el funcionamiento de la escuela, y la relación escuela-comunidad, para favorecer la colaboración.")
        ]),
        (4, 4, "Formas de ser, pensar, actuar y relacionarse.", [
            (3, "Reconoce características que lo hacen diferente y a la vez único, para favorecer la construcción de su identidad."),
            (4, "Comparte los cambios que afronta en sus capacidades y las formas de ser, pensar, actuar y relacionarse para valorar la manera en que las demás personas inciden en la construcción de su identidad.")
        ]),
        (4, 4, "Construcción del proyecto de vida.", [
            (3, "Reflexiona acerca de logros cotidianos, académicos y emocionales, así como los aspectos que inciden en estos y los retos que tiene."),
            (4, "Reconoce cambios en sus necesidades, intereses y logros, para ajustar metas y diseñar estrategias que permitan cumplirlas.")
        ]),
        (4, 4, "Equidad de género en la familia, la escuela y la comunidad.", [
            (3, "Observa y describe las prácticas cotidianas que prevalecen entre las mujeres y los hombres en el grupo de pares, en el equipo docente, en su familia."),
            (4, "Reflexiona acerca de las prácticas que prevalecen entre hombres y mujeres, en la familia y la comunidad.")
        ]),

        # ================= FASE 5 (5º y 6º GRADO) =================
        # LENGUAJES
        (1, 5, "Narración de sucesos autobiográficos.", [
            (5, "Lee textos autobiográficos y reflexiona sobre las razones por las que suelen estar narrados en primera persona del singular."),
            (6, "Lee textos autobiográficos e identifica las relaciones temporales de secuencia, simultaneidad y duración.")
        ]),
        (1, 5, "Comprensión y producción de textos explicativos.", [
            (5, "Lee distintos tipos de textos explicativos y reflexiona sobre sus características y funciones. Expone las diferencias entre una descripción y una explicación."),
            (6, "Localiza y lee textos explicativos de temas variados. Expresa con sus palabras las ideas que comprende de los textos que lee.")
        ]),
        (1, 5, "Participación en debates sobre temas de interés común.", [
            (5, "Reconoce que hay temas donde las opiniones se dividen, y es necesario sustentar las propias. Conoce la función y organización de un debate."),
            (6, "Prepara su participación en un debate y formula los argumentos por presentar, cuidando que la exposición del tema por discutir resulte coherente.")
        ]),
        (1, 5, "Comprensión y producción de textos argumentativos.", [
            (5, "Lee textos sobre temas polémicos, y distingue las opiniones de los datos y hechos concretos."),
            (6, "Lee textos sobre temas polémicos, e identifica los argumentos que sustentan cada postura. Registra los principales argumentos.")
        ]),
        (1, 5, "Comprensión y producción de textos informativos.", [
            (5, "Selecciona y lee textos informativos sobre temas de su interés. Formula preguntas para guiar la búsqueda de información específica."),
            (6, "Lee textos informativos y reflexiona sobre su organización. Identifica información específica sobre asuntos de su interés.")
        ]),
        (1, 5, "Comprensión y producción de textos discontinuos.", [
            (5, "Reconoce, mediante el análisis, las características y funciones de los textos discontinuos, en particular de tablas de doble entrada, líneas del tiempo."),
            (6, "Reconoce, mediante el análisis, las características y funciones de los textos discontinuos, en particular de gráficas, cuadros sinópticos y mapas conceptuales.")
        ]),
        (1, 5, "Elaboración e intercambio de reseñas de diversos textos y/o audiovisuales.", [
            (5, "Reconoce las características y función de las reseñas. Describe un texto leído y construye una opinión acerca del mismo."),
            (6, "Explica la utilidad de las reseñas y comenta sus características. Describe el material audiovisual consultado y registra los datos de identificación.")
        ]),
        (1, 5, "Producción y envío de cartas personales.", [
            (5, "Lee distintas cartas personales reales y literarias. Reflexiona sobre las características y funciones de las cartas personales enviadas por correo postal y electrónico."),
            (6, "Lee distintas cartas personales reales y literarias y analiza sus características. Discute sobre las similitudes y diferencias.")
        ]),
        # SABERES Y PENSAMIENTO CIENTÍFICO (FASE 5)
        (2, 5, "Estructura y funcionamiento del cuerpo humano: sistemas circulatorio, respiratorio e inmunológico.", [
            (5, "Indaga, describe y representa con modelos, la función general del corazón y los vasos sanguíneos (arterias y venas)."),
            (6, "Explica la participación del sistema inmunológico en la defensa y protección del cuerpo humano ante infecciones y enfermedades.")
        ]),
        (2, 5, "Etapas del desarrollo humano: proceso de reproducción y prevención de ITS y embarazos.", [
            (5, "Describe a la infancia, adolescencia, madurez y vejez como parte del desarrollo humano, así como las características, necesidades, responsabilidades."),
            (6, "Analiza y argumenta las implicaciones y riesgos del embarazo en adolescentes, y las consecuencias en el ámbito de la salud, social, económico.")
        ]),
        (2, 5, "Alimentación saludable: características de la dieta correcta, costumbres de la comunidad.", [
            (5, "Explica las características de la dieta correcta: variada, completa, equilibrada, inocua, suficiente, y las contrasta con sus hábitos de alimentación."),
            (6, "Establece relaciones entre problemas asociados a la alimentación: sobrepeso, obesidad y desnutrición con factores de riesgo como consumo de alimentos y bebidas ultraprocesadas.")
        ]),
        (2, 5, "Funciones vitales que caracterizan a plantas y animales como seres vivos.", [
            (5, "Explica la reproducción en plantas por semillas, tallos, hojas, raíces y su interacción con otros seres vivos y el entorno natural."),
            (6, "Indaga y explica cambios en los seres vivos y en el entorno natural a través del tiempo, a partir de reconocer causas y consecuencias de su extinción.")
        ]),
        (2, 5, "Factores que conforman la biodiversidad y el medio ambiente.", [
            (5, "Comprende que la biodiversidad es la cantidad y variedad de ecosistemas y de seres vivos (animales, plantas, hongos y bacterias)."),
            (6, "Comprende que el medio ambiente es el conjunto de componentes naturales en interacción con los componentes sociales.")
        ]),
        (2, 5, "Pérdida de biodiversidad, problemas medio ambientales en la comunidad, México y el mundo.", [
            (5, "Analiza y explica el impacto de las actividades humanas en la biodiversidad, en particular sobre la variedad y cantidad de seres vivos."),
            (6, "Analiza y explica algunos problemas medio ambientales de la comunidad, México y el mundo, sus causas y consecuencias en la salud ambiental.")
        ]),
        (2, 5, "Costos y beneficios del consumo de agua, energía eléctrica y combustibles.", [
            (5, "Indaga y analiza la cantidad de agua que se consume en diversas actividades en la casa, compara su consumo diario."),
            (6, "Identifica los combustibles: madera, petróleo, carbón, gas, que se emplean en el ámbito familiar para satisfacer sus necesidades.")
        ]),
        (2, 5, "Propiedades de los materiales: dureza, flexibilidad y permeabilidad.", [
            (5, "Experimenta con diversos materiales las propiedades de dureza, flexibilidad y permeabilidad."),
            (6, "Comprende que el aire es un gas, a partir de describir sus características: color, olor, sabor y si se puede comprimir.")
        ]),
        (2, 5, "Estudio de los números.", [
            (5, "Expresa oralmente la sucesión numérica hasta seis cifras, en español y hasta donde sea posible, en su lengua materna."),
            (6, "Expresa oralmente la sucesión numérica hasta billones, en español y hasta donde sea posible, en su lengua materna.")
        ]),
        (2, 5, "Suma y resta, su relación como operaciones inversas.", [
            (5, "A partir de situaciones problemáticas vinculadas a diferentes contextos, suma y resta números decimales y fracciones con diferentes denominadores."),
            (6, "A partir de situaciones problemáticas vinculadas a diferentes contextos, suma y resta números decimales y fracciones con diferentes denominadores.")
        ]),
        (2, 5, "Multiplicación y división, su relación como operaciones inversas.", [
            (5, "Resuelve situaciones problemáticas vinculadas a diferentes contextos que implican multiplicar números fraccionarios y números decimales, con un número natural como multiplicador."),
            (6, "Resuelve situaciones problemáticas vinculadas a diferentes contextos que implican dividir números decimales entre naturales.")
        ]),
        (2, 5, "Proporcionalidad.", [
            (5, "A partir de situaciones problemáticas de proporcionalidad vinculadas a diferentes contextos, determina valores faltantes a partir de diferentes estrategias."),
            (6, "A partir de situaciones problemáticas de proporcionalidad vinculadas a diferentes contextos, determina valores faltantes en las que en ocasiones se conoce el valor unitario y en otras no.")
        ]),
        # ÉTICA, NATURALEZA Y SOCIEDADES (FASE 5)
        (3, 5, "Valoración de la biodiversidad: Biodiversidad en la localidad, entidad, México y el mundo.", [
            (5, "Comprende la biodiversidad, su función como elemento vital en la Tierra y en el equilibrio de la biosfera."),
            (6, "Comprende la biodiversidad en la Tierra, su sistema de relaciones e interdependencia global.")
        ]),
        (3, 5, "Sustentabilidad de la biodiversidad y humanismo.", [
            (5, "Analiza críticamente estilos de vida y modelos de desarrollo dominantes en las sociedades del Mundo y de México a través del tiempo."),
            (6, "Valora las causas y los factores sociales que impactan en la problemática ambiental, en la salud de los ecosistemas, en los seres humanos.")
        ]),
        (3, 5, "Ética y biodiversidad: Factores sociales que propician la convivencia armónica.", [
            (5, "Dialoga acerca de los valores que necesitamos promover para conservar y proteger a la biodiversidad."),
            (6, "Valorar la importancia del respeto y la colaboración en el cuidado y aprovechamiento sustentable de la biodiversidad.")
        ]),
        (3, 5, "Derechos humanos: a un ambiente sano y Acceso al agua potable.", [
            (5, "Dialoga acerca del derecho humano a un ambiente sano y adecuado para su desarrollo y bienestar."),
            (6, "Indaga, comprende y dialoga sobre la importancia del agua y su balance con otros elementos del ecosistema global.")
        ]),
        (3, 5, "Responsabilidad compartida, respeto y consumo sustentable.", [
            (5, "Comprende el largo camino que recorren los productos para llegar a sus hogares, los medios que se utilizan para imponer patrones de consumo."),
            (6, "Investiga acciones de consumo sustentable del agua y la biodiversidad, para contribuir a mitigar el impacto negativo.")
        ]),
        (3, 5, "Riesgos de desastre y crisis humanitarias.", [
            (5, "Comprende que los desastres no son naturales, sino eventos repentinos que ocasionan daños materiales, humanos y sociales."),
            (6, "Investiga en noticias, lecturas o narraciones, desastres ocurridos en México y otros países del mundo.")
        ]),
        (3, 5, "Construcción de la cultura de paz: análisis de conflictos vecinales.", [
            (5, "Indaga en fuentes orales, escritas o digitales acerca de conflictos vecinales entre personas y/o grupos de su comunidad."),
            (6, "Analiza críticamente algunos ejemplos de conflictos territoriales en México en el pasado o el presente.")
        ]),
        (3, 5, "La democracia como forma de gobierno en México.", [
            (5, "Indaga acerca de las transformaciones en las formas de gobierno de nuestro país, durante el siglo XIX."),
            (6, "Analiza críticamente las transformaciones en la forma de gobierno en México durante el siglo XX.")
        ]),
        # DE LO HUMANO Y LO COMUNITARIO (FASE 5)
        (4, 5, "La comunidad, como espacio para el aprendizaje y el bienestar común.", [
            (5, "Argumenta la pertinencia y vigencia de las ideas, conocimientos y prácticas culturales de su comunidad, para valorar sus beneficios."),
            (6, "Profundiza acerca de ideas, conocimientos y prácticas culturales, para proponer alternativas orientadas a promover, preservar y difundir para el bien común.")
        ]),
        (4, 5, "Formas de ser, pensar, actuar y relacionarse.", [
            (5, "Reflexiona acerca de las formas de ser, pensar, actuar y relacionarse que tienen las personas y los factores que las originan."),
            (6, "Valora sus experiencias acerca de las formas de ser, pensar, actuar y relacionarse en determinadas situaciones.")
        ]),
        (4, 5, "Construcción del proyecto de vida.", [
            (5, "Replantea las formas de satisfacer las necesidades e intereses, para promover la autodeterminación orientada al cumplimiento de metas."),
            (6, "Valora logros y cambios en gustos, necesidades, intereses y habilidades actuales, para reestructurar metas que favorezcan el desarrollo personal y social.")
        ]),
        (4, 5, "Educación integral de la sexualidad.", [
            (5, "Intercambia experiencias acerca de sensaciones de placer o displacer que se presentan en la interacción."),
            (6, "Reflexiona sobre sus acciones, decisiones e implicaciones en la interacción, para valorar placeres y displaceres.")
        ]),
        (4, 5, "Equidad de género.", [
            (5, "Reflexiona sobre situaciones asociadas con la diversidad de identidades y género, para proponer acciones en contra de la discriminación."),
            (6, "Analiza situaciones de discriminación por identidad o género en la escuela, la comunidad y otros ámbitos.")
        ]),
        (4, 5, "Capacidades y habilidades motrices.", [
            (5, "Reconoce posibilidades y límites al participar en situaciones de juego e iniciación deportiva, individuales y colectivas."),
            (6, "Aplica sus capacidades, habilidades y destrezas motrices al organizar y participar en situaciones de juego e iniciación deportiva.")
        ]),
        (4, 5, "Estilos de vida activos y saludables.", [
            (5, "Plantea alternativas de actividades físicas que puede practicar dentro y fuera de la escuela."),
            (6, "Evalúa los factores que limitan la práctica constante de actividades físicas, para implementar opciones que permitan superarlos.")
        ]),
        (4, 5, "Pensamiento lúdico, divergente y creativo.", [
            (5, "Planifica e implementa estrategias ante situaciones de juego y cotidianas."),
            (6, "Emplea el pensamiento estratégico y divergente ante situaciones de juego o cotidianas.")
        ]),
        (4, 5, "Interacción motriz.", [
            (5, "Promueve ambientes de participación en situaciones de juego, iniciación deportiva y cotidianas."),
            (6, "Organiza e implementa situaciones de juego e iniciación deportiva, para favorecer la convivencia en la escuela y la comunidad.")
        ]),
        (4, 5, "Acciones individuales que repercuten en la conservación y mejora de la salud.", [
            (5, "Construye alternativas saludables y sostenibles asociadas con hábitos de higiene personal y limpieza de los espacios."),
            (6, "Promueve alternativas de hábitos de higiene personal y limpieza de los espacios en la comunidad.")
        ]),
        (4, 5, "Sentido de comunidad y satisfacción de necesidades humanas.", [
            (5, "Argumenta acerca de la pertinencia de ideas, conocimientos y prácticas culturales de la comunidad."),
            (6, "Diseña alternativas que contribuyen a afrontar cambios situaciones de riesgo relacionadas con accidentes, adicciones y violencia.")
        ]),
        (4, 5, "Toma de decisiones y creatividad, ante problemas de la vida.", [
            (5, "Describe los problemas que se presentan en su vida, para reflexionar sobre posibles soluciones."),
            (6, "Describe los problemas de vida que ha enfrentado para reflexionar sobre la resolución con base en el juicio crítico.")
        ])
    ]

    print(f"⏳ Insertando Contenidos y PDAs de forma masiva ({len(datos)} bloques)...")
    
    count_pdas = 0
    for campo_id, fase_id, desc_contenido, lista_pdas in datos:
        cursor.execute("INSERT INTO contenidos (campo_id, fase_id, descripcion) VALUES (?, ?, ?)", (campo_id, fase_id, desc_contenido))
        contenido_id = cursor.lastrowid
        
        for grado, desc_pda in lista_pdas:
            cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion, estado) VALUES (?, ?, ?, ?)", (contenido_id, grado, desc_pda, 'Pendiente'))
            count_pdas += 1

    conn.commit()
    conn.close()
    print(f"✅ ¡BASE DE DATOS ACTUALIZADA EXITOSAMENTE en: {DB_NAME}!")
    print(f"   --> Total de PDAs insertados: {count_pdas}")

if __name__ == "__main__":
    sembrar_base_datos_completa()