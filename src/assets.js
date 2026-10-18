/* Önceden çizilen, deterministik dokular (bir kez üretilir, her karede yeniden kullanılır) */
(function (root) {
  'use strict';
  const R = root.R;
  const A = (R.A = {});
  const TAU = Math.PI * 2;
  R.PR = 480; // pizza yerel yarıçapı (1000px doku, merkez 500)

  function buildPizza() {
    const S = 1000, PR = R.PR, c = R.mk(S, S), g = c.getContext('2d'), rnd = R.rng(101);
    g.translate(S / 2, S / 2);
    // hamur kenarı
    let gr = g.createRadialGradient(0, 0, PR * 0.72, 0, 0, PR);
    gr.addColorStop(0, '#F0C77A'); gr.addColorStop(0.45, '#E3A955'); gr.addColorStop(0.8, '#CB873B'); gr.addColorStop(1, '#94531F');
    g.fillStyle = gr; R.blob(g, 0, 0, PR, PR, rnd, 0.012, 48); g.fill();
    for (let i = 0; i < 110; i++) {
      const a = rnd() * TAU, d = PR * (0.85 + rnd() * 0.12);
      g.fillStyle = rnd() < 0.55 ? `rgba(118,58,18,${0.12 + rnd() * 0.22})` : `rgba(255,228,165,${0.15 + rnd() * 0.25})`;
      R.blob(g, Math.cos(a) * d, Math.sin(a) * d, 5 + rnd() * 15, 4 + rnd() * 8, rnd, 0.3, 10, a); g.fill();
    }
    // sos
    g.save();
    g.shadowColor = 'rgba(80,30,10,.45)'; g.shadowBlur = 18;
    gr = g.createRadialGradient(-PR * 0.2, -PR * 0.25, PR * 0.1, 0, 0, PR * 0.86);
    gr.addColorStop(0, '#E8613F'); gr.addColorStop(0.7, '#CF4129'); gr.addColorStop(1, '#AE2E1C');
    g.fillStyle = gr; R.blob(g, 0, 0, PR * 0.845, PR * 0.845, rnd, 0.03, 40); g.fill();
    g.restore();
    // sos dokusu
    for (let i = 0; i < 160; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * PR * 0.82;
      g.fillStyle = rnd() < 0.5 ? 'rgba(150,25,12,.25)' : 'rgba(250,120,80,.18)';
      g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 2 + rnd() * 6, 0, TAU); g.fill();
    }
    // mozzarella: erimiş, birbirine akmış katman (ayrı canvas → yumuşatılır)
    const cc = R.mk(S, S), cg = cc.getContext('2d');
    cg.translate(S / 2, S / 2);
    const ch = [];
    for (let i = 0; i < 95; i++) {
      const d = Math.sqrt(rnd()) * PR * 0.74, a = rnd() * TAU;
      ch.push([Math.cos(a) * d, Math.sin(a) * d, 42 + rnd() * 52, rnd() * 1000]);
    }
    for (const b of ch) {
      const [x, y, r] = b;
      gr = cg.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r * 1.05);
      gr.addColorStop(0, '#FFFEF8'); gr.addColorStop(0.65, '#FBF2DC'); gr.addColorStop(1, '#F1DDAE');
      cg.fillStyle = gr; R.blob(cg, x, y, r, r * 0.9, R.rng(b[3] | 0), 0.3, 18); cg.fill();
    }
    // erime izleri: sosun içine uzanan ince peynir dilleri
    cg.strokeStyle = '#FAF0D8'; cg.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const b = ch[(rnd() * ch.length) | 0], a = rnd() * TAU, l = b[2] * (0.8 + rnd() * 0.7);
      cg.lineWidth = 8 + rnd() * 12;
      cg.beginPath(); cg.moveTo(b[0], b[1]); cg.quadraticCurveTo(b[0] + Math.cos(a + 0.5) * l * 0.6, b[1] + Math.sin(a + 0.5) * l * 0.6, b[0] + Math.cos(a) * l, b[1] + Math.sin(a) * l); cg.stroke();
    }
    g.save(); g.translate(-S / 2, -S / 2);
    g.filter = 'blur(7px)'; g.globalAlpha = 0.45; g.globalCompositeOperation = 'multiply';
    g.drawImage(cc, 3, 8);
    g.filter = 'blur(1.6px)'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.drawImage(cc, 0, 0);
    g.filter = 'none';
    g.restore();
    // altın kızarmış benekler
    for (let i = 0; i < 90; i++) {
      const b = ch[(rnd() * ch.length) | 0];
      const x = b[0] + (rnd() - 0.5) * b[2], y = b[1] + (rnd() - 0.5) * b[2];
      g.fillStyle = rnd() < 0.85 ? `rgba(222,160,70,${0.18 + rnd() * 0.25})` : 'rgba(120,65,25,.28)';
      R.blob(g, x, y, 4 + rnd() * 12, 3 + rnd() * 8, rnd, 0.35, 10); g.fill();
    }
    // fesleğen
    const leaves = [[-180, -60, 0.4], [120, -200, 2.2], [200, 120, -0.6], [-80, 210, 1.3], [-250, 140, 2.9], [40, 40, -2.2]];
    for (const [x, y, a] of leaves) {
      g.save(); g.shadowColor = 'rgba(60,20,5,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
      R.leaf(g, x, y, 82, 30, a, '#5F9A55', '#2C5634'); g.restore();
    }
    // kekik benekleri + yağ parlaması
    for (let i = 0; i < 220; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * PR * 0.8;
      g.fillStyle = `rgba(55,75,35,${0.35 + rnd() * 0.4})`;
      g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2 + rnd() * 2.5, 1.5 + rnd() * 2);
    }
    for (let i = 0; i < 70; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * PR * 0.8;
      g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.4})`;
      g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 2 + rnd() * 5, 1 + rnd() * 2, rnd() * 3, 0, TAU); g.fill();
    }
    return c;
  }

  // Dilim: pizzanın kesilmiş sektörü (perspektifsiz yerel koordinat)
  R.GAP = { a0: -2.08, a1: -1.06 };
  function buildSlice() {
    const c = R.mk(1000, 1000), g = c.getContext('2d');
    g.translate(500, 500);
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R.PR * 1.02, R.GAP.a0, R.GAP.a1); g.closePath(); g.clip();
    g.drawImage(A.pizza, -500, -500);
    return c;
  }

  // Makarna tabağı (900x560, tabak merkezi 450,290; spagetti yuvası merkezi 450,268)
  R.PASTA = { cx: 450, cy: 290, nx: 450, ny: 262, nrx: 238, nry: 122 };
  R.nestTop = (u, v) => { // u,v ∈ birim disk → yuva yüzeyi (doku koordinatı)
    const P = R.PASTA, r2 = u * u + v * v;
    return [P.nx + u * P.nrx * 0.86, P.ny + v * P.nry * 0.78 - 64 * Math.max(0, 1 - r2)];
  };
  function buildPasta() {
    const c = R.mk(900, 560), g = c.getContext('2d'), rnd = R.rng(202), P = R.PASTA;
    g.save(); g.translate(P.cx, P.cy + 14); g.scale(1, 0.54);
    g.fillStyle = '#C9C0B2'; g.beginPath(); g.arc(0, 0, 425, 0, TAU); g.fill();
    g.restore();
    g.save(); g.translate(P.cx, P.cy); g.scale(1, 0.54);
    let gr = g.createRadialGradient(-140, -180, 40, 0, 0, 430);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.7, '#F3EFE8'); gr.addColorStop(1, '#D9D2C5');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 425, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(140,125,105,.35)'; g.lineWidth = 3; g.stroke();
    gr = g.createRadialGradient(40, 60, 30, 0, 0, 300);
    gr.addColorStop(0, '#F1ECE3'); gr.addColorStop(1, '#DCD3C4');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 292, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 4, 300, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    g.strokeStyle = 'rgba(120,100,80,.22)'; g.lineWidth = 6; g.beginPath(); g.arc(0, -3, 296, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.restore();
    // yuva gölgesi
    R.softShadow(g, P.nx + 10, P.ny + 70, 270, 100, 0.35, '90,60,25');
    // spagetti: derinliğe göre sıralı yaylar, tüp hacmi için üç katman
    const st = [];
    for (let i = 0; i < 300; i++) {
      const r = Math.sqrt(rnd()), a = rnd() * TAU;
      const u = Math.cos(a) * r, v = Math.sin(a) * r;
      const [x, y] = R.nestTop(u * 0.85, v * 0.85);
      const ar = 26 + rnd() * 80;
      st.push({ x, y, ar, br: ar * (0.32 + rnd() * 0.22), rot: (rnd() - 0.5) * 0.7, s0: rnd() * TAU, sw: 1.2 + rnd() * 2.6, depth: v });
    }
    st.sort((p, q) => p.depth - q.depth);
    g.lineCap = 'round';
    for (const s of st) {
      const path = () => { g.beginPath(); g.ellipse(s.x, s.y, s.ar, s.br, s.rot, s.s0, s.s0 + s.sw); };
      path(); g.strokeStyle = '#A97B26'; g.lineWidth = 9; g.stroke();
      path(); g.strokeStyle = '#E8BE5C'; g.lineWidth = 6.5; g.stroke();
      g.save(); g.translate(-1.2, -1.8); path(); g.strokeStyle = 'rgba(255,240,190,.85)'; g.lineWidth = 1.8; g.stroke(); g.restore();
    }
    // tereyağı/sos parlaması
    for (let i = 0; i < 50; i++) {
      const [x, y] = R.nestTop((rnd() - 0.5) * 1.5, (rnd() - 0.5) * 1.4);
      g.fillStyle = 'rgba(255,250,225,.6)'; g.beginPath(); g.ellipse(x, y, 3 + rnd() * 4, 1.5, rnd() * 3, 0, TAU); g.fill();
    }
    // karabiber
    for (let i = 0; i < 70; i++) {
      const [x, y] = R.nestTop((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6);
      g.fillStyle = 'rgba(40,30,25,.8)'; g.fillRect(x, y, 2 + rnd() * 2, 2 + rnd() * 2);
    }
    g.save(); g.shadowColor = 'rgba(60,40,10,.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3;
    R.leaf(g, P.nx - 40, P.ny - 70, 64, 24, -0.5, '#6AA35D', '#2E5A37');
    R.leaf(g, P.nx - 36, P.ny - 72, 54, 20, 0.6, '#5E9653', '#2B5434');
    g.restore();
    return c;
  }

  // Parmesan dilimi (600x420). Kabuk solda, sivri uç sağda (rendeye bakar).
  R.PARM = { tipX: 568, tipY: 238 };
  function buildParmesan() {
    const c = R.mk(600, 420), g = c.getContext('2d'), rnd = R.rng(404);
    const T = [568, 238], B = [150, 72], F = [70, 182], H = 150; // T uç, B arka kabuk, F ön kabuk
    // yan (kırık) yüz: T-F-F'-T'
    const jag = (p, q, n, amp, s) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        out.push([R.lerp(p[0], q[0], u) + (i && i < n ? R.noise1(i * 1.7, s) * amp : 0), R.lerp(p[1], q[1], u) + (i && i < n ? R.noise1(i * 2.3, s + 5) * amp : 0)]);
      }
      return out;
    };
    const front = jag(T, F, 22, 5, 3);
    g.beginPath();
    g.moveTo(front[0][0], front[0][1]);
    for (const p of front) g.lineTo(p[0], p[1]);
    g.lineTo(F[0], F[1] + H); g.lineTo(T[0] - 6, T[1] + H * 0.92);
    g.closePath();
    let gr = g.createLinearGradient(0, 180, 0, 400);
    gr.addColorStop(0, '#E9CD7F'); gr.addColorStop(1, '#BE9548');
    g.fillStyle = gr; g.fill();
    // kırılma yüzeyi: pütürlü faset parçaları
    g.save(); g.clip();
    for (let i = 0; i < 260; i++) {
      const u = rnd(), v = rnd();
      const x = R.lerp(T[0], F[0], u) + (rnd() - 0.5) * 10, y = R.lerp(T[1], F[1], u) + v * H * 0.98;
      const s = 4 + rnd() * 13;
      g.fillStyle = rnd() < 0.5 ? `rgba(255,240,190,${0.25 + rnd() * 0.35})` : `rgba(120,85,30,${0.18 + rnd() * 0.25})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * (rnd() - 0.2)); g.lineTo(x + s * (rnd() - 0.3), y + s); g.closePath(); g.fill();
    }
    for (let i = 0; i < 160; i++) {
      const u = rnd(), v = rnd();
      g.fillStyle = 'rgba(255,252,235,.85)';
      g.fillRect(R.lerp(T[0], F[0], u), R.lerp(T[1], F[1], u) + v * H, 1.5 + rnd() * 2, 1.5 + rnd() * 2);
    }
    g.restore();
    // kabuk ucu (sol): kalın, koyu, nokta desenli
    g.beginPath();
    g.moveTo(B[0], B[1]); g.quadraticCurveTo(40, 100, F[0], F[1]); g.lineTo(F[0], F[1] + H);
    g.quadraticCurveTo(22, 150 + H * 0.6, B[0] - 40, B[1] + H * 0.7); g.closePath();
    gr = g.createLinearGradient(20, 0, 160, 0);
    gr.addColorStop(0, '#8E5E24'); gr.addColorStop(0.5, '#B98340'); gr.addColorStop(1, '#A26E2E');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (let r = 0; r < 9; r++) for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(70,40,10,.4)';
      g.beginPath(); g.arc(30 + k * 16 + (r % 2) * 8, 150 + r * 17, 2.2, 0, TAU); g.fill();
    }
    g.restore();
    // üst yüz
    g.beginPath();
    g.moveTo(T[0], T[1]);
    const back = jag(T, B, 18, 3, 9);
    for (const p of back) g.lineTo(p[0], p[1]);
    g.quadraticCurveTo(40, 100, F[0], F[1]);
    for (let i = front.length - 1; i >= 0; i--) g.lineTo(front[i][0], front[i][1]);
    g.closePath();
    gr = g.createLinearGradient(100, 60, 500, 260);
    gr.addColorStop(0, '#F5E2A0'); gr.addColorStop(0.6, '#EDD288'); gr.addColorStop(1, '#E2C273');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 420; i++) {
      const x = 60 + rnd() * 520, y = 60 + rnd() * 200;
      if (rnd() < 0.45) { g.fillStyle = `rgba(160,120,45,${0.25 + rnd() * 0.3})`; g.beginPath(); g.ellipse(x, y, 1 + rnd() * 2.5, 0.8 + rnd() * 1.6, rnd() * 3, 0, TAU); g.fill(); }
      else { g.fillStyle = `rgba(255,253,240,${0.5 + rnd() * 0.5})`; g.fillRect(x, y, 1 + rnd() * 2.2, 1 + rnd() * 2.2); }
    }
    // kabuk bandı üstte
    g.strokeStyle = '#B07A36'; g.lineWidth = 22; g.beginPath(); g.moveTo(B[0] + 6, B[1] - 4); g.quadraticCurveTo(30, 100, F[0] + 2, F[1] + 4); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(120,85,35,.5)'; g.lineWidth = 1.5;
    g.beginPath(); for (const p of front) g.lineTo(p[0], p[1]); g.stroke();
    return c;
  }

  // El rendesi (160x660): sap üstte, metal yüzey altta
  function buildGrater() {
    const c = R.mk(160, 660), g = c.getContext('2d');
    let gr = g.createLinearGradient(30, 0, 130, 0);
    gr.addColorStop(0, '#1E1A18'); gr.addColorStop(0.45, '#4A423D'); gr.addColorStop(1, '#1B1715');
    g.fillStyle = gr; g.beginPath(); g.roundRect(45, 6, 70, 170, 30); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(56, 18, 12, 140, 6); g.fill();
    gr = g.createLinearGradient(18, 0, 142, 0);
    gr.addColorStop(0, '#7E868D'); gr.addColorStop(0.25, '#E7EBEE'); gr.addColorStop(0.5, '#A6AEB4'); gr.addColorStop(0.75, '#DDE2E6'); gr.addColorStop(1, '#727A81');
    g.fillStyle = gr; g.beginPath(); g.roundRect(18, 160, 124, 494, 10); g.fill();
    g.strokeStyle = '#5B6268'; g.lineWidth = 3; g.stroke();
    for (let r = 0; r < 28; r++) {
      for (let k = 0; k < 5; k++) {
        const x = 36 + k * 22 + (r % 2) * 11, y = 186 + r * 16.5;
        if (x > 132) continue;
        g.fillStyle = '#3C4247'; g.beginPath(); g.ellipse(x, y, 6.5, 3.2, -0.25, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y + 1, 6.5, 3.2, -0.25, 0.2, Math.PI - 0.2); g.stroke();
      }
    }
    return c;
  }

  // Burrata tabağı (1000x600, merkez 500,300) — koyu seramik, domates, fesleğen, zeytinyağı
  function tomatoSlice(g, x, y, r, rot, rnd) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, 0.56);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 6;
    g.fillStyle = '#B92F1F'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#E65A3F'; g.beginPath(); g.arc(0, 0, r * 0.9, 0, TAU); g.fill();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      g.fillStyle = '#F4925F'; R.blob(g, Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, r * 0.3, r * 0.22, rnd, 0.12, 14, a); g.fill();
      for (let k = 0; k < 4; k++) {
        g.fillStyle = '#F7DDA6'; g.beginPath();
        g.ellipse(Math.cos(a) * r * (0.38 + k * 0.06), Math.sin(a) * r * (0.38 + k * 0.06) + (k % 2) * 4, 3.5, 2, a, 0, TAU); g.fill();
      }
    }
    g.fillStyle = 'rgba(255,170,140,.6)'; g.beginPath(); g.arc(0, 0, r * 0.16, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.08, -0.4, 0, TAU); g.fill();
    g.restore();
  }
  function cherryHalf(g, x, y, r) {
    g.save(); g.translate(x, y);
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 10; g.shadowOffsetY = 5;
    let gr = g.createRadialGradient(-r * 0.4, -r * 0.4, 2, 0, 0, r * 1.1);
    gr.addColorStop(0, '#F27A5E'); gr.addColorStop(0.5, '#D94732'); gr.addColorStop(1, '#8E2214');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r, r * 0.82, 0, 0, TAU); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#F07A55'; g.beginPath(); g.ellipse(0, -r * 0.1, r * 0.78, r * 0.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#F9B07C'; g.beginPath(); g.ellipse(0, -r * 0.1, r * 0.35, r * 0.22, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.35, r * 0.18, r * 0.08, -0.5, 0, TAU); g.fill();
    g.restore();
  }
  function buildBurrataPlate() {
    const c = R.mk(1000, 600), g = c.getContext('2d'), rnd = R.rng(505);
    g.save(); g.translate(500, 316); g.scale(1, 0.53);
    g.fillStyle = '#17110E'; g.beginPath(); g.arc(0, 0, 470, 0, TAU); g.fill(); g.restore();
    g.save(); g.translate(500, 300); g.scale(1, 0.53);
    let gr = g.createRadialGradient(-120, -150, 40, 0, 0, 470);
    gr.addColorStop(0, '#54443A'); gr.addColorStop(0.6, '#3B2E26'); gr.addColorStop(1, '#271D18');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 470, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,235,210,.14)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 452, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    gr = g.createRadialGradient(30, 40, 30, 0, 0, 370);
    gr.addColorStop(0, '#3E3028'); gr.addColorStop(1, '#2C221C');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 368, 0, TAU); g.fill();
    g.restore();
    // zeytinyağı havuzları
    for (const [x, y, rx, ry] of [[330, 360, 110, 34], [690, 350, 120, 32], [520, 420, 150, 30]]) {
      const og = g.createRadialGradient(x - rx * 0.2, y - ry * 0.3, 2, x, y, rx);
      og.addColorStop(0, 'rgba(236,205,90,.55)'); og.addColorStop(1, 'rgba(200,160,40,.22)');
      g.fillStyle = og; R.blob(g, x, y, rx * 0.8, ry * 0.8, rnd, 0.22, 20); g.fill();
      g.strokeStyle = 'rgba(255,236,150,.4)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(255,252,225,.8)'; g.beginPath(); g.ellipse(x - rx * 0.25, y - ry * 0.25, rx * 0.18, 2.5, 0, 0, TAU); g.fill();
    }
    // domates dilimleri ve çeri domatesler (merkez boş: burrata oraya oturur)
    for (const [x, y, r, rot] of [[230, 250, 92, 0.3], [770, 245, 96, -0.4], [300, 380, 86, -0.2], [735, 385, 90, 0.5], [500, 175, 80, 0.1]]) tomatoSlice(g, x, y, r, rot, rnd);
    for (const [x, y, r] of [[165, 330, 34], [845, 320, 36], [420, 455, 30], [610, 460, 32]]) cherryHalf(g, x, y, r);
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
    for (const [x, y, a, l] of [[150, 255, -0.7, 78], [820, 400, 2.6, 80], [360, 175, -2.6, 70], [660, 170, -0.4, 74], [470, 470, 0.2, 66], [860, 245, -2.2, 60]]) R.leaf(g, x, y, l, l * 0.38, a, '#78B864', '#2F6238');
    g.restore();
    for (let i = 0; i < 90; i++) {
      const a = rnd() * TAU, d = 120 + rnd() * 300;
      const x = 500 + Math.cos(a) * d, y = 300 + Math.sin(a) * d * 0.5;
      g.fillStyle = rnd() < 0.6 ? 'rgba(20,15,12,.85)' : 'rgba(255,255,255,.8)';
      g.fillRect(x, y, 2 + rnd() * 2.5, 2 + rnd() * 2);
    }
    return c;
  }

  // Bıçak (720x170). Ağız çizgisi yerel y=120, uç x=8.
  function buildKnife() {
    const c = R.mk(720, 170), g = c.getContext('2d');
    g.beginPath();
    g.moveTo(8, 112); g.quadraticCurveTo(60, 40, 170, 36); g.lineTo(478, 34); g.lineTo(478, 122); g.lineTo(40, 122); g.quadraticCurveTo(14, 120, 8, 112);
    g.closePath();
    let gr = g.createLinearGradient(0, 34, 0, 122);
    gr.addColorStop(0, '#6F7880'); gr.addColorStop(0.18, '#C9CFD4'); gr.addColorStop(0.7, '#E6EAED'); gr.addColorStop(0.86, '#F7F9FA'); gr.addColorStop(1, '#9AA3AA');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(60,66,72,.6)'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(44, 106); g.lineTo(476, 106); g.stroke();
    gr = g.createLinearGradient(0, 30, 0, 130);
    gr.addColorStop(0, '#8C949A'); gr.addColorStop(0.5, '#D6DADD'); gr.addColorStop(1, '#6A7278');
    g.fillStyle = gr; g.beginPath(); g.roundRect(474, 30, 26, 96, 6); g.fill();
    gr = g.createLinearGradient(0, 40, 0, 120);
    gr.addColorStop(0, '#5A3522'); gr.addColorStop(0.5, '#3F2416'); gr.addColorStop(1, '#25140B');
    g.fillStyle = gr; g.beginPath(); g.roundRect(498, 42, 214, 76, 30); g.fill();
    g.strokeStyle = 'rgba(255,220,180,.12)'; g.lineWidth = 3; g.beginPath(); g.moveTo(512, 54); g.lineTo(690, 54); g.stroke();
    for (const x of [545, 605, 665]) {
      g.fillStyle = '#D9DDE0'; g.beginPath(); g.arc(x, 80, 7, 0, TAU); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 1.5, 81.5, 4, 0, TAU); g.fill();
    }
    return c;
  }

  function buildGrain() {
    const c = R.mk(540, 960), g = c.getContext('2d'), img = g.createImageData(540, 960), rnd = R.rng(909);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (rnd() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  R.buildAssets = function () {
    A.pizza = buildPizza();
    A.slice = buildSlice();
    A.pasta = buildPasta();
    A.parm = buildParmesan();
    A.grater = buildGrater();
    A.bplate = buildBurrataPlate();
    A.knife = buildKnife();
    A.grain = buildGrain();
  };

  // Zemin: düz renk + sıcak ışık + çok hafif doku
  R.bg = function (ctx, dark) {
    ctx.fillStyle = dark ? R.C.esp : R.C.cream;
    ctx.fillRect(0, 0, R.W, R.H);
    const g = ctx.createRadialGradient(540, 760, 80, 540, 900, 1250);
    if (dark) { g.addColorStop(0, 'rgba(110,70,40,.38)'); g.addColorStop(1, 'rgba(10,6,4,.45)'); }
    else { g.addColorStop(0, 'rgba(255,255,250,.55)'); g.addColorStop(1, 'rgba(190,160,120,.22)'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, R.W, R.H);
    ctx.save();
    ctx.globalAlpha = dark ? 0.05 : 0.035;
    ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
    ctx.drawImage(A.grain, 0, 0, R.W, R.H);
    ctx.restore();
  };
})(window);
