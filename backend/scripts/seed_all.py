import subprocess
import sys
import os

def run_script(script_path):
    script_name = os.path.basename(script_path)
    print(f"\n{'='*50}")
    print(f"  Ejecutando: {script_name}")
    print(f"{'='*50}")

    result = subprocess.run([sys.executable, script_path], capture_output=False)

    if result.returncode != 0:
        print(f"  ❌ Error en {script_name}")
        return False

    print(f"  ✅ {script_name} OK")
    return True

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    scripts = [
        "init_db.py",      # Crear tablas
        "seed_periods.py", # Periodos académicos
        "seed_courses.py", # Catálogo de cursos
        "seed_admin.py",   # Usuario administrador
    ]

    print("🌱 Seed inicial - Solo datos estructurales del sistema")
    print("   (No incluye: estudiantes, sílabos, inscripciones, incidentes)")

    for script in scripts:
        script_full_path = os.path.join(base_dir, script)
        if not run_script(script_full_path):
            print("\n🚨 Seed interrumpido por errores.")
            sys.exit(1)

    print("\n" + "="*50)
    print("  ✅ Seed completado exitosamente.")
    print("="*50)
    print("\n  Credenciales de acceso:")
    print("    Email:    admin@unitru.edu.pe")
    print("    Password: admin123")
    print("\n  Nota: Registra estudiantes manualmente desde el panel.")

if __name__ == "__main__":
    main()
