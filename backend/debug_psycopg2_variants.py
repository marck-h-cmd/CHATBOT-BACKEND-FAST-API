import traceback
from app.config import Config
import psycopg2

cases = [
    ('kw_args', dict(dbname='chatbot_academico', user='chatbot_user', password='chatbot_password', host='127.0.0.1', port=5432)),
    ('dsn_str', dict(dsn='host=127.0.0.1 dbname=chatbot_academico user=chatbot_user password=chatbot_password')),
    ('dsn_bytes', dict(dsn=b'host=127.0.0.1 dbname=chatbot_academico user=chatbot_user password=chatbot_password')),
]

for name, kwargs in cases:
    print('---', name)
    try:
        conn = psycopg2.connect(**kwargs)
        print('connected', name)
        conn.close()
    except Exception:
        traceback.print_exc()
