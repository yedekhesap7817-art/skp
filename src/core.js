/* HANGİ YEMEĞE HANGİ PEYNİR? — çekirdek yardımcılar
   Bütün çizim tek bir zaman değerinden (t, saniye) türetilir. Rastgelelik sabit seed'lidir. */
(function (root) {
  'use strict';
  const R = (root.R = root.R || {});

  R.W = 1080; R.H = 1920; R.FPS = 30; R.DUR = 44; R.FRAMES = 1320;
  R.TX = 495;            // metin merkezi: güvenli alan x=90–900
  R.SAFE_W = 800;
  R.C = { cream: '#F5EFE3', esp: '#251C17', tom: '#D94732', basil: '#42684B', ched: '#F2A12A' };
  R.FONT = "'Inter', 'Inter Display', 'DejaVu Sans', sans-serif";

  const clamp = (R.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x));
  const lerp = (R.lerp = (a, b, t) => a + (b - a) * t);
  R.prog = (t, a, b) => clamp((t - a) / (b - a));
  R.E = {
    in2: (t) => t * t,
    in3: (t) => t * t * t,
    out2: (t) => 1 - (1 - t) * (1 - t),
    out3: (t) => 1 - Math.pow(1 - t, 3),
    out5: (t) => 1 - Math.pow(1 - t, 5),
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    ioS: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    back: (t, s = 1.4) => { const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  };
  // Sönümlü yay: 0'dan 1'e, kontrollü overshoot
  R.spring = (dt, k = 9, w = 13) => (dt <= 0 ? 0 : 1 - Math.exp(-k * dt) * Math.cos(w * dt));
  // Darbe sonrası sönümlü salınım (0'dan başlar, 0'a döner)
  R.impulse = (dt, k = 9, w = 18) => (dt <= 0 ? 0 : Math.exp(-k * dt) * Math.sin(w * dt));

  R.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  function hash1(i) {
    let x = Math.imul(i | 0, 374761393) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  R.noise1 = (x, s = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash1(i + s * 1013), hash1(i + 1 + s * 1013), u) * 2 - 1;
  };

  R.mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  R.hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  R.mix = (a, b, t) => {
    const A = R.hex(a), B = R.hex(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  };

  // ---------- şekil yardımcıları ----------
  R.smoothClosed = function (g, pts) {
    const n = pts.length;
    g.beginPath();
    g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  };
  // Düzensiz organik form (periyodik sinüs toplamı → kapalı, pürüzsüz)
  R.blobPts = function (cx, cy, rx, ry, rnd, irr = 0.15, n = 24, rot = 0) {
    const p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28, pts = [];
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + irr * (0.6 * Math.sin(3 * a + p1) + 0.4 * Math.sin(5 * a + p2) + 0.25 * Math.sin(8 * a + p3)) / 1.25;
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return pts;
  };
  R.blob = (g, cx, cy, rx, ry, rnd, irr, n, rot) => R.smoothClosed(g, R.blobPts(cx, cy, rx, ry, rnd, irr, n, rot));

  R.softShadow = function (ctx, x, y, rx, ry, a = 0.3, col = '37,28,23') {
    if (rx <= 0 || ry <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(${col},${a})`);
    g.addColorStop(0.55, `rgba(${col},${a * 0.55})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  R.leaf = function (g, x, y, len, wid, ang, c1 = '#6FA05E', c2 = '#2F5638') {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.22, -wid * 1.05, len * 0.72, -wid * 0.95, len, 0);
    g.bezierCurveTo(len * 0.72, wid * 0.85, len * 0.22, wid * 0.95, 0, 0);
    g.closePath();
    const gr = g.createLinearGradient(0, -wid, len * 0.3, wid);
    gr.addColorStop(0, c1);
    gr.addColorStop(1, c2);
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = 'rgba(20,45,25,.35)';
    g.lineWidth = Math.max(0.8, wid * 0.05);
    g.stroke();
    g.strokeStyle = 'rgba(215,240,195,.5)';
    g.lineWidth = Math.max(0.8, wid * 0.07);
    g.beginPath();
    g.moveTo(len * 0.04, 0);
    g.quadraticCurveTo(len * 0.5, -wid * 0.1, len * 0.94, 0);
    g.stroke();
    g.lineWidth = Math.max(0.6, wid * 0.035);
    for (let i = 1; i < 5; i++) {
      const px = len * (0.15 + i * 0.16);
      g.beginPath(); g.moveTo(px, -wid * 0.04); g.quadraticCurveTo(px + len * 0.08, -wid * 0.45, px + len * 0.16, -wid * 0.62); g.stroke();
      g.beginPath(); g.moveTo(px, wid * 0.02); g.quadraticCurveTo(px + len * 0.08, wid * 0.4, px + len * 0.16, wid * 0.55); g.stroke();
    }
    // parlaklık
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.beginPath();
    g.ellipse(len * 0.42, -wid * 0.4, len * 0.22, wid * 0.18, -0.15, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  // Kuadratik eğri boyunca değişken genişlikte şerit (peynir lifleri için)
  R.ribbonPath = function (ctx, A, Cp, B, wfun, n = 22) {
    const L = [], Rr = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      const x = v * v * A[0] + 2 * v * u * Cp[0] + u * u * B[0];
      const y = v * v * A[1] + 2 * v * u * Cp[1] + u * u * B[1];
      let tx = 2 * v * (Cp[0] - A[0]) + 2 * u * (B[0] - Cp[0]);
      let ty = 2 * v * (Cp[1] - A[1]) + 2 * u * (B[1] - Cp[1]);
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      const w = wfun(u) / 2;
      L.push([x - ty * w, y + tx * w]);
      Rr.push([x + ty * w, y - tx * w]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
    ctx.closePath();
  };
  // Mozzarella lifi: gölge + gövde + kenar + parlak çizgi
  R.cheeseRibbon = function (ctx, A, Cp, B, wfun, opt = {}) {
    const fill = opt.fill || '#FFF5DF';
    ctx.save();
    ctx.translate(3, 6);
    R.ribbonPath(ctx, A, Cp, B, wfun);
    ctx.fillStyle = opt.shadow || 'rgba(90,40,10,.13)';
    ctx.fill();
    ctx.restore();
    R.ribbonPath(ctx, A, Cp, B, wfun);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = opt.edge || 'rgba(190,150,85,.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // merkez parlaklığı
    const wm = wfun(0.5);
    if (wm > 2.2) {
      ctx.beginPath();
      ctx.moveTo(A[0] - 1, A[1] - 1);
      ctx.quadraticCurveTo(Cp[0] - 1, Cp[1] - 1.5, B[0] - 1, B[1] - 1);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = Math.max(1, wm * 0.28);
      ctx.stroke();
    }
  };

  R.applyM = (ctx, m) => ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  R.cam = (ctx, cx, cy, s, ox = 0, oy = 0) => { ctx.translate(cx + ox, cy + oy); ctx.scale(s, s); ctx.translate(-cx, -cy); };

  // ---------- tipografi ----------
  R.font = (size, weight) => `${weight} ${size}px ${R.FONT}`;
  R.text = function (ctx, s, x, y, size, weight, color, o = {}) {
    ctx.save();
    ctx.font = R.font(size, weight);
    ctx.letterSpacing = (o.ls != null ? o.ls : 0) + 'px';
    const maxW = o.maxW || R.SAFE_W;
    const w = ctx.measureText(s).width;
    if (w > maxW) { size *= maxW / w; ctx.font = R.font(size, weight); }
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.restore();
    return Math.min(w, maxW);
  };
  // Hızlı oturan, sonra sabit kalan metin
  R.animText = function (ctx, t, t0, t1, s, x, y, size, weight, color, o = {}) {
    if (t < t0 || t > t1 + 0.25) return;
    const pin = R.prog(t, t0, t0 + 0.32), pout = R.prog(t, t1, t1 + 0.22);
    const a = R.E.out3(pin) * (1 - pout);
    if (a <= 0) return;
    const dy = (1 - R.E.back(pin, 1.5)) * (o.rise != null ? o.rise : 34) - pout * 12;
    ctx.save();
    ctx.globalAlpha *= a;
    R.text(ctx, s, x, Math.round(y + dy), size, weight, color, o);
    ctx.restore();
  };
  // Sahne başlığı + peynir rengi alt çizgi
  R.title = function (ctx, t, t0, t1, s, color, bar) {
    R.animText(ctx, t, t0, t1, s, R.TX, 332, 104, 900, color, { ls: 2 });
    if (t < t0 + 0.1 || t > t1 + 0.25) return;
    const p = R.E.out3(R.prog(t, t0 + 0.1, t0 + 0.5)) * (1 - R.prog(t, t1, t1 + 0.2));
    const w = 130 * p;
    ctx.save();
    ctx.fillStyle = bar;
    ctx.beginPath();
    ctx.roundRect(R.TX - w / 2, 362, w, 10, 5);
    ctx.fill();
    ctx.restore();
  };
  // Bilgi satırları (ana öğe + açıklama) — altyazı bandının üstünde biter
  R.info = function (ctx, t, t0, t1, l1, l2, c1, c2) {
    R.animText(ctx, t, t0, t1, l1, R.TX, 1196, 62, 800, c1, { ls: 1 });
    if (l2) R.animText(ctx, t, t0 + 0.18, t1, l2, R.TX, 1270, 50, 500, c2);
  };

  // ---------- altyazı ----------
  // Seslendirme metniyle senkron, kısa öbekler. hl: hafif renkle vurgulanan kelime.
  R.SUBS = [
    { t0: 1.45, t1: 2.9, s: 'Dördünü ayıralım.', hl: 'Dördünü' },
    { t0: 3.3, t1: 5.05, s: 'Mozzarella, pizza ve lazanyada', hl: 'pizza' },
    { t0: 5.05, t1: 6.9, s: 'uzayan doku verir.', hl: 'uzayan' },
    { t0: 7.3, t1: 8.85, s: 'Taze olanını kullanıyorsan,', hl: 'Taze' },
    { t0: 8.85, t1: 10.5, s: 'fazla suyunu süzdür.', hl: 'süzdür.' },
    { t0: 11.3, t1: 12.6, s: 'Parmesan sert', hl: 'sert' },
    { t0: 12.6, t1: 14.1, s: 've yoğun aromalıdır.', hl: 'yoğun' },
    { t0: 14.5, t1: 16.2, s: 'Makarna ve risottoya', hl: 'Makarna' },
    { t0: 16.2, t1: 18.3, s: 'rendeleyerek lezzet katarsın.', hl: 'rendeleyerek' },
    { t0: 19.35, t1: 21.1, s: 'Burratanın dışı mozzarella,', hl: 'dışı' },
    { t0: 21.1, t1: 23.3, s: 'içi kremalı peynir lifleridir.', hl: 'kremalı' },
    { t0: 23.7, t1: 25.4, s: 'Salatada, kızarmış ekmekte', hl: 'Salatada,' },
    { t0: 25.4, t1: 27.5, s: 'veya fırından çıkan pizzada dene.', hl: 'pizzada' },
    { t0: 28.3, t1: 29.85, s: 'Cheddar, burger ve tostta', hl: 'burger' },
    { t0: 29.85, t1: 31.35, s: 'belirgin bir tat verir.', hl: 'belirgin' },
    { t0: 31.6, t1: 33.0, s: 'Isınınca yumuşar,', hl: 'Isınınca' },
    { t0: 33.0, t1: 34.6, s: 'erir ve yüzeye yayılır.', hl: 'erir' },
    { t0: 35.3, t1: 36.95, s: 'Kısaca: mozzarella uzatır,', hl: 'uzatır,' },
    { t0: 36.95, t1: 38.65, s: 'parmesan lezzeti yoğunlaştırır,', hl: 'yoğunlaştırır,' },
    { t0: 38.8, t1: 40.3, s: 'burrata kremamsılık katar;', hl: 'kremamsılık' },
    { t0: 40.3, t1: 41.9, s: 'cheddar burger ve tostu tamamlar.', hl: 'tamamlar.' },
    { t0: 42.1, t1: 43.75, s: 'Bir sonraki alışveriş için kaydet.', hl: 'kaydet.' },
  ];
  // Seslendirme cümle yuvaları (VO dosyaları bu zamanlara yerleştirilir)
  R.VO = [
    { t0: 0.2, t1: 2.9, s: 'Hangi yemeğe hangi peynir? Dördünü ayıralım.' },
    { t0: 3.3, t1: 6.9, s: 'Mozzarella, pizza ve lazanyada uzayan doku verir.' },
    { t0: 7.3, t1: 10.5, s: 'Taze olanını kullanıyorsan, fazla suyunu süzdür.' },
    { t0: 11.3, t1: 14.1, s: 'Parmesan sert ve yoğun aromalıdır.' },
    { t0: 14.5, t1: 18.3, s: 'Makarna ve risottoya rendeleyerek lezzet katarsın.' },
    { t0: 19.35, t1: 23.3, s: 'Burratanın dışı mozzarella, içi kremalı peynir lifleridir.' },
    { t0: 23.7, t1: 27.5, s: 'Salatada, kızarmış ekmekte veya fırından çıkan pizzada dene.' },
    { t0: 28.3, t1: 31.35, s: 'Cheddar, burger ve tostta belirgin bir tat verir.' },
    { t0: 31.6, t1: 34.6, s: 'Isınınca yumuşar, erir ve yüzeye yayılır.' },
    { t0: 35.3, t1: 41.9, s: 'Kısaca: mozzarella uzatır, parmesan lezzeti yoğunlaştırır, burrata kremamsılık katar; cheddar burger ve tostu tamamlar.' },
    { t0: 42.1, t1: 43.75, s: 'Bir sonraki alışveriş için kaydet.' },
  ];

  const subCache = new Map();
  function layoutSub(ctx, sub) {
    if (subCache.has(sub)) return subCache.get(sub);
    ctx.save();
    ctx.font = R.font(50, 600);
    const words = sub.s.split(' ');
    const lines = [[]];
    let w = 0;
    const space = ctx.measureText(' ').width;
    for (const wd of words) {
      const ww = ctx.measureText(wd).width;
      if (w > 0 && w + space + ww > 740) { lines.push([]); w = 0; }
      lines[lines.length - 1].push({ wd, ww });
      w += (w > 0 ? space : 0) + ww;
    }
    const lay = lines.map((l) => ({ words: l, w: l.reduce((s, o) => s + o.ww, 0) + space * (l.length - 1) }));
    ctx.restore();
    const res = { lines: lay, space };
    subCache.set(sub, res);
    return res;
  }
  R.drawSubs = function (ctx, t) {
    for (const sub of R.SUBS) {
      if (t < sub.t0 || t >= sub.t1) continue;
      const a = R.E.out2(R.prog(t, sub.t0, sub.t0 + 0.12)) * (1 - R.prog(t, sub.t1 - 0.1, sub.t1));
      const lay = layoutSub(ctx, sub);
      const lh = 64, padX = 30, padY = 20;
      const bw = Math.max(...lay.lines.map((l) => l.w)) + padX * 2;
      const bh = lay.lines.length * lh + padY * 2 - 8;
      const cy = 1405, top = Math.round(cy - bh / 2) + Math.round((1 - a) * 4);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(27,20,17,.88)';
      ctx.beginPath();
      ctx.roundRect(R.TX - bw / 2, top, bw, bh, 22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245,239,227,.16)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = R.font(50, 600);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      lay.lines.forEach((l, i) => {
        let x = R.TX - l.w / 2;
        const y = top + padY + 46 + i * lh;
        for (const o of l.words) {
          ctx.fillStyle = o.wd === sub.hl ? R.C.ched : R.C.cream;
          ctx.fillText(o.wd, x, y);
          x += o.ww + lay.space;
        }
      });
      ctx.restore();
    }
  };
})(window);
