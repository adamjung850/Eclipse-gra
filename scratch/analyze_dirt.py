from PIL import Image
import numpy as np

im = Image.open('assets/textures/dirt_24.png').convert('RGB')
arr = np.array(im).astype(np.float32)

# Luminance
lum = 0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]

# Print stats
print("Dirt 24 stats:")
print("Min lum:", lum.min(), "Max lum:", lum.max(), "Mean lum:", lum.mean(), "Std lum:", lum.std())

# Check autocorrelation at lag 1, 2, 3
def autocorr(x, lag_x, lag_y):
    x0 = x
    x1 = np.roll(np.roll(x, lag_x, axis=1), lag_y, axis=0)
    return np.corrcoef(x0.flatten(), x1.flatten())[0, 1]

print("Autocorr (1, 0):", autocorr(lum, 1, 0))
print("Autocorr (0, 1):", autocorr(lum, 0, 1))
print("Autocorr (2, 0):", autocorr(lum, 2, 0))
print("Autocorr (0, 2):", autocorr(lum, 0, 2))

# Dirt has autocorr around 0.35 at lag 1!
# Now, why did our candidate from earlier look like gravel?
# In our earlier candidate:
# We mapped: dark_rgb = [52, 56, 64], bright_rgb = [158, 166, 180]
# The span was 106 levels!
# And what was Dirt's span?
# Dirt's lum span: min ~67, max ~135 -> span ~68 levels!
# Because our candidate had a span of 106 (high contrast), every single pixel stood out sharply like a piece of gravel!
