from PIL import Image
import numpy as np

# Load dirt
dirt = np.array(Image.open('assets/textures/dirt_24.png').convert('RGB')).astype(np.float32)

lum = 0.299 * dirt[:,:,0] + 0.587 * dirt[:,:,1] + 0.114 * dirt[:,:,2]
norm_lum = (lum - lum.min()) / (lum.max() - lum.min()) # 0 to 1

# In our previous attempt, we mapped norm_lum from 52 to 166 (span of 114 levels with S-curve!)
# That caused severe, high-contrast salt-and-pepper noise -> GRAVEL!
# Now, let's test a calm, solid rock mapping:
# Mean stone: 126
# Low contrast span: 114 to 138 (span of ONLY 24 levels, no S-curve!)
# This makes it a smooth, solid, dense monolithic rock!

smooth_val = 114 + norm_lum * 24

# Slate tint (Terraria style):
r = smooth_val * 0.94
g = smooth_val * 0.99
b = smooth_val * 1.10

smooth_stone = np.stack([r, g, b], axis=-1).astype(np.uint8)

# Now let's add 2-3 natural, organic rock fissures/cracks (pęknięcia skalne):
# A crack has a dark line and a lit shelf on top.
# Unlike the artificial lines before, these follow the natural contours of the stone!
fissures = [
    # Natural meander across upper-left
    (3, 5), (4, 5), (5, 6), (6, 6), (7, 6), (8, 7), (9, 7), (10, 6), (11, 6),
    # Branch
    (7, 7), (8, 8), (8, 9),
    # Meander across lower-right
    (14, 15), (15, 15), (16, 16), (17, 16), (18, 17), (19, 17), (20, 16), (21, 16),
    # Branch
    (18, 18), (19, 19),
    # Corner wrap
    (22, 4), (23, 4), (0, 4), (1, 4)
]

rock_with_cracks = smooth_stone.copy().astype(np.float32)
for x, y in fissures:
    # Dark fissure
    rock_with_cracks[y % 24, x % 24] = [54, 58, 68]
    # Highlight shelf on top
    rock_with_cracks[(y - 1) % 24, x % 24] = np.clip(rock_with_cracks[(y - 1) % 24, x % 24] + 35, 0, 255)
    # Shadow below
    rock_with_cracks[(y + 1) % 24, x % 24] = np.clip(rock_with_cracks[(y + 1) % 24, x % 24] - 25, 0, 255)

rock_with_cracks = np.clip(rock_with_cracks, 0, 255).astype(np.uint8)

# Save previews
def save_4x4(arr, name):
    im = Image.fromarray(arr)
    tiled = Image.new('RGB', (24 * 4, 24 * 4))
    for ty in range(4):
        for tx in range(4):
            tiled.paste(im, (tx * 24, ty * 24))
    tiled.resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST).save(f'scratch/{name}.png')

save_4x4(smooth_stone, 'smooth_stone_4x4')
save_4x4(rock_with_cracks, 'rock_with_cracks_4x4')

print("Saved smooth_stone_4x4 and rock_with_cracks_4x4")
