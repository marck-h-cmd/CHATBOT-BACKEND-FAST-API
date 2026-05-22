import os

for k, v in os.environ.items():
    try:
        b = v.encode('latin-1')
    except Exception:
        continue
    if 0xf3 in b:
        print('KEY', k)
        print('VALUE', v)
        print('BYTES', [hex(x) for x in b if x == 0xf3])
        print('POS', [i for i, x in enumerate(b) if x == 0xf3])
        print('---')
