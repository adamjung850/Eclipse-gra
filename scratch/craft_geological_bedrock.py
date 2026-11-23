from PIL import Image
import numpy as np

T = 24

# Palette: Authentic Cool Slate Bedrock
# C0: Deep cleft / fissure:      [64,  68,  78]   #40444e
# C1: Shadowed rock edge:        [86,  92,  104]  #565c68
# C2: Deep rock midtone:         [110, 117, 131]  #6e7583
# C3: BASE SOLID BEDROCK (60%):  [124, 132, 147]  #7c8493
# C4: Lit rock plane (25%):      [138, 146, 162]  #8a92a2
# C5: Raised cleft shelf / lip:  [162, 170, 186]  #a2aaba

PAL = np.array([
    [64,  68,  78],
    [86,  92,  104],
    [110, 117, 131],
    [124, 132, 147],
    [138, 146, 162],
    [162, 170, 186]
], dtype=np.uint8)

def craft_geological_bedrock():
    # Start with base solid bedrock (3)
    grid = np.full((T, T), 3, dtype=np.uint8)
    
    # 1. Broad, natural planar rock facets (massive solid rock volume):
    # Upper-left planar face (chunky, cohesive, NOT noise!):
    grid[2:7, 2:13] = 4
    grid[3:6, 3:11] = 4
    
    # Lower-right planar face:
    grid[12:19, 11:21] = 4
    grid[13:17, 12:20] = 4
    
    # Subterranean shaded planes:
    grid[14:19, 2:8] = 2
    grid[2:7, 15:21] = 2
    
    # Subtle internal rock chisel clods (sizes 2x2 to 3x3, low contrast):
    clods_lit = [(8, 3, 3, 2), (18, 9, 3, 2), (4, 10, 2, 2), (14, 21, 3, 2)]
    for cx, cy, cw, ch in clods_lit:
        grid[cy:cy+ch, cx:cx+cw] = 4
        
    clods_dark = [(13, 2, 2, 2), (2, 8, 2, 2), (17, 13, 2, 2), (8, 16, 3, 2)]
    for cx, cy, cw, ch in clods_dark:
        grid[cy:cy+ch, cx:cx+cw] = 2

    # 2. CONTINUOUS GEOLOGICAL FAULT LINE (SZCZELINA SKALNA):
    # This fault traverses the block seamlessly so it forms an interconnected network:
    # Segment 1: Enters left at (x=0, y=9), runs across to (x=13, y=10)
    fault_main = [
        (0, 9), (1, 9), (2, 9), (3, 8), (4, 8), (5, 8), (6, 9), (7, 9),
        (8, 10), (9, 10), (10, 10), (11, 10), (12, 11), (13, 11)
    ]
    # Branch A: Continues to right edge, exiting at (x=23, y=9) -> connects to (x=0, y=9)!
    branch_right = [
        (14, 11), (15, 10), (16, 10), (17, 10), (18, 9), (19, 9),
        (20, 9), (21, 9), (22, 9), (23, 9)
    ]
    # Branch B: Jogs down vertically through rock:
    branch_down = [
        (13, 12), (13, 13), (14, 14), (14, 15), (14, 16),
        (15, 17), (15, 18), (16, 19), (16, 20), (16, 21),
        (16, 22), (16, 23)
    ]
    # Connects vertically: exiting at (x=16, y=23) connects to top at (x=16, y=0)!
    branch_top_connect = [
        (16, 0), (16, 1), (15, 2), (15, 3), (14, 4), (14, 5)
    ]
    
    # Secondary hairline fracture:
    fissure_subtle = [
        (4, 16), (5, 16), (6, 17), (7, 17), (8, 18)
    ]

    all_fractures = [fault_main, branch_right, branch_down, branch_top_connect, fissure_subtle]

    for line in all_fractures:
        for x, y in line:
            # Deep fracture cleft (0)
            grid[y % T, x % T] = 0
            # Raised lit shelf directly above horizontal parts (5)
            # or directly left for vertical parts
            top_y = (y - 1) % T
            if grid[top_y, x % T] >= 3:
                grid[top_y, x % T] = 5
            # Shaded edge directly below (1)
            bot_y = (y + 1) % T
            if grid[bot_y, x % T] >= 2 and grid[bot_y, x % T] != 0:
                grid[bot_y, x % T] = 1

    return PAL[grid]

geo_rock = craft_geological_bedrock()

# 6x6 preview
tiled = np.zeros((24*6, 24*6, 3), dtype=np.uint8)
for ty in range(6):
    for tx in range(6):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = geo_rock

Image.fromarray(tiled).resize((288, 288), Image.NEAREST).save('scratch/geological_bedrock_6x6.png')
Image.fromarray(geo_rock).resize((96, 96), Image.NEAREST).save('scratch/geological_bedrock_single.png')

print("Saved scratch/geological_bedrock_6x6.png")
