import pandas as pd

excel_file = r"C:\Users\USER\Desktop\SIGEPA FASE 6.xlsm.xlsx"

try:
    print(f"Abriendo {excel_file}...")
    df = pd.read_excel(excel_file, sheet_name='Contenidos')
    
    if 'GRADO' in df.columns:
        print("\nValores únicos en GRADO:")
        print(df['GRADO'].dropna().unique())
        print("\nConteo de registros por GRADO:")
        print(df['GRADO'].value_counts())
        
    if 'GRADO.1' in df.columns:
        print("\nValores únicos en GRADO.1:")
        print(df['GRADO.1'].dropna().unique())
        print("\nConteo de registros por GRADO.1:")
        print(df['GRADO.1'].value_counts())
        
    if 'GRADOS' in df.columns:
        print("\nConteo de registros por GRADOS:")
        print(df['GRADOS'].value_counts())

except Exception as e:
    print(f"Error: {e}")
