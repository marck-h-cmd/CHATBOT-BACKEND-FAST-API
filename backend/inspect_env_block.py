import ctypes
import ctypes.wintypes as wintypes

GetEnvironmentStringsW = ctypes.windll.kernel32.GetEnvironmentStringsW
FreeEnvironmentStringsW = ctypes.windll.kernel32.FreeEnvironmentStringsW
GetEnvironmentStringsW.restype = ctypes.c_void_p

block = GetEnvironmentStringsW()
if not block:
    raise OSError('GetEnvironmentStringsW failed')

try:
    ptr = ctypes.cast(block, ctypes.POINTER(ctypes.c_wchar))
    i = 0
    entries = []
    current = []
    while True:
        ch = ptr[i]
        if ch == '\x00':
            if current:
                entries.append(''.join(current))
                current = []
            else:
                break
        else:
            current.append(ch)
        i += 1
    print('Total entries:', len(entries))
    for p in entries:
        if any(ord(c) > 127 for c in p):
            print('KEY/VALUE:', p)
            print('UTF8 bytes:', [hex(b) for b in p.encode('utf-8')])
            print('CP1252 bytes:', [hex(b) for b in p.encode('cp1252', errors="replace")])
            print('---')
finally:
    FreeEnvironmentStringsW(block)
