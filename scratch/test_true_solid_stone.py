import math
from PIL import Image
import numpy as np

T = 24

# Let's craft true, solid Terraria stone:
# 1. Base color dominates: #7B828F (RGB: 123, 130, 143) - smooth solid bedrock
# 2. Tight low-contrast palette:
#    - Dark crack (very sparse, thin winding fissures): #464B54
#    - Soft shadow: #666C78
#    - Base solid stone: #7B828F
#    - Soft light face: #8E96A4
#    - Top edge highlight: #A3ABB9
# Notice: the difference between Base (123) and Soft Light (142) is only ~19, not 80!
# It's a cohesive, monolithic solid rock slab, NOT high-frequency salt-and-pepper gravel noise!

def generate_solid_rock():
    # Base solid rock
    img = Image.new('RGB', (T, T), '#7B828F')
    pix = img.load()
    
    # We want broad, monolithic rock faces with subtle 2-3 pixel fracture veins.
    # Seamless perlin-style continuous field with low contrast
    # Let's compute smooth toroidal harmonics (seamless on 24)
    for y in range(T):
        for x in range(T):
            # Smooth low-frequency field
            fx = x / T * 2 * math.pi
            fy = y / T * 2 * math.pi
            
            # Harmonic 1: gentle broad undulation (macro rock shape)
            h1 = math.sin(fx * 1 + 0.8) * math.cos(fy * 1 + 0.4) * 0.5 + 0.5
            # Harmonic 2: subtle secondary wave
            h2 = math.cos(fx * 2 + 1.2) * math.sin(fy * 2 + 0.5) * 0.5 + 0.5
            # Harmonic 3: slight diagonal fracture bias
            h3 = math.sin(fx + fy + 2.1) * 0.5 + 0.5
            
            val = h1 * 0.6 + h2 * 0.25 + h3 * 0.15
            
            # Very tight, gentle transitions
            # Base stone is around val 0.45..0.65
            if val < 0.28:
                col = (102, 108, 120) # soft shadow
            elif val < 0.45:
                col = (112, 118, 131) # deep midtone
            elif val < 0.62:
                col = (123, 130, 143) # base dominant stone (#7B828F)
            elif val < 0.78:
                col = (136, 143, 157) # soft light face (#888F9D)
            else:
                col = (148, 156, 170) # gentle highlight face
                
            pix[x, y] = col
            
    # Now let's add a few sparse, crisp, authentic rock fractures / fissures (pęknięcia skalne):
    # These give it the unmistakable look of solid bedrock rather than gravel or wallpaper!
    # Seamless cracks on 24x24:
    fissures = [
        # Crack 1: organic curved fissure across upper-center
        (6, 4), (7, 5), (8, 5), (9, 6), (10, 6), (11, 7), (12, 7), (13, 7),
        # Crack 2: lower-right fissure
        (16, 15), (17, 16), (18, 16), (19, 17), (20, 17), (21, 18),
        # Crack 3: edge wrapping fissure
        (22, 10), (23, 11), (0, 11), (1, 12), (2, 12),
        # Tiny branching hair cracks
        (8, 6), (9, 7),
        (18, 17), (18, 18)
    ]
    
    for cx, cy in fissures:
        # Dark crack line
        pix[cx % T, cy % T] = (62, 66, 74) # dark fissure (#3E424A)
        # Highlight on top edge of crack (raised rock shelf)
        top_y = (cy - 1) % T
        cur_top = pix[cx % T, top_y]
        pix[cx % T, top_y] = (min(255, cur_top[0] + 24), min(255, cur_top[1] + 24), min(255, cur_top[2] + 26))
        
    return img

rock = generate_solid_rock()

# 4x4 preview
preview = Image.new('RGB', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        preview.paste(rock, (tx * T, ty * T))
        
preview_2x = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
preview_2x.save('scratch/true_solid_rock_4x4.png')
print("Saved scratch/true_solid_rock_4x4.png")
