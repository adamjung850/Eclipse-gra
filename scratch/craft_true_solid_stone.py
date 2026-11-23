from PIL import Image
import numpy as np

T = 24

# Cool Slate Palette (Authentic 2D Sandbox RPG style)
# 5 discrete colors:
# C0: Deep cleft / fracture: [62, 66, 76]    #3e424c
# C1: Shaded rock tone:      [88, 94, 108]   #585e6c
# C2: Base solid stone body: [118, 126, 142] #767e8e (dominant ~55%)
# C3: Lit rock facet:        [146, 154, 172] #929aac
# C4: Highlight edge:        [176, 184, 202] #b0b8ca

PAL = np.array([
    [62,  66,  76],
    [88,  94,  108],
    [118, 126, 142],
    [146, 154, 172],
    [176, 184, 202]
], dtype=np.uint8)

# We want 3-4 natural boulder / rock slab facets inside the 24x24 tile.
# To prevent diagonal striping:
# Boulder A: Wide horizontal slab in top half (e.g. y: 2..8, x: 3..14)
# Boulder B: Squarish blocky mass in top right (e.g. y: 1..7, x: 17..22)
# Boulder C: Rounded boulder in bottom left (e.g. y: 12..20, x: 1..9)
# Boulder D: Wide horizontal slab in bottom right (e.g. y: 11..19, x: 12..21)
# Seamless joints:
# Seam across top/bottom wrap: y=0/23
# Seam across left/right wrap: x=0/23

def create_rock_design_A():
    grid = np.full((T, T), 2, dtype=np.uint8) # Fill with base solid stone
    
    # --- Boulder A (Top-Left horizontal slab) ---
    # Body
    grid[3:8, 4:14] = 3
    # Lit top face
    grid[3:5, 5:13] = 4
    # Shaded bottom
    grid[8, 4:14] = 1
    grid[9, 5:13] = 0
    # Left shade
    grid[4:8, 3] = 1
    # Right shade
    grid[4:8, 14] = 1
    
    # --- Boulder B (Top-Right blocky slab) ---
    grid[2:7, 18:23] = 3
    grid[2:4, 19:22] = 4
    grid[7, 18:23] = 1
    grid[8, 19:22] = 0
    grid[3:7, 17] = 1
    
    # Vertical cleft between Boulder A and B (at x=15..16)
    grid[2:8, 15] = 1
    grid[3:7, 16] = 0
    
    # --- Boulder C (Bottom-Left rounded slab) ---
    grid[13:19, 2:9] = 3
    grid[13:15, 3:8] = 4
    grid[19, 2:9] = 1
    grid[20, 3:8] = 0
    grid[14:19, 1] = 1
    grid[14:19, 9] = 1
    
    # --- Boulder D (Bottom-Right wide slab) ---
    grid[12:18, 13:22] = 3
    grid[12:14, 14:21] = 4
    grid[18, 13:22] = 1
    grid[19, 14:21] = 0
    grid[13:18, 12] = 1
    
    # --- Interlocking Central Joint (Breaks up straight lines!) ---
    # An organic notch in the center (y: 9..11, x: 9..13)
    grid[10:12, 10:13] = 3
    grid[10, 10:12] = 4
    grid[11, 13] = 1
    
    # Seamless border handling:
    # Top edge (y=0, 1) and bottom edge (y=22, 23):
    # Let's ensure a boulder wraps from bottom to top!
    # Boulder E (wrapping vertically at x=7..16):
    grid[22:24, 8:16] = 3
    grid[0:2, 8:16] = 3
    grid[0, 9:15] = 4 # catches light from above
    grid[22, 9:15] = 1
    grid[21, 9:15] = 0
    
    # Left-Right wrap at x=0, 23:
    # A boulder wrapping horizontally at y=7..13:
    grid[8:13, 22:24] = 3
    grid[8:13, 0:2] = 3
    grid[8:10, 23] = 4
    grid[8:10, 0] = 4
    grid[13, 22:24] = 1
    grid[13, 0:2] = 1

    return PAL[grid]

# Design B: Organic Terraria-inspired Solid Stone
# Based on Terraria's actual 8x8 boulder geometry, but engineered to tile seamlessly
# without diagonal lines by mirroring/offsetting the cleavage planes.
def create_rock_design_B():
    # 8x8 native matrix
    # Values: 0 to 4
    mat = np.array([
        [2, 2, 3, 3, 2, 1, 0, 1],
        [2, 3, 4, 3, 2, 0, 1, 2],
        [3, 4, 3, 2, 1, 2, 3, 3],
        [2, 3, 2, 0, 2, 3, 4, 2],
        [1, 1, 0, 2, 3, 4, 3, 2],
        [0, 2, 2, 3, 4, 3, 2, 1],
        [2, 3, 3, 2, 1, 0, 2, 2],
        [1, 2, 2, 1, 0, 1, 2, 2]
    ], dtype=np.uint8)
    
    # Scale 3x to 24x24 (clean 3x3 pixel clods)
    rgb_8 = PAL[mat]
    rgb_24 = np.repeat(np.repeat(rgb_8, 3, axis=0), 3, axis=1)
    return rgb_24

# Design C: Heavy Monolithic Slate (Layered Geologic Rock)
# 12x12 native grid (scaled 2x to 24x24)
def create_rock_design_C():
    # 12x12 matrix
    mat = np.array([
        [2, 2, 3, 3, 3, 2, 2, 1, 0, 1, 2, 2],
        [2, 3, 4, 4, 3, 2, 1, 0, 1, 2, 3, 3],
        [3, 4, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3],
        [3, 3, 3, 2, 0, 1, 2, 2, 3, 4, 3, 2],
        [2, 2, 1, 0, 1, 2, 3, 3, 3, 2, 1, 1],
        [1, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0],
        [0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 1, 1],
        [1, 2, 3, 3, 3, 2, 1, 0, 1, 2, 2, 2],
        [2, 3, 2, 1, 0, 1, 2, 2, 3, 3, 2, 1],
        [2, 2, 1, 0, 1, 2, 3, 4, 4, 3, 2, 1],
        [1, 0, 1, 2, 2, 3, 4, 4, 3, 2, 1, 0],
        [1, 1, 2, 2, 1, 2, 3, 3, 2, 1, 1, 1]
    ], dtype=np.uint8)
    
    rgb_12 = PAL[mat]
    rgb_24 = np.repeat(np.repeat(rgb_12, 2, axis=0), 2, axis=1)
    return rgb_24

rA = create_rock_design_A()
rB = create_rock_design_B()
rC = create_rock_design_C()

def save_tiled(tile, name):
    # Tile 6x6 (144x144, 2x zoom to 288x288)
    tiled = np.zeros((24*6, 24*6, 3), dtype=np.uint8)
    for ty in range(6):
        for tx in range(6):
            tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = tile
    Image.fromarray(tiled).resize((288, 288), Image.NEAREST).save(f'scratch/{name}_6x6.png')
    # Also save single tile at 4x zoom (96x96)
    Image.fromarray(tile).resize((96, 96), Image.NEAREST).save(f'scratch/{name}_single_4x.png')

save_tiled(rA, 'solid_rock_A')
save_tiled(rB, 'solid_rock_B')
save_tiled(rC, 'solid_rock_C')

print("Generated solid_rock_A, solid_rock_B, solid_rock_C")
