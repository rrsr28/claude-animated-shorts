#!/usr/bin/env python3
"""Mix voice + music + sfx. Music = 50% of voice level (-6 dB gated RMS); SFX = 50% with peaks capped at 0.7x voice peak.
Only linear gains + one peak guard; no ducking/compression.  usage: python3 mix.py voice.mp3 music.wav sfx.wav"""
import numpy as np, subprocess, sys, wave
SR = 48000
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def grms(x, thr_db=-45):
    w = SR // 10; n = len(x) // w; fr = x[: n * w].reshape(n, w); r = np.sqrt((fr ** 2).mean(1) + 1e-12)
    mx = r.max(); keep = r > mx * 10 ** (thr_db / 20); return float(np.sqrt((r[keep] ** 2).mean()))
v, m, s = load(sys.argv[1]), load(sys.argv[2]), load(sys.argv[3]); N = len(v)
m = np.pad(m, (0, max(0, N - len(m))))[:N]; s = np.pad(s, (0, max(0, N - len(s))))[:N]
rv = grms(v); gm = 0.5 * rv / grms(m)
m *= gm
# sfx: sparse, so level by active-gated RMS, then cap peaks
gs = 0.5 * rv / grms(s); s *= gs
cap = 0.7 * np.abs(v).max()
if np.abs(s).max() > cap: s *= cap / np.abs(s).max()
mix = v + m + s
pk = np.abs(mix).max()
if pk > 0.98: mix *= 0.98 / pk
db = lambda a, b: 20 * np.log10(a / b)
print(f"voice gated rms {rv:.4f}; music {db(grms(m), rv):+.1f} dB vs voice; sfx gated {db(grms(s), rv):+.1f} dB, peak {np.abs(s).max():.3f} (cap {cap:.3f}); mix peak {np.abs(mix).max():.3f}")
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open("mix_raw.wav", "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
