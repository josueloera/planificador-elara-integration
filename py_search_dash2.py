with open(r"C:\Users\USER\Desktop\App - Planificador Docente\planificador pda\app\src\components\DashboardGrupos.jsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "[1,2,3,4,5,6]" in line.replace(" ", "") or "1,2,3,4,5,6" in line.replace(" ", ""):
        print(f"Line {i+1}: {line.strip()}")
