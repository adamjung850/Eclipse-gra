from PIL import Image
import numpy as np

T = 24

# Let's design 3 organic, nestled boulders of different orientations on 24x24:
# Palette (Authentic Slate Stone):
# C0: Deep seam crevice:   #3e434e (62, 67, 78)
# C1: Shadow under boulder: #555c6b (85, 92, 107)
# C2: Deep midtone:        #6b7385 (107, 115, 133)
# C3: Solid base rock:     #80899c (128, 137, 156) - dominant
# C4: Lit rock face:       #96a0b4 (150, 160, 180)
# C5: Top rock highlight:  #adb7cd (173, 183, 205)

PAL = np.array([
    [62,  67,  78],  # 0
    [85,  92,  107], # 1
    [107, 115, 133], # 2
    [128, 137, 156], # 3
    [150, 160, 180], # 4
    [173, 183, 205]  # 5
], dtype=np.uint8)

def render_natural_rock():
    # Start with base rock C3
    grid = np.full((T, T), 3, dtype=np.uint8)
    
    # BOULDER 1: Large Upper-Left Boulder (horizontal rounded mass, x: 1..13, y: 1..10)
    # Lit face:
    grid[2:7, 2:12] = 4
    grid[3:5, 3:9] = 5 # highlight
    grid[1, 3:10] = 4
    # Shadow underside:
    grid[8:10, 2:13] = 2
    grid[9, 3:12] = 1
    
    # BOULDER 2: Tall Right Boulder (vertical rounded mass, x: 14..23, y: 1..14)
    grid[2:11, 15:23] = 4
    grid[3:8, 16:21] = 5 # highlight
    grid[1, 16:22] = 4
    # Shadow underside:
    grid[11:14, 15:23] = 2
    grid[13, 16:22] = 1
    
    # BOULDER 3: Broad Lower-Left Bedrock (x: 1..13, y: 11..22)
    grid[12:19, 2:12] = 4
    grid[13:16, 3:9] = 5 # highlight
    grid[11, 3:10] = 4
    # Shadow underside:
    grid[19:22, 2:13] = 2
    grid[21, 3:12] = 1
    
    # BOULDER 4: Lower-Right Nestled Boulder (x: 13..23, y: 15..23)
    grid[16:22, 14:23] = 4
    grid[17:19, 15:21] = 5
    grid[15, 15:22] = 4
    grid[22:24, 14:23] = 2
    
    # NATURAL CREVICE SEAMS BETWEEN THE BOULDERS:
    # 1. Horizontal seam between Boulder 1 and Boulder 3:
    for x in range(1, 13):
        grid[10, x] = 1
    grid[10, 4:9] = 0 # deep pit
    
    # 2. Vertical seam between (Boulder 1/3) and (Boulder 2/4):
    for y in range(1, 14):
        grid[y, 13] = 1
    grid[4:9, 13] = 0 # deep pit
    
    for y in range(14, 23):
        grid[y, 12] = 1
    grid[16:20, 12] = 0 # deep pit
    
    # 3. Horizontal seam between Boulder 2 and Boulder 4:
    for x in range(13, 23):
        grid[14, x] = 1
    grid[14, 16:20] = 0
    
    # 4. Seamless border wrapping:
    # Top/Bottom seam (y=0 <-> y=23):
    grid[0, :] = grid[23, :]
    for x in range(0, 24):
        if grid[22, x] in [1, 2]:
            grid[23, x] = 1
            grid[0, x] = 0
            grid[1, x] = 2
            
    # Left/Right seam (x=0 <-> x=23):
    grid[:, 0] = grid[:, 23]
    for y in range(0, 24):
        if grid[y, 22] in [1, 2]:
            grid[y, 23] = 1
            grid[y, 0] = 0
            grid[y, 1] = 2
            
    # 5. Organic rock fractures & beveling (softening the boulder corners so they look like cracked rock):
    corners_to_soften = [
        (2, 2), (11, 2), (2, 7), (11, 7),
        (15, 2), (22, 2), (15, 11), (22, 11),
        (2, 12), (11, 12), (2, 19), (11, 19),
        (14, 16), (22, 16), (14, 22), (22, 22)
    ]
    for cx, cy in corners_to_soften:
        if grid[cy, cx] == 4:
            grid[cy, cx] = 3

    # Internal micro-fissure on Boulder 1:
    grid[4, 6] = 2; grid[4, 7] = 1; grid[5, 7] = 0
    # Internal micro-fissure on Boulder 2:
    grid[6, 18] = 2; grid[7, 18] = 1; grid[7, 19] = 0
    # Internal micro-fissure on Boulder 3:
    grid[15, 6] = 2; grid[15, 7] = 1; grid[16, 7] = 0

    return PAL[grid]

stone_rgb = render_natural_rock()

# 4x4 preview
preview = Image.new('RGB', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        preview.paste(Image.fromarray(stone_rgb), (tx * T, ty * T))
        
preview_2x = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
preview_2x.save('scratch/natural_rock_showcase.png')
print("Saved scratch/natural_rock_showcase.png")
