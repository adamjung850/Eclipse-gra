from PIL import Image
import numpy as np

T = 24

# Let's design 4 natural rock boulders on 24x24 with different orientations:
# Boulder 1 (upper-left): rounded boulder, slightly horizontal
# Boulder 2 (upper-right): angular rock, tilted right (\)
# Boulder 3 (lower-left): vertical rock slab (|)
# Boulder 4 (lower-right): broad horizontal bedrock shelf (-)
# Seams between them curve organically.

# Palette: Authentic Cool Slate Rock (exact tones from Terraria t2)
# C0: Deep crevice:       [54, 58, 68]
# C1: Shadow seam:        [78, 85, 98]
# C2: Deep midtone:       [102, 110, 126]
# C3: Solid base stone:   [124, 132, 150]
# C4: Lit rock facet:     [148, 157, 176]
# C5: Crisp highlight:    [174, 183, 204]

PAL = np.array([
    [54,  58,  68],  # 0
    [78,  85,  98],  # 1
    [102, 110, 126], # 2
    [124, 132, 150], # 3
    [148, 157, 176], # 4
    [174, 183, 204]  # 5
], dtype=np.uint8)

def render_multi_angle():
    grid = np.full((T, T), 3, dtype=np.uint8)
    
    # BOULDER 1 (upper-left: x 1..11, y 1..9, rounded):
    grid[2:7, 2:10] = 4
    grid[3:5, 3:7] = 5
    # Shadow underside:
    grid[7:9, 3:11] = 2
    grid[9, 4:11] = 1
    
    # BOULDER 2 (upper-right: x 13..22, y 1..12, vertical-ish):
    grid[2:9, 15:22] = 4
    grid[3:6, 17:21] = 5
    grid[10:12, 15:22] = 2
    grid[12, 16:22] = 1
    
    # BOULDER 3 (lower-left: x 1..12, y 11..22, vertical tall slab):
    grid[12:18, 3:11] = 4
    grid[13:16, 4:8] = 5
    grid[19:21, 3:11] = 2
    grid[21, 4:10] = 1
    
    # BOULDER 4 (lower-right: x 13..23, y 14..22, broad horizontal shelf):
    grid[15:19, 14:23] = 4
    grid[15:17, 16:21] = 5
    grid[20:22, 14:23] = 2
    grid[22, 15:23] = 1
    
    # NATURAL CREVICES (C0 and C1):
    # Seam between B1 and B3:
    crevice_1 = [(1,9), (2,10), (3,10), (4,10), (5,10), (6,11), (7,11), (8,10), (9,10), (10,10), (11,11), (12,11)]
    for x, y in crevice_1:
        grid[y, x] = 0
        if y > 0: grid[y-1, x] = min(grid[y-1, x], 1)
        
    # Seam between B1/B3 and B2/B4:
    crevice_2 = [(12,1), (12,2), (12,3), (13,4), (13,5), (13,6), (12,7), (12,8), (12,9), (13,10), (13,11), (13,12), (13,13), (12,14), (12,15), (13,16), (13,17), (13,18), (12,19), (12,20), (12,21), (12,22)]
    for x, y in crevice_2:
        grid[y, x] = 0
        if x > 0: grid[y, x-1] = min(grid[y, x-1], 1)
        
    # Seam between B2 and B4:
    crevice_3 = [(14,13), (15,13), (16,14), (17,14), (18,14), (19,13), (20,13), (21,13), (22,14)]
    for x, y in crevice_3:
        grid[y, x] = 0
        if y > 0: grid[y-1, x] = min(grid[y-1, x], 1)

    # Seamless borders:
    # Top/Bottom:
    grid[0, :] = grid[23, :]
    for x in range(T):
        if grid[22, x] <= 1:
            grid[23, x] = 1
            grid[0, x] = 0
            grid[1, x] = 2
            
    # Left/Right:
    grid[:, 0] = grid[:, 23]
    for y in range(T):
        if grid[y, 22] <= 1:
            grid[y, 23] = 1
            grid[y, 0] = 0
            grid[y, 1] = 2

    return PAL[grid]

stone_rgb = render_multi_angle()

# 4x4 preview
preview = Image.new('RGB', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        preview.paste(Image.fromarray(stone_rgb), (tx * T, ty * T))
        
preview_2x = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
preview_2x.save('scratch/multi_angle_showcase.png')
print("Saved scratch/multi_angle_showcase.png")
