from PIL import Image
import numpy as np

im = Image.open('scratch/starbound_cobblestone.png').convert('RGB')
arr = np.array(im)
print("Starbound size:", arr.shape)
# Find non-transparent or crop
print("Starbound colors:", len(np.unique(arr.reshape(-1, 3), axis=0)))
# Starbound tiles are 8x8 pixels per block in game!
