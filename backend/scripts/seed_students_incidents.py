"""
Seeder para crear múltiples estudiantes, asignarles cursos existentes y generar incidencias de servicio en el sílabo oficial.
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import (
    Usuario, RolUsuario, Curso, PeriodoAcademico, Silabo, 
    ContextoCursoUsuario, OrigenContexto, EstadoVerificacion,
    IncidenteServicio, TipoIncidenteServicio, EstadoIncidente
)
from app.core.security import SecurityService

ESTUDIANTES = [
    # Ciclo I
    {"nombres": "Juan Carlos", "apellidos": "Pérez Morales", "email": "jperez@unitru.edu.pe", "codigo_universitario": "102938471", "password": "estudiante123", "ciclo": "I", "notas": {"pu1": 11.5, "pu2": 10.0, "pu3": 12.0, "asistencia": 0.82}},
    {"nombres": "Luis Alberto", "apellidos": "Sánchez Díaz", "email": "lsanchez@unitru.edu.pe", "codigo_universitario": "102938475", "password": "estudiante123", "ciclo": "I", "notas": {"pu1": 14.0, "pu2": 15.0, "pu3": 13.5, "asistencia": 0.90}},
    # Ciclo II
    {"nombres": "María Fernanda", "apellidos": "Gómez Vargas", "email": "mgomez@unitru.edu.pe", "codigo_universitario": "102938472", "password": "estudiante123", "ciclo": "II", "notas": {"pu1": 15.0, "pu2": 16.5, "pu3": 14.0, "asistencia": 0.95}},
    {"nombres": "Claudia Sofía", "apellidos": "Ramos Peña", "email": "cramos@unitru.edu.pe", "codigo_universitario": "102938476", "password": "estudiante123", "ciclo": "II", "notas": {"pu1": 12.0, "pu2": 11.5, "pu3": 14.0, "asistencia": 0.85}},
    # Ciclo III
    {"nombres": "Carlos Alberto", "apellidos": "Mendoza Rojas", "email": "cmendoza@unitru.edu.pe", "codigo_universitario": "102938473", "password": "estudiante123", "ciclo": "III", "notas": {"pu1": 09.5, "pu2": 10.5, "pu3": 11.0, "asistencia": 0.75}},
    {"nombres": "Jorge Luis", "apellidos": "Castro Silva", "email": "jcastro@unitru.edu.pe", "codigo_universitario": "102938477", "password": "estudiante123", "ciclo": "III", "notas": {"pu1": 16.0, "pu2": 17.0, "pu3": 16.5, "asistencia": 0.98}},
    # Ciclo IV
    {"nombres": "Ana Lucía", "apellidos": "Torres Ríos", "email": "atorres@unitru.edu.pe", "codigo_universitario": "102938474", "password": "estudiante123", "ciclo": "IV", "notas": {"pu1": 13.0, "pu2": 14.0, "pu3": 15.5, "asistencia": 0.88}},
    {"nombres": "Elena Beatriz", "apellidos": "Navarro Cruz", "email": "enavarro@unitru.edu.pe", "codigo_universitario": "102938478", "password": "estudiante123", "ciclo": "IV", "notas": {"pu1": 10.0, "pu2": 11.0, "pu3": 12.5, "asistencia": 0.80}},
    # Ciclo V
    {"nombres": "Pedro Pablo", "apellidos": "Quispe Mamani", "email": "pquispe@unitru.edu.pe", "codigo_universitario": "102938479", "password": "estudiante123", "ciclo": "V", "notas": {"pu1": 14.5, "pu2": 13.0, "pu3": 15.0, "asistencia": 0.92}},
    {"nombres": "Rosa María", "apellidos": "Flores Alba", "email": "rflores@unitru.edu.pe", "codigo_universitario": "102938480", "password": "estudiante123", "ciclo": "V", "notas": {"pu1": 11.0, "pu2": 12.5, "pu3": 10.5, "asistencia": 0.78}},
    # Ciclo VI
    {"nombres": "Miguel Ángel", "apellidos": "Salazar Vega", "email": "msalazar@unitru.edu.pe", "codigo_universitario": "102938481", "password": "estudiante123", "ciclo": "VI", "notas": {"pu1": 08.5, "pu2": 09.5, "pu3": 10.0, "asistencia": 0.72}},
    {"nombres": "Silvia Lorena", "apellidos": "Paredes Soto", "email": "sparedes@unitru.edu.pe", "codigo_universitario": "102938482", "password": "estudiante123", "ciclo": "VI", "notas": {"pu1": 15.5, "pu2": 16.0, "pu3": 17.0, "asistencia": 0.96}},
    # Ciclo VII
    {"nombres": "Fernando José", "apellidos": "Chávez Luna", "email": "fchavez@unitru.edu.pe", "codigo_universitario": "102938483", "password": "estudiante123", "ciclo": "VII", "notas": {"pu1": 13.5, "pu2": 12.0, "pu3": 14.0, "asistencia": 0.85}},
    {"nombres": "Patricia Inés", "apellidos": "Campos Vaca", "email": "pcampos@unitru.edu.pe", "codigo_universitario": "102938484", "password": "estudiante123", "ciclo": "VII", "notas": {"pu1": 17.0, "pu2": 18.0, "pu3": 17.5, "asistencia": 1.0}},
    {"nombres": "Raúl Eduardo", "apellidos": "Montoya Pinedo", "email": "rmontoya@unitru.edu.pe", "codigo_universitario": "102938485", "password": "estudiante123", "ciclo": "VII", "notas": {"pu1": 10.5, "pu2": 09.0, "pu3": 11.5, "asistencia": 0.76}},
    # Ciclo VIII
    {"nombres": "Gabriela Paz", "apellidos": "Aguilar Ortiz", "email": "gaguilar@unitru.edu.pe", "codigo_universitario": "102938486", "password": "estudiante123", "ciclo": "VIII", "notas": {"pu1": 14.0, "pu2": 15.5, "pu3": 16.0, "asistencia": 0.91}},
    {"nombres": "Víctor Manuel", "apellidos": "Reyes León", "email": "vreyes@unitru.edu.pe", "codigo_universitario": "102938487", "password": "estudiante123", "ciclo": "VIII", "notas": {"pu1": 11.0, "pu2": 10.5, "pu3": 12.0, "asistencia": 0.84}},
    {"nombres": "Diana Carolina", "apellidos": "Herrera Paz", "email": "dherrera@unitru.edu.pe", "codigo_universitario": "102938488", "password": "estudiante123", "ciclo": "VIII", "notas": {"pu1": 16.5, "pu2": 17.0, "pu3": 18.0, "asistencia": 0.97}},
    # Ciclo IX
    {"nombres": "Hugo Enrique", "apellidos": "Mejía Cárdenas", "email": "hmejia@unitru.edu.pe", "codigo_universitario": "102938489", "password": "estudiante123", "ciclo": "IX", "notas": {"pu1": 12.5, "pu2": 13.5, "pu3": 14.0, "asistencia": 0.87}},
    {"nombres": "Teresa de Jesús", "apellidos": "Sosa Bermejo", "email": "tsosa@unitru.edu.pe", "codigo_universitario": "102938490", "password": "estudiante123", "ciclo": "IX", "notas": {"pu1": 09.0, "pu2": 10.0, "pu3": 10.5, "asistencia": 0.74}},
    # Ciclo X
    {"nombres": "Manuel Alejandro", "apellidos": "Cordero Gil", "email": "mcordero@unitru.edu.pe", "codigo_universitario": "102938491", "password": "estudiante123", "ciclo": "X", "notas": {"pu1": 15.0, "pu2": 14.5, "pu3": 16.0, "asistencia": 0.93}},
    {"nombres": "Lucía Antonella", "apellidos": "Pinto Soria", "email": "lpinto@unitru.edu.pe", "codigo_universitario": "102938492", "password": "estudiante123", "ciclo": "X", "notas": {"pu1": 13.0, "pu2": 12.5, "pu3": 14.0, "asistencia": 0.86}}
]

def seed_all():
    db: Session = next(get_db())
    try:
        print("--- INICIANDO SEEDER DE ESTUDIANTES E INCIDENTES ---")
        
        # 1. Obtener Periodo, Cursos y Sílabo existentes
        periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.es_actual == True).first()
        if not periodo:
            periodo = db.query(PeriodoAcademico).first()
            
        cursos = db.query(Curso).all()
        silabo = db.query(Silabo).first()
        
        if not cursos:
            print("[ERROR] No se encontraron cursos en la base de datos. Ejecute seed_courses.py primero.")
            return
            
        if not periodo:
            print("[ERROR] No se encontró ningún periodo académico. Ejecute seed_periods.py primero.")
            return

        print(f"[INFO] Periodo activo: {periodo.nombre}")
        print(f"[INFO] Cursos disponibles: {len(cursos)}")
        if silabo:
            print(f"[INFO] Sílabo principal detectado: ID {silabo.id_silabo}")

        # 2. Poblar Estudiantes y Contextos
        estudiantes_creados = []
        for est_data in ESTUDIANTES:
            estudiante = db.query(Usuario).filter(Usuario.email == est_data["email"]).first()
            if not estudiante:
                hashed_pw = SecurityService.hash_password(est_data["password"])
                estudiante = Usuario(
                    nombres=est_data["nombres"],
                    apellidos=est_data["apellidos"],
                    email=est_data["email"],
                    codigo_universitario=est_data["codigo_universitario"],
                    hashed_password=hashed_pw,
                    rol=RolUsuario.ESTUDIANTE,
                    es_activo=True,
                    email_verificado=True
                )
                db.add(estudiante)
                db.commit()
                db.refresh(estudiante)
                print(f"[EXITO] Estudiante creado: {estudiante.nombres} {estudiante.apellidos} ({estudiante.codigo_universitario}) - Ciclo {est_data['ciclo']}")
            else:
                print(f"[INFO] Estudiante ya existente: {estudiante.email} - Ciclo {est_data['ciclo']}")
            
            estudiantes_creados.append(estudiante)

            # Filtrar cursos por el ciclo referencial del estudiante
            cursos_ciclo = [c for c in cursos if c.ciclo_referencial == est_data["ciclo"]]
            
            for curso in cursos_ciclo:
                contexto = db.query(ContextoCursoUsuario).filter(
                    ContextoCursoUsuario.id_usuario == estudiante.id,
                    ContextoCursoUsuario.id_curso == curso.id_curso,
                    ContextoCursoUsuario.id_periodo == periodo.id_periodo
                ).first()
                
                if not contexto:
                    notas = est_data["notas"]
                    contexto = ContextoCursoUsuario(
                        id_usuario=estudiante.id,
                        id_curso=curso.id_curso,
                        id_periodo=periodo.id_periodo,
                        id_silabo_asignado=silabo.id_silabo if silabo else None,
                        origen_contexto=OrigenContexto.DECLARADO_USUARIO,
                        estado_verificacion=EstadoVerificacion.APROBADO if silabo else EstadoVerificacion.PENDIENTE_CONFIRMACION,
                        puntaje_confianza=0.95,
                        pu1=notas.get("pu1"),
                        pu2=notas.get("pu2"),
                        pu3=notas.get("pu3"),
                        asistencia=notas.get("asistencia")
                    )
                    db.add(contexto)
                    print(f"   -> Asignado al curso ({curso.ciclo_referencial}): {curso.nombre_curso}")
            
            db.commit()

        # 3. Crear Incidencia de Servicio para el Sílabo
        if silabo:
            incidente_existente = db.query(IncidenteServicio).filter(
                IncidenteServicio.id_silabo == silabo.id_silabo,
                IncidenteServicio.tipo_incidente == TipoIncidenteServicio.FORMULA_AMBIGUA,
                IncidenteServicio.estado == EstadoIncidente.ACTIVO
            ).first()
            
            if not incidente_existente:
                incidente = IncidenteServicio(
                    id_silabo=silabo.id_silabo,
                    tipo_incidente=TipoIncidenteServicio.FORMULA_AMBIGUA,
                    descripcion="Inconsistencia detectada en las formulas de evaluacion del silabo oficial: La sigla 'PU2' o 'TAD' no coincide con las evidencias declaradas en la tabla de evaluacion.",
                    metadata_incidente={"formula_detectada": "PU1 = 0.3*PRACTICAS + 0.7*EXAMEN", "error": "Falta declarar evidencia PRACTICAS"},
                    estado=EstadoIncidente.ACTIVO
                )
                db.add(incidente)
                db.commit()
                print(f"[ALERTA] Incidente de Servicio registrado para el silabo ID {silabo.id_silabo}")
            else:
                print(f"[INFO] El silabo ID {silabo.id_silabo} ya tiene un Incidente de Servicio activo.")
        else:
            print("[ADVERTENCIA] No se pudo registrar Incidente de Servicio porque no hay un Silabo en la base de datos.")

        print("\n[EXITO] ¡SEEDER COMPLETADO CON EXITO!")
        print(f"Total de estudiantes gestionados: {len(ESTUDIANTES)}")

    except Exception as e:
        print(f"[ERROR] Error durante el seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
