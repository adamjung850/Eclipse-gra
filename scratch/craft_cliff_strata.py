from PIL import Image
import numpy as np

T = 24

# Let's craft true GEOLOGICAL CLIFF ROCK STRATA:
# Natural horizontal bedrock shelves with organic jagged steps and fissures.
# Palette:
# C0: Deep fissure:        #383d47 (56, 61, 71)
# C1: Shadow crevice:      #4e5462 (78, 84, 98)
# C2: Deep rock midtone:   #687080 (104, 112, 128)
# C3: Solid base stone:    #7e8798 (126, 135, 152) - dominant rock
# C4: Lit rock ledge:      #96a0b2 (150, 160, 178)
# C5: Top shelf highlight: #b0bacd (176, 186, 205)

PAL = np.array([
    [56,  61,  71],  # 0
    [78,  84,  98],  # 1
    [104, 112, 128], # 2
    [126, 135, 152], # 3
    [150, 160, 178], # 4
    [176, 186, 205]  # 5
], dtype=np.uint8)

def render_cliff_strata():
    grid = np.full((T, T), 3, dtype=np.uint8) # default base solid rock C3
    
    # ROCK SHELF 1 (Upper Strata, y: 1..8):
    # Lit rock face across upper layer:
    for y in range(2, 8):
        for x in range(T):
            grid[y, x] = 4
            
    # Top highlight ledge (catching light from above):
    for x in range(T):
        grid[1, x] = 5
        
    # Step-down on shelf 1 at x=13..15 (jagged drop, not straight line!):
    grid[1:3, 13:16] = 4
    grid[3, 14] = 5
    grid[4:7, 14] = 1 # vertical fracture
    grid[4:7, 15] = 0 # deep crevice
    
    # Shadow underside of Shelf 1:
    for x in range(T):
        grid[7, x] = 2
        grid[8, x] = 1
    # Deep horizontal fracture separating Shelf 1 and Shelf 2:
    for x in range(T):
        grid[8, x] = 0
    # Add jagged meander to fissure between shelves (so it's not a ruler-straight line):
    grid[7, 4:7] = 0; grid[8, 4:7] = 1; grid[9, 4:7] = 2
    grid[7, 17:21] = 0; grid[8, 17:21] = 1; grid[9, 17:21] = 2
    
    # ROCK SHELF 2 (Middle Strata, y: 9..16):
    # Lit rock face:
    for y in range(10, 16):
        for x in range(T):
            grid[y, x] = 4
    # Top highlight ledge for Shelf 2:
    for x in range(T):
        grid[9, x] = 5
    # Step-down on shelf 2 at x=6..8 (different x position than shelf 1!):
    grid[9:11, 6:9] = 4
    grid[11, 7] = 5
    grid[12:15, 7] = 1 # vertical fracture
    grid[12:15, 8] = 0 # deep crevice
    
    # Shadow underside of Shelf 2:
    for x in range(T):
        grid[15, x] = 2
        grid[16, x] = 0 # deep fissure
    grid[15, 11:15] = 0; grid[16, 11:15] = 1
    
    # ROCK SHELF 3 (Lower Strata, y: 17..23):
    # Lit rock face:
    for y in range(18, 23):
        for x in range(T):
            grid[y, x] = 4
    # Top highlight ledge:
    for x in range(T):
        grid[17, x] = 5
    # Step-down on shelf 3 at x=19..21:
    grid[17:19, 19:22] = 4
    grid[19, 20] = 5
    grid[20:23, 20] = 1
    grid[20:23, 21] = 0
    
    # Seamless wrap at bottom (y=23 <-> y=0):
    for x in range(T):
        grid[23, x] = 0 # bottom fissure connects with top of y=0!
        grid[0, x] = 2  # base rock starts
        
    # Natural rock chisel details (give it solid rock mass):
    # Smooth rock face variation (C3 inside C4):
    grid[3:6, 2:6] = 3
    grid[4:7, 8:13] = 3
    grid[3:6, 17:22] = 3
    
    grid[11:14, 2:6] = 3
    grid[11:15, 10:17] = 3
    grid[12:15, 19:23] = 3
    
    grid[19:22, 3:10] = 3
    grid[19:22, 13:18] = 3

    return PAL[grid]

cliff_rgb = render_cliff_strata()

# Tile 4x4
tiled = np.zeros((24 * 4, 24 * 4, 3), dtype=np.uint8)
for ty in range(4):
    for tx in range(4):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = cliff_rgb

im = Image.fromarray(tiled).resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
im.save('scratch/cliff_strata_showcase.png')
print("Saved scratch/cliff_strata_showcase.png")
