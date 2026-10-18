/* Sahneler + ana zaman çizelgesi. render(ctx, t) her kareyi yalnızca t'den üretir. */
(function (root) {
  'use strict';
  const R = root.R, A = R.A, C = R.C, E = R.E;
  const { clamp, lerp, prog } = R;
  const TAU = Math.PI * 2, PR = R.PR, GAP = R.GAP;
  const AM = (GAP.a0 + GAP.a1) / 2;
  const cues = (R.cues = []); // ses efekti noktaları (zaman, tür, süre)
  const cue = (t, type, dur = 0.3, gain = 1) => cues.push({ t: +t.toFixed(3), type, dur, gain });
  // Tam kare çapraz geçiş: sahne önce ayrı bir katmana çizilir, sonra tek alfa ile bindirilir
  let LAYER = null;
  function fadeIn(ctx, a, fn) {
    if (a <= 0) return;
    if (a >= 1) { fn(ctx); return; }
    if (!LAYER) LAYER = R.mk(R.W, R.H);
    const lc = LAYER.getContext('2d');
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, R.W, R.H);
    fn(lc);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(LAYER, 0, 0); ctx.restore();
  }

  /* =========================================================
     PİZZA + MOZZARELLA LİFLERİ
     ========================================================= */
  const pizzaM = (P) => new DOMMatrix().translateSelf(P.x, P.y).scaleSelf(P.r / PR, (P.r / PR) * P.tilt);
  function sliceM(P, L) {
    const pm = pizzaM(P);
    const piv = pm.transformPoint(new DOMPoint(Math.cos(AM) * PR * 0.55, Math.sin(AM) * PR * 0.55));
    return new DOMMatrix().translateSelf(piv.x + L.dx, piv.y + L.dy).scaleSelf(L.s, L.s * (1 + (L.sy || 0))).rotateSelf((L.rot * 180) / Math.PI)
      .translateSelf(-piv.x, -piv.y).multiplySelf(pm);
  }
  const droopAt = (rl, L) => L.droop * Math.pow(1 - clamp(rl / PR), 1.7);
  function slicePt(P, L, lx, ly) {
    const p = sliceM(P, L).transformPoint(new DOMPoint(lx, ly));
    return [p.x, p.y + droopAt(Math.hypot(lx, ly), L)];
  }
  function pizzaPt(P, lx, ly) { const p = pizzaM(P).transformPoint(new DOMPoint(lx, ly)); return [p.x, p.y]; }

  function makeLift(U, P, amp) {
    return (t) => {
      const u = U(t), v = (u - U(t - 0.06)) / 0.06;
      return { u, dx: amp.dx * u, dy: amp.dy * u, s: 1 + amp.s * u, sy: (amp.sy || 0) * u, rot: amp.rot * u, droop: P.r * (0.07 * u + 0.06 * clamp(v, -1, 3)) };
    };
  }

  function drawPizzaBase(ctx, P, gap = true) {
    R.softShadow(ctx, P.x + P.r * 0.05, P.y + P.r * P.tilt * 0.35, P.r * 1.25, P.r * P.tilt * 1.2, 0.32);
    const m = pizzaM(P);
    // ahşap servis tahtası
    ctx.save(); ctx.translate(0, P.r * 0.07); R.applyM(ctx, m);
    ctx.fillStyle = '#7B4D27'; ctx.beginPath(); ctx.arc(0, 0, PR * 1.1, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); R.applyM(ctx, m);
    let g = ctx.createRadialGradient(-150, -180, 40, 0, 0, PR * 1.1);
    g.addColorStop(0, '#D9A46A'); g.addColorStop(1, '#AE7743');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, PR * 1.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(110,65,30,.22)'; ctx.lineWidth = 4;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(0, 0, PR * (0.2 + i * 0.1), PR * (0.12 + i * 0.1), 0.3, 0, TAU); ctx.stroke(); }
    if (gap) { // boşlukta ortam gölgesi
      ctx.fillStyle = 'rgba(70,35,10,.28)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, PR * 1.0, GAP.a0, GAP.a1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const clipGap = () => { if (gap) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, PR * 1.03, GAP.a1, GAP.a0 + TAU); ctx.closePath(); ctx.clip(); } };
    ctx.save(); ctx.translate(0, P.r * 0.045); R.applyM(ctx, m); clipGap();
    ctx.fillStyle = '#A2632A'; ctx.beginPath(); ctx.arc(0, 0, PR * 0.995, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); R.applyM(ctx, m); clipGap(); ctx.drawImage(A.pizza, -500, -500); ctx.restore();
  }

  function drawSlice(ctx, P, L, alpha = 1) {
    const m = sliceM(P, L), N = 20, th = P.r * 0.03 * L.s;
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < N; k++) {
        const r0 = (k / N) * PR * 1.03, r1 = ((k + 1) / N) * PR * 1.03;
        const dy = droopAt((r0 + r1) / 2, L) + (pass === 0 ? th : 0);
        ctx.save();
        ctx.translate(0, dy);
        R.applyM(ctx, m);
        ctx.beginPath();
        ctx.arc(0, 0, r1 + 2, GAP.a0, GAP.a1);
        ctx.arc(0, 0, Math.max(0, r0 - 2), GAP.a1, GAP.a0, true);
        ctx.closePath();
        ctx.clip();
        if (pass === 0) { ctx.fillStyle = '#C08040'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, PR * 1.0, GAP.a0, GAP.a1); ctx.fill(); }
        else ctx.drawImage(A.pizza, -500, -500);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // Lif tanımları: [dilimdeki açı, yarıçap oranı, genişlik, kopma oranı (null = kopmaz), yanal sapma, pizzadaki açı]
  // Lifler dilimin kesik kenarlarından komşu pizza kenarlarına uzanır.
  const E0 = GAP.a0 - 0.05, E1 = GAP.a1 + 0.05;
  const STRAND_DEFS = [
    [GAP.a0 + 0.04, 0.24, 34, 0.72, -0.4, E0],
    [GAP.a0 + 0.04, 0.44, 26, null, 0.3, E0],
    [GAP.a0 + 0.05, 0.62, 22, 0.55, -0.2, E0],
    [GAP.a0 + 0.06, 0.8, 16, 0.5, 0.25, E0],
    [GAP.a0 + 0.07, 0.93, 12, 0.62, -0.3, E0],
    [AM, 0.06, 44, null, 0.1, AM],
    [AM - 0.15, 0.16, 26, 0.85, -0.2, GAP.a0 + 0.2],
    [AM + 0.15, 0.17, 24, 0.66, 0.2, GAP.a1 - 0.2],
    [GAP.a1 - 0.04, 0.26, 30, 0.86, 0.4, E1],
    [GAP.a1 - 0.04, 0.46, 36, null, -0.3, E1],
    [GAP.a1 - 0.05, 0.64, 18, 0.5, 0.35, E1],
    [GAP.a1 - 0.06, 0.82, 14, 0.62, -0.4, E1],
    [GAP.a1 - 0.07, 0.94, 11, 0.45, 0.2, E1],
  ];
  function makeStrands(P, Lf, t0, t1, wScale, seed) {
    const rnd = R.rng(seed);
    return STRAND_DEFS.map((d) => {
      const lx = Math.cos(d[0]) * d[1] * PR, ly = Math.sin(d[0]) * d[1] * PR;
      const B = pizzaPt(P, Math.cos(d[5]) * d[1] * PR, Math.sin(d[5]) * d[1] * PR);
      const len = (t) => { const A_ = slicePt(P, Lf(t), lx, ly); return Math.hypot(A_[0] - B[0], A_[1] - B[1]); };
      let Lmax = 0;
      for (let t = t0; t <= t1; t += 1 / 60) Lmax = Math.max(Lmax, len(t));
      const s = { lx, ly, B, w: d[2] * wScale, ph: d[4], tb: Infinity, brkL: Infinity, side: rnd() < 0.5 ? -1 : 1 };
      if (d[3] != null) {
        s.brkL = d[3] * Lmax;
        for (let t = t0; t <= t1; t += 1 / 120) if (len(t) > s.brkL) { s.tb = t; break; }
      }
      return s;
    });
  }
  function drawStrand(ctx, P, L, s, t, relax) {
    const A_ = slicePt(P, L, s.lx, s.ly), B = s.B;
    const dx = B[0] - A_[0], dy = B[1] - A_[1], len = Math.hypot(dx, dy);
    if (t < s.tb) {
      if (len < 4) return;
      const thin = Math.sqrt(110 / (110 + len));
      const neck = isFinite(s.brkL) ? 1 - 0.7 * clamp((len / s.brkL - 0.68) / 0.32) : 1;
      const wE = s.w * Math.max(0.6, thin * 1.35), wM = Math.max(2.2, s.w * thin * 0.75 * neck);
      const sag = len * (0.07 + 0.2 * relax) + 4, lat = s.ph * len * 0.1;
      const Cp = [(A_[0] + B[0]) / 2 + lat, (A_[1] + B[1]) / 2 + sag];
      R.cheeseRibbon(ctx, A_, Cp, B, (u) => lerp(wM, wE, Math.pow(Math.abs(2 * u - 1), 1.5)));
    } else {
      // Koptu: üst parça dilimden sarkar ve sallanır, alt parça pizzaya geri çöker
      const dt = t - s.tb;
      const hl = lerp(s.brkL * 0.5, s.brkL * 0.3, R.spring(dt, 5, 9));
      const sway = 26 * Math.exp(-2.6 * dt) * Math.sin(8 * dt + s.ph * 3) * s.side;
      const w0 = s.w * 0.62;
      const Et = [A_[0] + sway + s.ph * 10, A_[1] + hl];
      const Ct = [A_[0] + sway * 0.2, A_[1] + hl * 0.5];
      R.cheeseRibbon(ctx, A_, Ct, Et, (u) => lerp(w0, Math.max(2, w0 * 0.35), u));
      ctx.fillStyle = '#FFF5DF';
      ctx.beginPath(); ctx.ellipse(Et[0], Et[1], w0 * 0.42, w0 * 0.55, 0, 0, TAU); ctx.fill();
      // alt parça yerçekimiyle pizzaya geri çöker ve küçük bir yığın olur
      const c = E.out3(prog(dt, 0, 0.45));
      const bl = s.brkL * 0.4 * (1 - c);
      if (bl > 6) R.cheeseRibbon(ctx, B, [B[0] + s.side * 6, B[1] - bl * 0.55], [B[0] + s.side * 10 * c, B[1] - bl], (u) => lerp(w0 * 1.1, Math.max(2, w0 * 0.4), u));
      ctx.fillStyle = '#FBF1DA';
      ctx.beginPath(); ctx.ellipse(B[0], B[1], w0 * (0.5 + 0.4 * c), w0 * (0.3 + 0.15 * c), 0, 0, TAU); ctx.fill();
    }
  }
  function drawPizzaPull(ctx, P, L, strands, t, relax) {
    drawPizzaBase(ctx, P);
    // dilimin pizzaya düşen gölgesi
    const c = slicePt(P, L, Math.cos(AM) * PR * 0.5, Math.sin(AM) * PR * 0.5);
    R.softShadow(ctx, c[0], pizzaPt(P, Math.cos(AM) * PR * 0.5, Math.sin(AM) * PR * 0.5)[1] + 10, P.r * 0.35, P.r * 0.14, 0.25 * clamp(L.u * 2));
    for (const s of strands) drawStrand(ctx, P, L, s, t, relax);
    drawSlice(ctx, P, L);
  }

  /* =========================================================
     PARMESAN PARÇACIKLARI
     ========================================================= */
  const G = 1700;
  function makeFlight(p) { // p: {ts, x0,y0, tx,ty, tf}
    p.vx = (p.tx - p.x0) / p.tf;
    p.vy = (p.ty - p.y0 - 0.5 * G * p.tf * p.tf) / p.tf;
    return p;
  }
  function flightPos(p, t) {
    const dt = t - p.ts;
    if (dt < 0) return null;
    if (dt >= p.tf) return { x: p.tx, y: p.ty, rot: p.a0 + p.spin * p.tf, landed: true, dt };
    return { x: p.x0 + p.vx * dt, y: p.y0 + p.vy * dt + 0.5 * G * dt * dt, rot: p.a0 + p.spin * dt, landed: false, dt };
  }
  // Sert parmesan parçası: fasetli, pütürlü kırık
  function drawShard(ctx, x, y, s, rot, seed, flat) {
    const rnd = R.rng(seed);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (flat) ctx.scale(1, 0.62);
    const n = 6, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.5; const r = s * (0.55 + rnd() * 0.5); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = '#E6C878'; ctx.fill();
    ctx.strokeStyle = 'rgba(130,95,35,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#F8E9B4'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,245,.9)'; ctx.fillRect(-s * 0.2, -s * 0.15, 2, 2); ctx.fillRect(s * 0.15, s * 0.1, 1.5, 1.5);
    ctx.restore();
  }
  // Rende talaşı: ince kıvrık şerit ya da kırıntı
  function drawShaving(ctx, p, x, y, rot, flat, k = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k * (flat ? 0.6 : 1));
    if (p.kind === 0) {
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-p.len / 2, 0); ctx.quadraticCurveTo(0, -p.len * 0.35 * p.curl, p.len / 2, 0);
      ctx.strokeStyle = '#B99549'; ctx.lineWidth = p.w + 1.6; ctx.stroke();
      ctx.strokeStyle = p.col; ctx.lineWidth = p.w; ctx.stroke();
    } else {
      ctx.fillStyle = '#B99549'; ctx.beginPath(); ctx.ellipse(0.6, 0.8, p.w * 1.1, p.w * 0.85, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.w, p.w * 0.75, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* =========================================================
     SAHNE 1 — HOOK (0–3 sn)
     ========================================================= */
  const P1 = { x: 540, y: 665, r: 345, tilt: 0.56 };
  const PLATE1 = { x: 540, y: 1392, s: 1.02 };
  const U1 = (t) => 0.12 + 0.88 * E.back(prog(t, 0, 1.45), 1.25);
  const L1 = makeLift(U1, P1, { dx: 22, dy: -285, s: 0.12, sy: 0.32, rot: -0.07 });
  let S1 = {};
  function plateToWorld(PL, tx, ty) { return [PL.x + (tx - 450) * PL.s, PL.y + (ty - 290) * PL.s]; }
  function drawPastaPlate(ctx, PL) {
    R.softShadow(ctx, PL.x + 12, PL.y + 50 * PL.s, 450 * PL.s, 150 * PL.s, 0.3);
    ctx.drawImage(A.pasta, PL.x - 450 * PL.s, PL.y - 290 * PL.s, 900 * PL.s, 560 * PL.s);
  }
  function initS1() {
    S1.strands = makeStrands(P1, L1, 0, 3, 345 / 380, 11);
    const rnd = R.rng(1201);
    S1.shards = [];
    for (let i = 0; i < 26; i++) {
      const ts = -0.25 + i * 0.085 + rnd() * 0.04;
      const r = Math.sqrt(rnd()) * 0.9, a = rnd() * TAU;
      const [tx, ty] = R.nestTop(Math.cos(a) * r, Math.sin(a) * r);
      const [wx, wy] = plateToWorld(PLATE1, tx, ty);
      S1.shards.push(makeFlight({ ts, x0: 1150 + rnd() * 60, y0: 1150 + rnd() * 60, tx: wx, ty: wy, tf: 0.55 + rnd() * 0.2, a0: rnd() * TAU, spin: (rnd() - 0.5) * 16, s: 13 + rnd() * 13, seed: 500 + i }));
    }
    cue(0, 'beat', 0.5, 1); cue(0.02, 'stretch', 1.4, 0.8);
    S1.strands.forEach((s) => isFinite(s.tb) && s.tb < 3 && cue(s.tb, 'snap', 0.15, 0.7));
    S1.shards.forEach((p, i) => i % 4 === 1 && p.ts + p.tf > 0 && p.ts + p.tf < 2.6 && cue(p.ts + p.tf, 'tick', 0.08, 0.5));
    cue(0.62, 'clink', 0.4, 0.6);
    cue(0.15, 'pop', 0.15, 0.6); cue(0.75, 'pop', 0.15, 0.7);
    cue(2.3, 'whoosh', 0.7, 0.8);
  }
  function drawS1Food(ctx, t, opt = {}) {
    const L = L1(t);
    drawPizzaPull(ctx, P1, L, S1.strands, t, prog(t, 1.5, 3));
    drawPastaPlate(ctx, PLATE1);
    for (const p of S1.shards) {
      const q = flightPos(p, t);
      if (!q) continue;
      drawShard(ctx, q.x, q.y, p.s, q.rot, p.seed, q.landed);
    }
  }
  function drawS1(ctx, t, opt = {}) {
    R.bg(ctx, false);
    ctx.save();
    const z = E.in3(prog(t, 2.3, 3.0));
    if (z > 0) {
      const c = slicePt(P1, L1(t), Math.cos(AM) * PR * 0.5, Math.sin(AM) * PR * 0.5);
      R.cam(ctx, c[0], c[1], 1 + 1.6 * z);
    }
    drawS1Food(ctx, t);
    ctx.restore();
    if (opt.noText) return;
    const fade = 1 - prog(t, 2.4, 2.7);
    ctx.save(); ctx.globalAlpha = fade;
    R.animText(ctx, t, 0.12, 9, 'HANGİ YEMEĞE', R.TX, 1000, 104, 900, C.esp, { ls: 1 });
    R.animText(ctx, t, 0.72, 9, 'HANGİ PEYNİR?', R.TX, 1114, 108, 900, C.tom, { ls: 1 });
    ctx.restore();
  }

  /* =========================================================
     SAHNE 2 — MOZZARELLA (3–11 sn)
     ========================================================= */
  const P2 = { x: 540, y: 895, r: 350, tilt: 0.58 };
  const U2 = (t) => {
    if (t < 3.45) return 0;
    const dip = -0.03 * Math.sin(Math.PI * prog(t, 3.45, 3.8)); // hazırlık: dilim önce hafifçe bastırılır
    const p = prog(t, 3.8, 6.9);
    const u = p < 0.4 ? 0.2 * E.in2(p / 0.4) : 0.2 + 0.8 * E.back((p - 0.4) / 0.6, 1.1);
    return u + dip;
  };
  const L2 = makeLift(U2, P2, { dx: 28, dy: -245, s: 0.1, sy: 0.28, rot: -0.06 });
  let S2 = {};
  function initS2() {
    S2.strands = makeStrands(P2, L2, 3.0, 10.6, 350 / 380, 22);
    S2.drops = [];
    for (let i = 0; i < 9; i++) S2.drops.push({ ts: 8.45 + i * 0.24 + (i % 3) * 0.03, x: 290 + ((i * 37) % 30) - 15 });
    cue(3.85, 'stretch', 2.9, 1);
    S2.strands.forEach((s) => isFinite(s.tb) && cue(s.tb, 'snap', 0.15, 0.8));
    cue(8.0, 'swish', 0.4, 0.5);
    S2.drops.forEach((d, i) => i % 2 === 0 && cue(d.ts + 0.2, 'drip', 0.12, 0.45));
    cue(10.42, 'whoosh', 0.7, 0.9);
  }
  function s2Cam(ctx, t) {
    const zin = 1 - E.out3(prog(t, 2.82, 3.8));
    if (zin > 0) {
      const c = slicePt(P2, L2(t), Math.cos(AM) * PR * 0.5, Math.sin(AM) * PR * 0.5);
      R.cam(ctx, c[0], c[1], 1 + 1.25 * zin);
    }
    const k = E.io3(prog(t, 7.95, 8.6));
    if (k > 0) R.cam(ctx, 540, 895, 1 - 0.2 * k, 0, -105 * k);
  }
  function drawCompare(ctx, t) {
    const p = prog(t, 8.0, 8.55);
    if (p <= 0) return;
    const oy = (1 - E.back(p, 1.2)) * 460;
    ctx.save(); ctx.translate(0, oy);
    // tahta zemin
    R.softShadow(ctx, 520, 1080, 420, 46, 0.25);
    // --- taze mozzarella süzgeçte ---
    const bx = 300, by = 925;
    R.softShadow(ctx, bx, 1094, 80, 14, 0.25);
    ctx.fillStyle = 'rgba(150,190,215,.35)'; ctx.beginPath(); ctx.ellipse(bx, 1094, 70 * prog(t, 8.4, 9.6) + 10, 12, 0, 0, TAU); ctx.fill();
    // süzgeç arka kenar
    ctx.strokeStyle = '#8C949A'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(bx, 968, 118, 30, 0, Math.PI, TAU); ctx.stroke();
    // top
    let g = ctx.createRadialGradient(bx - 34, by - 40, 6, bx, by, 100);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, '#F7F5EF'); g.addColorStop(1, '#D9D3C6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, 96, 90, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(bx - 36, by - 44, 24, 12, -0.6, 0, TAU); ctx.fill();
    // ıslak boncuklar (nem)
    const rr = R.rng(77);
    for (let i = 0; i < 9; i++) {
      const a = 0.3 + rr() * 2.6, d = 60 + rr() * 26;
      const x = bx + Math.cos(a) * d, y = by + Math.sin(a) * d * 0.9 + ((t * 30 + i * 13) % 20) * 0.4;
      ctx.fillStyle = 'rgba(160,200,225,.55)'; ctx.beginPath(); ctx.ellipse(x, y, 4, 5.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(x - 1.5, y - 2.5, 2, 2);
    }
    // süzgeç ön yüzü (tel örgü)
    ctx.save();
    ctx.beginPath(); ctx.ellipse(bx, 968, 118, 30, 0, 0, Math.PI); ctx.lineTo(bx - 70, 1040); ctx.quadraticCurveTo(bx, 1072, bx + 70, 1040); ctx.closePath();
    ctx.fillStyle = 'rgba(160,168,174,.35)'; ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(90,98,104,.55)'; ctx.lineWidth = 1.5;
    for (let i = -12; i < 14; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 14, 960); ctx.lineTo(bx + i * 14 + 60, 1080); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx + i * 14, 960); ctx.lineTo(bx + i * 14 - 60, 1080); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#B8C0C6'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(bx, 968, 118, 30, 0, 0, Math.PI); ctx.stroke();
    // damlalar
    for (const d of S2.drops) {
      const dt = t - d.ts;
      if (dt < 0 || dt > 0.4) continue;
      const y = 1050 + 0.5 * 1800 * dt * dt;
      if (y < 1090) {
        ctx.fillStyle = 'rgba(150,195,225,.9)';
        ctx.beginPath(); ctx.moveTo(d.x, y - 12); ctx.quadraticCurveTo(d.x + 7, y, d.x, y + 6); ctx.quadraticCurveTo(d.x - 7, y, d.x, y - 12); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(d.x - 2, y - 3, 2, 3);
      } else {
        const k = prog(dt, Math.sqrt(80 / 900), 0.4);
        ctx.strokeStyle = `rgba(150,195,225,${0.8 * (1 - k)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(d.x, 1094, 8 + 30 * k, 3 + 6 * k, 0, 0, TAU); ctx.stroke();
      }
    }
    // --- pizzalık (düşük nemli) mozzarella blok ---
    const kx = 720, ky = 1000;
    R.softShadow(ctx, kx + 10, 1080, 150, 20, 0.3);
    ctx.fillStyle = '#E3CF9F'; ctx.beginPath(); ctx.moveTo(kx - 105, ky - 30); ctx.lineTo(kx + 70, ky - 30); ctx.lineTo(kx + 70, ky + 72); ctx.lineTo(kx - 105, ky + 72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#CDB680'; ctx.beginPath(); ctx.moveTo(kx + 70, ky - 30); ctx.lineTo(kx + 115, ky - 62); ctx.lineTo(kx + 115, ky + 40); ctx.lineTo(kx + 70, ky + 72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F2E4BF'; ctx.beginPath(); ctx.moveTo(kx - 105, ky - 30); ctx.lineTo(kx - 60, ky - 62); ctx.lineTo(kx + 115, ky - 62); ctx.lineTo(kx + 70, ky - 30); ctx.closePath(); ctx.fill();
    const r2 = R.rng(88);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(170,140,80,.25)'; ctx.fillRect(kx - 100 + r2() * 165, ky - 25 + r2() * 92, 2, 2); }
    // rendelenmiş şeritler
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = kx - 140 + r2() * 90, y = 1062 + r2() * 18, a = r2() * 3;
      ctx.strokeStyle = '#C9B07A'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 6); ctx.stroke();
      ctx.strokeStyle = '#F4E8C6'; ctx.lineWidth = 4; ctx.stroke();
    }
    R.text(ctx, 'TAZE', bx, 1140, 36, 800, '#6B5446', { ls: 2 });
    R.text(ctx, 'PİZZALIK', kx + 5, 1140, 36, 800, '#6B5446', { ls: 2 });
    ctx.restore();
  }
  function drawS2(ctx, t, opt = {}) {
    R.bg(ctx, false);
    ctx.save();
    s2Cam(ctx, t);
    const L = L2(t);
    drawPizzaPull(ctx, P2, L, S2.strands, t, prog(t, 6.9, 9.5));
    ctx.restore();
    drawCompare(ctx, t);
    if (opt.noText) return;
    R.title(ctx, t, 3.15, 10.35, 'MOZZARELLA', C.esp, C.tom);
    R.info(ctx, t, 3.7, 7.75, 'PİZZA • LAZANYA', 'Yumuşak tat, uzayan doku', C.tom, C.esp);
    R.animText(ctx, t, 7.95, 10.35, 'Taze mozzarella kullanıyorsan', R.TX, 1215, 48, 600, C.esp);
    R.animText(ctx, t, 8.1, 10.35, 'suyunu süzdür.', R.TX, 1278, 52, 800, C.tom);
  }

  /* =========================================================
     SAHNE 3 — PARMESAN (11–19 sn)
     ========================================================= */
  const GR = { x: 690, y: 612, rot: 0.22, s: 0.85 };
  const PLATE3 = { x: 540, y: 940, s: 0.86 };
  const PER = 0.64, ST0 = 11.35, NST = 10, ST1 = ST0 + NST * PER;
  function gPt(lx, ly) {
    const c = Math.cos(GR.rot), s = Math.sin(GR.rot);
    const x = (lx - 80) * GR.s, y = (ly - 330) * GR.s;
    return [GR.x + x * c - y * s, GR.y + x * s + y * c];
  }
  function strokeLy(t) { // rende yüzeyindeki temas noktası (yerel y)
    if (t < ST0 || t >= ST1) return 330;
    const q = ((t - ST0) % PER) / PER;
    if (q < 0.45) return lerp(330, 600, E.ioS(q / 0.45));
    return lerp(600, 330, E.ioS((q - 0.45) / 0.55));
  }
  const isDown = (t) => t >= ST0 && t < ST1 && ((t - ST0) % PER) / PER < 0.45;
  let S3 = {};
  function initS3() {
    const rnd = R.rng(303);
    S3.parts = [];
    for (let k = 0; k < NST; k++) {
      const c0 = ST0 + k * PER;
      cue(c0 + 0.02, 'rasp', PER * 0.42, 0.85);
      for (let j = 0; j < 34; j++) {
        const ts = c0 + PER * 0.45 * (0.12 + 0.8 * (j / 34)) + rnd() * 0.01;
        const ly = strokeLy(ts);
        const [x0, y0] = gPt(150 + rnd() * 20, ly + (rnd() - 0.5) * 20);
        const r = Math.pow(rnd(), 0.8) * 0.85, a = rnd() * TAU;
        const [tx, ty] = R.nestTop(Math.cos(a) * r, Math.sin(a) * r);
        const [wx, wy] = plateToWorld(PLATE3, tx, ty);
        const kind = rnd() < 0.72 ? 0 : 1;
        S3.parts.push(makeFlight({
          ts, x0, y0, tx: wx, ty: wy, ptx: tx, pty: ty, tf: 0.42 + rnd() * 0.22, a0: rnd() * TAU, spin: (rnd() - 0.5) * 18,
          kind, len: 13 + rnd() * 14, w: kind ? 3 + rnd() * 2.5 : 3.4 + rnd() * 1.8, curl: 0.4 + rnd() * 0.8,
          col: ['#FBF2D2', '#F6E6B4', '#FFF8E2'][(rnd() * 3) | 0],
        }));
      }
    }
    cue(18.28, 'whoosh', 0.8, 0.9);
  }
  function drawWedge(ctx, t) {
    const ly = strokeLy(t);
    const wear = 26 * prog(t, ST0, ST1);
    const press = isDown(t) ? 3 : 0;
    const [x, y] = gPt(26 + wear - press, ly);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(GR.rot * 0.45 - 0.08 + 0.02 * Math.sin((t - ST0) * TAU / PER));
    ctx.scale(0.68, 0.68);
    ctx.drawImage(A.parm, -566, -300);
    ctx.restore();
  }
  function drawGrater(ctx) {
    ctx.save(); ctx.translate(GR.x, GR.y); ctx.rotate(GR.rot); ctx.scale(GR.s, GR.s); ctx.drawImage(A.grater, -80, -330); ctx.restore();
  }
  function drawS3Food(ctx, t) {
    drawPastaPlate(ctx, PLATE3);
    const falling = [];
    for (const p of S3.parts) {
      const q = flightPos(p, t);
      if (!q) continue;
      if (q.landed) drawShaving(ctx, p, q.x, q.y, q.rot, true);
      else falling.push([p, q]);
    }
    drawWedge(ctx, t);
    drawGrater(ctx);
    for (const [p, q] of falling) drawShaving(ctx, p, q.x, q.y, q.rot, false);
  }
  function drawLeaf(ctx, t) { // kameraya uçan büyük parmesan yaprağı → burrata yüzeyi
    const p = prog(t, 18.3, 18.92);
    if (p <= 0) return;
    const k = E.in2(p);
    const sc = 0.25 * Math.pow(42 / 0.25, k);
    const [sx, sy] = gPt(170, 420);
    const x = lerp(sx, 540, E.io3(p)), y = lerp(sy, 900, E.io3(p));
    const col = R.mix('#EFD891', '#F8F4EC', prog(t, 18.62, 18.9));
    ctx.save();
    ctx.translate(x, y); ctx.rotate(lerp(-0.6, 1.4, E.out2(p))); ctx.scale(sc, sc);
    const rnd = R.rng(31);
    const pts = R.blobPts(0, 0, 64, 40, rnd, 0.18, 26);
    ctx.save(); ctx.translate(2, 4); R.smoothClosed(ctx, pts); ctx.fillStyle = 'rgba(40,25,10,.25)'; ctx.fill(); ctx.restore();
    R.smoothClosed(ctx, pts);
    ctx.fillStyle = col; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.globalAlpha = 1 - prog(t, 18.6, 18.85);
    ctx.strokeStyle = 'rgba(170,130,60,.35)'; ctx.lineWidth = 1.6;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(-70, i * 7); ctx.quadraticCurveTo(0, i * 7 - 10, 70, i * 7 + 3); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,240,.8)';
    for (let i = 0; i < 30; i++) ctx.fillRect(-55 + rnd() * 110, -32 + rnd() * 64, 1.2, 1.2);
    ctx.restore();
    ctx.restore();
  }
  function drawS3(ctx, t, opt = {}) {
    R.bg(ctx, true);
    ctx.save();
    R.cam(ctx, 540, 1150, 1 + 0.1 * E.ioS(prog(t, 11.3, 18.3)));
    drawS3Food(ctx, t);
    ctx.restore();
    if (!opt.noText) {
      R.title(ctx, t, 11.15, 18.2, 'PARMESAN', C.cream, C.ched);
      R.info(ctx, t, 11.9, 18.2, 'MAKARNA • RİSOTTO', 'Sert doku, yoğun aroma', C.ched, C.cream);
    }
    drawLeaf(ctx, t);
  }

  /* =========================================================
     SAHNE 4 — BURRATA (19–28 sn)
     ========================================================= */
  const BU = { cx: 540, cy: 870, rx: 196, ryT: 180, ryB: 60 };
  const PLATE4 = { x: 540, y: 905, s: 0.92 };
  const SY = BU.cy - BU.ryT * 0.5; // kesik çizgisi (üst yüzeyde)
  const SL = 112;                  // kesik yarı uzunluğu
  function knifePos(t) {
    // [x, y, açı] — bıçak ağzının merkezi
    if (t < 19.5) return null;
    if (t < 20.1) { const p = E.out3(prog(t, 19.5, 20.1)); return [lerp(980, 560, p), lerp(260, SY - 95, p), lerp(-0.25, -0.05, p)]; }
    if (t < 20.3) { const p = E.ioS(prog(t, 20.1, 20.3)); return [560, SY - 95 - 22 * p, -0.05]; }        // hazırlık
    if (t < 20.55) { const p = E.in2(prog(t, 20.3, 20.55)); return [560, lerp(SY - 117, SY + 6, p), -0.05]; } // bastırma
    if (t < 20.9) { const p = E.out2(prog(t, 20.55, 20.9)); return [560 - 50 * p, SY + 6 + 40 * p, -0.05]; }    // kesme
    const p = E.io3(prog(t, 20.9, 21.9));
    return [lerp(510, 1300, p), lerp(SY + 46, SY - 150, E.out2(p)), lerp(-0.05, -0.2, p)];
  }
  const pressAt = (t) => prog(t, 20.3, 20.55) * (1 - prog(t, 20.55, 20.75));
  const openAt = (t) => E.out3(prog(t, 20.6, 21.5));
  const deflAt = (t) => E.out2(prog(t, 20.8, 24.5));
  function bodyPts(t) {
    const pr = pressAt(t), df = deflAt(t);
    const rx = BU.rx * (1 + 0.05 * df + 0.03 * pr), ryT = BU.ryT * (1 - 0.1 * df - 0.04 * pr), ryB = BU.ryB;
    const pts = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU, s = Math.sin(a), c = Math.cos(a);
      const k = 1 + 0.025 * Math.sin(3 * a + 0.5) + 0.015 * Math.sin(5 * a + 1.2);
      const x = BU.cx + rx * c * k;
      let y = s < 0 ? BU.cy - ryT * Math.pow(-s, 0.82) * k : BU.cy + ryB * s;
      if (s < 0) y += pr * 18 * Math.exp(-Math.pow((x - 545) / 120, 2)) * Math.pow(-s, 3);
      pts.push([x, y]);
    }
    return { pts, ryT };
  }
  let S4 = {};
  function initS4() {
    const rnd = R.rng(404);
    S4.fibT = []; S4.fibP = [];
    for (let i = 0; i < 36; i++) S4.fibT.push({ k: i % 4, u: (rnd() - 0.5) * 1.4, v: rnd(), len: 24 + rnd() * 22, a: Math.PI / 2 + (rnd() - 0.5) * 1.4, c: (rnd() - 0.5) * 0.8 });
    for (let i = 0; i < 44; i++) S4.fibP.push({ r: Math.sqrt(rnd()) * 0.92, a: rnd() * TAU, len: 24 + rnd() * 24, ang: rnd() * Math.PI, c: (rnd() - 0.5) * 0.8, s: rnd() });
    cue(20.3, 'knifeTouch', 0.2, 0.8); cue(20.55, 'slice', 0.35, 0.9); cue(20.95, 'squish', 2.4, 0.8);
    cue(27.5, 'swoosh', 0.6, 1);
  }
  function fiber(ctx, x, y, len, ang, curve, sc = 1) {
    const dx = Math.cos(ang) * len * 0.5 * sc, dy = Math.sin(ang) * len * 0.5 * sc * 0.6;
    const cx = x - dy * curve * 2, cy = y + dx * curve * 0.6;
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.quadraticCurveTo(cx, cy, x + dx, y + dy);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(175,155,120,.5)'; ctx.lineWidth = 6.5 * sc; ctx.stroke();
    ctx.strokeStyle = '#FBF7EE'; ctx.lineWidth = 4.5 * sc; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.1 * sc;
    ctx.beginPath(); ctx.moveTo(x - dx - 0.8, y - dy - 1); ctx.quadraticCurveTo(cx - 0.8, cy - 1, x + dx - 0.8, y + dy - 1); ctx.stroke();
  }
  function drawBurrata(ctx, t) {
    const { pts, ryT } = bodyPts(t);
    const cx = BU.cx, cy = BU.cy;
    R.softShadow(ctx, cx + 14, cy + BU.ryB * 0.75, BU.rx * 1.25, 42, 0.55, '10,6,4');
    R.smoothClosed(ctx, pts);
    let g = ctx.createRadialGradient(cx - 70, cy - ryT * 0.62, 10, cx, cy - ryT * 0.2, BU.rx * 1.3);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#FAF6EE'); g.addColorStop(0.82, '#EAE1D1'); g.addColorStop(1, '#D3C6AE');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    g = ctx.createLinearGradient(0, cy - 20, 0, cy + BU.ryB);
    g.addColorStop(0, 'rgba(120,100,70,0)'); g.addColorStop(1, 'rgba(110,90,60,.32)');
    ctx.fillStyle = g; ctx.fillRect(cx - 300, cy - 20, 600, 120);
    // düğüme doğru toplanan yumuşak kıvrımlar (kese formu)
    const kx = cx + 8, ky = cy - ryT * 0.93;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.12 + 0.76 * (i / 8));
      const L = 60 + 38 * Math.sin(i * 2.3) ** 2;
      const ex = kx + Math.cos(a) * L * 1.5, ey = ky + Math.sin(a) * L * 0.75;
      const qx = kx + Math.cos(a) * L * 0.6 + 6, qy = ky + Math.sin(a) * L * 0.45;
      ctx.strokeStyle = 'rgba(150,130,100,.10)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(kx, ky + 6); ctx.quadraticCurveTo(qx, qy, ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(kx - 3, ky + 4); ctx.quadraticCurveTo(qx - 5, qy - 3, ex - 5, ey - 2); ctx.stroke();
    }
    // ıslak, saten parlaklık
    g = ctx.createRadialGradient(cx - 80, cy - ryT * 0.55, 2, cx - 80, cy - ryT * 0.55, 85);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 220, cy - 300, 280, 260);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx + 110, cy - ryT * 0.25, 16, 34, 0.5, 0, TAU); ctx.fill();
    ctx.restore();
    // düğüm: sıkıştırılmış, büzgülü uç
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(0.18);
    ctx.fillStyle = 'rgba(120,100,70,.25)'; ctx.beginPath(); ctx.ellipse(2, 8, 30, 9, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-26, 6); ctx.quadraticCurveTo(-14, -8, -6, -26); ctx.quadraticCurveTo(0, -34, 8, -27); ctx.quadraticCurveTo(14, -10, 26, 5); ctx.quadraticCurveTo(0, 14, -26, 6); ctx.closePath();
    g = ctx.createLinearGradient(-20, -30, 20, 10); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#DCD1BD');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(150,130,100,.5)'; ctx.lineWidth = 1.6;
    for (const a of [-15, -4, 7, 17]) { ctx.beginPath(); ctx.moveTo(a, 8); ctx.quadraticCurveTo(a * 0.3, -10, 1, -27); ctx.stroke(); }
    ctx.restore();
    // kesik + iç dolgu
    const o = openAt(t);
    if (o > 0) {
      const h = 32 * o, sy = SY + 8 * deflAt(t);
      const lens = () => { ctx.beginPath(); ctx.moveTo(cx - SL, sy); ctx.quadraticCurveTo(cx, sy - h, cx + SL, sy); ctx.quadraticCurveTo(cx, sy + h * 0.9, cx - SL, sy); ctx.closePath(); };
      lens(); ctx.fillStyle = '#CDBF9F'; ctx.fill();
      ctx.save(); lens(); ctx.clip();
      for (let i = 0; i < 9; i++) fiber(ctx, cx - 88 + i * 22, sy + 2 + (i % 2) * 7, 26, 0.25 * (i % 3) - 0.25, 0.3, 0.9);
      g = ctx.createLinearGradient(0, sy - h, 0, sy + h); g.addColorStop(0, 'rgba(120,98,68,.6)'); g.addColorStop(0.5, 'rgba(240,232,214,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - SL, sy - h, SL * 2, h * 2);
      ctx.restore();
      ctx.strokeStyle = 'rgba(140,120,90,.5)'; ctx.lineWidth = 2; lens(); ctx.stroke();
    }
  }
  // Kremalı, lifli dolgu: kesikten taşar, farklı uzunlukta yoğun diller hâlinde iner, tabakta yayılır
  const FINGERS = [[-0.62, 0.8, 54], [-0.2, 1.0, 76], [0.22, 0.9, 64], [0.6, 0.62, 46]];
  function drawFlow(ctx, t) {
    const o = openAt(t);
    if (o <= 0.05) return;
    const cx = BU.cx, sy = SY + 8 * deflAt(t) + 4;
    const baseY = BU.cy + BU.ryB + 16, H = baseY - sy;
    // tabaktaki havuz
    const pg = E.out3(prog(t, 22.5, 25.6)) + 0.04 * prog(t, 25.6, 28);
    if (pg > 0) {
      const poolPts = R.blobPts(cx + 8, baseY + 10, 70 + 190 * pg, 20 + 52 * pg, R.rng(4040), 0.16, 30);
      ctx.save(); ctx.translate(5, 8); R.smoothClosed(ctx, poolPts); ctx.fillStyle = 'rgba(10,6,4,.35)'; ctx.fill(); ctx.restore();
      R.smoothClosed(ctx, poolPts);
      const g = ctx.createRadialGradient(cx - 30, baseY, 10, cx, baseY + 10, 240);
      g.addColorStop(0, '#FDF6E6'); g.addColorStop(0.7, '#F4E9D3'); g.addColorStop(1, '#DACAAA');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); R.smoothClosed(ctx, poolPts); ctx.clip();
      for (const f of S4.fibP) {
        if (f.r > pg * 1.05) continue;
        fiber(ctx, cx + 8 + Math.cos(f.a) * f.r * (70 + 190 * pg) * 0.9, baseY + 10 + Math.sin(f.a) * f.r * (20 + 52 * pg) * 0.85, f.len, f.ang, f.c, 1);
      }
      ctx.restore();
    }
    // tek parça yoğun kütle: kesikten taşar, farklı uzunlukta loblarla aşağı sarkar
    const hp = E.ioS(prog(t, 20.95, 23.3));
    const len = H * hp * 1.04;
    const xl = cx - SL * 0.95 * o, xr = cx + SL * 0.95 * o;
    const ext = (x) => {
      let v = 0.3;
      for (const [u, lf, w] of FINGERS) v = Math.max(v, lf * Math.exp(-Math.pow((x - (cx + u * SL * 1.05)) / (w * 0.8), 2)));
      return v;
    };
    const pts = [[xl, sy - 2]];
    for (let k = 1; k <= 6; k++) { const y = sy + (k / 6) * len * ext(xl) * 0.92; pts.push([xl - 10 * Math.sin((k / 6) * Math.PI) * hp + R.noise1(k, 2) * 3, y]); }
    const M = 36;
    for (let i = 0; i <= M; i++) { const x = lerp(xl, xr, i / M); pts.push([x, sy + len * ext(x) + 6 + R.noise1(i * 0.8, 5) * 4 * hp]); }
    for (let k = 6; k >= 1; k--) { const y = sy + (k / 6) * len * ext(xr) * 0.92; pts.push([xr + 10 * Math.sin((k / 6) * Math.PI) * hp + R.noise1(k, 9) * 3, y]); }
    pts.push([xr, sy - 2]);
    pts.push([cx, sy + 10]);
    ctx.save(); ctx.translate(6, 6); R.smoothClosed(ctx, pts); ctx.fillStyle = 'rgba(90,70,45,.22)'; ctx.fill(); ctx.restore();
    R.smoothClosed(ctx, pts);
    let g = ctx.createLinearGradient(xl, 0, xr, 0);
    g.addColorStop(0, '#EADCC0'); g.addColorStop(0.3, '#FBF2DF'); g.addColorStop(0.7, '#F6ECD6'); g.addColorStop(1, '#DCCCAE');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(150,130,100,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); R.smoothClosed(ctx, pts); ctx.clip();
    for (const [u, lf, w] of FINGERS) { // lobların yumuşak hacmi
      const x = cx + u * SL * 1.05, y = sy + len * lf * 0.62;
      const hg = ctx.createRadialGradient(x - w * 0.15, y - 10, 2, x, y, w * 0.9);
      hg.addColorStop(0, 'rgba(255,255,255,.75)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.fillRect(x - w, y - w * 1.5, w * 2, w * 3);
    }
    g = ctx.createLinearGradient(0, sy, 0, sy + len + 30);
    g.addColorStop(0, 'rgba(120,100,70,.18)'); g.addColorStop(0.25, 'rgba(120,100,70,0)'); g.addColorStop(0.85, 'rgba(120,100,70,0)'); g.addColorStop(1, 'rgba(120,100,70,.2)');
    ctx.fillStyle = g; ctx.fillRect(xl - 30, sy - 5, xr - xl + 60, len + 60);
    for (const f of S4.fibT) {
      const x = lerp(xl + 14, xr - 14, (f.u + 0.7) / 1.4);
      const y = sy + 10 + f.v * (len * ext(x) - 22);
      if (len * ext(x) < 30) continue;
      fiber(ctx, x, y, f.len, f.a, f.c, 1);
    }
    ctx.restore();
  }
  function drawKnife(ctx, t, bodyPath) {
    const k = knifePos(t);
    if (!k) return;
    const draw = () => { ctx.save(); ctx.translate(k[0], k[1]); ctx.rotate(k[2]); ctx.scale(0.9, 0.9); ctx.drawImage(A.knife, -250, -120); ctx.restore(); };
    // yaklaşırken burrata üzerine düşen gölge
    const near = clamp(1 - Math.abs(k[1] - SY) / 200);
    if (k[0] < 800) R.softShadow(ctx, k[0] - 30, SY + 18, 170, 22, 0.22 * near);
    ctx.save(); ctx.beginPath(); ctx.rect(-100, -100, 1300, SY + 100 + 2); ctx.clip(); draw(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-100, SY + 2, 1300, 2000); bodyPath(); ctx.clip('evenodd'); draw(); ctx.restore();
  }
  function s4Cam(ctx, t) {
    const zin = 1 - E.out3(prog(t, 18.95, 19.85));
    if (zin > 0) R.cam(ctx, BU.cx - 10, BU.cy - 120, 1 + 3.6 * zin);
    const cu = E.io3(prog(t, 20.12, 20.5)) * (1 - E.io3(prog(t, 21.45, 22.3)));
    if (cu > 0) R.cam(ctx, 545, SY + 10, 1 + 0.75 * cu);
  }
  function drawS4Food(ctx, t, knife = true) {
    ctx.drawImage(A.bplate, PLATE4.x - 500 * PLATE4.s, PLATE4.y - 300 * PLATE4.s, 1000 * PLATE4.s, 600 * PLATE4.s);
    drawBurrata(ctx, t);
    drawFlow(ctx, t);
    if (knife) drawKnife(ctx, t, () => { const { pts } = bodyPts(t); const n = pts.length; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); });
  }
  function drawS4(ctx, t, opt = {}) {
    R.bg(ctx, false);
    ctx.save(); s4Cam(ctx, t); drawS4Food(ctx, t); ctx.restore();
    if (opt.noText) return;
    R.title(ctx, t, 19.3, 27.35, 'BURRATA', C.esp, C.basil);
    R.info(ctx, t, 21.9, 23.5, 'DIŞI MOZZARELLA', 'İÇİ KREMALI PEYNİR LİFLERİ', C.basil, C.esp);
    R.animText(ctx, t, 23.75, 27.35, 'SALATA • KIZARMIŞ EKMEK', R.TX, 1196, 60, 800, C.basil, { ls: 1 });
    R.animText(ctx, t, 23.95, 27.35, 'Pizzaya servis öncesi eklemeyi dene.', R.TX, 1270, 48, 500, C.esp);
  }

  /* =========================================================
     SAHNE 5 — CHEDDAR (28–35 sn)
     ========================================================= */
  const BX = 540, BRX = 242, BK = 0.27;
  const FIN = { bun: 1002, let: 980, tom: 962, pat: 910, top: 898 };
  const FLT = { bun: 1002, let: 925, tom: 842, pat: 748, ched: 642, top: 560 };
  const DROP = { let: [29.15, 29.45], tom: [29.38, 29.68], pat: [29.62, 30.0], ched: [30.0, 30.32], top: [31.95, 32.38] };
  const bob = (t, i) => 7 * Math.sin(t * 3.1 + i * 1.3);
  function layerY(name, t, i) {
    const [a, b] = DROP[name];
    if (t < a) return { y: FLT[name] + bob(t, i), sq: 0 };
    if (t < b) return { y: lerp(FLT[name] + bob(a, i), FIN[name === 'ched' ? 'pat' : name], E.in2(prog(t, a, b))), sq: 0 };
    return { y: FIN[name === 'ched' ? 'pat' : name], sq: R.impulse(t - b, 8, 17) * (name === 'pat' ? 0.09 : 0.05) };
  }
  function burgerState(t) {
    const comp = R.impulse(t - DROP.top[1], 7, 15) * (t > DROP.top[1] ? 1 : 0);
    const st = {
      bun: { y: FIN.bun + (t < 29 ? bob(t, 0) * (1 - prog(t, 28.6, 29)) : 0), sq: R.impulse(t - DROP.let[1], 8, 17) * 0.025 + comp * 0.03 },
      let: layerY('let', t, 1), tom: layerY('tom', t, 2), pat: layerY('pat', t, 3), top: layerY('top', t, 5),
    };
    // peynir: üstten düşerek girer (bıçak geçişiyle aynı yön), sonra köftenin üstüne iner
    const ci = E.back(prog(t, 28.0, 28.6), 1.3);
    let cy;
    if (t < DROP.ched[0]) cy = lerp(-200, FLT.ched, ci) + bob(t, 4) * ci;
    else if (t < DROP.ched[1]) cy = lerp(FLT.ched + bob(DROP.ched[0], 4), FIN.pat, E.in2(prog(t, ...DROP.ched)));
    else cy = FIN.pat;
    st.ched = { y: cy, yaw: 0.62 + 0.18 * Math.sin(t * 2.2) * (1 - prog(t, 29.9, 30.5)) + 0.25 * (1 - ci), roll: 0.06 * Math.sin(t * 2.7) * (1 - prog(t, 29.9, 30.4)) };
    st.melt = E.ioS(prog(t, 30.42, 32.6)) * 0.9 + 0.1 * prog(t, 32.38, 33.4);
    st.comp = comp;
    for (const k of ['let', 'tom', 'pat']) if (t > DROP.top[1]) st[k].y += comp * { let: 2, tom: 4, pat: 7 }[k];
    st.top.y += comp * 9;
    return st;
  }
  function ellPts(cx, y, rx, ry, n = 60, f) { const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const k = f ? f(a) : 1; pts.push([cx + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); } return pts; }
  function cylinder(ctx, pts, h, sideFill) {
    const n = pts.length, half = [];
    for (let i = 0; i <= n / 2; i++) half.push(pts[i]);
    ctx.beginPath();
    ctx.moveTo(half[0][0], half[0][1]);
    for (const p of half) ctx.lineTo(p[0], p[1]);
    for (let i = half.length - 1; i >= 0; i--) ctx.lineTo(half[i][0], half[i][1] + h);
    ctx.closePath();
    ctx.fillStyle = sideFill; ctx.fill();
  }
  function hGrad(ctx, x0, x1, stops) { const g = ctx.createLinearGradient(x0, 0, x1, 0); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function bunBottom(ctx, y, sq) {
    ctx.save(); ctx.translate(BX, y); ctx.scale(1 + sq * 0.5, 1 - sq); ctx.translate(-BX, -y);
    const ry = BRX * BK;
    ctx.beginPath(); ctx.moveTo(BX - BRX, y); ctx.lineTo(BX - BRX, y + 30);
    ctx.ellipse(BX, y + 44, BRX * 0.97, ry * 1.1, 0, Math.PI, 0, true); ctx.lineTo(BX + BRX, y);
    ctx.ellipse(BX, y, BRX, ry, 0, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = hGrad(ctx, BX - BRX, BX + BRX, ['#9E5520', '#D88D45', '#E8A55C', '#C97B37', '#8F4A1A']); ctx.fill();
    ctx.beginPath(); ctx.ellipse(BX, y, BRX * 0.985, ry, 0, 0, TAU);
    const g = ctx.createRadialGradient(BX - 60, y - 20, 10, BX, y, BRX); g.addColorStop(0, '#F6DFAF'); g.addColorStop(1, '#E2BC80');
    ctx.fillStyle = g; ctx.fill();
    const rnd = R.rng(61);
    ctx.fillStyle = 'rgba(190,140,70,.35)';
    for (let i = 0; i < 60; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.9; ctx.beginPath(); ctx.ellipse(BX + Math.cos(a) * d * BRX, y + Math.sin(a) * d * ry, 3, 1.6, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function lettuce(ctx, y, sq) {
    const f = (a) => 1.1 + 0.045 * Math.sin(a * 13) + 0.025 * Math.sin(a * 7 + 1);
    const pts = ellPts(BX, y, BRX, BRX * BK, 90, f).map((p, i) => [p[0], p[1] + 5 * Math.sin(i * 0.77)]);
    ctx.save(); ctx.translate(BX, y); ctx.scale(1 + sq * 0.5, 1 - sq); ctx.translate(-BX, -y);
    ctx.save(); ctx.translate(0, 12); R.smoothClosed(ctx, pts); ctx.fillStyle = '#3E6B33'; ctx.fill(); ctx.restore();
    R.smoothClosed(ctx, pts);
    const g = ctx.createLinearGradient(0, y - 60, 0, y + 70); g.addColorStop(0, '#B5D86E'); g.addColorStop(1, '#5E8E3E');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(230,250,190,.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; ctx.beginPath(); ctx.moveTo(BX + Math.cos(a) * 60, y + Math.sin(a) * 16); ctx.lineTo(BX + Math.cos(a) * BRX, y + Math.sin(a) * BRX * BK); ctx.stroke(); }
    ctx.restore();
  }
  function tomato(ctx, y, sq) {
    const rx = BRX * 0.95, ry = rx * BK;
    ctx.save(); ctx.translate(BX, y); ctx.scale(1 + sq * 0.5, 1 - sq); ctx.translate(-BX, -y);
    cylinder(ctx, ellPts(BX, y, rx, ry), 18, hGrad(ctx, BX - rx, BX + rx, ['#8E2214', '#D94732', '#E8664A', '#B3301E']));
    ctx.beginPath(); ctx.ellipse(BX, y, rx, ry, 0, 0, TAU); ctx.fillStyle = '#E2563A'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(BX, y, rx * 0.9, ry * 0.88, 0, 0, TAU); ctx.fillStyle = '#EE7553'; ctx.fill();
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; ctx.fillStyle = '#F7A475'; ctx.beginPath(); ctx.ellipse(BX + Math.cos(a) * rx * 0.5, y + Math.sin(a) * ry * 0.5, 38, 12, a * 0.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function patty(ctx, y, sq) {
    const rnd = R.rng(71);
    const pts = R.blobPts(BX, y, BRX * 1.0, BRX * BK, rnd, 0.035, 60);
    ctx.save(); ctx.translate(BX, y); ctx.scale(1 + sq * 0.5, 1 - sq); ctx.translate(-BX, -y);
    cylinder(ctx, pts, 52, hGrad(ctx, BX - BRX, BX + BRX, ['#2A160C', '#5A3320', '#6E4129', '#4A2919', '#24130A']));
    // yan doku
    ctx.save(); ctx.globalAlpha = 0.5;
    for (let i = 0; i < 40; i++) { const x = BX - BRX + rnd() * BRX * 2; const a = Math.acos(clamp((x - BX) / BRX, -1, 1)); const yy = y + Math.sin(a) * BRX * BK + 8 + rnd() * 36; ctx.fillStyle = rnd() < 0.5 ? '#1E0F07' : '#8A5634'; ctx.fillRect(x, yy, 3, 4 + rnd() * 6); }
    ctx.restore();
    R.smoothClosed(ctx, pts);
    const g = ctx.createRadialGradient(BX - 50, y - 15, 10, BX, y, BRX); g.addColorStop(0, '#6E4229'); g.addColorStop(1, '#3B2114');
    ctx.fillStyle = g; ctx.fill();
    for (let i = 0; i < 110; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.92;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(25,12,6,.6)' : 'rgba(150,95,60,.45)';
      ctx.beginPath(); ctx.ellipse(BX + Math.cos(a) * d * BRX, y + Math.sin(a) * d * BRX * BK, 2 + rnd() * 5, 1.5 + rnd() * 2.5, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function topBun(ctx, yb, sq) {
    const hd = 182, rx = BRX * 1.03;
    ctx.save(); ctx.translate(BX, yb); ctx.scale(1 + sq * 0.6, 1 - sq); ctx.translate(-BX, -yb);
    ctx.beginPath();
    ctx.moveTo(BX - rx, yb);
    ctx.bezierCurveTo(BX - rx, yb - hd * 0.82, BX - rx * 0.55, yb - hd, BX, yb - hd);
    ctx.bezierCurveTo(BX + rx * 0.55, yb - hd, BX + rx, yb - hd * 0.82, BX + rx, yb);
    ctx.ellipse(BX, yb, rx, rx * BK * 0.55, 0, 0, Math.PI, false);
    ctx.closePath();
    const g = ctx.createRadialGradient(BX - 80, yb - hd * 0.78, 10, BX, yb - hd * 0.3, rx * 1.25);
    g.addColorStop(0, '#F6C77A'); g.addColorStop(0.4, '#E29A48'); g.addColorStop(0.8, '#B9672A'); g.addColorStop(1, '#8B4519');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    const g2 = ctx.createLinearGradient(0, yb - 40, 0, yb + 30); g2.addColorStop(0, 'rgba(90,40,10,0)'); g2.addColorStop(1, 'rgba(90,40,10,.45)');
    ctx.fillStyle = g2; ctx.fillRect(BX - rx, yb - 40, rx * 2, 80);
    const rnd = R.rng(81);
    for (let i = 0; i < 30; i++) {
      const u = (rnd() - 0.5) * 1.6, v = 0.25 + rnd() * 0.68;
      const x = BX + u * rx * (1 - v * 0.38), y = yb - hd * v * (1 - u * u * 0.32);
      const a = rnd() * 3;
      ctx.fillStyle = 'rgba(90,45,15,.4)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 2, 7, 3.6, a, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FBEFD2'; ctx.beginPath(); ctx.ellipse(x, y, 7, 3.6, a, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }
  // Cheddar: soğukken düz ve rijit; ısınınca köşeler köftenin kenarına kıvrılıp sarkar
  function cheddar(ctx, cx, y, yaw, melt, roll = 0) {
    const s = 208, n = 80, rp = BRX * 0.98, pts = [];
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const m2 = E.in2(melt);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      let x = s * Math.sign(ca) * Math.pow(Math.abs(ca), 0.25), z = s * Math.sign(sa) * Math.pow(Math.abs(sa), 0.25);
      [x, z] = [x * cy - z * sy, x * sy + z * cy];
      const d = Math.hypot(x, z), th = Math.atan2(z, x);
      let drop = 0;
      if (d > rp * 0.9) {
        const over = d - rp * 0.9;
        const f = (rp * 0.9 + over * (1 - 0.55 * melt)) / d;
        x *= f; z *= f;
        drop = melt * (over * 1.45 + 6) * (1 + 0.28 * Math.sin(3 * th + 1));
      }
      if (z > 0) drop += m2 * 30 * (Math.exp(-Math.pow((th - 1.15) / 0.12, 2)) + 0.8 * Math.exp(-Math.pow((th - 2.1) / 0.1, 2)) + 0.6 * Math.exp(-Math.pow((th - 0.45) / 0.1, 2)));
      pts.push([cx + x, y + z * BK + drop * (z > -40 ? 1 : 0.35)]);
    }
    ctx.save();
    if (roll) { ctx.translate(cx, y); ctx.rotate(roll); ctx.translate(-cx, -y); }
    const thick = 7 * (1 - melt * 0.6);
    ctx.save(); ctx.translate(0, thick); R.smoothClosed(ctx, pts); ctx.fillStyle = '#C46F16'; ctx.fill(); ctx.restore();
    R.smoothClosed(ctx, pts);
    const g = ctx.createLinearGradient(0, y - 70, 0, y + 110);
    g.addColorStop(0, '#F8B648'); g.addColorStop(0.45, '#F2A12A'); g.addColorStop(1, '#D9801B');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(170,90,15,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); ctx.clip();
    // mat yüzey: yumuşak ışık + çok ince doku (plastik parlaklık yok)
    const h = ctx.createRadialGradient(cx - 70, y - 25, 5, cx - 70, y - 25, 150);
    h.addColorStop(0, `rgba(255,236,190,${0.22 + 0.12 * melt})`); h.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = h; ctx.fillRect(cx - 300, y - 200, 600, 400);
    const rnd = R.rng(91);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,220,150,.3)' : 'rgba(190,105,20,.25)'; ctx.fillRect(cx - 220 + rnd() * 440, y - 60 + rnd() * 120, 2, 2); }
    // sarkan kısımlarda koyulaşma
    const g3 = ctx.createLinearGradient(0, y + 30, 0, y + 120); g3.addColorStop(0, 'rgba(170,85,10,0)'); g3.addColorStop(1, 'rgba(170,85,10,.35)');
    ctx.fillStyle = g3; ctx.fillRect(cx - 300, y + 30, 600, 140);
    ctx.restore();
    ctx.restore();
  }
  function steam(ctx, t, yTop) {
    const a = prog(t, 30.6, 31.4) * (1 - prog(t, 33.8, 34.4));
    if (a <= 0) return;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x0 = 440 + i * 100, ph = ((t * 0.55 + i * 0.33) % 1);
      const path = () => { ctx.beginPath(); for (let k = 0; k <= 12; k++) { const y = yTop - 30 - k * 18 - ph * 120; const x = x0 + Math.sin(k * 0.6 + t * 3 + i) * 14; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
      ctx.strokeStyle = '#FFF4E4';
      ctx.globalAlpha = a * 0.06 * Math.sin(Math.PI * ph); ctx.lineWidth = 34; path(); ctx.stroke();
      ctx.globalAlpha = a * 0.07 * Math.sin(Math.PI * ph); ctx.lineWidth = 14; path(); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBurger(ctx, t) {
    const s = burgerState(t);
    const shadowA = 0.45;
    R.softShadow(ctx, BX + 10, FIN.bun + 120, BRX * 1.35, 44, shadowA, '0,0,0');
    bunBottom(ctx, s.bun.y, s.bun.sq);
    lettuce(ctx, s.let.y, s.let.sq);
    tomato(ctx, s.tom.y, s.tom.sq);
    patty(ctx, s.pat.y, s.pat.sq);
    const onPatty = t >= DROP.ched[1];
    cheddar(ctx, BX, onPatty ? s.pat.y - 2 : s.ched.y, s.ched.yaw, s.melt, s.ched.roll);
    steam(ctx, t, s.pat.y - 40);
    topBun(ctx, s.top.y, s.top.sq);
  }
  let S5 = {};
  function initS5() {
    cue(28.05, 'whoosh', 0.5, 0.6);
    cue(DROP.let[1], 'thud', 0.2, 0.45); cue(DROP.tom[1], 'thud', 0.2, 0.5); cue(DROP.pat[1], 'thud', 0.3, 1);
    cue(DROP.ched[1], 'flap', 0.2, 0.7); cue(30.42, 'sizzle', 3.6, 0.5); cue(DROP.top[1], 'thud', 0.3, 0.9);
    cue(34.42, 'whoosh', 0.6, 0.7);
  }
  function drawS5(ctx, t, opt = {}) {
    R.bg(ctx, true);
    drawBurger(ctx, t);
    if (opt.noText) return;
    R.title(ctx, t, 28.15, 34.25, 'CHEDDAR', C.cream, C.ched);
    R.info(ctx, t, 28.9, 34.25, 'BURGER • TOST', 'Belirgin tat, eriyen doku', C.ched, C.cream);
  }

  /* =========================================================
     İKONLAR (özet ekranı için önceden çizilir)
     ========================================================= */
  function buildIcons() {
    // makarna + rendelenmiş parmesan
    let c = R.mk(900, 560), g = c.getContext('2d');
    g.drawImage(A.pasta, 0, 0);
    for (const p of S3.parts) drawShaving(g, p, p.ptx, p.pty, p.a0 + p.spin * p.tf, true, 1 / PLATE3.s);
    A.iconPasta = c;
    // burrata tabağı (son hâl)
    c = R.mk(1000, 720); g = c.getContext('2d'); g.translate(-40, -560); drawS4Food(g, 27.4, false); A.iconBurrata = c;
    // burger (son hâl)
    c = R.mk(760, 760); g = c.getContext('2d'); g.translate(-160, -560); drawBurger(g, 34.45); A.iconBurger = c;
  }

  /* =========================================================
     SAHNE 6 — ÖZET (35–42 sn) + SAHNE 7 — KAPANIŞ (42–44 sn)
     ========================================================= */
  const ROWS = [
    { name: 'MOZZARELLA', uses: 'PİZZA / LAZANYA', col: C.tom },
    { name: 'PARMESAN', uses: 'MAKARNA / RİSOTTO', col: '#C99A3E' },
    { name: 'BURRATA', uses: 'SALATA / EKMEK ÜSTÜ', col: C.basil },
    { name: 'CHEDDAR', uses: 'BURGER / TOST', col: C.ched },
  ];
  const ROWY = [530, 725, 920, 1115], ICX = 182, RST = [35.0, 35.3, 35.6, 35.9];
  // dilim ikonu matrisi: dilim merkezi ikon merkezine
  const SLC = [Math.cos(AM) * PR * 0.58, Math.sin(AM) * PR * 0.58];
  function sliceIconM(x, y, k) { return new DOMMatrix().translateSelf(x, y).scaleSelf(k, k * 0.62).translateSelf(-SLC[0], -SLC[1]); }
  const lerpM = (a, b, t) => new DOMMatrix([lerp(a.a, b.a, t), lerp(a.b, b.b, t), lerp(a.c, b.c, t), lerp(a.d, b.d, t), lerp(a.e, b.e, t), lerp(a.f, b.f, t)]);
  function drawSliceImg(ctx, m, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.save(); ctx.translate(0, 9 * m.a / 0.35); R.applyM(ctx, m);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, PR, GAP.a0, GAP.a1); ctx.closePath(); ctx.fillStyle = '#A2632A'; ctx.fill(); ctx.restore();
    ctx.save(); R.applyM(ctx, m); ctx.drawImage(A.slice, -500, -500); ctx.restore();
    ctx.restore();
  }
  const pastaIconM = (x, y, k) => new DOMMatrix().translateSelf(x, y).scaleSelf(k, k).translateSelf(-450, -275);
  function drawIconImg(ctx, img, m) { ctx.save(); R.applyM(ctx, m); ctx.drawImage(img, 0, 0); ctx.restore(); }

  function drawS6(ctx, t) {
    // zemin: espresso → krem
    const bgk = E.in2(prog(t, 34.42, 34.95));
    if (bgk < 1) {
      R.bg(ctx, true);
      ctx.save(); ctx.beginPath(); ctx.arc(540, 900, 2300 * bgk, 0, TAU); ctx.clip(); R.bg(ctx, false); ctx.restore();
    } else R.bg(ctx, false);

    const out = t >= 42 ? E.in2(prog(t, 42.0, 42.35)) : 0; // kapanışta özetin çekilmesi
    const end = E.io3(prog(t, 42.0, 43.5));                 // dilim ve tabak ilk kareye döner

    // kartlar ve metin
    ROWS.forEach((r, i) => {
      const p = prog(t, RST[i], RST[i] + 0.45);
      if (p <= 0) return;
      const a = E.out3(p) * (1 - out);
      if (a <= 0) return;
      const ox = (1 - E.back(p, 1.2)) * 70;
      const y = ROWY[i];
      ctx.save(); ctx.globalAlpha = a; ctx.translate(ox, out * 20);
      ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.beginPath(); ctx.roundRect(96, y - 84, 806, 168, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(37,28,23,.07)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = r.col; ctx.beginPath(); ctx.roundRect(96, y - 54, 9, 108, 4); ctx.fill();
      ctx.fillStyle = r.col; ctx.globalAlpha = a * 0.16; ctx.beginPath(); ctx.arc(ICX, y + 4, 72, 0, TAU); ctx.fill();
      ctx.globalAlpha = a;
      R.text(ctx, r.name, 282, y - 8, 60, 900, C.esp, { align: 'left', maxW: 600, ls: 1 });
      R.text(ctx, '→ ' + r.uses, 282, y + 50, 46, 700, '#6E5546', { align: 'left', maxW: 600 });
      ctx.restore();
    });
    // ikonlar
    const icon = (i, enterFrom) => {
      const p = prog(t, RST[i] - 0.1, RST[i] + 0.4);
      return { p, x: lerp(enterFrom[0], ICX, E.back(p, 1.1)), y: lerp(enterFrom[1], ROWY[i] + 4, E.back(p, 1.1)) };
    };
    // 1) pizza dilimi → kapanışta ilk sahnedeki konumuna büyür
    {
      const ic = icon(0, [-160, 330]);
      if (ic.p > 0) {
        const mI = sliceIconM(ic.x, ic.y, 0.4);
        const m = end > 0 ? lerpM(mI, sliceM(P1, L1(0)), end) : mI;
        if (end > 0) { // ilk sahnedeki pizza tabanı geri gelir
          const pa = E.out2(prog(t, 42.55, 43.35));
          if (pa > 0) { ctx.save(); ctx.globalAlpha = pa; ctx.translate(P1.x, P1.y); ctx.scale(lerp(0.92, 1, pa), lerp(0.92, 1, pa)); ctx.translate(-P1.x, -P1.y); drawPizzaBase(ctx, P1); ctx.restore(); }
        }
        drawSliceImg(ctx, m);
      }
    }
    // 2) makarna → kapanışta alt tabak konumuna
    {
      const ic = icon(1, [-200, 725]);
      if (ic.p > 0) {
        const mI = pastaIconM(ic.x, ic.y, 0.24);
        const m = end > 0 ? lerpM(mI, pastaIconM(PLATE1.x, PLATE1.y - 15 * PLATE1.s, PLATE1.s), end) : mI;
        R.softShadow(ctx, m.e + 450 * m.a, m.f + 330 * m.a, 420 * m.a, 120 * m.a, 0.25);
        drawIconImg(ctx, A.iconPasta, m);
      }
    }
    // 3) burrata
    {
      const ic = icon(2, [-200, 1000]);
      if (ic.p > 0 && out < 1) { ctx.save(); ctx.globalAlpha = 1 - out; drawIconImg(ctx, A.iconBurrata, new DOMMatrix().translateSelf(ic.x, ic.y).scaleSelf(0.215, 0.215).translateSelf(-500, -330)); ctx.restore(); }
    }
    // 4) burger: önceki sahneden küçülerek yerine gelir
    {
      const p = E.io3(prog(t, 34.45, 35.15));
      const x = lerp(540, ICX, p), y = lerp(920, ROWY[3] + 2, p), k = lerp(1, 0.235, p);
      if (out < 1) { ctx.save(); ctx.globalAlpha = 1 - out; drawIconImg(ctx, A.iconBurger, new DOMMatrix().translateSelf(x, y).scaleSelf(k, k).translateSelf(-380, -360)); ctx.restore(); }
    }
    // başlık + dipnot
    ctx.save(); ctx.globalAlpha = 1 - out;
    R.animText(ctx, t, 34.95, 45, 'AKLINDA BÖYLE KALSIN', R.TX, 360, 84, 900, C.esp, { ls: 1 });
    if (t > 35.1) { const w = 130 * E.out3(prog(t, 35.1, 35.5)); ctx.fillStyle = C.tom; ctx.beginPath(); ctx.roundRect(R.TX - w / 2, 386, w, 10, 5); ctx.fill(); }
    R.animText(ctx, t, 36.2, 45, 'Bunlar başlangıç eşleşmeleri;', R.TX, 1246, 38, 500, '#7A6556', { rise: 10 });
    R.animText(ctx, t, 36.2, 45, 'kullanım alanları daha geniş.', R.TX, 1292, 38, 500, '#7A6556', { rise: 10 });
    ctx.restore();

    // SAHNE 7 metinleri — ilk sahnedeki başlıkla aynı bölgeye oturur
    if (t >= 42) {
      const fo = 1 - prog(t, 43.72, 43.92);
      ctx.save(); ctx.globalAlpha = fo;
      R.animText(ctx, t, 42.18, 50, 'MARKETTE LAZIM OLUR.', R.TX, 984, 76, 900, C.esp, { ls: 1 });
      R.animText(ctx, t, 42.5, 50, 'KAYDET.', R.TX, 1100, 112, 900, C.tom, { ls: 3 });
      ctx.restore();
    }
  }

  /* =========================================================
     GEÇİŞLER
     ========================================================= */
  // Sahne 2 → 3: son peynir şeridi ekranı çapraz geçer, arkasından parmesan sahnesi açılır
  function wipeBand(ctx, t) {
    const p = E.ioS(prog(t, 10.4, 11.05));
    const d = [0.55, -0.835];
    const P0 = [-420, 2350], P1_ = [1520, -520];
    const pc = [lerp(P0[0], P1_[0], p), lerp(P0[1], P1_[1], p)];
    const tg = [-d[1], d[0]];
    drawS2(ctx, t);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pc[0] + tg[0] * 3000, pc[1] + tg[1] * 3000);
    ctx.lineTo(pc[0] - tg[0] * 3000, pc[1] - tg[1] * 3000);
    ctx.lineTo(pc[0] - tg[0] * 3000 - d[0] * 4000, pc[1] - tg[1] * 3000 - d[1] * 4000);
    ctx.lineTo(pc[0] + tg[0] * 3000 - d[0] * 4000, pc[1] + tg[1] * 3000 - d[1] * 4000);
    ctx.closePath(); ctx.clip();
    drawS3(ctx, t);
    ctx.restore();
    // şerit
    const A_ = [pc[0] + tg[0] * 1500, pc[1] + tg[1] * 1500], B = [pc[0] - tg[0] * 1500, pc[1] - tg[1] * 1500];
    const sag = 40 * Math.sin(p * Math.PI);
    const Cp = [pc[0] + d[0] * sag, pc[1] + d[1] * sag];
    R.cheeseRibbon(ctx, A_, Cp, B, (u) => 190 + 90 * Math.pow(Math.abs(2 * u - 1), 2) + 16 * Math.sin(u * 37), { shadow: 'rgba(20,10,5,.35)', fill: '#FBF0D6' });
    ctx.save();
    // şeridin hacmi: kenarlara doğru koyulaşan, ortası parlak lifler
    for (const [off, col, w] of [[-70, 'rgba(200,160,95,.35)', 30], [70, 'rgba(200,160,95,.35)', 30], [-18, 'rgba(255,255,255,.7)', 16]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      ctx.moveTo(A_[0] - d[0] * off, A_[1] - d[1] * off);
      ctx.quadraticCurveTo(Cp[0] - d[0] * off, Cp[1] - d[1] * off, B[0] - d[0] * off, B[1] - d[1] * off); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(205,175,120,.4)'; ctx.lineWidth = 2.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(A_[0] - d[0] * i * 18, A_[1] - d[1] * i * 18);
      ctx.quadraticCurveTo(Cp[0] - d[0] * i * 14, Cp[1] - d[1] * i * 14, B[0] - d[0] * i * 18, B[1] - d[1] * i * 18);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Sahne 4 → 5: bıçak kesme yönünde (yukarıdan aşağı) ekranı keser
  function wipeKnife(ctx, t) {
    const p = E.io3(prog(t, 27.55, 28.05));
    const yb = lerp(-160, 2120, p), ang = -0.1;
    drawS4(ctx, t);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-200, -200); ctx.lineTo(1300, -200);
    ctx.lineTo(1300, yb + Math.tan(ang) * 760); ctx.lineTo(-200, yb - Math.tan(ang) * 740);
    ctx.closePath(); ctx.clip();
    drawS5(ctx, t);
    ctx.restore();
    ctx.save();
    ctx.translate(540, yb); ctx.rotate(ang); ctx.scale(2.3, 2.3);
    ctx.drawImage(A.knife, -320, -120);
    ctx.restore();
  }

  /* =========================================================
     ANA ZAMAN ÇİZELGESİ
     ========================================================= */
  R.render = function (ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    t = clamp(t, 0, R.DUR - 1e-6);
    if (t < 2.86) drawS1(ctx, t);
    else if (t < 3.0) { drawS1(ctx, t); fadeIn(ctx, prog(t, 2.86, 3.0), (c) => drawS2(c, t)); }
    else if (t < 10.4) drawS2(ctx, t);
    else if (t < 11.05) wipeBand(ctx, t);
    else if (t < 18.95) drawS3(ctx, t);
    else if (t < 19.3) {
      drawS4(ctx, t);
      ctx.save(); ctx.globalAlpha = 1 - prog(t, 19.0, 19.28); ctx.fillStyle = '#F8F4EC'; ctx.fillRect(0, 0, R.W, R.H); ctx.restore();
    }
    else if (t < 27.55) drawS4(ctx, t);
    else if (t < 28.05) wipeKnife(ctx, t);
    else if (t < 34.45) drawS5(ctx, t);
    else drawS6(ctx, t);
    // döngü: son anlarda ilk kareye birebir bağlan
    if (t > 43.5) fadeIn(ctx, E.ioS(prog(t, 43.5, 43.95)), (c) => drawS1(c, 0, { noText: true }));
    R.drawSubs(ctx, t);
  };

  R.init = function () {
    R.buildAssets();
    initS1(); initS2(); initS3(); initS4(); initS5();
    buildIcons();
    RST.forEach((s) => cue(s + 0.05, 'click', 0.08, 0.5));
    cue(41.95, 'whoosh', 0.6, 0.6); cue(42.5, 'chime', 1.2, 0.8); cue(43.55, 'whoosh', 0.5, 0.5);
    cues.sort((a, b) => a.t - b.t);
  };
})(window);
