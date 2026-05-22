import os

for k, v in os.environ.items():
    chars = [(i, c, ord(c)) for i, c in enumerate(v) if ord(c) > 127]
    if chars:
        print('KEY:', k)
        print('VALUE:', v)
        print('NON-ASCII:', chars)
        print('UTF8 BYTES:', [hex(b) for b in v.encode('utf-8')])
        print('LATIN1 BYTES:', [hex(b) for b in v.encode('latin-1', errors='replace')])
        print('---')
