from PIL import Image
import numpy as np

T = 24

# Slate Palette
PAL = np.array([
    [78,  84,  96],   # 0: deep hairline cleft
    [98,  105, 120],  # 1: crevice shadow
    [120, 128, 144],  # 2: BASE DOMINANT ROCK BODY
    [138, 146, 162],  # 3: lit rock face
    [158, 166, 182]   # 4: top shelf highlight
], dtype=np.uint8)

def craft_non_diagonal_bedrock():
    grid = np.full((T, T), 2, dtype=np.uint8) # Default base solid stone
    
    # 1. HORIZONTAL ROCK SHELF (Upper region: y: 2..8, x: 2..15)
    # Catches light from directly above (horizontal highlight, NOT diagonal!):
    grid[2, 3:15] = 4
    grid[3:7, 3:15] = 3
    # Underside shadow (horizontal):
    grid[7, 3:15] = 1
    grid[8, 4:14] = 0
    
    # 2. VERTICAL ROCK PILLAR (Right region: y: 1..13, x: 18..22)
    # Flat top catching light:
    grid[1, 18:22] = 4
    grid[2:12, 18:22] = 3
    # Left vertical shadow seam (separating pillar from shelf):
    grid[2:12, 17] = 0
    grid[2:12, 16] = 1
    # Bottom shadow of pillar:
    grid[12, 18:22] = 1
    grid[13, 18:22] = 0
    
    # 3. ROUNDED CENTRAL-LEFT BOULDER (y: 11..19, x: 2..11)
    # Rounded top highlight:
    grid[11, 4:9] = 4
    grid[12, 3:10] = 3
    grid[13:17, 2:11] = 3
    # Rounded bottom shadow:
    grid[17, 3:10] = 1
    grid[18, 4:9] = 0
    
    # 4. LOWER-RIGHT HORIZONTAL BLOCK (y: 15..21, x: 13..23)
    grid[15, 14:22] = 4
    grid[16:20, 13:23] = 3
    grid[20, 14:22] = 1
    grid[21, 15:21] = 0
    # Left vertical seam of block:
    grid[16:20, 12] = 0
    
    # 5. SEAMLESS VERTICAL WRAP (y=0 <-> y=23 at x=7..17):
    # A rock mass wrapping from bottom to top:
    grid[22:24, 7:17] = 3
    grid[0:2, 7:17] = 3
    grid[0, 8:16] = 4 # top highlight
    grid[22, 8:16] = 1 # bottom shadow
    
    # 6. SEAMLESS HORIZONTAL WRAP (x=0 <-> x=23 at y=7..13):
    # A rock mass wrapping horizontally:
    grid[8:12, 22:24] = 3
    grid[8:12, 0:2] = 3
    grid[7, 22:24] = 4
    grid[7, 0:2] = 4
    grid[12, 22:24] = 1
    grid[12, 0:2] = 1

    return PAL[grid]

nd_rock = craft_non_diagonal_bedrock()

# 6x6 preview
tiled = np.zeros((24*6, 24*6, 3), dtype=np.uint8)
for ty in range(6):
    for tx in range(6):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = nd_rock

Image.fromarray(tiled).resize((288, 288), Image.NEAREST).save('scratch/non_diagonal_6x6.png')
Image.fromarray(nd_rock).resize((96, 96), Image.NEAREST).save('scratch/non_diagonal_single.png')

print("Saved scratch/non_diagonal_6x6.png")
