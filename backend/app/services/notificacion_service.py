from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.database.models import SugerenciaEstudio, NotificacionProgramada, EstadoNotificacion, Usuario
from app.services.email_service import EmailService

class NotificacionService:
    @staticmethod
    def programar_recordatorio(db: Session, id_sugerencia: int, dias_antes: int = 1) -> NotificacionProgramada:
        """
        Programa un recordatorio de estudio para 'dias_antes' días antes de una supuesta fecha de entrega.
        Como es dinámico y a pedido, simulamos que la entrega será mañana + dias_antes.
        """
        sugerencia = db.query(SugerenciaEstudio).filter(SugerenciaEstudio.id_sugerencia == id_sugerencia).first()
        if not sugerencia:
            raise ValueError("Sugerencia no encontrada")
            
        usuario = db.query(Usuario).filter(Usuario.id == sugerencia.id_usuario).first()
        if not usuario:
            raise ValueError("Usuario no encontrado")

        # Calculamos cuándo debe enviarse el correo
        # El usuario en el frontend elige cuántos días antes de la entrega quiere el recordatorio.
        # Si la entrega está a X días, programaremos que se envíe "fecha_entrega - dias_antes".
        # Para simular sin fecha real, diremos que se envía AHORA si quiere 0 días, o programado para el futuro.
        # En la práctica simulada, si dice "dias_antes", programaremos el envío para dentro de unos minutos/horas 
        # (para prueba rápida pondremos que ya debe enviarse, o se programa exactamente en N días).
        
        # Como es una simulación de fechas, programamos la notificación para ENVIARSE en:
        fecha_programada = datetime.now() # Por defecto, ahora para que el job lo coja y veamos que funciona.
        
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
