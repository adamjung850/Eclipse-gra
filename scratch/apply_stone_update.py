with open('scratch/new_stone_24_rgba.txt', 'r') as f:
    new_b64 = f.read().strip()

with open('src/textures/TextureGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re
pattern = r'const STONE_24_RGBA = \'[^\']+\';'
replacement = f"const STONE_24_RGBA = '{new_b64}';"

assert re.search(pattern, content), "STONE_24_RGBA pattern not found in TextureGenerator.ts!"

new_content = re.sub(pattern, replacement, content, count=1)

with open('src/textures/TextureGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated src/textures/TextureGenerator.ts successfully!")
