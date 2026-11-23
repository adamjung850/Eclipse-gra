from PIL import Image
import craft_authentic_monolithic_stone as cams

stone = cams.stone_rgb
Image.fromarray(stone).save('assets/textures/stone_24.png')
Image.fromarray(stone).save('assets/textures/stone.png')
print("Saved assets/textures/stone_24.png and stone.png")
