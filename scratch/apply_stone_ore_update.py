import re

with open('scratch/stone_24_rgba.txt', 'r', encoding='utf-8') as f:
    stone_b64 = f.read().strip()

with open('src/textures/TextureGenerator.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add STONE_24_RGBA right after DIRT_WALL_24_RGBA
stone_def = f"const STONE_24_RGBA = '{stone_b64}';\n"
if "const STONE_24_RGBA =" not in code:
    code = code.replace("const DIRT_WALL_24_RGBA = '", stone_def + "const DIRT_WALL_24_RGBA = '")
    print("Added STONE_24_RGBA")
else:
    code = re.sub(r"const STONE_24_RGBA = '.*?';", f"const STONE_24_RGBA = '{stone_b64}';", code)
    print("Updated STONE_24_RGBA")

# 2. Update drawStoneTexture
new_draw_stone = """  public static drawStoneTexture(ctx: CanvasRenderingContext2D, T: number): void {
    TextureGenerator.decodePixelData(ctx, T, T, STONE_24_RGBA);
  }"""

code = re.sub(
    r"  public static drawStoneTexture\(ctx: CanvasRenderingContext2D, T: number\): void \{[\s\S]*?\n  \}",
    new_draw_stone,
    code,
    count=1
)
print("Updated drawStoneTexture")

# 3. Update drawOrganicOreTexture with the new faceted crystal nodules
new_draw_ore = """  public static drawOrganicOreTexture(
    ctx: CanvasRenderingContext2D,
    T: number,
    palette: { socket: string; base: string; bright: string; hi: string; glint: string }
  ): void {
    TextureGenerator.drawStoneTexture(ctx, T);

    const deposits = [
      // Deposit 1 (upper-left, faceted)
      {
        socket: [[5,5,4,1], [4,6,1,2], [8,6,1,1], [4,7,1,1], [9,7,1,1], [5,8,4,1], [6,9,2,1]],
        base:   [[5,6,3,1], [5,7,4,1], [6,8,2,1]],
        bright: [[6,6,2,1], [5,7,2,1]],
        hi:     [[6,6,1,1]],
        glint:  [[6,6,1,1]]
      },
      // Deposit 2 (center-right, faceted)
      {
        socket: [[13,11,4,1], [12,12,1,2], [17,12,1,2], [13,14,1,1], [17,14,1,1], [14,15,3,1]],
        base:   [[14,12,2,1], [13,13,4,1], [14,14,3,1]],
        bright: [[14,12,2,1], [13,13,2,1]],
        hi:     [[14,12,2,1]],
        glint:  [[14,12,1,1]]
      },
      // Deposit 3 (lower-left, faceted)
      {
        socket: [[8,15,4,1], [7,16,1,2], [11,16,1,2], [7,18,1,1], [9,18,2,1], [8,19,1,1]],
        base:   [[9,16,2,1], [8,17,3,1], [8,18,1,1]],
        bright: [[9,16,2,1], [8,17,1,1]],
        hi:     [[9,16,1,1]],
        glint:  [[9,16,1,1]]
      },
      // Deposit 4 (upper-right fleck)
      {
        socket: [[17,4,4,1], [17,5,1,1], [20,5,1,1], [18,6,1,1], [20,6,1,1], [19,7,1,1]],
        base:   [[18,5,2,1], [19,6,1,1]],
        bright: [[18,5,2,1]],
        hi:     [[18,5,1,1]],
        glint:  [[18,5,1,1]]
      },
      // Deposit 5 (lower-edge fleck)
      {
        socket: [[3,12,3,1], [3,13,1,2], [5,13,1,2], [4,15,1,1]],
        base:   [[4,13,1,2]],
        bright: [[4,13,1,1]],
        hi:     [[4,13,1,1]],
        glint:  [[4,13,1,1]]
      }
    ];

    deposits.forEach(dep => {
      ctx.fillStyle = palette.socket;
      dep.socket.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.base;
      dep.base.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.bright;
      dep.bright.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.hi;
      dep.hi.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.glint;
      dep.glint.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
    });
  }"""

code = re.sub(
    r"  public static drawOrganicOreTexture\([\s\S]*?\n  \}",
    new_draw_ore,
    code,
    count=1
)
print("Updated drawOrganicOreTexture")

# 4. Update palettes in createBlockTextures for ores:
# COPPER_ORE
code = re.sub(
    r"drawTile\(`tile_\$\{BlockId\.COPPER_ORE\}`, \(ctx\) => \{[\s\S]*?\n    \}\);",
    """drawTile(`tile_${BlockId.COPPER_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#301405', base: '#c65622', bright: '#ea803e', hi: '#ffaf6c', glint: '#ffe6c8'
      });
    });""",
    code,
    count=1
)

# IRON_ORE
code = re.sub(
    r"drawTile\(`tile_\$\{BlockId\.IRON_ORE\}`, \(ctx\) => \{[\s\S]*?\n    \}\);",
    """drawTile(`tile_${BlockId.IRON_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#24201c', base: '#8a7c70', bright: '#b0a296', hi: '#d6cec6', glint: '#ffffff'
      });
    });""",
    code,
    count=1
)

# COAL_ORE
code = re.sub(
    r"drawTile\(`tile_\$\{BlockId\.COAL_ORE\}`, \(ctx\) => \{[\s\S]*?\n    \}\);",
    """drawTile(`tile_${BlockId.COAL_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#101114', base: '#22242a', bright: '#363a42', hi: '#545a66', glint: '#7d8694'
      });
    });""",
    code,
    count=1
)

# GOLD_ORE
code = re.sub(
    r"drawTile\(`tile_\$\{BlockId\.GOLD_ORE\}`, \(ctx\) => \{[\s\S]*?\n    \}\);",
    """drawTile(`tile_${BlockId.GOLD_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#422e02', base: '#d8a010', bright: '#f8ca26', hi: '#ffec64', glint: '#ffffff'
      });
    });""",
    code,
    count=1
)

# DIAMOND_ORE
code = re.sub(
    r"drawTile\(`tile_\$\{BlockId\.DIAMOND_ORE\}`, \(ctx\) => \{[\s\S]*?\n    \}\);",
    """drawTile(`tile_${BlockId.DIAMOND_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#082e38', base: '#1aaac4', bright: '#44e0f6', hi: '#a5f8ff', glint: '#ffffff'
      });
    });""",
    code,
    count=1
)

# Make sure decodePixelData is public static or private static is fine since called within TextureGenerator
# But just in case, make decodePixelData public static
code = code.replace("private static decodePixelData(", "public static decodePixelData(")

with open('src/textures/TextureGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully written to src/textures/TextureGenerator.ts")
