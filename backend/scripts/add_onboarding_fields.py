#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import engine
from sqlalchemy import text

SQL = text('''
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS onboarding_skipped boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS onboarding_version integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS onboarding_updated_at timestamp NULL;
''')

def run():
    print('🔧 Aplicando migración: onboarding fields')
    with engine.connect() as conn:
        try:
            conn.execute(SQL)
            conn.commit()
            print('✅ Columnas de onboarding añadidas (si no existían)')
        except Exception as e:
            print('❌ Error aplicando migración:', e)

if __name__ == '__main__':
    run()
