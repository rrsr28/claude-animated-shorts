"""Synthesized music bed + SFX for the soldier short, mixed under voice.mp3."""
import numpy as np, subprocess, wave

SR = 48000
DUR = 72.84
N = int(DUR * SR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def load_voice():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "voice.mp3", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    v = np.frombuffer(raw, np.float32).copy()
    out = np.zeros(N, np.float32); out[:min(N, len(v))] = v[:N]; return out

def env(n, a=0.005, r=0.2, sus=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
    return e

def lp(x, k):  # one-pole low-pass, k in (0,1)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += k * (x[i] - acc); y[i] = acc
    return y

def lp_fast(x, cutoff):
    # FFT brick-ish low-pass (fast, fine for beds)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x)).astype(np.float32)

def hp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x)).astype(np.float32)

def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i < N and j > i: buf[i:j] += sig[: j - i] * gain

midi = lambda m: 440 * 2 ** ((m - 69) / 12)


# ---------------- music: gentle Indian-village bed (D bhupali: D E F# A B) ----------------
music = np.zeros(N, np.float32)
BPM = 96; beat = 60 / BPM
def pluck(f, dur=0.5, bright=0.55, bend=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * f * t * (1 + bend * np.exp(-t * 18))
    s = sum((bright ** k) * np.sin((k + 1) * ph + 0.3 * k) / (k + 1) for k in range(7))
    return (s * env(n, 0.003, dur * 0.4)).astype(np.float32)
def drone(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.2 * (1 + 0.3 * np.sin(2 * np.pi * (0.3 + k * 0.07) * t)) for k in range(1, 7))
    return (s * env(n, 0.05, dur * 0.7)).astype(np.float32)
def tabla(kind):
    if kind == "dha":
        n = int(0.4 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * np.cumsum(95 + 60 * np.exp(-t * 25)) / SR) * np.exp(-t * 9) * 0.9 + np.sin(2 * np.pi * 420 * t) * np.exp(-t * 30) * 0.4).astype(np.float32)
    if kind == "na":
        n = int(0.15 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 620 * t) * np.exp(-t * 35) * 0.7 + hp_fast(noise(0.15), 2500) * np.exp(-t * 40) * 0.25).astype(np.float32)
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 310 * t) * np.exp(-t * 28) * 0.5).astype(np.float32)
def noise(d): return rng.standard_normal(int(d * SR)).astype(np.float32)
SC = [62, 64, 66, 69, 71]  # D E F# A B
def deg(i, octv=0): return SC[i % 5] + 12 * (i // 5) + 12 * octv
phrases = [[0, 2, 3, 2, 1, 0, 1, 2], [3, 4, 5, 4, 3, 2, 1, 2], [2, 3, 4, 3, 2, 1, 0, 1], [0, 1, 2, 3, 2, 1, 0, 0]]
bar = 0; tt = 0.0
while tt < DUR - 0.2:
    # tanpura: Sa-Pa-Sa-Sa(low) cycle
    for k, m in enumerate([50, 57, 62, 62]): place(music, drone(midi(m), beat * 1.2), tt + k * beat, 0.07)
    ph = phrases[bar % 4]
    for k, d in enumerate(ph):
        place(music, pluck(midi(deg(d, 0) + 12 * (1 if bar % 4 == 1 else 0)), 0.45, 0.6, 0.012), tt + k * beat / 2, 0.14)
    for k in range(8):
        tb = tt + k * beat / 2
        kind = "dha" if k in (0, 4) else ("na" if k in (2, 6) else "ti")
        place(music, tabla(kind), tb, 0.30 if kind != "ti" else 0.12)
    bar += 1; tt += beat * 4
# resolve: final chord bell + sustained drone
for k, m in enumerate([62, 66, 69, 74]): place(music, pluck(midi(m), 2.4, 0.5), 70.2 + k * 0.1, 0.12)
place(music, drone(midi(50), 2.8), 70.0, 0.10)
fd = int(0.9 * SR); music[-fd:] *= np.linspace(1, 0, fd)

# ---------------- sfx ----------------
sfx = np.zeros(N, np.float32)
# ---------------- sfx ----------------
def noise(d): return rng.standard_normal(int(d * SR)).astype(np.float32)
def thunk(f0=90, d=0.3):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f0 * t * (1 + 0.6 * np.exp(-t * 40))) * np.exp(-t * 14) + lp_fast(noise(d), 1200) * np.exp(-t * 30) * 0.5).astype(np.float32)
def rumble(d):
    n = int(d * SR); t = np.arange(n) / SR
    s = lp_fast(noise(d), 160) * 3 * np.minimum(1, t / 0.15) * np.exp(-t / (d * 0.45))
    return s.astype(np.float32)
