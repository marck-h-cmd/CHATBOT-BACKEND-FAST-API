import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import Config


class EmailService:
    @staticmethod
    async def enviar_email(destinatario: str, asunto: str, contenido: str, html_contenido: str = None) -> bool:
        """
        Envía un email real usando SMTP configurado en variables de entorno.
        Si no hay configuración SMTP válida, cae a simulación por consola (modo desarrollo).
        """
        # Verificar si hay configuración SMTP válida
        smtp_user = Config.SMTP_USER
        smtp_password = Config.SMTP_PASSWORD
        smtp_from = Config.SMTP_FROM or smtp_user

        if not smtp_user or not smtp_password:
            # Modo desarrollo: simular por consola
            print("\n" + "="*50)
            print("📧 SIMULACIÓN DE ENVÍO DE EMAIL (SMTP no configurado)")
            print("="*50)
            print(f"PARA:    {destinatario}")
            print(f"ASUNTO:  {asunto}")
            print("-" * 50)
            print("CONTENIDO:")
            print(contenido)
            print("="*50 + "\n")
            return True

        # Modo producción: envío real vía SMTP
        try:
            msg = MIMEMultipart("alternative")
            msg['Subject'] = asunto
            msg['From'] = smtp_from
            msg['To'] = destinatario

            # Adjuntar contenido plain text
            msg.attach(MIMEText(contenido, 'plain', 'utf-8'))

            # Adjuntar HTML si se proporciona
            if html_contenido:
                msg.attach(MIMEText(html_contenido, 'html', 'utf-8'))

            server = smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT)
            if Config.SMTP_USE_TLS:
                server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, [destinatario], msg.as_string())
            server.quit()
            return True
        except Exception as e:
            print(f"Error al enviar correo real: {e}")
            return False

    @staticmethod
    async def enviar_email_verificacion_otp(destinatario: str, nombres: str, codigo_otp: str) -> bool:
        """
        Envía el código OTP de verificación de email con formato institucional.
        """
        asunto = "Sylia AI - Código de verificación de cuenta"

        contenido_texto = f"""Hola {nombres},

Gracias por registrarte en Sylia AI, tu asistente académico inteligente de la UNT.

Tu código de verificación es: {codigo_otp}

Este código es válido por 10 minutos. Por favor, ingrésalo en la aplicación para activar tu cuenta.

Si no solicitaste este código, ignora este mensaje.

Atentamente,
Equipo Sylia AI
UNT • Ingeniería de Sistemas
"""

        contenido_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verificación de cuenta - Sylia AI</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding:40px 0;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <tr>
                        <td style="background:#0B0F19;padding:32px 40px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Sylia AI</h1>
                            <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">Verificación de cuenta institucional</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="color:#0f172a;margin:0 0 16px;font-size:18px;font-weight:600;">Hola, {nombres}</h2>
                            <p style="color:#475569;margin:0 0 24px;font-size:14px;line-height:1.6;">
                                Gracias por registrarte en <strong>Sylia AI</strong>. Para completar tu registro y activar tu cuenta, ingresa el siguiente código de verificación de 6 dígitos en la aplicación:
                            </p>
                            <div style="text-align:center;margin:32px 0;">
                                <div style="display:inline-block;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:20px 40px;">
                                    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0B0F19;font-family:'Courier New',monospace;">{codigo_otp}</span>
                                </div>
                            </div>
                            <p style="color:#64748b;margin:0 0 8px;font-size:13px;text-align:center;">
                                Este código expira en <strong>10 minutos</strong>.
                            </p>
                            <p style="color:#94a3b8;margin:24px 0 0;font-size:12px;text-align:center;">
                                Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="color:#94a3b8;margin:0;font-size:11px;">
                                UNT • Ingeniería de Sistemas &copy; {datetime.now().year}<br>
                                <span style="color:#cbd5e1;">Este es un mensaje automático, por favor no respondas.</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

        return await EmailService.enviar_email(
            destinatario=destinatario,
            asunto=asunto,
            contenido=contenido_texto,
            html_contenido=contenido_html
        )
