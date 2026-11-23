with open('src/textures/TextureGenerator.ts', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'icon_stone' in line:
            print(i + 1, line)
