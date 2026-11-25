"""Build the POWERLINES soundtrack: news-style voice-over + synthesized low backing.

Run from this folder:
  python3 build_audio.py --engine kokoro                    # local open-source voice (default: bm_george)
  python3 build_audio.py --engine elevenlabs                # ElevenLabs (needs ELEVENLABS_API_KEY)
  python3 build_audio.py --engine say --voice "Jamie (Premium)"   # built-in macOS voice
Reads ../story.js (via node) so clips stay in sync with the film clock.
Writes narration.wav (voice only), backing.wav (music only), soundtrack.wav and soundtrack.m4a (mix — the
file the film plays), soundtrack-<engine>.m4a (kept per engine for comparison) and cues.json.
Rendered lines are cached in cache/ by engine+voice+text, so re-runs only re-render changed lines
(this also avoids spending ElevenLabs credits twice).

Engines
  say         macOS voices. Install better ones in System Settings → Accessibility → Spoken Content →
              System Voice → Manage Voices (e.g. "Jamie (Premium)", "Serena (Premium)").
  kokoro      Kokoro-82M (Apache-2.0), runs locally in .venv-kokoro (see kokoro_tts.py).
              British voices: bm_george, bm_daniel, bm_lewis, bm_fable, bf_emma, bf_isabella.
  elevenlabs  api.elevenlabs.io. Set the key in your shell:  export ELEVENLABS_API_KEY=...
              --voice takes a voice ID or one of: daniel (British news presenter), george (British narrator).
              The narration text is sent to ElevenLabs."""
import argparse, hashlib, json, os, re, subprocess, tempfile, urllib.error, urllib.request, wave, pathlib
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly

HERE = pathlib.Path(__file__).resolve().parent
SR = 44100
ap = argparse.ArgumentParser()
ap.add_argument("--engine", choices=["say", "kokoro", "elevenlabs"], default="kokoro")
ap.add_argument("--voice", default=None)
ap.add_argument("--rate", type=int, default=165)          # say: words per minute; news reads ~160–170
ap.add_argument("--speed", type=float, default=0.95)      # kokoro speed
ap.add_argument("--model", default="eleven_multilingual_v2")  # elevenlabs model
ap.add_argument("--music-db", type=float, default=-17)    # backing level under silence
ap.add_argument("--duck-db", type=float, default=-8)      # extra reduction while the voice speaks
args = ap.parse_args()
DEFAULT_VOICE = {"say": "Daniel", "kokoro": "bm_george", "elevenlabs": "daniel"}
VOICE = args.voice or DEFAULT_VOICE[args.engine]
EL_VOICES = {"daniel": "onwK4e9ZLuTAKqWW03F9", "george": "JBFqnCBsd6RMkjVDRZzb"}
CACHE = HERE / "cache"; CACHE.mkdir(exist_ok=True)

# ---------- scenes from story.js ----------
js = ("global.window={};require('vm').runInThisContext(require('fs').readFileSync('../story.js','utf8'));"
      "let a=0;console.log(JSON.stringify(window.STORY.scenes.map(s=>{const o={id:s.id,start:a,dur:s.dur,vo:s.vo||'',"
      "chapter:s.chapter||'',capUntil:s.capUntil||null};a+=s.dur;return o;})))")
scenes = json.loads(subprocess.check_output(["node", "-e", js], cwd=HERE))
TOTAL = sum(s["dur"] for s in scenes)
N = int(TOTAL * SR)