def crash(d=1.2):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n, np.float32)
    for k in range(14):
        tk = rng.uniform(0, d * 0.6); i = int(tk * SR); g = thunk(rng.uniform(60, 160), 0.35) * rng.uniform(0.3, 0.9)
        s[i:i + len(g)] += g[: n - i]
    s += lp_fast(noise(d), 2500) * np.exp(-t * 3) * 0.25
    return s
def cuckoo():
    out = []
    for f, d in [(740, 0.16), (587, 0.24)]:
        n = int(d * SR); t = np.arange(n) / SR
        out.append(np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.01) * np.exp(-t * 6)); out.append(np.zeros(int(0.06 * SR)))
    return np.concatenate(out).astype(np.float32)
def scrape(d=0.8):
    n = int(d * SR); t = np.arange(n) / SR
    s = noise(d) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * t)) * np.sin(np.pi * t / d)
    s = hp_fast(lp_fast(s, 5000), 1500)
    ring = np.sin(2 * np.pi * 1870 * t) * np.exp(-t * 3) * 0.2
    return (s * 0.6 + ring).astype(np.float32)
def ting():
    n = int(1.2 * SR); t = np.arange(n) / SR
    return (sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(2093, 4), (3136, 6), (4186, 8)]) * 0.3).astype(np.float32)
def sting():
    n = int(2.0 * SR); t = np.arange(n) / SR
    low = np.sin(2 * np.pi * 41 * t) * np.exp(-t * 1.5) * 1.2
    hit = lp_fast(noise(2.0), 900) * np.exp(-t * 6) * 0.8
    stab = brass([midi(45), midi(48), midi(51)], 1.4); s = low + hit; s[: len(stab)] += stab * 2.2 * np.exp(-np.arange(len(stab)) / SR * 2)
    return s.astype(np.float32)
def creak(d=0.6, f0=140):
    n = int(d * SR); t = np.arange(n) / SR
    rate = f0 * (1 + 0.35 * np.sin(2 * np.pi * 1.3 * t / d))
    ph = np.cumsum(rate) / SR; pulses = (np.mod(ph, 1) < 0.08).astype(np.float32)
    s = lp_fast(pulses * (0.6 + 0.4 * rng.random(n).astype(np.float32)), 2200) * np.sin(np.pi * t / d)
    return hp_fast(s, 200) * 2.5
def snap():
    d = 0.5; n = int(d * SR); t = np.arange(n) / SR
    return (hp_fast(noise(d), 800) * np.exp(-t * 18) * 1.4 + np.pad(thunk(120, 0.4), (0, n - int(0.4 * SR))) * 0.6).astype(np.float32)
def splash(d=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    s = lp_fast(noise(d), 4000) * (np.exp(-t * 4) * np.minimum(1, t / 0.01)) + lp_fast(noise(d), 400) * np.exp(-t * 7) * 1.5
    return s.astype(np.float32)
def whoosh(d=0.5):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), 1500) * np.sin(np.pi * t / d) ** 2 * 0.6).astype(np.float32)
def snore(d=1.1):
    n = int(d * SR); t = np.arange(n) / SR
    buzz = (np.mod(np.cumsum(60 + 25 * np.sin(np.pi * t / d)) / SR, 1) < 0.3).astype(np.float32)
    return (lp_fast(buzz * 0.5 + noise(d) * 0.15, 700) * np.sin(np.pi * t / d) ** 2).astype(np.float32)
def leaves(d):
    n = int(d * SR); t = np.arange(n) / SR
    return (hp_fast(lp_fast(noise(d), 6000), 2500) * (0.3 + 0.3 * np.sin(2 * np.pi * 0.7 * t) ** 2) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)).astype(np.float32)
def water(d):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), 900) * 0.5 + hp_fast(lp_fast(noise(d), 3000), 1200) * 0.15 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))).astype(np.float32)


def pop(f0=520, d=0.14):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.6 * np.exp(-t * 40))) / SR) * np.exp(-t * 26) * 0.9).astype(np.float32)
def trumpet(d=1.3):
    n = int(d * SR); t = np.arange(n) / SR
    f = 280 + 330 * np.sin(np.pi * np.minimum(1, t / (d * 0.55)) * 0.5) ** 2 - 90 * np.clip((t - d * 0.7) / (d * 0.3), 0, 1)
    ph = np.cumsum(f * (1 + 0.012 * np.sin(2 * np.pi * 28 * t))) / SR * 2 * np.pi
    s = sum(np.sin((k + 1) * ph) / (k + 1) ** 0.9 for k in range(9)) + noise(d) * 0.18
    a = np.minimum(1, t / 0.06) * np.minimum(1, (d - t) / 0.25).clip(0)
    return (lp_fast((s * a).astype(np.float32), 3200) * 0.7).astype(np.float32)
