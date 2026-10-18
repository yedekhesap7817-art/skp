#!/usr/bin/env python3
"""Film müziği + ses efektleri (yalnızca numpy, sabit seed → her çalıştırmada aynı sonuç).

Girdi : audio/cues.json   (node scripts/render.mjs --cues ile animasyonun zaman çizelgesinden üretilir)
        audio/vo/vo_XX.wav (isteğe bağlı seslendirme dosyaları; XX = cues.json'daki VO yuvası sırası, 00..10)
Çıktı : audio/soundtrack.wav (48 kHz stereo), soundtrack.m4a (AAC), soundtrack.ogg (Opus)

Müzik: 120 BPM, özgün, kodla sentezlenmiş (telif sorunu yok). Seslendirme varsa müzik altında kısılır (ducking).
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 44.0
N = int(SR * DUR)
rng = np.random.default_rng(4242)


def t_axis(d):
    return np.arange(int(SR * d)) / SR


def env_ad(n, a, d_curve=4.0):
    """Hızlı atak, üstel sönüm."""
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    return att * np.exp(-d_curve * t / (n / SR))


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) * 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def noise(d):
    return rng.standard_normal(int(SR * d))


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def sweep_noise(d, centers):
    """Gürültü, zaman içinde kayan bant (whoosh)."""
    n = int(SR * d)
    base = noise(d)
    bands = [(300, 700), (700, 1500), (1500, 3200), (3200, 7000)]
    layers = [norm(band(base, lo, hi)) for lo, hi in bands]
    tt = np.linspace(0, 1, n)
    c = np.interp(tt, np.linspace(0, 1, len(centers)), centers)  # 0..3 bant indeksi
    out = np.zeros(n)
    for i, L in enumerate(layers):
        out += L * np.clip(1 - np.abs(c - i), 0, 1)
    return out


# ---------------- ses efektleri ----------------
def sfx_beat(d):
    t = t_axis(0.45)
    f = 45 + 110 * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    k = np.sin(ph) * np.exp(-t * 7)
    click = band(noise(0.45), 1500, 6000) * np.exp(-t * 120) * 0.25
    return norm(k + click) * 0.9


def sfx_stretch(d):
    t = t_axis(d)
    n = len(t)
    f = 170 + 230 * (t / d) + 12 * np.sin(2 * np.pi * 5.5 * t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35 + np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * 0.12
    creak = norm(band(noise(d), 500, 2200)) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 23 * t))) * 0.3
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return (tone + creak) * e * 0.45


def sfx_snap(d):
    t = t_axis(0.12)
    pop = norm(band(noise(0.12), 900, 4500)) * np.exp(-t * 90)
    thump = np.sin(2 * np.pi * 210 * t) * np.exp(-t * 45) * 0.6
    return (pop + thump) * 0.6


def sfx_tick(d):
    t = t_axis(0.05)
    return norm(band(noise(0.05), 2500, 7000)) * np.exp(-t * 160) * 0.35


def sfx_clink(d):
    t = t_axis(0.6)
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(2150, 1, 7), (3370, 0.6, 9), (5230, 0.35, 12), (7100, 0.2, 16)])
    return s * env_ad(len(t), 0.002, 1) * 0.35


def sfx_pop(d):
    t = t_axis(0.09)
    f = 520 + 420 * (t / 0.09)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * 0.35


def sfx_whoosh(d):
    n = int(SR * d)
    x = sweep_noise(d, [0.2, 1.6, 2.6, 1.0])
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return x * e * 0.45


def sfx_swish(d):
    return sfx_whoosh(d) * 0.6


def sfx_swoosh(d):
    n = int(SR * d)
    x = sweep_noise(d, [0.5, 2.8, 3.0, 1.2])
    e = np.sin(np.pi * np.linspace(0, 1, n) ** 0.7) ** 2
    ring = np.sin(2 * np.pi * 4200 * t_axis(d)) * np.exp(-t_axis(d) * 8) * 0.08
    return (x * e + ring) * 0.55


def sfx_drip(d):
    t = t_axis(0.12)
    f = 650 + 1100 * np.clip(t / 0.03, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * 0.3


def sfx_rasp(d):
    t = t_axis(d)
    x = norm(band(noise(d), 2200, 9000))
    grain = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 38 * t + 3 * np.sin(2 * np.pi * 3 * t)))
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8
    body = norm(band(noise(d), 600, 1800)) * 0.25
    return (x * grain + body) * e * 0.32


def sfx_knifeTouch(d):
    t = t_axis(0.18)
    return (np.sin(2 * np.pi * 150 * t) * np.exp(-t * 30) + norm(band(noise(0.18), 300, 1200)) * np.exp(-t * 60) * 0.4) * 0.45


def sfx_slice(d):
    t = t_axis(d)
    x = norm(band(noise(d), 3000, 10000)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    ring = np.sin(2 * np.pi * 4600 * t) * np.exp(-t * 10) * 0.15
    return (x + ring) * 0.35


def sfx_squish(d):
    t = t_axis(d)
    x = norm(band(noise(d), 120, 650))
    wob = 0.6 + 0.4 * np.sin(2 * np.pi * (2.5 + 1.5 * t / d) * t) ** 2
    e = np.clip(t / 0.3, 0, 1) * np.exp(-1.6 * t / d)
    gl = sum(np.sin(2 * np.pi * (220 + 60 * k) * t) * np.exp(-((t - 0.25 - 0.45 * k) ** 2) / 0.004) for k in range(4)) * 0.25
    return (x * wob * e + gl) * 0.4


def sfx_thud(d):
    t = t_axis(0.35)
    f = 60 + 70 * np.exp(-t * 25)
    k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    m = norm(band(noise(0.35), 150, 900)) * np.exp(-t * 50) * 0.35
    return (k + m) * 0.7


def sfx_flap(d):
    t = t_axis(0.12)
    return norm(band(noise(0.12), 250, 1600)) * np.exp(-t * 55) * 0.4


def sfx_sizzle(d):
    t = t_axis(d)
    hiss = norm(band(noise(d), 3500, 9000)) * 0.16
    cr = np.zeros(len(t))
    idx = rng.integers(0, len(t) - 400, int(d * 55))
    for i in idx:
        L = int(rng.integers(60, 300))
        cr[i:i + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.3, 1)
    cr = band(cr, 1500, 9000)
    e = np.clip(t / 0.15, 0, 1) * np.clip((d - t) / 1.4, 0, 1)
    return (hiss + norm(cr) * 0.6) * e * 0.3


def sfx_click(d):
    t = t_axis(0.04)
    return np.sin(2 * np.pi * 1250 * t) * np.exp(-t * 110) * 0.3


def sfx_chime(d):
    t = t_axis(1.6)
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(880, 1, 2.8), (1318.5, 0.6, 3.2), (1760, 0.35, 4), (2637, 0.15, 6)])
    return s * env_ad(len(t), 0.004, 0.5) * 0.3


SFX = {k[4:]: v for k, v in globals().items() if k.startswith('sfx_')}


# ---------------- müzik ----------------
BPM = 120
BEAT = 60 / BPM


def pluck(freq, d, bright=1.0):
    t = t_axis(d)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * bright * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 6) + 0.12 * bright * np.sin(2 * np.pi * freq * 4.01 * t) * np.exp(-t * 12)
    return s * env_ad(len(t), 0.005, 5)


def marimba(freq, d):
    t = t_axis(d)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 3.93 * t) * np.exp(-t * 18)
    return s * env_ad(len(t), 0.002, 7)


def music():
    L = np.zeros(N)
    Rr = np.zeros(N)
    # F majör sıcak döngü: Fmaj7 – Dm7 – Bbmaj7 – C (her akor 1 ölçü = 2 sn)
    chords = [[174.61, 220.0, 261.63, 329.63], [146.83, 174.61, 220.0, 261.63], [116.54, 146.83, 174.61, 220.0], [130.81, 164.81, 196.0, 246.94]]
    roots = [87.31, 73.42, 58.27, 65.41]
    kick = sfx_beat(0) * 0.7
    hat = norm(band(noise(0.06), 6000, 12000)) * np.exp(-t_axis(0.06) * 70)
    snap = norm(band(noise(0.15), 1200, 5000)) * np.exp(-t_axis(0.15) * 30)

    def add(buf, sig, at, g):
        i = int(at * SR)
        if i >= N:
            return
        j = min(N, i + len(sig))
        buf[i:j] += sig[: j - i] * g

    nbeats = int(DUR / BEAT)
    for b in range(nbeats):
        tb = b * BEAT
        bar = b // 4
        ch = chords[bar % 4]
        calm = 35.0 <= tb < 42.0  # özet: okuma için daha sakin
        dg = 0.5 if calm else 1.0
        if b % 2 == 0:
            add(L, kick, tb, 0.5 * dg); add(Rr, kick, tb, 0.5 * dg)
        if b % 4 in (1, 3):
            add(L, snap, tb, 0.12 * dg); add(Rr, snap, tb, 0.14 * dg)
        for k in range(2):
            hg = (0.05 if k else 0.035) * dg
            add(L, hat, tb + k * BEAT / 2, hg * 0.8); add(Rr, hat, tb + k * BEAT / 2, hg)
        # bas
        if b % 4 in (0, 2) or (b % 4 == 3 and not calm):
            bs = pluck(roots[bar % 4] * (2 if b % 4 == 3 else 1), BEAT * 1.8, 0.6)
            add(L, bs, tb, 0.32); add(Rr, bs, tb, 0.32)
        # marimba arpej (8'likler)
        for k in range(2):
            note = ch[(b * 2 + k) % 4] * 2
            m = marimba(note, 0.6)
            pan = 0.35 if (b * 2 + k) % 2 else -0.35
            g = 0.075 if not calm else 0.055
            add(L, m, tb + k * BEAT / 2, g * (1 - pan)); add(Rr, m, tb + k * BEAT / 2, g * (1 + pan))
    # yumuşak ped (akor tonları, yavaş atak)
    for bar in range(int(DUR / (BEAT * 4)) + 1):
        tb = bar * BEAT * 4
        t = t_axis(BEAT * 4)
        e = np.clip(t / 0.4, 0, 1) * np.clip((BEAT * 4 - t) / 0.4, 0, 1)
        pad = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate(chords[bar % 4])) * e
        add(L, pad, tb, 0.022); add(Rr, pad, tb, 0.022)
    return L, Rr


def read_wav(path):
    with wave.open(path) as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    a = np.frombuffer(raw, dtype={2: np.int16, 4: np.int32}[sw]).astype(np.float64) / (2 ** (8 * sw - 1))
    a = a.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        a = np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a)
    return a


def main():
    data = json.load(open(os.path.join(HERE, 'cues.json')))
    mL, mR = music()
    fx = np.zeros(N)
    for c in data['cues']:
        fn = SFX.get(c['type'])
        if fn is None:
            print('bilinmeyen efekt:', c['type'], file=sys.stderr)
            continue
        s = fn(c['dur']) * c['gain']
        i = int(max(0, c['t']) * SR)
        j = min(N, i + len(s))
        fx[i:j] += s[: j - i]

    # seslendirme (varsa)
    vo = np.zeros(N)
    vodir = os.path.join(HERE, 'vo')
    found = 0
    for k, slot in enumerate(data['vo']):
        p = os.path.join(vodir, f'vo_{k:02d}.wav')
        if not os.path.exists(p):
            continue
        a = read_wav(p)
        a = a / (np.max(np.abs(a)) or 1) * 0.85
        i = int(slot['t0'] * SR)
        j = min(N, i + len(a))
        vo[i:j] += a[: j - i]
        found += 1
        span = len(a) / SR
        if span > slot['t1'] - slot['t0'] + 0.25:
            print(f'UYARI: VO {k:02d} yuvasından uzun ({span:.2f} sn > {slot["t1"] - slot["t0"]:.2f} sn)', file=sys.stderr)
    # ducking: VO varken müzik −8 dB
    duck = np.ones(N)
    if found:
        envv = np.abs(vo)
        win = int(0.25 * SR)
        envv = np.convolve(envv, np.ones(win) / win, mode='same')
        duck = 1 - 0.6 * np.clip(envv / 0.05, 0, 1)
    music_gain = 0.55
    L = mL * music_gain * duck + fx * 0.95 + vo
    R = mR * music_gain * duck + fx * 0.95 + vo
    # döngü dikişi: ilk/son 15 ms yumuşat
    f = int(0.015 * SR)
    ramp = np.linspace(0, 1, f)
    for ch in (L, R):
        ch[:f] *= ramp
        ch[-f:] *= ramp[::-1]
    st = np.stack([L, R], axis=1)
    st = np.tanh(st * 1.1) / np.tanh(1.1)
    st = st / np.max(np.abs(st)) * 0.89  # ~ -1 dBFS tepe
    out = os.path.join(HERE, 'soundtrack.wav')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    print(f'{out} yazıldı — {len(data["cues"])} efekt, seslendirme dosyası: {found}/{len(data["vo"])}')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-c:a', 'aac', '-b:a', '192k', os.path.join(HERE, 'soundtrack.m4a')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-c:a', 'libopus', '-b:a', '128k', os.path.join(HERE, 'soundtrack.ogg')], check=True)


if __name__ == '__main__':
    main()
