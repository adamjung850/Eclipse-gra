import re

with open('src/textures/TextureGenerator.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update BlockId.STONE
old_stone = """    // 3. STONE
    drawTile(`tile_${BlockId.STONE}`, (ctx) => {
      ctx.fillStyle = '#5b616b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#737982';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Highlights & cracks
      ctx.fillStyle = '#8d95a1';
      ctx.fillRect(2, 2, 8, 6);
      ctx.fillRect(14, 10, 7, 6);
      ctx.fillStyle = '#474b54';
      // Crack lines
      ctx.fillRect(7, 3, 2, 5);
      ctx.fillRect(9, 7, 5, 2);
      ctx.fillRect(13, 8, 2, 6);
      ctx.fillRect(4, 15, 8, 2);
      // Shadow bottom-right
      ctx.fillStyle = '#3c4047';
      ctx.fillRect(0, T - 2, T, 2);
      ctx.fillRect(T - 2, 0, 2, T);
    });"""

new_stone = """    // 3. STONE (Terraria-style natural subterranean shale)
    drawTile(`tile_${BlockId.STONE}`, (ctx) => {
      TextureGenerator.drawStoneTexture(ctx, T);
    });"""

assert old_stone in code, "old_stone not found"
code = code.replace(old_stone, new_stone)

# 2. Update COPPER_ORE up through DARK_DIRT (leaving tree blocks intact)
# Let's inspect from line 236 (COPPER_ORE) to line 683 (end of DARK_DIRT)
# Before DARK_WOOD (BlockId.DARK_WOOD)
part1_start = code.find("    // 6. COPPER ORE")
part1_end = code.find("    // 34. DARK WOOD")
assert part1_start != -1 and part1_end != -1, "part1 bounds not found"

new_part1 = """    // 6. COPPER ORE
    drawTile(`tile_${BlockId.COPPER_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        shadow: '#4d1e0a', base: '#ab4418', bright: '#db6429', highlight: '#f79354', sparkle: '#ffdac2'
      });
    });

    // 7. IRON ORE
    drawTile(`tile_${BlockId.IRON_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        shadow: '#382b22', base: '#7a6452', bright: '#ad9582', highlight: '#d6c4b4', sparkle: '#ffffff'
      });
    });

    // 8. COAL ORE
    drawTile(`tile_${BlockId.COAL_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        shadow: '#0d0e12', base: '#1c1d24', bright: '#33353f', highlight: '#575b69', sparkle: '#8b91a3'
      });
    });

    // 9. GOLD ORE
    drawTile(`tile_${BlockId.GOLD_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        shadow: '#5e3c03', base: '#b57e0e', bright: '#f2b522', highlight: '#ffdc47', sparkle: '#ffffff'
      });
    });

    // 10. CRYSTAL ORE
    drawTile(`tile_${BlockId.CRYSTAL_ORE}`, (ctx) => {
      ctx.fillStyle = '#2d2038';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3d2b4d';
      ctx.fillRect(2, 1, 14, 8);
      ctx.fillRect(1, 4, 18, 10);
      ctx.fillRect(7, 10, 15, 11);
      ctx.fillStyle = '#503863';
      ctx.fillRect(4, 2, 10, 4);
      ctx.fillRect(8, 11, 11, 4);

      ctx.fillStyle = '#1c1424';
      ctx.fillRect(0, 8, 5, 2);
      ctx.fillRect(4, 10, 3, 2);
      ctx.fillRect(6, 12, 2, 3);
      ctx.fillRect(14, 2, 2, 2);

      const crystals = [
        { x: 4, y: 3, w: 6, h: 5 },
        { x: 12, y: 5, w: 6, h: 5 },
        { x: 7, y: 11, w: 5, h: 5 },
        { x: 14, y: 14, w: 6, h: 5 },
        { x: 3, y: 16, w: 4, h: 4 }
      ];
      crystals.forEach(c => {
        ctx.fillStyle = '#420d66';
        ctx.fillRect(c.x - 1, c.y - 1, c.w + 2, c.h + 2);
        ctx.fillStyle = '#831ec7';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#ab3bf0';
        ctx.fillRect(c.x + 1, c.y + 1, c.w - 1, c.h - 1);
        ctx.fillStyle = '#dc7aff';
        ctx.fillRect(c.x + 1, c.y + 1, Math.max(1, c.w - 2), 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(c.x + 2, c.y + 1, 2, 1);
      });
    });

    // 11. BRICK
    drawTile(`tile_${BlockId.BRICK}`, (ctx) => {
      ctx.fillStyle = '#26282e';
      ctx.fillRect(0, 0, T, T);

      const brickRows = [
        [{ x: 1, y: 1, w: 10, h: 4 }, { x: 12, y: 1, w: 11, h: 4 }],
        [{ x: 1, y: 6, w: 4, h: 4 }, { x: 6, y: 6, w: 11, h: 4 }, { x: 18, y: 6, w: 5, h: 4 }],
        [{ x: 1, y: 11, w: 10, h: 5 }, { x: 12, y: 11, w: 11, h: 5 }],
        [{ x: 1, y: 17, w: 5, h: 5 }, { x: 7, y: 17, w: 10, h: 5 }, { x: 18, y: 17, w: 5, h: 5 }]
      ];

      brickRows.forEach(row => {
        row.forEach(b => {
          ctx.fillStyle = '#545963';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = '#7a8291';
          ctx.fillRect(b.x, b.y, b.w, 1);
          ctx.fillRect(b.x, b.y, 1, b.h);
          ctx.fillStyle = '#636975';
          ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
          ctx.fillStyle = '#3a3d45';
          ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
          ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
        });
      });
    });

    // 12. PLANK
    drawTile(`tile_${BlockId.PLANK}`, (ctx) => {
      ctx.fillStyle = '#331e0d';
      ctx.fillRect(0, 0, T, T);

      const boards = [
        { x: 0, y: 1, w: T, h: 6 },
        { x: 0, y: 9, w: T, h: 6 },
        { x: 0, y: 17, w: T, h: 6 }
      ];

      boards.forEach(b => {
        ctx.fillStyle = '#8a5929';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#9c6630';
        ctx.fillRect(b.x, b.y + 1, b.w, b.h - 2);
        ctx.fillStyle = '#be8547';
        ctx.fillRect(b.x, b.y, b.w, 1);
        ctx.fillStyle = '#d69956';
        ctx.fillRect(b.x + 4, b.y, 12, 1);
        ctx.fillStyle = '#73461c';
        ctx.fillRect(b.x, b.y + 3, b.w, 1);
        ctx.fillRect(b.x + 6, b.y + 4, 10, 1);
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
        // Nails
        ctx.fillStyle = '#26180a';
        ctx.fillRect(b.x + 2, b.y + 2, 2, 2);
        ctx.fillRect(b.x + b.w - 4, b.y + 2, 2, 2);
        ctx.fillStyle = '#8a94a3';
        ctx.fillRect(b.x + 2, b.y + 2, 1, 1);
        ctx.fillRect(b.x + b.w - 4, b.y + 2, 1, 1);
      });
    });

    // 13. GLASS
    drawTile(`tile_${BlockId.GLASS}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#4da2b0';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = 'rgba(165, 230, 245, 0.35)';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#94e8f5';
      ctx.fillRect(1, 1, T - 2, 1);
      ctx.fillRect(1, 1, 1, T - 2);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 14; i++) {
        ctx.fillRect(4 + i, 18 - i, 2, 1);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(12 + i, 20 - i, 1, 1);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 2, 2, 2);
    });

    // 14. OBSIDIAN
    drawTile(`tile_${BlockId.OBSIDIAN}`, (ctx) => {
      ctx.fillStyle = '#0a0712';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#140e21';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#241838';
      ctx.fillRect(2, 2, 14, 9);
      ctx.fillRect(8, 11, 14, 10);
      ctx.fillRect(2, 13, 8, 8);

      ctx.fillStyle = '#472b6e';
      ctx.fillRect(3, 3, 11, 3);
      ctx.fillRect(9, 12, 11, 3);
      ctx.fillRect(3, 14, 5, 2);

      ctx.fillStyle = '#7346ad';
      ctx.fillRect(5, 3, 7, 1);
      ctx.fillRect(11, 12, 7, 1);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 3, 2, 1);
      ctx.fillRect(13, 12, 2, 1);
    });

    // 15. BEDROCK
    drawTile(`tile_${BlockId.BEDROCK}`, (ctx) => {
      ctx.fillStyle = '#0a0b0e';
      ctx.fillRect(0, 0, T, T);

      ctx.fillStyle = '#151821';
      ctx.fillRect(1, 1, 15, 9);
      ctx.fillRect(8, 10, 15, 12);
      ctx.fillRect(1, 12, 9, 10);

      ctx.fillStyle = '#222836';
      ctx.fillRect(3, 2, 10, 5);
      ctx.fillRect(10, 12, 11, 6);
      ctx.fillRect(2, 14, 6, 5);

      ctx.fillStyle = '#313a4d';
      ctx.fillRect(5, 3, 6, 2);
      ctx.fillRect(12, 13, 7, 2);

      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 9, 8, 2);
      ctx.fillRect(7, 11, 3, 2);
      ctx.fillRect(15, 2, 2, 8);
      ctx.fillRect(16, 9, 8, 2);
    });

    // 16. WALL TILES
    drawTile(`tile_${BlockId.DIRT_WALL}`, (ctx) => {
      ctx.fillStyle = '#2e1e12';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3d2817';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#4a321d';
      ctx.fillRect(3, 3, 8, 6);
      ctx.fillRect(13, 9, 8, 7);
      ctx.fillRect(4, 14, 7, 6);
      ctx.fillStyle = '#24160a';
      ctx.fillRect(8, 7, 2, 2);
      ctx.fillRect(15, 17, 2, 2);
    });

    drawTile(`tile_${BlockId.STONE_WALL}`, (ctx) => {
      ctx.fillStyle = '#222429';
      ctx.fillRect(0, 0, T, T);

      const bricks = [
        { x: 1, y: 1, w: 10, h: 4 }, { x: 12, y: 1, w: 11, h: 4 },
        { x: 1, y: 6, w: 5, h: 4 }, { x: 7, y: 6, w: 10, h: 4 }, { x: 18, y: 6, w: 5, h: 4 },
        { x: 1, y: 11, w: 10, h: 5 }, { x: 12, y: 11, w: 11, h: 5 },
        { x: 1, y: 17, w: 5, h: 5 }, { x: 7, y: 17, w: 10, h: 5 }, { x: 18, y: 17, w: 5, h: 5 }
      ];
      bricks.forEach(b => {
        ctx.fillStyle = '#393c45';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#4a4f5c';
        ctx.fillRect(b.x, b.y, b.w, 1);
        ctx.fillRect(b.x, b.y, 1, b.h);
      });
    });

    drawTile(`tile_${BlockId.WOOD_WALL}`, (ctx) => {
      ctx.fillStyle = '#211409';
      ctx.fillRect(0, 0, T, T);
      const boards = [{ x: 1, w: 6 }, { x: 9, w: 6 }, { x: 17, w: 6 }];
      boards.forEach(b => {
        ctx.fillStyle = '#422a14';
        ctx.fillRect(b.x, 0, b.w, T);
        ctx.fillStyle = '#54361a';
        ctx.fillRect(b.x + 1, 0, b.w - 2, T);
        ctx.fillStyle = '#694421';
        ctx.fillRect(b.x + 2, 0, 1, T);
      });
    });

    // 19. TORCH
    drawTile(`tile_${BlockId.TORCH}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#262930';
      ctx.fillRect(8, 14, 8, 2);
      ctx.fillRect(8, 16, 2, 4);

      ctx.fillStyle = '#543419';
      ctx.fillRect(10, 8, 4, 14);
      ctx.fillStyle = '#784b25';
      ctx.fillRect(11, 8, 2, 14);

      ctx.fillStyle = '#e63700';
      ctx.fillRect(8, 4, 8, 6);
      ctx.fillStyle = '#ff7b00';
      ctx.fillRect(9, 3, 6, 6);
      ctx.fillStyle = '#ffc800';
      ctx.fillRect(10, 2, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 2, 2, 3);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(10, 0, 1, 1);
      ctx.fillRect(13, 1, 1, 1);
    });

    // 20. WORKBENCH
    drawTile(`tile_${BlockId.WORKBENCH}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#70431e';
      ctx.fillRect(1, 4, 22, 6);
      ctx.fillStyle = '#8f5728';
      ctx.fillRect(2, 5, 20, 4);
      ctx.fillStyle = '#bd7d42';
      ctx.fillRect(2, 4, 20, 1);

      ctx.fillStyle = '#472a12';
      ctx.fillRect(3, 10, 4, 13);
      ctx.fillRect(17, 10, 4, 13);
      ctx.fillStyle = '#5c3718';
      ctx.fillRect(4, 10, 2, 13);
      ctx.fillRect(18, 10, 2, 13);

      ctx.fillStyle = '#38200c';
      ctx.fillRect(3, 16, 18, 3);

      ctx.fillStyle = '#363b45';
      ctx.fillRect(3, 1, 5, 3);
      ctx.fillStyle = '#8c95a6';
      ctx.fillRect(4, 2, 4, 1);
      ctx.fillStyle = '#c99420';
      ctx.fillRect(14, 2, 5, 2);
      ctx.fillStyle = '#f0b835';
      ctx.fillRect(15, 2, 2, 1);
    });

    // 21. FURNACE
    drawTile(`tile_${BlockId.FURNACE}`, (ctx) => {
      ctx.fillStyle = '#383b42';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#545863';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#6b717e';
      ctx.fillRect(2, 2, 9, 4);
      ctx.fillRect(13, 2, 9, 4);
      ctx.fillStyle = '#26282e';
      ctx.fillRect(0, 6, T, 1);
      ctx.fillRect(11, 0, 1, 7);

      ctx.fillStyle = '#141517';
      ctx.fillRect(4, 9, 16, 13);

      ctx.fillStyle = '#b32200';
      ctx.fillRect(6, 13, 12, 8);
      ctx.fillStyle = '#eb4c07';
      ctx.fillRect(7, 14, 10, 6);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(8, 15, 8, 4);
      ctx.fillStyle = '#ffea59';
      ctx.fillRect(9, 16, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 16, 3, 1);

      ctx.fillStyle = '#1e1f24';
      ctx.fillRect(6, 0, 12, 2);
    });

    // 22. ANVIL
    drawTile(`tile_${BlockId.ANVIL}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#171921';
      ctx.fillRect(3, 18, 18, 5);
      ctx.fillStyle = '#2d3240';
      ctx.fillRect(4, 18, 16, 2);

      ctx.fillStyle = '#222530';
      ctx.fillRect(7, 11, 10, 7);
      ctx.fillStyle = '#383e52';
      ctx.fillRect(9, 11, 6, 7);

      ctx.fillStyle = '#383e52';
      ctx.fillRect(1, 5, 22, 6);
      ctx.fillStyle = '#57607a';
      ctx.fillRect(4, 5, 17, 3);
      ctx.fillStyle = '#9cb0d4';
      ctx.fillRect(5, 5, 15, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, 5, 6, 1);

      ctx.fillStyle = '#383e52';
      ctx.fillRect(0, 6, 2, 3);
    });

    // 23. DIAMOND ORE
    drawTile(`tile_${BlockId.DIAMOND_ORE}`, (ctx) => {
      ctx.fillStyle = '#262c38';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#343c4d';
      ctx.fillRect(2, 1, 14, 8);
      ctx.fillRect(1, 4, 18, 10);
      ctx.fillRect(7, 10, 15, 11);
      ctx.fillStyle = '#444e63';
      ctx.fillRect(4, 2, 10, 4);
      ctx.fillRect(8, 11, 11, 4);

      ctx.fillStyle = '#181c24';
      ctx.fillRect(0, 8, 5, 2);
      ctx.fillRect(4, 10, 3, 2);
      ctx.fillRect(6, 12, 2, 3);
      ctx.fillRect(14, 2, 2, 2);
      ctx.fillRect(15, 4, 3, 2);

      const diamonds = [
        { x: 4, y: 3, w: 6, h: 5 },
        { x: 12, y: 5, w: 6, h: 5 },
        { x: 7, y: 11, w: 5, h: 5 },
        { x: 14, y: 14, w: 6, h: 5 },
        { x: 3, y: 16, w: 4, h: 4 }
      ];
      diamonds.forEach(d => {
        ctx.fillStyle = '#026aa3';
        ctx.fillRect(d.x - 1, d.y - 1, d.w + 2, d.h + 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(d.x + 1, d.y + 1, d.w - 1, d.h - 1);
        ctx.fillStyle = '#a5f3fc';
        ctx.fillRect(d.x + 1, d.y + 1, Math.max(1, d.w - 2), 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(d.x + 2, d.y + 1, 2, 1);
      });
    });

    // --- ETAP 4: BIOME BLOCKS ---
    // 28. SNOW
    drawTile(`tile_${BlockId.SNOW}`, (ctx) => {
      ctx.fillStyle = '#bed5eb';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#d8e8f7';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#edf5fc';
      ctx.fillRect(0, 1, T, 6);
      ctx.fillRect(0, 9, T, 5);
      ctx.fillRect(0, 16, T, 6);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 1, 9, 3);
      ctx.fillRect(13, 2, 8, 3);
      ctx.fillRect(4, 9, 12, 3);
      ctx.fillRect(1, 16, 10, 3);
      ctx.fillRect(13, 17, 9, 3);

      ctx.fillStyle = '#adcbe6';
      ctx.fillRect(1, 6, 6, 2);
      ctx.fillRect(16, 7, 6, 2);
      ctx.fillRect(8, 14, 6, 2);
      ctx.fillRect(3, 21, 8, 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 3, 1, 1);
      ctx.fillRect(17, 3, 1, 1);
      ctx.fillRect(8, 10, 1, 1);
      ctx.fillRect(15, 18, 1, 1);
    });

    // 29. ICE
    drawTile(`tile_${BlockId.ICE}`, (ctx) => {
      ctx.fillStyle = '#4496ba';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#62badb';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#8ee0f5';
      ctx.fillRect(2, 2, 14, 9);
      ctx.fillRect(9, 11, 13, 10);
      ctx.fillRect(2, 13, 9, 9);

      ctx.fillStyle = '#bdf0fc';
      ctx.fillRect(4, 3, 10, 5);
      ctx.fillRect(11, 12, 9, 5);
      ctx.fillRect(3, 14, 6, 5);

      ctx.fillStyle = '#2c708f';
      for (let i = 0; i < 9; i++) {
        ctx.fillRect(2 + i, 10 - i, 1, 1);
        ctx.fillRect(12 + i, 20 - i, 1, 1);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 3, 5, 1);
      ctx.fillRect(12, 12, 5, 1);
    });

    // 30. SAND
    drawTile(`tile_${BlockId.SAND}`, (ctx) => {
      ctx.fillStyle = '#b38634';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#c7993f';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#dbae4d';
      ctx.fillRect(0, 3, 11, 2);
      ctx.fillRect(11, 4, 13, 2);
      ctx.fillRect(0, 10, 14, 2);
      ctx.fillRect(14, 11, 10, 2);
      ctx.fillRect(0, 17, 9, 2);
      ctx.fillRect(9, 18, 15, 2);

      ctx.fillStyle = '#f0ca6e';
      ctx.fillRect(2, 3, 7, 1);
      ctx.fillRect(13, 4, 8, 1);
      ctx.fillRect(3, 10, 8, 1);
      ctx.fillRect(15, 11, 7, 1);
      ctx.fillRect(2, 17, 5, 1);
      ctx.fillRect(11, 18, 9, 1);

      ctx.fillStyle = '#9e7327';
      ctx.fillRect(1, 5, 8, 1);
      ctx.fillRect(13, 6, 8, 1);
      ctx.fillRect(2, 12, 10, 1);
      ctx.fillRect(12, 20, 9, 1);

      ctx.fillStyle = '#fff4cc';
      ctx.fillRect(5, 3, 1, 1);
      ctx.fillRect(16, 4, 1, 1);
      ctx.fillRect(7, 10, 1, 1);
      ctx.fillRect(18, 11, 1, 1);
      ctx.fillRect(14, 18, 1, 1);
    });

    // 31. SANDSTONE
    drawTile(`tile_${BlockId.SANDSTONE}`, (ctx) => {
      ctx.fillStyle = '#7a501a';
      ctx.fillRect(0, 0, T, T);

      const strata = [
        { y: 1, h: 5, base: '#b5853c', hi: '#cca054', lo: '#946624' },
        { y: 7, h: 4, base: '#8a5c1e', hi: '#a37129', lo: '#6e4712' },
        { y: 12, h: 5, base: '#bd8f44', hi: '#d4aa59', lo: '#996d29' },
        { y: 18, h: 5, base: '#9c6c22', hi: '#b3812f', lo: '#7a5015' }
      ];

      strata.forEach(s => {
        ctx.fillStyle = s.base;
        ctx.fillRect(0, s.y, T, s.h);
        ctx.fillStyle = s.hi;
        ctx.fillRect(0, s.y, T, 1);
        ctx.fillRect(3, s.y + 1, 8, 2);
        ctx.fillRect(14, s.y + 1, 7, 2);
        ctx.fillStyle = s.lo;
        ctx.fillRect(0, s.y + s.h - 1, T, 1);
      });

      ctx.fillStyle = '#52340b';
      ctx.fillRect(8, 1, 1, 5);
      ctx.fillRect(16, 7, 1, 4);
      ctx.fillRect(6, 12, 1, 5);
      ctx.fillRect(17, 18, 1, 5);
    });

    // 32. DARK GRASS
    drawTile(`tile_${BlockId.DARK_GRASS}`, (ctx) => {
      ctx.fillStyle = '#261c2e';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#392a45';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#1c1029';
      ctx.fillRect(0, 0, T, 6);
      ctx.fillStyle = '#321d47';
      ctx.fillRect(0, 0, T, 4);
      ctx.fillStyle = '#542f78';
      ctx.fillRect(2, 1, 6, 2);
      ctx.fillRect(11, 1, 7, 2);
      ctx.fillStyle = '#7843ab';
      ctx.fillRect(3, 1, 3, 1);
      ctx.fillRect(13, 1, 3, 1);

      ctx.fillStyle = '#321d47';
      ctx.fillRect(2, 4, 2, 4);
      ctx.fillRect(6, 4, 3, 5);
      ctx.fillRect(12, 4, 2, 4);
      ctx.fillRect(17, 4, 3, 5);
      ctx.fillStyle = '#542f78';
      ctx.fillRect(3, 4, 1, 2);
      ctx.fillRect(7, 4, 1, 3);
      ctx.fillRect(18, 4, 1, 3);
    });

    // 33. DARK DIRT
    drawTile(`tile_${BlockId.DARK_DIRT}`, (ctx) => {
      ctx.fillStyle = '#291e30';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3a2d45';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#4c3a59';
      ctx.fillRect(3, 3, 7, 6);
      ctx.fillRect(13, 8, 8, 7);
      ctx.fillRect(4, 14, 8, 6);

      ctx.fillStyle = '#634b75';
      ctx.fillRect(5, 5, 4, 2);
      ctx.fillRect(15, 10, 4, 2);
      ctx.fillStyle = '#1b1421';
      ctx.fillRect(8, 6, 2, 2);
      ctx.fillRect(14, 17, 2, 2);
    });
"""

code = code[:part1_start] + new_part1 + code[part1_end:]

# 3. Update MOSSY_STONE (line 712 to before CACTUS)
mossy_start = code.find("    // 36. MOSSY STONE")
mossy_end = code.find("    // 37. CACTUS")
assert mossy_start != -1 and mossy_end != -1, "mossy bounds not found"

new_mossy = """    // 36. MOSSY STONE
    drawTile(`tile_${BlockId.MOSSY_STONE}`, (ctx) => {
      TextureGenerator.drawStoneTexture(ctx, T);

      const moss = [
        { x: 1, y: 1, w: 9, h: 4 },
        { x: 3, y: 4, w: 6, h: 2 },
        { x: 13, y: 2, w: 8, h: 4 },
        { x: 5, y: 8, w: 9, h: 3 },
        { x: 12, y: 12, w: 10, h: 5 },
        { x: 2, y: 16, w: 7, h: 4 }
      ];

      moss.forEach(m => {
        ctx.fillStyle = '#143818';
        ctx.fillRect(m.x - 1, m.y - 1, m.w + 2, m.h + 2);
        ctx.fillStyle = '#23612b';
        ctx.fillRect(m.x, m.y, m.w, m.h);
        ctx.fillStyle = '#368c40';
        ctx.fillRect(m.x + 1, m.y + 1, Math.max(1, m.w - 1), Math.max(1, m.h - 1));
        ctx.fillStyle = '#54b860';
        ctx.fillRect(m.x + 1, m.y + 1, Math.max(1, m.w - 2), 2);
        ctx.fillStyle = '#82e690';
        ctx.fillRect(m.x + 2, m.y + 1, 1, 1);
      });
    });
"""
code = code[:mossy_start] + new_mossy + code[mossy_end:]

# 4. Update CRYSTAL_BLOCK through CHEST (before PALM_WOOD)
part2_start = code.find("    // 38. CRYSTAL BLOCK")
part2_end = code.find("    // 46. PALM WOOD")
assert part2_start != -1 and part2_end != -1, "part2 bounds not found"

new_part2 = """    // 38. CRYSTAL BLOCK
    drawTile(`tile_${BlockId.CRYSTAL_BLOCK}`, (ctx) => {
      ctx.fillStyle = '#24083b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3b0d5e';
      ctx.fillRect(1, 1, T - 2, T - 2);

      // Gemstone facet planes
      ctx.fillStyle = '#63189e';
      ctx.fillRect(3, 3, 11, 11);
      ctx.fillStyle = '#8c24de';
      ctx.fillRect(4, 4, 9, 9);
      ctx.fillStyle = '#b747fa';
      ctx.fillRect(5, 5, 7, 7);
      ctx.fillStyle = '#db82ff';
      ctx.fillRect(6, 6, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 7, 2, 2);

      ctx.fillStyle = '#541287';
      ctx.fillRect(14, 2, 8, 8);
      ctx.fillStyle = '#781ec2';
      ctx.fillRect(15, 3, 6, 6);
      ctx.fillStyle = '#a633fa';
      ctx.fillRect(16, 4, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 4, 2, 1);

      ctx.fillStyle = '#480f73';
      ctx.fillRect(13, 13, 9, 9);
      ctx.fillStyle = '#6b18ad';
      ctx.fillRect(14, 14, 7, 7);
      ctx.fillStyle = '#9b2bf0';
      ctx.fillRect(15, 15, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, 15, 2, 1);

      ctx.fillStyle = '#501180';
      ctx.fillRect(2, 14, 8, 8);
      ctx.fillStyle = '#731bb8';
      ctx.fillRect(3, 15, 6, 6);
      ctx.fillStyle = '#9e29f5';
      ctx.fillRect(4, 16, 4, 4);

      ctx.fillStyle = '#160424';
      ctx.fillRect(14, 0, 1, T);
      ctx.fillRect(0, 14, T, 1);
    });

    // 39. CRYSTAL WALL
    drawTile(`tile_${BlockId.CRYSTAL_WALL}`, (ctx) => {
      ctx.fillStyle = '#1b0729';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#2c0c42';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#421463';
      ctx.fillRect(3, 3, 7, 7);
      ctx.fillRect(13, 11, 7, 7);
      ctx.fillStyle = '#9b38e8';
      ctx.fillRect(6, 6, 2, 2);
      ctx.fillRect(16, 14, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 1, 1);
    });

    // 40. HELLSTONE
    drawTile(`tile_${BlockId.HELLSTONE}`, (ctx) => {
      ctx.fillStyle = '#1c0503';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#310b06';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#471009';
      ctx.fillRect(2, 2, 14, 8);
      ctx.fillRect(7, 10, 15, 11);

      const magmaSegments = [
        { x: 1, y: 7, w: 7, h: 2 },
        { x: 7, y: 5, w: 2, h: 6 },
        { x: 8, y: 10, w: 6, h: 2 },
        { x: 13, y: 8, w: 2, h: 5 },
        { x: 14, y: 8, w: 8, h: 2 },
        { x: 10, y: 12, w: 3, h: 6 },
        { x: 12, y: 17, w: 9, h: 2 },
        { x: 4, y: 15, w: 7, h: 2 }
      ];

      ctx.fillStyle = '#8f1701';
      magmaSegments.forEach(m => ctx.fillRect(m.x - 1, m.y - 1, m.w + 2, m.h + 2));
      ctx.fillStyle = '#db3509';
      magmaSegments.forEach(m => ctx.fillRect(m.x, m.y, m.w, m.h));
      ctx.fillStyle = '#ff7512';
      magmaSegments.forEach(m => ctx.fillRect(m.x, m.y, Math.max(1, m.w - 1), Math.max(1, m.h - 1)));
      ctx.fillStyle = '#ffca29';
      ctx.fillRect(7, 5, 2, 2);
      ctx.fillRect(13, 8, 2, 2);
      ctx.fillRect(10, 12, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 5, 1, 1);
      ctx.fillRect(13, 8, 1, 1);
    });

    // 41. ASH BLOCK
    drawTile(`tile_${BlockId.ASH_BLOCK}`, (ctx) => {
      ctx.fillStyle = '#171517';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#262426';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#383538';
      ctx.fillRect(2, 2, 14, 6);
      ctx.fillRect(7, 9, 15, 10);
      ctx.fillRect(2, 13, 8, 9);

      ctx.fillStyle = '#4a464a';
      ctx.fillRect(4, 3, 9, 3);
      ctx.fillRect(10, 11, 9, 4);

      ctx.fillStyle = '#e62e00';
      ctx.fillRect(7, 6, 2, 2);
      ctx.fillRect(16, 11, 2, 2);
      ctx.fillRect(5, 17, 2, 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(7, 6, 1, 1);
      ctx.fillRect(16, 11, 1, 1);
    });

    // 42. LAVA ROCK
    drawTile(`tile_${BlockId.LAVA_ROCK}`, (ctx) => {
      ctx.fillStyle = '#9e1800';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#db3707';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#ff7300';
      ctx.fillRect(2, 2, T - 4, T - 4);
      ctx.fillStyle = '#ffc414';
      for (let i = 0; i < 16; i++) {
        ctx.fillRect(4 + i, 3 + i, 4, 4);
      }
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 10; i++) {
        ctx.fillRect(7 + i, 6 + i, 2, 2);
      }

      ctx.fillStyle = '#140f13';
      ctx.fillRect(0, 0, 7, 16);
      ctx.fillRect(7, 0, 8, 8);
      ctx.fillRect(0, 16, 4, 8);
      ctx.fillStyle = '#261b24';
      ctx.fillRect(1, 1, 5, 13);
      ctx.fillRect(6, 1, 7, 6);
      ctx.fillStyle = '#3d2b3a';
      ctx.fillRect(2, 2, 3, 10);
      ctx.fillRect(5, 2, 6, 4);

      ctx.fillStyle = '#140f13';
      ctx.fillRect(15, 8, 9, 16);
      ctx.fillRect(9, 16, 7, 8);
      ctx.fillRect(17, 3, 7, 5);
      ctx.fillStyle = '#261b24';
      ctx.fillRect(16, 9, 7, 14);
      ctx.fillRect(10, 17, 6, 6);
      ctx.fillStyle = '#3d2b3a';
      ctx.fillRect(17, 10, 5, 11);
      ctx.fillRect(11, 18, 4, 4);
    });

    // 43. VOID STONE
    drawTile(`tile_${BlockId.VOID_STONE}`, (ctx) => {
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#0d091a';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#1e1136';
      ctx.fillRect(2, 2, 14, 8);
      ctx.fillRect(8, 10, 14, 11);

      ctx.fillStyle = '#331b5c';
      ctx.fillRect(4, 4, 9, 4);
      ctx.fillRect(11, 12, 9, 5);

      ctx.fillStyle = '#a83af5';
      ctx.fillRect(6, 5, 1, 1);
      ctx.fillRect(16, 13, 1, 1);
      ctx.fillRect(9, 18, 1, 1);
      ctx.fillStyle = '#ff66ff';
      ctx.fillRect(15, 4, 1, 1);
      ctx.fillRect(4, 14, 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 6, 1, 1);
      ctx.fillRect(7, 12, 1, 1);
    });

    // 44. VOID CRYSTAL
    drawTile(`tile_${BlockId.VOID_CRYSTAL}`, (ctx) => {
      ctx.fillStyle = '#120221';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#24053d';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#540f85';
      ctx.fillRect(3, 3, 11, 11);
      ctx.fillStyle = '#7d19c7';
      ctx.fillRect(4, 4, 9, 9);
      ctx.fillStyle = '#ad2bf0';
      ctx.fillRect(5, 5, 7, 7);
      ctx.fillStyle = '#d96eff';
      ctx.fillRect(6, 6, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 7, 2, 2);

      ctx.fillStyle = '#480d73';
      ctx.fillRect(14, 2, 8, 8);
      ctx.fillStyle = '#6b16a3';
      ctx.fillRect(15, 3, 6, 6);
      ctx.fillStyle = '#9b24ed';
      ctx.fillRect(16, 4, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 4, 2, 1);

      ctx.fillStyle = '#3d0a61';
      ctx.fillRect(13, 13, 9, 9);
      ctx.fillStyle = '#5e1294';
      ctx.fillRect(14, 14, 7, 7);
      ctx.fillStyle = '#8f1fe3';
      ctx.fillRect(15, 15, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, 15, 2, 1);

      ctx.fillStyle = '#420b69';
      ctx.fillRect(2, 14, 8, 8);
      ctx.fillStyle = '#63139c';
      ctx.fillRect(3, 15, 6, 6);
      ctx.fillStyle = '#8f1fe3';
      ctx.fillRect(4, 16, 4, 4);
    });

    // 45. CHEST (Interactive ancient chest)
    drawTile(`tile_${BlockId.CHEST}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(2, 6, 20, 16);
      ctx.fillStyle = '#6e411b';
      ctx.fillRect(3, 7, 18, 14);
      ctx.fillStyle = '#875122';
      ctx.fillRect(3, 8, 18, 3);
      ctx.fillStyle = '#875122';
      ctx.fillRect(3, 14, 18, 3);

      ctx.fillStyle = '#26150a';
      ctx.fillRect(3, 11, 18, 2);

      ctx.fillStyle = '#333842';
      ctx.fillRect(3, 7, 3, 14);
      ctx.fillRect(18, 7, 3, 14);
      ctx.fillStyle = '#545c6e';
      ctx.fillRect(4, 7, 1, 14);
      ctx.fillRect(19, 7, 1, 14);
      ctx.fillStyle = '#8a94a6';
      ctx.fillRect(4, 8, 1, 1);
      ctx.fillRect(4, 18, 1, 1);
      ctx.fillRect(19, 8, 1, 1);
      ctx.fillRect(19, 18, 1, 1);

      ctx.fillStyle = '#8f6815';
      ctx.fillRect(10, 10, 4, 6);
      ctx.fillStyle = '#f5c838';
      ctx.fillRect(11, 11, 2, 4);
      ctx.fillStyle = '#140f06';
      ctx.fillRect(11, 13, 2, 1);
    });
"""

code = code[:part2_start] + new_part2 + code[part2_end:]

# 5. Add static helper methods `drawStoneTexture` and `drawOrganicOreTexture`
helper_methods = """  public static drawStoneTexture(ctx: CanvasRenderingContext2D, T: number): void {
    ctx.fillStyle = '#616773';
    ctx.fillRect(0, 0, T, T);

    ctx.fillStyle = '#727987';
    ctx.fillRect(2, 1, 14, 8);
    ctx.fillRect(1, 4, 18, 10);
    ctx.fillRect(7, 10, 15, 11);
    ctx.fillRect(3, 15, 14, 7);

    ctx.fillStyle = '#87909e';
    ctx.fillRect(4, 2, 10, 4);
    ctx.fillRect(8, 11, 11, 4);
    ctx.fillRect(4, 16, 7, 3);

    ctx.fillStyle = '#9da7b5';
    ctx.fillRect(6, 2, 5, 2);
    ctx.fillRect(11, 11, 5, 2);
    ctx.fillRect(5, 16, 3, 1);

    ctx.fillStyle = '#474c57';
    ctx.fillRect(14, 2, 2, 2);
    ctx.fillRect(15, 4, 3, 2);
    ctx.fillRect(18, 5, 4, 1);
    ctx.fillRect(20, 6, 2, 3);
    ctx.fillRect(0, 8, 3, 1);
    ctx.fillRect(2, 9, 4, 2);
    ctx.fillRect(5, 11, 3, 2);
    ctx.fillRect(7, 13, 2, 3);
    ctx.fillRect(12, 17, 3, 2);
    ctx.fillRect(15, 18, 4, 2);
    ctx.fillRect(19, 19, 3, 2);
    ctx.fillRect(9, 21, 4, 2);

    ctx.fillStyle = '#33373f';
    ctx.fillRect(16, 4, 2, 1);
    ctx.fillRect(3, 9, 2, 1);
    ctx.fillRect(6, 12, 2, 1);
    ctx.fillRect(14, 18, 2, 1);
    ctx.fillRect(10, 21, 2, 1);

    ctx.fillStyle = '#525761';
    ctx.fillRect(7, 7, 2, 1);
    ctx.fillRect(13, 8, 1, 2);
    ctx.fillRect(3, 14, 2, 1);
    ctx.fillRect(17, 14, 2, 1);
    ctx.fillStyle = '#adb8c7';
    ctx.fillRect(8, 3, 1, 1);
    ctx.fillRect(13, 12, 1, 1);
  }

  public static drawOrganicOreTexture(
    ctx: CanvasRenderingContext2D,
    T: number,
    palette: { shadow: string; base: string; bright: string; highlight: string; sparkle: string }
  ): void {
    TextureGenerator.drawStoneTexture(ctx, T);

    const veinNuggets = [
      { x: 3, y: 3, w: 6, h: 4 },
      { x: 6, y: 6, w: 5, h: 4 },
      { x: 13, y: 7, w: 6, h: 5 },
      { x: 11, y: 11, w: 5, h: 4 },
      { x: 14, y: 14, w: 7, h: 5 },
      { x: 17, y: 18, w: 4, h: 4 },
      { x: 3, y: 16, w: 4, h: 3 }
    ];

    ctx.fillStyle = palette.shadow;
    veinNuggets.forEach(n => ctx.fillRect(n.x - 1, n.y - 1, n.w + 2, n.h + 2));
    ctx.fillStyle = palette.base;
    veinNuggets.forEach(n => ctx.fillRect(n.x, n.y, n.w, n.h));
    ctx.fillStyle = palette.bright;
    veinNuggets.forEach(n => ctx.fillRect(n.x + 1, n.y + 1, Math.max(1, n.w - 1), Math.max(1, n.h - 1)));
    ctx.fillStyle = palette.highlight;
    veinNuggets.forEach(n => ctx.fillRect(n.x + 1, n.y + 1, Math.max(1, n.w - 2), Math.max(1, Math.floor(n.h / 2))));
    ctx.fillStyle = palette.sparkle;
    ctx.fillRect(4, 4, 2, 1);
    ctx.fillRect(15, 8, 2, 1);
    ctx.fillRect(16, 15, 2, 1);
    ctx.fillRect(4, 17, 1, 1);
  }

"""

# Insert helper methods right before `private static createBlockTextures`
cb_idx = code.find("  private static createBlockTextures(")
assert cb_idx != -1, "createBlockTextures not found"
code = code[:cb_idx] + helper_methods + code[cb_idx:]

with open('src/textures/TextureGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully updated TextureGenerator.ts with all upgraded block textures!")