def tap(d=0.09):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 900 * t) * np.exp(-t * 60) * 0.5 + hp_fast(noise(d), 1500) * np.exp(-t * 70) * 0.3).astype(np.float32)
def chirp():
    d = 0.22; n = int(d * SR); t = np.arange(n) / SR
    f = 3200 + 1400 * np.sin(2 * np.pi * 9 * t) + 800 * t / d
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * 0.25).astype(np.float32)
def boing(d=0.5):
    n = int(d * SR); t = np.arange(n) / SR
    f = 260 + 200 * np.sin(2 * np.pi * 5 * t) * np.exp(-t * 3)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.6).astype(np.float32)
def babble(d):
    n = int(d * SR); t = np.arange(n) / SR
    s = lp_fast(noise(d), 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.3 * t) * np.sin(2 * np.pi * 3.1 * t + 1)) ** 2
    return (hp_fast(s, 250) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3).clip(0)).astype(np.float32)
def shimmer(d=1.6):
    n = int(d * SR); t = np.arange(n) / SR
    return (sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(1568, 2.5), (2349, 3), (3136, 3.5), (4699, 4)]) * 0.28).astype(np.float32)
F = lambda f: f / 30
place(sfx, whoosh(0.6), F(34), 0.5)                                  # hook pull-back
for f_ in [20, 96, 150, 305, 388, 640, 905, 1130, 1260]: place(sfx, chirp(), F(f_), 0.35)
for k in range(8): place(sfx, thunk(70, 0.2), F(122) + k * 0.2, 0.3) if k < 0 else None
place(sfx, babble(1.4), F(160), 0.3)                                 # villager shouting the news
place(sfx, pop(700), F(196), 0.6)                                    # "!" on royal elephant
for k in range(5): place(sfx, thunk(62, 0.35), F(222) + k * 0.57, 0.85)   # elephant footsteps
place(sfx, whoosh(0.4), F(262), 0.3)
place(sfx, trumpet(1.3), F(268), 0.8)                                # royal trumpet
for f_ in (300, 314, 328): place(sfx, pop(560 + (f_ - 300) * 4), F(f_), 0.7)  # question bubbles
for k in range(4): place(sfx, tap(), F(368) + k * 0.4, 0.5)           # cane taps while they walk
for f_ in (435, 606, 748, 950, 1098, 1252): place(sfx, thunk(110, 0.18), F(f_), 0.5)   # hand lands
for f_, fr in [(549, 520), (697, 600), (888, 480), (1048, 560), (1186, 640), (1374, 540)]: place(sfx, pop(fr), F(f_), 0.8)
place(sfx, ting(), F(698), 0.2)                                      # spear glint
place(sfx, boing(0.6), F(782), 0.5); place(sfx, boing(0.6), F(840), 0.4)   # trunk wiggles
for k in range(3): place(sfx, whoosh(0.3), F(1090 + 48 * k), 0.4)    # ear flaps
for k in range(4): place(sfx, whoosh(0.25), F(1262 + 63 * k), 0.35)  # tail swishes
place(sfx, babble(3.2), F(1420), 0.45)                               # the argument
for m in range(1, 7): place(sfx, pop(480 + m * 40), F(1420 + 6 * m), 0.6)
for k in range(5): place(sfx, thunk(150, 0.14), F(1440 + k * 14), 0.35)
for k in range(8): place(sfx, tap(), F(1556 + k * 8) , 0.35)         # sage's cane as he arrives
place(sfx, whoosh(0.5), F(1854), 0.5)                                # golden flash
for m in range(1, 7): place(sfx, whoosh(0.4), F(1862 + m * 4), 0.18)  # bubbles deflate
place(sfx, ting(), F(1908), 0.6)                                     # realisation
place(sfx, shimmer(1.8), F(1954), 0.5)                               # "Moral:"
place(sfx, whoosh(0.8), F(1960), 0.35)
place(sfx, trumpet(1.5), F(2148), 0.7)                               # final trumpet
place(sfx, shimmer(2.2), F(2156), 0.9)
place(sfx, ting(), F(2160), 0.6)
sfx = sfx[:N]
def save(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(name, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
pk = max(np.abs(music).max(), 1e-6); save("music.wav", music / pk * 0.9)
pk = max(np.abs(sfx).max(), 1e-6); save("sfx.wav", sfx / pk * 0.9)
print("stems ok", N / SR)
