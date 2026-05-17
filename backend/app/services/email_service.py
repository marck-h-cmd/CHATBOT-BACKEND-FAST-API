class EmailService:
    @staticmethod
    async def enviar_email(destinatario: str, asunto: str, contenido: str) -> bool:
        """
        Simula el envío de un email imprimiéndolo en la terminal (según decisión del usuario).
        En un entorno de producción real, aquí se usaría smtplib o un proveedor como SendGrid.
        """
        print("\n" + "="*50)
        print("📧 SIMULACIÓN DE ENVÍO DE EMAIL 📧")
        print("="*50)
        print(f"PARA:    {destinatario}")
        print(f"ASUNTO:  {asunto}")
        print("-" * 50)
        print("CONTENIDO:")
        print(contenido)
        print("="*50 + "\n")
        
        return True
