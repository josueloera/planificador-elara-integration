with open(r"C:\Users\USER\Desktop\App - Planificador Docente\planificador pda\app\src\App.jsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "get-alumnos" in line or "get-proyectos" in line or "get-planeacion" in line or "get-criterios" in line:
        print(f"Line {i+1}: {line.strip()}")
