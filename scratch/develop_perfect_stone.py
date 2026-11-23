import math
from PIL import Image

T = 24

# Let's create seamless periodic noise on 24x24
def periodic_noise(x, y, period, seed=42):
    # Toroidal noise using trig functions
    s = x / period * 2 * math.pi
    t = y / period * 2 * math.pi
    # 4D torus coordinates
    nx = math.cos(s)
    ny = math.sin(s)
    nz = math.cos(t)
    nw = math.sin(t)
    
    # Simple hash of 4D coordinates
    v = (math.sin(nx * 1.7 + ny * 2.3 + nz * 3.1 + nw * 2.7 + seed * 0.1) * 43758.5453) % 1.0
    return v

# Better: Smooth periodic value noise
def smooth_noise(x, y, period, seed=101):
    # grid points on torus
    gx = x % period
    gy = y % period
    
    # 4 harmonics
    val = 0.0
    weight = 1.0
    total_w = 0.0
    
    for octave in [1, 2, 4]:
        freq = octave * 2 * math.pi / period
        # seamless s, t
        s1 = math.cos(x * freq + seed)
        s2 = math.sin(x * freq + seed * 1.3)
        t1 = math.cos(y * freq + seed * 0.7)
        t2 = math.sin(y * freq + seed * 1.9)
        h = (s1 * 0.5 + s2 * 0.3 + t1 * 0.5 + t2 * 0.3)
        val += h * weight
        total_w += weight
        weight *= 0.5
        
    return (val / total_w) * 0.5 + 0.5

# Let's craft stone pixel art with discrete cellular rocky features
# A Terraria stone block has:
# 1. Base rocky matrix with soft granite stippling
# 2. Subtle organic boulder seams (interlocking, horizontal-leaning curves, NOT diagonals)
# 3. Soft top-left ambient illumination on individual rock patches
# 4. Tiny micro-pores and specks

def generate_stone_tile():
    img = Image.new('RGBA', (T, T))
    pix = img.load()
    
    # Palette definition for high-end slate stone:
    # C0: Deep crack: #2c2f35
    # C1: Shadow seam: #3d414a
    # C2: Deep midtone: #515661
    # C3: Base stone: #656b77
    # C4: Light stone: #79808d
    # C5: Soft highlight: #8d95a3
    # C6: Crisp rim: #a3abc0
    
    palette = [
        (44, 47, 53, 255),   # 0: deep crack
        (61, 65, 74, 255),   # 1: shadow seam
        (81, 86, 97, 255),   # 2: dark midtone
        (101, 107, 119, 255),# 3: base rock
        (121, 128, 141, 255),# 4: light stone
        (141, 149, 163, 255),# 5: soft highlight
        (163, 171, 186, 255) # 6: crisp specular rim
    ]
    
    # Let's map pixels using organic rock shapes
    # We want 3-4 natural rock facets across the 24x24 tile that tile seamlessly!
    for y in range(T):
        for x in range(T):
            # Macro structure: large organic rock masses (low frequency seamless)
            n_macro = smooth_noise(x, y, T, seed=137)
            # Second harmonic for curving seams
            n_mid = smooth_noise(x + 3, y + 7, T, seed=293)
            # High frequency grain for rough rock texture
            n_grain = smooth_noise(x * 2, y * 2, T, seed=571)
            
            # Combine
            rock_val = n_macro * 0.55 + n_mid * 0.3 + n_grain * 0.15
            
            # Directional shading (light from top-left):
            # Add subtle gradient from top-left of each rock mass
            # n_macro derivative
            dx = smooth_noise(x + 1, y, T, seed=137) - smooth_noise(x - 1, y, T, seed=137)
            dy = smooth_noise(x, y + 1, T, seed=137) - smooth_noise(x, y - 1, T, seed=137)
            # Light vector (-1, -1) -> dot product with normal
            light = -(dx + dy) * 2.5
            
            final_h = rock_val + light * 0.15
            
            # Fine crack detection: where mid-noise has sharp valley
            crack = math.exp(-((n_mid - 0.48) ** 2) / 0.003)
            if crack > 0.6:
                color_idx = 0 if crack > 0.85 else 1
            else:
                if final_h < 0.34:
                    color_idx = 1
                elif final_h < 0.44:
                    color_idx = 2
                elif final_h < 0.56:
                    color_idx = 3
                elif final_h < 0.68:
                    color_idx = 4
                elif final_h < 0.78:
                    color_idx = 5
                else:
                    color_idx = 6
                    
            # Add occasional single-pixel granite grain
            grain_hash = ((x * 17 + y * 31 + 13) * 73) % 100
            if grain_hash < 6 and color_idx < 5:
                color_idx = min(6, color_idx + 1)
            elif grain_hash > 94 and color_idx > 1:
                color_idx = max(0, color_idx - 1)
                
            pix[x, y] = palette[color_idx]
            
    return img

stone = generate_stone_tile()

# Create a 4x4 tiled preview of stone
preview = Image.new('RGBA', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        preview.paste(stone, (tx * T, ty * T))

preview.save('scratch/procedural_stone_tile_4x4.png')
print("Saved scratch/procedural_stone_tile_4x4.png")
