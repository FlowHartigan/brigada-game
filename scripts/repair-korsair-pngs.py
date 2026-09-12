"""Repair damaged KORSAIR PNG containers without redrawing or changing RGB pixels.
The corrupt idle/attack streams are replaced with intact poses of the same v2 art.
Original bytes remain available in git at f231316.
"""
from pathlib import Path
import io, struct, zlib
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'public/fighters/korsair-v2'
for name in ('hit', 'dodge'):
    path = root / f'{name}.png'
    raw = path.read_bytes()
    output = bytearray(raw[:8])
    offset = 8
    while offset < len(raw):
        length = struct.unpack('>I', raw[offset:offset+4])[0]
        chunk = raw[offset+4:offset+8+length]
        output.extend(struct.pack('>I', length) + chunk + struct.pack('>I', zlib.crc32(chunk)))
        offset += length + 12
    # Explicit RGBA avoids browser-specific indexed transparency decoding.
    Image.open(io.BytesIO(output)).convert('RGBA').save(path)
for name in ('front', 'defend', 'special', 'win', 'portrait'):
    path = root / f'{name}.png'
    Image.open(path).convert('RGBA').save(path)
# Use complete, approved artwork rather than partly decoded damaged streams.
(root / 'idle.png').write_bytes((root / 'front.png').read_bytes())
(root / 'attack.png').write_bytes((root / 'defend.png').read_bytes())
