import math
from PIL import Image
import numpy as np

T = 24

# Let's understand what makes STONE look like solid bedrock/rock slabs, NOT loose gravel:
# 1. Macro Rock Strata / Slabs:
#    Rock consists of larger solid surfaces (slabs/plates of 4 to 8 pixels) with solid cohesive stone colors,
#    separated by natural cracks, fissures, and edge bevels.
# 2. Low micro-noise:
#    Gravel has 1-pixel noise everywhere (high frequency).
#    Stone has broad, smooth rock surfaces with medium-frequency fissures and bevels (low-to-mid frequency).
# 3. Terraria-style stone colors:
#    - Deepest crack: #3a3d45 (58, 61, 69)
#    - Shadow crease: #4c505a (76, 80, 90)
#    - Deep rock tone: #616672 (97, 102, 114)
#    - Main solid stone: #757b88 (117, 123, 136)
#    - Light rock face: #878e9b (135, 142, 155)
#    - Highlight rim / top bevel: #9da5b3 (157, 165, 179)
#    - Crisp edge glint: #b3bccb (179, 188, 203)

# Let's create 3 distinct solid stone designs:

# DESIGN A: Terraria-style Organic Slate Rock Strata
# Interlocking solid rock plates nestled together, seamless on 24x24.
# Smooth rock faces with natural winding fissures.

def create_design_a_slate():
    # 24x24 canvas
    img = Image.new('RGB', (T, T), '#757b88')
    pix = img.load()
    
    # We define 4 natural, solid, chunky rock slabs across the 24x24 tile:
    # Slab 1: Top-Left massive rock slab (approx 12x10)
    # Slab 2: Top-Right / wrap slab (approx 12x8)
    # Slab 3: Bottom-Left rock slab (approx 11x11)
    # Slab 4: Bottom-Right rock slab (approx 13x12)
    
    # Base color: #757b88
    # Fissures / seams between the slabs:
    # Notice: these are natural winding cracks, NOT straight lines, NOT 1px diagonal steps, NOT loose sand!
    
    # Let's fill the broad rock faces:
    # Slab 1 body:
    for y in range(1, 10):
        for x in range(1, 13):
            pix[x, y] = (135, 142, 155) # light rock face
            
    # Slab 1 top highlight rim:
    for x in range(2, 11):
        pix[x, 1] = (157, 165, 179)
    for x in range(3, 8):
        pix[x, 2] = (179, 188, 203)
        
    # Slab 1 right & bottom shadow crease:
    for x in range(1, 13):
        pix[x, 9] = (97, 102, 114)
    for y in range(2, 10):
        pix[12, y] = (97, 102, 114)
        
    # Slab 2 body (top-right / wrap):
    for y in range(1, 12):
        for x in range(14, 24):
            pix[x, y] = (130, 137, 150)
    # Wrap to x=0:
    for y in range(1, 12):
        pix[0, y] = (130, 137, 150)
    for x in range(15, 23):
        pix[x, 1] = (157, 165, 179)
    for x in range(16, 21):
        pix[x, 2] = (179, 188, 203)
        
    # Slab 3 body (bottom-left):
    for y in range(11, 23):
        for x in range(1, 11):
            pix[x, y] = (125, 132, 145)
    for x in range(2, 10):
        pix[x, 11] = (157, 165, 179)
    for x in range(3, 7):
        pix[x, 12] = (179, 188, 203)
    for x in range(1, 11):
        pix[x, 22] = (97, 102, 114)
    for y in range(11, 23):
        pix[10, y] = (97, 102, 114)
        
    # Slab 4 body (bottom-right):
    for y in range(13, 23):
        for x in range(12, 24):
            pix[x, y] = (132, 139, 152)
    for y in range(13, 23):
        pix[0, y] = (132, 139, 152) # wrap
    for x in range(13, 22):
        pix[x, 13] = (157, 165, 179)
    for x in range(14, 19):
        pix[x, 14] = (179, 188, 203)
        
    # Deep cracks / fissures between slabs (dark #4c505a and #3a3d45):
    # Fissure between Slab 1 and Slab 3:
    pix[0, 10] = (58, 61, 69)
    pix[1, 10] = (58, 61, 69)
    pix[2, 10] = (58, 61, 69)
    pix[3, 10] = (76, 80, 90)
    pix[4, 10] = (76, 80, 90)
    pix[5, 10] = (58, 61, 69)
    pix[6, 11] = (58, 61, 69)
    pix[7, 11] = (58, 61, 69)
    pix[8, 11] = (76, 80, 90)
    pix[9, 11] = (58, 61, 69)
    pix[10, 11] = (58, 61, 69)
    pix[11, 11] = (58, 61, 69)
    pix[12, 12] = (58, 61, 69)
    
    # Fissure between Slab 1/3 and Slab 2/4 (vertical winding):
    pix[13, 0] = (58, 61, 69)
    pix[13, 1] = (58, 61, 69)
    pix[13, 2] = (76, 80, 90)
    pix[13, 3] = (58, 61, 69)
    pix[14, 4] = (58, 61, 69)
    pix[14, 5] = (76, 80, 90)
    pix[13, 6] = (58, 61, 69)
    pix[13, 7] = (58, 61, 69)
    pix[13, 8] = (76, 80, 90)
    pix[13, 9] = (58, 61, 69)
    pix[13, 10] = (58, 61, 69)
    
    pix[11, 13] = (58, 61, 69)
    pix[11, 14] = (76, 80, 90)
    pix[11, 15] = (58, 61, 69)
    pix[12, 16] = (58, 61, 69)
    pix[11, 17] = (76, 80, 90)
    pix[11, 18] = (58, 61, 69)
    pix[11, 19] = (58, 61, 69)
    pix[11, 20] = (76, 80, 90)
    pix[11, 21] = (58, 61, 69)
    pix[11, 22] = (58, 61, 69)
    pix[11, 23] = (58, 61, 69)
    
    # Horizontal fissure at bottom (wrap seamlessly to y=0):
    for x in range(0, 24):
        if x not in [13]:
            pix[x, 0] = (76, 80, 90)
            pix[x, 23] = (58, 61, 69)
            
    # Internal surface fissures / fractures on the rock face (gives it solid cracked rock feel):
    # Slab 1 crack:
    pix[4, 5] = (76, 80, 90)
    pix[5, 5] = (58, 61, 69)
    pix[6, 6] = (76, 80, 90)
    pix[7, 6] = (97, 102, 114)
    # Slab 2 crack:
    pix[18, 6] = (76, 80, 90)
    pix[19, 7] = (58, 61, 69)
    pix[20, 7] = (76, 80, 90)
    # Slab 4 crack:
    pix[16, 17] = (76, 80, 90)
    pix[17, 18] = (58, 61, 69)
    pix[18, 18] = (76, 80, 90)
    
    return img

img_a = create_design_a_slate()

# Save 4x4 preview of Design A
tiled_a = Image.new('RGB', (24 * 4, 24 * 4))
for ty in range(4):
    for tx in range(4):
        tiled_a.paste(img_a, (tx * 24, ty * 24))
        
tiled_a.resize((tiled_a.width * 2, tiled_a.height * 2), Image.NEAREST).save('scratch/test_rock_a.png')
print("Saved scratch/test_rock_a.png")
