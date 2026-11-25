"""sidebyside.py grid.jpg figure.png out.jpg — gridded imagery left, report figure right, same height."""
import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB"); b = Image.open(sys.argv[2]).convert("RGB")
H = 900
a = a.resize((int(a.width * H / a.height), H)); b = b.resize((int(b.width * H / b.height), H))
out = Image.new("RGB", (a.width + b.width + 10, H), "white"); out.paste(a, (0, 0)); out.paste(b, (a.width + 10, 0)); out.save(sys.argv[3], quality=88)
