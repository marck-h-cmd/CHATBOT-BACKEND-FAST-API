import subprocess
import sys
import os
import time

def run_script(script_path):
    script_name = os.path.basename(script_path)
    print(f"\n--- Ejecutando {script_name} ---")
    
    # Asegurarnos de que el script se ejecute con el mismo intérprete de python
    result = subprocess.run([sys.executable, script_path], capture_output=False)
    
    if result.returncode != 0:
        print(f"❌ Error al ejecutar {script_name}")
        return False
    
    print(f"✅ {script_name} completado con éxito")
    return True

def main():
    # Obtener el directorio actual de este script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Lista de scripts en orden de ejecución
    scripts = [
        "init_db.py",
        "seed_periods.py",
        "seed_courses.py",
        "seed_official_silabo.py",
        "seed_admin.py",
        "seed_chunks.py"
    ]
    
    print("🌱 Iniciando proceso de siembra de base de datos (Seeding)...")
    
    for script in scripts:
        script_full_path = os.path.join(base_dir, script)
        if not run_script(script_full_path):
            print("\n🚨 Proceso de seeding interrumpido por errores.")
            sys.exit(1)
            
    print("\n✨ Proceso de seeding completado exitosamente.")

if __name__ == "__main__":
    main()
