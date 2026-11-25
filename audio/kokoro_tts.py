"""Render text with Kokoro-82M (Apache-2.0, runs locally). Called by build_audio.py inside .venv-kokoro.
Usage: .venv-kokoro/bin/python kokoro_tts.py --voice bm_george --speed 0.95 --out line.wav < text.txt
British voices (lang 'b'): bm_george, bm_daniel, bm_lewis, bm_fable, bf_emma, bf_isabella, bf_alice, bf_lily.
Writes 24 kHz mono 16-bit WAV with a short pause between sentences."""
import argparse, sys, warnings
import numpy as np, soundfile as sf

warnings.filterwarnings("ignore")
ap = argparse.ArgumentParser()
ap.add_argument("--voice", default="bm_george")
ap.add_argument("--speed", type=float, default=0.95)
ap.add_argument("--pause", type=float, default=0.32)   # seconds between sentences / chunks
ap.add_argument("--out", required=True)
a = ap.parse_args()

# the espeakng_loader wheel ships without phontab on macOS; use Homebrew's espeak-ng instead
import os, espeakng_loader
for lib, data in (("/opt/homebrew/lib/libespeak-ng.dylib", "/opt/homebrew/share/espeak-ng-data"),
                  ("/usr/local/lib/libespeak-ng.dylib", "/usr/local/share/espeak-ng-data")):
    if os.path.exists(lib) and os.path.exists(os.path.join(data, "phontab")):
        espeakng_loader.get_library_path = lambda lib=lib: lib
        espeakng_loader.get_data_path = lambda data=data: data
        break
from kokoro import KPipeline
text = sys.stdin.read().strip()
lang = a.voice[0]  # 'b' British, 'a' American
pipe = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
parts = []
gap = np.zeros(int(24000 * a.pause), np.float32)
for _, _, audio in pipe(text, voice=a.voice, speed=a.speed, split_pattern=r"(?<=[.;!?–—])\s+"):
    if audio is None: continue
    parts += [np.asarray(audio, np.float32), gap]
sf.write(a.out, np.concatenate(parts[:-1]) if parts else np.zeros(1, np.float32), 24000, subtype="PCM_16")
