import base64
import numpy as np
import craft_authentic_monolithic_stone as cams

stone = cams.stone_rgb # (24, 24, 3) uint8

# Add alpha channel 255
rgba = np.full((24, 24, 4), 255, dtype=np.uint8)
rgba[:, :, :3] = stone

# Bytes in RGBA order
raw_bytes = rgba.tobytes()
b64 = base64.b64encode(raw_bytes).decode('ascii')

print("STONE_24_RGBA length:", len(b64))
print("STONE_24_RGBA preview:", b64[:50] + "..." + b64[-30:])

with open('scratch/new_stone_24_rgba.txt', 'w') as f:
    f.write(b64)

# Verify decoding
decoded_bytes = base64.b64decode(b64)
decoded_arr = np.frombuffer(decoded_bytes, dtype=np.uint8).reshape((24, 24, 4))
assert np.array_equal(rgba, decoded_arr), "Decoded array must match original!"
print("Verification passed! Base64 is 100% valid.")
