import re

with open('scratch/test_block_textures.js', 'r', encoding='utf-8') as f:
    c = f.read()

new_lava = """// Lava Rock: diagonal raging lava river between two large jagged basalt crust slabs
function drawLavaRock(ctx, T = 24) {
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

  // Upper-left basalt rock slab
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

  // Lower-right basalt rock slab
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
}"""

c = re.sub(r'// Lava Rock:.*?\nfunction drawLavaRock\(ctx, T = 24\) \{[\s\S]*?\n\}', new_lava, c)

with open('scratch/test_block_textures.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("Regex replaced Lava Rock!")