def read_wav(path):
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        from math import gcd
        g = gcd(SR, sr); x = resample_poly(x, SR // g, sr // g).astype(np.float32)
    return x


def render_say(text, out):
    t = re.sub(r"([.;])\s+", r"\1 [[slnc 350]] ", text.strip())          # newsreader beat after sentences
    t = t.replace(" – ", " [[slnc 250]] ").replace(" — ", " [[slnc 250]] ")
    t = f"[[rate {args.rate}]] [[volm 1.0]] " + t
    subprocess.run(["say", "-v", VOICE, "--file-format=WAVE", "--data-format=LEI16@44100", "-o", str(out), t], check=True)


def render_kokoro(text, out):
    py = HERE / ".venv-kokoro/bin/python"
    if not py.exists():
        raise SystemExit("Kokoro is not installed: see SCRIPT.md → Soundtrack (uv venv --python 3.12 .venv-kokoro …)")
    subprocess.run([str(py), str(HERE / "kokoro_tts.py"), "--voice", VOICE, "--speed", str(args.speed), "--out", str(out)],
                   input=text.encode(), check=True, stderr=subprocess.DEVNULL)


def render_elevenlabs(text, out):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key: raise SystemExit("Set ELEVENLABS_API_KEY in your shell first (export ELEVENLABS_API_KEY=...)")
    vid = EL_VOICES.get(VOICE.lower(), VOICE)
    body = json.dumps({"text": text, "model_id": args.model,
                       "voice_settings": {"stability": 0.6, "similarity_boost": 0.75, "style": 0.1, "use_speaker_boost": True}}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128", data=body,
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        mp3 = urllib.request.urlopen(req, timeout=120).read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ElevenLabs error {e.code}: {e.read()[:300].decode(errors='replace')}")
    tmp = out.with_suffix(".mp3"); tmp.write_bytes(mp3)
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@44100", str(tmp), str(out)], check=True); tmp.unlink()


# pronunciation fixes per engine (kokoro takes inline IPA: [word](/phonemes/))
PRON = {
    "kokoro": {"ZNPP": "[ZNPP](/zˈɛd ˌɛn pˌiː pˈiː/)", "Kakhovka": "[Kakhovka](/kəhˈɒvkə/)", "Kyiv": "[Kyiv](/kˈiːɪv/)"},
    "say": {"ZNPP": "Zed N P P"},
    "elevenlabs": {"ZNPP": "Z.N.P.P."},
}


def speakable(text):
    for w, r in PRON.get(args.engine, {}).items():
        text = re.sub(rf"\b{w}\b", r, text)
    return text


def tts(text):
    text = speakable(text)
    tag = f"{args.engine}|{VOICE}|{args.rate if args.engine == 'say' else args.speed if args.engine == 'kokoro' else args.model}|{text}"
    path = CACHE / (hashlib.sha1(tag.encode()).hexdigest()[:16] + ".wav")
    if not path.exists():
        {"say": render_say, "kokoro": render_kokoro, "elevenlabs": render_elevenlabs}[args.engine](text, path)
    x = read_wav(path)
    nz = np.where(np.abs(x) > 0.01)[0]                                      # trim leading/trailing silence
    return x[nz[0]:nz[-1] + 1] if len(nz) else x


# ---------- voice track ----------
voice = np.zeros(N, np.float32)
cues = []
print(f"engine {args.engine} · voice {VOICE}")
if True:
    for s in scenes:
        if not s["vo"]: continue
        x = tts(s["vo"])
        lead = 5.6 if s["chapter"] else 1.6              # wait for the chapter card, as the captions do
        t0 = s["start"] + lead
        limit = s["start"] + (s["capUntil"] or s["dur"]) - 0.4
        dur = len(x) / SR
        fits = t0 + dur <= limit
        i = int(t0 * SR); voice[i:i + len(x)] += x[: max(0, N - i)]
        cues.append({"id": s["id"], "start": round(t0, 2), "end": round(t0 + dur, 2), "limit": round(limit, 2), "fits": fits})
        print(f"{s['id']:<11} {t0:6.1f}–{t0 + dur:6.1f}s  ({dur:4.1f}s)  {'ok' if fits else f'OVERRUNS chapter end {limit:.1f}s'}")
voice *= 0.9 / max(1e-6, np.abs(voice).max())

# ---------- backing: low drone that darkens chapter by chapter ----------
t = np.arange(N) / SR
rng = np.random.default_rng(7)
A1 = 55.0
# per-chapter root (semitones from A1) and colour; changes crossfade over 4 s
MOOD = {"kyiv": (0, "m"), "hostage": (-2, "m"), "lifeline": (3, "M"), "occupation": (1, "m"), "draw": (0, "m"),
        "water": (-2, "m"), "notyet": (-4, "m"), "repair": (-5, "m"), "dependency": (-2, "m"), "supply": (-5, "m"),
        "frontier": (-7, "m"), "winter": (-4, "m"), "end": (-7, "m")}
music = np.zeros(N, np.float32)
fade = 4.0
for k, s in enumerate(scenes):
    root, col = MOOD.get(s["id"], (0, "m"))
    f0 = A1 * 2 ** (root / 12)
    third = 2 ** ((4 if col == "M" else 3) / 12)
    a, b = s["start"] - (fade if k else 0), s["start"] + s["dur"] + fade
    m = (t >= a) & (t < b)
    tt = t[m]
    env = np.clip((tt - a) / fade, 0, 1) * np.clip((b - tt) / fade, 0, 1)
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * tt / 11.0 + k)
    tone = (0.55 * np.sin(2 * np.pi * f0 * tt) + 0.28 * np.sin(2 * np.pi * f0 * 1.5 * tt + 0.3)
            + 0.18 * np.sin(2 * np.pi * f0 * 2 * third * tt + 1.1) + 0.12 * np.sin(2 * np.pi * (f0 * 2 + 0.35) * tt)
            + 0.10 * np.sin(2 * np.pi * f0 * 0.5 * tt))            # sub octave
    music[m] += (tone * env * swell).astype(np.float32)

# filtered noise "wind/rumble" bed
noise = rng.standard_normal(N).astype(np.float32)
rumble = sosfilt(butter(2, [30, 160], btype="band", fs=SR, output="sos"), noise)
rumble *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 23.0)
music += 0.35 * rumble / np.abs(rumble).max()

