from PIL import Image

im = Image.open('scratch/stone-0000.png')
print("stone-0000 size:", im.size, "mode:", im.mode)
im.resize((128, 128), Image.NEAREST).save('scratch/stone_0000_128.png')

im2 = Image.open('scratch/stone-0xxx.png')
im2.resize((128, 128), Image.NEAREST).save('scratch/stone_0xxx_128.png')

im3 = Image.open('scratch/stone-x000.png')
im3.resize((128, 128), Image.NEAREST).save('scratch/stone_x000_128.png')
