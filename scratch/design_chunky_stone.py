from PIL import Image
import numpy as np

T = 24

# Let's design 24x24 stone using bold, chunky rock facets (2x2, 3x3, 4x3 pixels):
# Solid rock slabs with organic seams, completely seamless when tiled!

# Palette (Cool Slate Rock):
# C0: Deep crack:      #383c44
# C1: Dark crevice:    #4e5460
# C2: Deep midtone:    #666d7c
# C3: Base stone:      #7c8495
# C4: Light facet:     #939caa
# C5: Bright highlight:#acb5c4

PALETTE = {
    0: (56, 60, 68),
    1: (78, 84, 96),
    2: (102, 109, 124),
    3: (124, 132, 149),
    4: (147, 156, 170),
    5: (172, 181, 196)
}

# We can construct the 24x24 tile as an arrangement of solid rock faces:
# Rock Slab A (Top Left): broad, rounded boulder face (~8x7)
# Rock Slab B (Top Right): broad boulder face (~9x7)
# Rock Slab C (Center): interlocking center boulder (~10x7)
# Rock Slab D (Bottom Left): bold boulder face (~8x8)
# Rock Slab E (Bottom Right): bold boulder face (~9x8)

def build_chunky_stone():
    # Grid of palette indices (0..5)
    grid = np.full((T, T), 3, dtype=np.uint8) # default base stone C3
    
    # 1. Fill broad solid rock slabs:
    # Slab A (upper left):
    grid[2:7, 2:8] = 4 # light facet C4
    grid[3:5, 3:7] = 5 # bright highlight C5
    grid[1:3, 3:7] = 4
    
    # Slab B (upper right, wrapping to edge):
    grid[2:7, 14:22] = 4
    grid[3:5, 15:20] = 5
    
    # Slab C (center, slightly lower):
    grid[9:15, 6:17] = 4
    grid[10:13, 8:15] = 5
    
    # Slab D (lower left):
    grid[17:22, 2:10] = 4
    grid[18:20, 3:8] = 5
    
    # Slab E (lower right / wrap):
    grid[16:22, 14:23] = 4
    grid[17:20, 16:21] = 5
    
    # 2. Add deep midtone shadow on lower/right of each boulder (giving 3D rock volume):
    grid[6:8, 2:9] = 2
    grid[6:8, 14:23] = 2
    grid[14:16, 6:18] = 2
    grid[21:23, 2:10] = 2
    grid[21:23, 14:24] = 2
    
    # 3. Organic crevices / cracks between the boulders (C1 and C0):
    # Crevice around Slab A:
    for x in range(1, 9):
        grid[8, x] = 1
    for y in range(1, 9):
        grid[y, 9] = 1
    grid[8, 4:7] = 0 # deep pit
    grid[4:7, 9] = 0
    
    # Crevice around Slab B:
    for x in range(13, 23):
        grid[8, x] = 1
    for y in range(1, 8):
        grid[y, 13] = 1
    grid[8, 16:19] = 0
    grid[3:6, 13] = 0
    
    # Center crevice below Slab C:
    for x in range(5, 19):
        grid[16, x] = 1
    grid[16, 9:14] = 0
    
    # Vertical divide between bottom slabs:
    for y in range(16, 24):
        grid[y, 11] = 1
    grid[18:22, 11] = 0
    
    # 4. Make borders tile seamlessly:
    # Horizontal wrap (y=0 <-> y=23):
    grid[0, :] = grid[23, :]
    # Vertical wrap (x=0 <-> x=23):
    grid[:, 0] = grid[:, 23]
    
    # Small organic fractures inside rock faces:
    grid[4, 5] = 2; grid[4, 6] = 1
    grid[11, 11] = 2; grid[11, 12] = 1
    grid[18, 18] = 2; grid[18, 19] = 1
    
    # Convert grid to RGB image
    img = Image.new('RGB', (T, T))
    for y in range(T):
        for x in range(T):
            img.putpixel((x, y), PALETTE[grid[y, x]])
            
    return img

chunky_stone = build_chunky_stone()

# 4x4 tiled preview
tiled = Image.new('RGB', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        tiled.paste(chunky_stone, (tx * T, ty * T))
        
tiled_2x = tiled.resize((tiled.width * 2, tiled.height * 2), Image.NEAREST)
tiled_2x.save('scratch/chunky_stone_4x4.png')
print("Saved scratch/chunky_stone_4x4.png")