# low impacts at structural moments (title, chapter turns into conflict)
def boom(at, gain=1.0):
    i = int(at * SR); L = int(4.5 * SR)
    tt = np.arange(L) / SR
    x = (np.sin(2 * np.pi * (48 * np.exp(-tt * 0.6)) * tt) * np.exp(-tt * 1.1)
         + 0.4 * sosfilt(butter(2, 120, fs=SR, output="sos"), rng.standard_normal(L)) * np.exp(-tt * 2.5))
    music[i:i + L] += gain * x[: max(0, N - i)].astype(np.float32)
start = {s["id"]: s["start"] for s in scenes}
_k = json.loads(subprocess.check_output(["node", "-e", "global.window={};require('vm').runInThisContext(require('fs').readFileSync('../story.js','utf8'));"
      "console.log(JSON.stringify(window.STORY.scenes.find(s=>s.id==='kyiv').dim||{}))"], cwd=HERE))
boom(start["kyiv"] + _k.get("t0", 16.0), 0.9)   # Kyiv goes dark (follows the dim timing in story.js)
boom(start["hostage"] + 15.0, 1.0)       # title
for sid in ("occupation", "repair", "supply", "frontier"):
    boom(start[sid] + 0.5, 0.6)

music = sosfilt(butter(4, 900, fs=SR, output="sos"), music)   # keep it dark and out of the voice's band
music /= np.abs(music).max()
# master fades
fi, fo = int(3 * SR), int(6 * SR)
music[:fi] *= np.linspace(0, 1, fi); music[-fo:] *= np.linspace(1, 0, fo)

# ---------- ducking under the voice ----------
def movavg(x, w):
    c = np.cumsum(np.concatenate([[0.0], x.astype(np.float64)]))
    y = (c[w:] - c[:-w]) / w
    pad = (len(x) - len(y)); return np.pad(y, (pad // 2, pad - pad // 2)).astype(np.float32)
envv = movavg(np.abs(voice), int(0.25 * SR))
speaking = (envv > 0.01).astype(np.float32)
speaking = movavg(speaking, int(0.6 * SR))       # smooth attack/release
gain_db = args.music_db + args.duck_db * np.clip(speaking, 0, 1)
music_l = music * (10 ** (gain_db / 20))

mix = voice * 0.95 + music_l
mix /= max(1.0, np.abs(mix).max() / 0.98)


def write(path, x, stereo=True):
    x16 = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    if stereo: x16 = np.repeat(x16[:, None], 2, axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2 if stereo else 1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x16.tobytes())

write(HERE / "narration.wav", voice * 0.95)
write(HERE / "backing.wav", music * 10 ** (args.music_db / 20))
write(HERE / "soundtrack.wav", mix)
subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "192000", str(HERE / "soundtrack.wav"), str(HERE / "soundtrack.m4a")], check=True)
(HERE / f"soundtrack-{args.engine}.m4a").write_bytes((HERE / "soundtrack.m4a").read_bytes())
json.dump({"engine": args.engine, "voice": VOICE, "rate": args.rate, "total": TOTAL, "cues": cues}, open(HERE / "cues.json", "w"), indent=1)
print("wrote narration.wav, backing.wav, soundtrack.wav, soundtrack.m4a, cues.json · total", TOTAL, "s")
