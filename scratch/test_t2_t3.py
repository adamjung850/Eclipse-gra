from PIL import Image

t1 = Image.open('scratch/stone-xxxx.png')
t2 = Image.open('scratch/stone-xxxx (2).png')
t3 = Image.open('scratch/stone-xxxx (3).png')

def tile_it(im, name):
    t = Image.new('RGBA', (64, 64))
    for y in range(4):
        for x in range(4):
            t.paste(im, (x*16, y*16))
    t.resize((256, 256), Image.NEAREST).save(f'scratch/{name}.png')

tile_it(t2, 't2_showcase')
tile_it(t3, 't3_showcase')
print("Saved t2_showcase and t3_showcase")
