from PIL import Image
import numpy as np

for fn in ['stone-xxxx.png', 'stone-xxxx (2).png', 'stone-xxxx (3).png']:
    im = Image.open('scratch/' + fn).convert('L')
    arr = np.array(im)
    # Subsample 2x2 to get native 8x8
    native = arr[::2, ::2]
    print(f"--- {fn} (8x8 native) ---")
    for r in native:
        print(" ".join(f"{v:3d}" for v in r))
