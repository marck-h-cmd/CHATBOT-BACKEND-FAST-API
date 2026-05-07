import logging
import sys
from datetime import datetime

def setup_logger(name: str = "chatbot") -> logging.Logger:
    """Configura y retorna un logger"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Handler para consola
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    
    # Formato
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    if not logger.handlers:
        logger.addHandler(handler)
    
    return logger

def get_logger(name: str = "chatbot") -> logging.Logger:
    return setup_logger(name)