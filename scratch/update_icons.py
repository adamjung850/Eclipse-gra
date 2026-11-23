import re

with open('src/textures/TextureGenerator.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Helper replacement in createItemIcons
block_icon_mappings = [
    ('icon_stone', 'BlockId.STONE'),
    ('icon_plank', 'BlockId.PLANK'),
    ('icon_brick', 'BlockId.BRICK'),
    ('icon_glass', 'BlockId.GLASS'),
    ('icon_obsidian', 'BlockId.OBSIDIAN'),
    ('icon_copper_ore', 'BlockId.COPPER_ORE'),
    ('icon_iron_ore', 'BlockId.IRON_ORE'),
    ('icon_coal', 'BlockId.COAL_ORE'),
    ('icon_gold_ore', 'BlockId.GOLD_ORE'),
    ('icon_diamond_ore', 'BlockId.DIAMOND_ORE'),
    ('icon_snow', 'BlockId.SNOW'),
    ('icon_ice', 'BlockId.ICE'),
    ('icon_sand', 'BlockId.SAND'),
    ('icon_sandstone', 'BlockId.SANDSTONE'),
    ('icon_dark_dirt', 'BlockId.DARK_DIRT'),
    ('icon_hellstone', 'BlockId.HELLSTONE'),
    ('icon_ash', 'BlockId.ASH_BLOCK'),
    ('icon_void_stone', 'BlockId.VOID_STONE'),
    ('icon_void_crystal', 'BlockId.VOID_CRYSTAL'),
    ('icon_chest', 'BlockId.CHEST'),
]

for icon_name, block_id in block_icon_mappings:
    # Pattern to find drawIcon('icon_name', (ctx) => { ... });
    p = r"drawIcon\('" + icon_name + r"', \(ctx\) => \{(?:[^{}]*|\{[^{}]*\})*\n    \}\);"
    m = re.search(p, code)
    if m:
        replacement = f"""drawIcon('{icon_name}', (ctx) => {{
      const tileTex = scene.textures.exists(`tile_${{{block_id}}}`) ? scene.textures.get(`tile_${{{block_id}}}`) : null;
      if (tileTex) {{
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {{
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }}
      }}
    }});"""
        code = code[:m.start()] + replacement + code[m.end():]
        print(f"Updated icon: {icon_name}")
    else:
        print(f"Pattern for {icon_name} not found")

with open('src/textures/TextureGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Finished updating icons in TextureGenerator.ts!")
