import re

with open('src/textures/TextureGenerator.ts', 'r', encoding='utf-8') as f:
    text = f.read()

for line in text.splitlines():
    if any(k in line for k in ['drawStoneTexture', 'drawOrganicOreTexture', 'STONE_24_RGBA', 'createBlockTextures', 'BlockId.STONE']):
        print(line[:100])
