from PIL import Image
import numpy as np

# Load stone b64
with open('scratch/stone_24_rgba.txt', 'r') as f:
    stone_b64 = f.read().strip()

import base64
raw_bytes = base64.b64decode(stone_b64)
stone_rgba = np.frombuffer(raw_bytes, dtype=np.uint8).reshape((24, 24, 4))
stone_rgb = stone_rgba[:, :, :3]

# Now let's implement the exact deposit array logic that will be in TypeScript:
deposits = [
    # Deposit 1 (upper-left, faceted)
    {
        'socket': [[5,5,4,1], [4,6,1,2], [8,6,1,1], [4,7,1,1], [9,7,1,1], [5,8,4,1], [6,9,2,1]],
        'base':   [[5,6,3,1], [5,7,4,1], [6,8,2,1]],
        'bright': [[6,6,2,1], [5,7,2,1]],
        'hi':     [[6,6,1,1]],
        'glint':  [[6,6,1,1]]
    },
    # Deposit 2 (center-right, faceted)
    {
        'socket': [[13,11,4,1], [12,12,1,2], [17,12,1,2], [13,14,1,1], [17,14,1,1], [14,15,3,1]],
        'base':   [[14,12,2,1], [13,13,4,1], [14,14,3,1]],
        'bright': [[14,12,2,1], [13,13,2,1]],
        'hi':     [[14,12,2,1]],
        'glint':  [[14,12,1,1]]
      },
      # Deposit 3 (lower-left, faceted)
      {
        'socket': [[8,15,4,1], [7,16,1,2], [11,16,1,2], [7,18,1,1], [9,18,2,1], [8,19,1,1]],
        'base':   [[9,16,2,1], [8,17,3,1], [8,18,1,1]],
        'bright': [[9,16,2,1], [8,17,1,1]],
        'hi':     [[9,16,1,1]],
        'glint':  [[9,16,1,1]]
      },
      # Deposit 4 (upper-right fleck)
      {
        'socket': [[17,4,4,1], [17,5,1,1], [20,5,1,1], [18,6,1,1], [20,6,1,1], [19,7,1,1]],
        'base':   [[18,5,2,1], [19,6,1,1]],
        'bright': [[18,5,2,1]],
        'hi':     [[18,5,1,1]],
        'glint':  [[18,5,1,1]]
      },
      # Deposit 5 (lower-edge fleck)
      {
        'socket': [[3,12,3,1], [3,13,1,2], [5,13,1,2], [4,15,1,1]],
        'base':   [[4,13,1,2]],
        'bright': [[4,13,1,1]],
        'hi':     [[4,13,1,1]],
        'glint':  [[4,13,1,1]]
      }
]

def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=np.uint8)

def render_ts_ore(base_rgb, pal):
    im_arr = base_rgb.copy()
    for dep in deposits:
        for k in ['socket', 'base', 'bright', 'hi', 'glint']:
            c = hex2rgb(pal[k])
            for rect in dep[k]:
                x, y, w, h = rect
                im_arr[y:y+h, x:x+w] = c
    return im_arr

copper_pal = {'socket': '#301405', 'base': '#c65622', 'bright': '#ea803e', 'hi': '#ffaf6c', 'glint': '#ffe6c8'}
gold_pal = {'socket': '#422e02', 'base': '#d8a010', 'bright': '#f8ca26', 'hi': '#ffec64', 'glint': '#ffffff'}
iron_pal = {'socket': '#24201c', 'base': '#8a7c70', 'bright': '#b0a296', 'hi': '#d6cec6', 'glint': '#ffffff'}
coal_pal = {'socket': '#101114', 'base': '#22242a', 'bright': '#363a42', 'hi': '#545a66', 'glint': '#7d8694'}
diamond_pal = {'socket': '#082e38', 'base': '#1aaac4', 'bright': '#44e0f6', 'hi': '#a5f8ff', 'glint': '#ffffff'}

copper_ts = render_ts_ore(stone_rgb, copper_pal)
gold_ts = render_ts_ore(stone_rgb, gold_pal)

# Save 3x3 comparison
comp = Image.new('RGB', (24 * 3 * 2, 24 * 3))
for ty in range(3):
    for tx in range(3):
        comp.paste(Image.fromarray(copper_ts), (tx * 24, ty * 24))
        comp.paste(Image.fromarray(gold_ts), (72 + tx * 24, ty * 24))

comp_2x = comp.resize((comp.width * 2, comp.height * 2), Image.NEAREST)
comp_2x.save('scratch/ts_ore_verify.png')
print("Saved scratch/ts_ore_verify.png!")
