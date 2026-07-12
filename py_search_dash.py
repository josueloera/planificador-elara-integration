with open(r"C:\Users\USER\Desktop\App - Planificador Docente\planificador pda\app\src\components\DashboardGrupos.jsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "onSelectGrupo" in line or "grupo" in line or "disciplinas" in line:
        print(f"Line {i+1}: {line.strip()}")
