import math
from PIL import Image
import numpy as np

T = 24

# Periodic Voronoi / Worley noise on 24x24 torus
# We place 7-9 rock feature seeds distributed on the 24x24 torus.
# Each seed represents the center of a solid rock boulder / slate slab.

# Seed points (x, y) chosen to give natural, irregular rock sizes (not a square grid!):
seeds = [
    (4.5, 4.0),
    (15.5, 5.0),
    (21.0, 11.5),
    (7.0, 12.5),
    (14.0, 15.0),
    (4.0, 19.5),
    (20.0, 21.0),
    (11.5, 22.5)
]

def torus_dist_sq(x1, y1, x2, y2, T):
    dx = abs(x1 - x2)
    dy = abs(y1 - y2)
    if dx > T / 2: dx = T - dx
    if dy > T / 2: dy = T - dy
    return dx * dx + dy * dy

def generate_voronoi_rock():
    # Palette: Authentic cool slate stone
    # Deep crack:      (50, 54, 62)   #32363e
    # Crevice shadow:  (72, 78, 88)   #484e58
    # Dark midtone:    (96, 103, 116) #606774
    # Solid base rock: (120, 128, 142)#78808e
    # Light rock face: (140, 148, 164)#8c94a4
    # Rock highlight:  (165, 174, 190)#a5aebd
    
    img = Image.new('RGB', (T, T))
    pix = img.load()
    
    for y in range(T):
        for x in range(T):
            # Find closest and 2nd closest seed
            dists = []
            for i, (sx, sy) in enumerate(seeds):
                d = torus_dist_sq(x, y, sx, sy, T)
                dists.append((d, i, sx, sy))
            dists.sort(key=lambda item: item[0])
            
            d1 = math.sqrt(dists[0][0]) # distance to cell center
            d2 = math.sqrt(dists[1][0]) # distance to neighbor center
            
            # Distance to border between closest two cells:
            border_dist = (d2 - d1)
            
            # Direction from cell center to pixel
            _, _, cx, cy = dists[0]
            dx = x - cx
            dy = y - cy
            if dx > T / 2: dx -= T
            if dx < -T / 2: dx += T
            if dy > T / 2: dy -= T
            if dy < -T / 2: dy += T
            
            # Directional shading (light from top-left: -dx, -dy)
            normal_light = (-dx - dy) / (d1 + 1.0) # range roughly -1.5 to +1.5
            
            # Is it a crack / fissure between rock slabs?
            if border_dist < 0.65:
                # Deep crack
                col = (54, 58, 66)
            elif border_dist < 1.3:
                # Shadow seam
                col = (76, 82, 94)
            else:
                # Solid rock facet!
                # Base stone intensity modulated by directional light
                # Notice: large solid facets of 5-8 pixels!
                lit_val = 120 + normal_light * 20
                
                # Discrete pixel art quantizing (4 solid tone bands)
                if lit_val < 105:
                    col = (98, 105, 118) # shaded rock face
                elif lit_val < 125:
                    col = (120, 128, 142) # dominant solid stone face
                elif lit_val < 140:
                    col = (140, 148, 163) # light rock facet
                else:
                    col = (162, 170, 186) # bright top-left rock highlight
                    
            pix[x, y] = col
            
    return img

rock_im = generate_voronoi_rock()

# 4x4 tiled preview
preview = Image.new('RGB', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        preview.paste(rock_im, (tx * T, ty * T))
        
preview_2x = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
preview_2x.save('scratch/voronoi_rock_4x4.png')
print("Saved scratch/voronoi_rock_4x4.png")
