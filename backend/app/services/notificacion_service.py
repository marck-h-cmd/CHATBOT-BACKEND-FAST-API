from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.database.models import SugerenciaEstudio, NotificacionProgramada, EstadoNotificacion, Usuario
from app.services.email_service import EmailService

class NotificacionService:
    @staticmethod
    def programar_recordatorio(db: Session, id_sugerencia: int, fecha_programada: datetime) -> NotificacionProgramada:
        """
        Programa un recordatorio de estudio para la fecha y hora indicadas por el usuario.
        """
        sugerencia = db.query(SugerenciaEstudio).filter(SugerenciaEstudio.id_sugerencia == id_sugerencia).first()
        if not sugerencia:
            raise ValueError("Sugerencia no encontrada")
            
        usuario = db.query(Usuario).filter(Usuario.id == sugerencia.id_usuario).first()
        if not usuario:
            raise ValueError("Usuario no encontrado")

        # Asignamos la fecha elegida por el usuario
        # fecha_programada ya viene calculada/asignada desde el endpoint
        
        asunto = f"📚 Recordatorio de estudio: {sugerencia.tema_o_evidencia}"
        
        nombre_usuario = usuario.nombres.split(" ")[0] if usuario.nombres else "Estudiante"
        
        contenido = f"""Hola {nombre_usuario},

Este es un recordatorio de que planeaste estudiar {sugerencia.horas_sugeridas} horas para tu evidencia o tema: '{sugerencia.tema_o_evidencia}'.

Justificación de la sugerencia:
{sugerencia.justificacion}

¿Ya empezaste? ¡Tú puedes!

Saludos,
Tu asistente de estudio Sylia
"""
        
        notificacion = NotificacionProgramada(
            id_sugerencia=sugerencia.id_sugerencia,
            id_usuario=usuario.id,
            destinatario=usuario.email,
            asunto=asunto,
            contenido=contenido,
            fecha_programada=fecha_programada,
            estado=EstadoNotificacion.PENDIENTE
        )
        
        db.add(notificacion)
        db.commit()
        db.refresh(notificacion)
        
        return notificacion

    @staticmethod
    async def procesar_pendientes(db: Session) -> int:
        """
        Busca notificaciones PENDIENTES cuya fecha_programada <= now() y las envía.
        Retorna la cantidad de emails enviados.
        """
        now = datetime.now()
        pendientes = db.query(NotificacionProgramada).filter(
            NotificacionProgramada.estado == EstadoNotificacion.PENDIENTE,
            NotificacionProgramada.fecha_programada <= now
        ).all()
        
        enviados = 0
        for notif in pendientes:
            exito = await EmailService.enviar_email(
                destinatario=notif.destinatario,
                asunto=notif.asunto,
                contenido=notif.contenido
            )
            
            if exito:
                notif.estado = EstadoNotificacion.ENVIADO
                notif.fecha_envio = datetime.now()
                enviados += 1
            else:
                notif.estado = EstadoNotificacion.FALLIDO
                
        if enviados > 0:
            db.commit()
            
        return enviados
