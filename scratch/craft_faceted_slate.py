from PIL import Image
import numpy as np

T = 24

# Let's craft true SOLID SLATE BEDROCK:
# Structure: 7-9 interlocking solid rock facets (sizes 3x3 to 5x4 pixels)
# Each facet is a flat rock cleavage plane:
# - Solid rock body: #7c8495 (124, 132, 149)
# - Soft lit edge:   #929aa9 (146, 154, 169)
# - Crisp rim (top): #a8b0bf (168, 176, 191)
# - Cleft crease:    #5e6574 (94, 101, 116)
# - Deep fracture:   #4a505e (74, 80, 94)

PAL = np.array([
    [74,  80,  94],  # 0: deep fracture
    [94,  101, 116], # 1: cleft crease
    [112, 119, 135], # 2: shaded rock body
    [126, 134, 150], # 3: base dominant solid rock
    [144, 152, 168], # 4: lit rock facet
    [165, 173, 189]  # 5: top rock edge highlight
], dtype=np.uint8)

# Hand-crafted 24x24 matrix composed of interlocking solid rock facets:
# We distribute 8 natural facets across the tile so no single facet dominates:
# Facet 1: (2..6, 2..6)
# Facet 2: (9..15, 1..5)
# Facet 3: (18..22, 2..7)
# Facet 4: (1..6, 9..14)
# Facet 5: (8..13, 8..14)
# Facet 6: (15..21, 10..15)
# Facet 7: (3..9, 17..22)
# Facet 8: (12..18, 17..22)
# Plus seamless edge wraps!

def build_faceted_slate():
    grid = np.full((T, T), 3, dtype=np.uint8) # default base solid rock C3
    
    facets = [
        # (x, y, w, h)
        (2, 2, 5, 4),
        (9, 1, 6, 4),
        (17, 2, 5, 5),
        (1, 8, 5, 5),
        (8, 7, 6, 6),
        (16, 9, 6, 5),
        (2, 16, 6, 5),
        (10, 15, 6, 5),
        (18, 16, 5, 6)
    ]
    
    for fx, fy, fw, fh in facets:
        # Solid rock body
        for dy in range(fh):
            for dx in range(fw):
                x = (fx + dx) % T
                y = (fy + dy) % T
                grid[y, x] = 3
                
        # Lit face (upper/left area)
        for dy in range(max(1, fh - 2)):
            for dx in range(max(1, fw - 2)):
                x = (fx + dx + 1) % T
                y = (fy + dy + 1) % T
                grid[y, x] = 4
                
        # Top-left highlight
        grid[(fy + 1) % T, (fx + 1) % T] = 5
        grid[(fy + 1) % T, (fx + 2) % T] = 5
        
        # Bottom-right shadow rim
        for dx in range(fw):
            grid[(fy + fh - 1) % T, (fx + dx) % T] = 2
        for dy in range(fh):
            grid[(fy + dy) % T, (fx + fw - 1) % T] = 2
            
        # Crevice crack around bottom-right
        for dx in range(fw + 1):
            grid[(fy + fh) % T, (fx + dx) % T] = 1
        for dy in range(fh + 1):
            grid[(fy + dy) % T, (fx + fw) % T] = 1
            
        # Deep fracture point
        grid[(fy + fh) % T, (fx + fw) % T] = 0

    return PAL[grid]

slate_rgb = build_faceted_slate()

# Tile 4x4
tiled = np.zeros((24 * 4, 24 * 4, 3), dtype=np.uint8)
for ty in range(4):
    for tx in range(4):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = slate_rgb

im = Image.fromarray(tiled).resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
im.save('scratch/faceted_slate_showcase.png')
print("Saved scratch/faceted_slate_showcase.png")
