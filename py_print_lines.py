with open(r"C:\Users\USER\Desktop\App - Planificador Docente\planificador pda\app\src\components\DashboardGrupos.jsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(135, 150):
    print(f"Line {i+1}: {lines[i].strip()}")
