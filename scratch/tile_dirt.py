from PIL import Image

dirt = Image.open('assets/textures/dirt_24.png')
w, h = dirt.size

tiled = Image.new('RGBA', (w * 4, h * 4))
for ty in range(4):
    for tx in range(4):
        tiled.paste(dirt, (tx * w, ty * h))

tiled.save('scratch/dirt_tiled_4x4.png')
print("Saved dirt_tiled_4x4.png")
