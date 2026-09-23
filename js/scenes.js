/* ==========================================================================
   scenes.js — процедурные canvas-сцены «Мука & Мёд»
   --------------------------------------------------------------------------
   Это временные «живые» заглушки вместо видео Higgsfield. Каждая сцена —
   функция draw(ctx, w, h, p, t), где:
     p — прогресс 0..1 (управляется скроллом, scroll-scrub)
     t — время в секундах (для фоновой жизни: пудра, блики, циклы)
   Как только в assets появится настоящее видео, слот переключится на <video>
   (см. MM_ASSETS в main.js), а эти сцены останутся фолбэком.
   ========================================================================== */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  // «окно» прогресса: 0 до a, 1 после b
  const seg = (p, a, b) => clamp((p - a) / (b - a));

  // Детерминированный генератор случайных чисел — чтобы сцена не «прыгала» между кадрами
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Осветлить (amt > 0) или затемнить (amt < 0) HEX-цвет
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const target = amt < 0 ? 0 : 255, k = Math.abs(amt);
    const r = Math.round(lerp(n >> 16, target, k));
    const g = Math.round(lerp((n >> 8) & 255, target, k));
    const b = Math.round(lerp(n & 255, target, k));
    return `rgb(${r},${g},${b})`;
  }

  /* ---------- Базовые примитивы ---------- */

  // Цилиндрический ярус торта: верх — эллипс, бок — градиент «под свет»
  function tier(ctx, cx, top, rx, ry, h, side, topColor) {
    const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    g.addColorStop(0, shade(side, -0.32));
    g.addColorStop(0.32, shade(side, 0.14));
    g.addColorStop(0.55, side);
    g.addColorStop(1, shade(side, -0.42));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - rx, top);
    ctx.lineTo(cx - rx, top + h);
    ctx.ellipse(cx, top + h, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(cx + rx, top);
    ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI, false);
    ctx.fill();
    // верхняя плоскость
    const tg = ctx.createLinearGradient(cx - rx, top - ry, cx + rx, top + ry);
    tg.addColorStop(0, shade(topColor || side, 0.18));
    tg.addColorStop(1, shade(topColor || side, -0.08));
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(cx, top, rx, ry, 0, 0, TAU);
    ctx.fill();
  }

  // Подтёки глазури по переднему краю яруса
  function drips(ctx, cx, top, rx, ry, color, grow, seed, rot = 0) {
    const r = rng(seed);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, top, rx * 1.005, ry * 1.01, 0, 0, TAU);
    ctx.fill();
    const count = 22;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + rot + r() * 0.12;
      const len = (10 + r() * 38) * grow;
      const w = 7 + r() * 7;
      if (Math.sin(a) < -0.05) continue; // задняя сторона не видна
      const x = cx + Math.cos(a) * rx * 0.985;
      const y = top + Math.sin(a) * ry;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - 2);
      ctx.lineTo(x - w / 2, y + len);
      ctx.arc(x, y + len, w / 2, Math.PI, 0, true);
      ctx.lineTo(x + w / 2, y - 2);
      ctx.fill();
    }
    // блик на глазури
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.25, top - ry * 0.25, rx * 0.45, ry * 0.3, -0.1, 0, TAU);
    ctx.fill();
  }

  // Жемчужный бордюр по основанию яруса (вращается вместе с тортом)
  function pearls(ctx, cx, y, rx, ry, rot, color, size) {
    const n = 46;
    const items = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rot;
      const s = Math.sin(a);
      if (s < -0.1) continue;
      items.push({ x: cx + Math.cos(a) * rx, y: y + s * ry, d: 0.75 + s * 0.25 });
    }
    items.forEach((it) => {
      const r = size * it.d;
      const g = ctx.createRadialGradient(it.x - r * 0.35, it.y - r * 0.35, r * 0.1, it.x, it.y, r);
      g.addColorStop(0, '#FFF6E0');
      g.addColorStop(0.5, color);
      g.addColorStop(1, shade(color, -0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(it.x, it.y, r, 0, TAU);
      ctx.fill();
    });
  }

  /* ---------- Топпинги ---------- */

  function raspberry(ctx, x, y, r) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const px = x + Math.cos(a) * r * 0.5, py = y + Math.sin(a) * r * 0.45;
      ctx.fillStyle = i % 2 ? '#B8324A' : '#CF4460';
      ctx.beginPath(); ctx.arc(px, py, r * 0.42, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#D6536D';
    ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.45, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.14, 0, TAU); ctx.fill();
  }

  function cherry(ctx, x, y, r) {
    ctx.strokeStyle = '#5A3A1C'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.quadraticCurveTo(x + r * 0.4, y - r * 2, x + r * 1.1, y - r * 2.3); ctx.stroke();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#E0506A'); g.addColorStop(0.55, '#8E1328'); g.addColorStop(1, '#4E0714');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function honeycomb(ctx, x, y, r) {
    const hex = (cx, cy, rr) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8); }
      ctx.closePath();
    };
    ctx.fillStyle = '#E3A73C'; hex(x, y, r); ctx.fill();
    ctx.strokeStyle = '#B7771F'; ctx.lineWidth = Math.max(1, r * 0.1);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; hex(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.34, r * 0.34); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,240,200,0.5)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.14, 0, TAU); ctx.fill();
  }

  function pear(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.2, r * 0.1, x, y, r * 1.2);
    g.addColorStop(0, '#F2D98A'); g.addColorStop(0.7, '#C9A24A'); g.addColorStop(1, '#8F6A26');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.75, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - r * 0.45, r * 0.48, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5A3A1C'; ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x + r * 0.15, y - r * 1.35); ctx.stroke();
  }

  function goldLeaf(ctx, x, y, r, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#F3DA92'); g.addColorStop(0.5, '#C9A45C'); g.addColorStop(1, '#F7E6B0');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.8); ctx.lineTo(r, -r * 0.1); ctx.lineTo(r * 0.3, r * 0.7); ctx.lineTo(-r * 0.7, r * 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  const TOPPINGS = { raspberry, cherry, honeycomb, pear };

  /* ---------- Рецепты тортов для сцены «сборки» ---------- */
  // Слои снизу вверх: [тип, цвет, высота]. Высоты — в условных единицах сцены.
  const CAKES = {
    honey: {
      layers: [
        ['sponge', '#D69A55', 15], ['cream', '#FFF0DA', 6], ['sponge', '#D69A55', 15], ['cream', '#FFF0DA', 6],
        ['sponge', '#D69A55', 15], ['cream', '#FFF0DA', 6], ['sponge', '#D69A55', 15], ['cream', '#FFF0DA', 6], ['sponge', '#D69A55', 15],
      ],
      glaze: '#C68B59', topping: 'honeycomb', count: 7, crumbs: '#B67A3C',
      ingredients: ['#F4E6C8', '#E3A73C', '#FFFFFF', '#F7E1A6'],
    },
    raspberry: {
      layers: [
        ['sponge', '#B9C77A', 24], ['jam', '#C23A55', 7], ['cream', '#FFF6EE', 12],
        ['sponge', '#B9C77A', 24], ['jam', '#C23A55', 7], ['cream', '#FFF6EE', 12], ['sponge', '#B9C77A', 22],
      ],
      glaze: '#F4D4D6', topping: 'raspberry', count: 11, crumbs: '#8FA24A',
      ingredients: ['#CF4460', '#9DB35A', '#FFFFFF', '#F4E6C8'],
    },
    cherry: {
      layers: [
        ['sponge', '#5B3526', 26], ['jam', '#7E1427', 8], ['cream', '#F5E3D3', 12],
        ['sponge', '#5B3526', 26], ['jam', '#7E1427', 8], ['cream', '#F5E3D3', 12], ['sponge', '#5B3526', 24],
      ],
      glaze: '#3E2723', topping: 'cherry', count: 8, crumbs: '#2A1712',
      ingredients: ['#8E1328', '#3E2723', '#FFFFFF', '#F4E6C8'],
    },
    pear: {
      layers: [
        ['sponge', '#EFD39A', 26], ['jam', '#C68B59', 8], ['cream', '#FFF4E4', 12],
        ['sponge', '#EFD39A', 26], ['jam', '#C68B59', 8], ['cream', '#FFF4E4', 12], ['sponge', '#EFD39A', 24],
      ],
      glaze: '#B8702F', topping: 'pear', count: 6, crumbs: '#E7C77E',
      ingredients: ['#C9A24A', '#C68B59', '#FFFFFF', '#F4E6C8'],
    },
  };

  // Рисуем «ингредиенты», которые слетаются к тарелке в начале сборки
  function ingredients(ctx, cx, cy, p, t, colors, seed) {
    const a = 1 - seg(p, 0.05, 0.32);
    if (a <= 0) return;
    const r = rng(seed);
    const pull = easeInOut(seg(p, 0, 0.3));
    for (let i = 0; i < 26; i++) {
      const ang = r() * TAU, dist = 190 + r() * 120, size = 5 + r() * 11, spd = 0.4 + r() * 0.6;
      const col = colors[i % colors.length];
      const fx = cx + Math.cos(ang + t * 0.08 * spd) * dist * (1 - pull * 0.85);
      const fy = cy - 60 + Math.sin(ang + t * 0.08 * spd) * dist * 0.55 * (1 - pull * 0.85) + Math.sin(t * spd * 1.6 + i) * 6;
      ctx.globalAlpha = a * (0.55 + r() * 0.45);
      ctx.fillStyle = col;
      ctx.beginPath();
      if (i % 5 === 0) ctx.ellipse(fx, fy, size * 1.1, size * 1.4, 0.3, 0, TAU); // «яйцо»
      else if (i % 7 === 0) ctx.rect(fx - size, fy - size, size * 1.6, size * 1.6); // кубик масла
      else ctx.arc(fx, fy, size * 0.6, 0, TAU); // мука, ягоды, капли мёда
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Сцена сборки торта: тарелка → слои падают по очереди → глазурь → топпинг
  function drawAssembly(ctx, w, h, p, t, cfg, opts = {}) {
    const bg = opts.bg || null;
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    else {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.4, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      g.addColorStop(0, '#FFF8F0'); g.addColorStop(1, '#F1DFCF');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    const s = Math.min(w / 560, h / 560);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, s);

    const rx = 165, ry = 44, cx = 0;
    const plateY = 175;
    const layers = cfg.layers;
    const n = layers.length + 2; // + глазурь + топпинг
    const base = 0.14, span = 0.84, d = span / n;

    // тень и тарелка
    const plateT = easeOut(seg(p, 0, 0.12));
    ctx.globalAlpha = plateT;
    ctx.fillStyle = 'rgba(62,39,35,0.14)';
    ctx.beginPath(); ctx.ellipse(cx, plateY + 22, 230, 40, 0, 0, TAU); ctx.fill();
    tier(ctx, cx, plateY, 215, 54, 10, '#EDE2D6', '#FBF6F0');
    ctx.strokeStyle = 'rgba(201,164,92,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, plateY, 200, 49, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;

    ingredients(ctx, cx, plateY, p, t, cfg.ingredients, 11 + layers.length);

    // слои
    let y = plateY; // низ текущего слоя
    let topY = plateY;
    let lastVisible = -1;
    layers.forEach((L, i) => {
      const lt = seg(p, base + i * d, base + (i + 1.6) * d);
      const hL = L[2];
      const top = y - hL;
      if (lt > 0) {
        const drop = (1 - easeOutBack(lt)) * -240;
        ctx.globalAlpha = clamp(lt * 3);
        const side = L[1];
        const rr = L[0] === 'sponge' ? rx : rx - 3;
        tier(ctx, cx, top + drop, rr, ry, hL, side, L[0] === 'sponge' ? shade(side, 0.1) : side);
        // пористость бисквита
        if (L[0] === 'sponge') {
          const r = rng(i * 97 + 5);
          ctx.fillStyle = shade(side, -0.18);
          for (let k = 0; k < 16; k++) {
            const px = cx - rx * 0.9 + r() * rx * 1.8, py = top + drop + 4 + r() * (hL - 4);
            ctx.beginPath(); ctx.arc(px, py + ry * 0.55 * Math.sqrt(1 - Math.pow((px - cx) / rx, 2)), 1.3, 0, TAU); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        lastVisible = i;
        topY = top;
      }
      y = top;
    });

    // глазурь
    const gi = layers.length;
    const gt = seg(p, base + gi * d, base + (gi + 1.4) * d);
    if (gt > 0 && lastVisible === layers.length - 1) {
      ctx.globalAlpha = clamp(gt * 2.5);
      drips(ctx, cx, topY, rx, ry, cfg.glaze, easeOut(gt), 31);
      ctx.globalAlpha = 1;
    }

    // топпинг: падает с «отскоком», сортируем по глубине
    const tt = seg(p, base + (gi + 1) * d, 1);
    if (tt > 0 && TOPPINGS[cfg.topping]) {
      const r = rng(77);
      const items = [];
      for (let k = 0; k < cfg.count; k++) {
        const ang = r() * TAU, rad = 0.2 + r() * 0.62, size = 13 + r() * 6;
        items.push({ x: cx + Math.cos(ang) * rad * rx, y: topY + Math.sin(ang) * rad * ry - 6, size, k });
      }
      items.sort((a, b) => a.y - b.y);
      items.forEach((it) => {
        const st = seg(tt, (it.k / cfg.count) * 0.55, (it.k / cfg.count) * 0.55 + 0.45);
        if (st <= 0) return;
        const yy = it.y - (1 - easeOutBack(st)) * 220;
        ctx.globalAlpha = clamp(st * 3);
        TOPPINGS[cfg.topping](ctx, it.x, yy, it.size);
      });
      // крошка по краю
      ctx.fillStyle = cfg.crumbs;
      const rc = rng(5);
      for (let k = 0; k < 40; k++) {
        const ang = rc() * TAU;
        const ct = seg(tt, 0.4, 1);
        ctx.globalAlpha = ct;
        ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rx * 0.93, topY + Math.sin(ang) * ry * 0.93, 1.8 + rc() * 1.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------- HERO: торт на вращающейся подставке ---------- */
  const dust = (() => { const r = rng(2024); return Array.from({ length: 90 }, () => ({ x: r(), o: r(), sp: 0.02 + r() * 0.05, sz: 0.6 + r() * 1.8, sw: r() * TAU })); })();

  function drawHero(ctx, w, h, p, t) {
    // Тёплый «киношный» фон со светом сверху
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.3, 20, w * 0.5, h * 0.55, Math.max(w, h) * 0.85);
    bg.addColorStop(0, '#6B4430'); bg.addColorStop(0.45, '#3A241A'); bg.addColorStop(1, '#170D09');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // конус света
    const beam = ctx.createLinearGradient(0, 0, 0, h);
    beam.addColorStop(0, 'rgba(255,214,160,0.20)'); beam.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(w * 0.42, 0); ctx.lineTo(w * 0.58, 0); ctx.lineTo(w * 0.85, h); ctx.lineTo(w * 0.15, h); ctx.closePath(); ctx.fill();

    const narrow = w < 700;
    const zoom = lerp(1, 1.38, easeInOut(p));
    const s = (narrow ? Math.min(w / 900, h / 760) * 1.25 : Math.min(w / 1150, h / 1000)) * zoom;
    const rot = p * TAU * 0.75 + t * 0.12;

    ctx.save();
    ctx.translate(w / 2, h * (narrow ? 0.68 : 0.69) + p * h * 0.04);
    ctx.scale(s, s);

    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 250, 250, 40, 0, 0, TAU); ctx.fill();
    // подставка: ножка + блюдо
    const stem = ctx.createLinearGradient(-40, 0, 40, 0);
    stem.addColorStop(0, '#8C6A3A'); stem.addColorStop(0.4, '#F3DA92'); stem.addColorStop(1, '#6E5028');
    ctx.fillStyle = stem;
    ctx.beginPath(); ctx.moveTo(-26, 150); ctx.lineTo(-58, 238); ctx.lineTo(58, 238); ctx.lineTo(26, 150); ctx.fill();
    tier(ctx, 0, 236, 110, 22, 8, '#B38A45', '#E8C77E');
    tier(ctx, 0, 140, 250, 50, 12, '#B38A45', '#EFE3D2');

    // нижний ярус (пыльно-розовый крем) и верхний (сливочный)
    tier(ctx, 0, -10, 200, 44, 150, '#E8B4B8', '#F2CDCF');
    pearls(ctx, 0, 140, 200, 44, rot, '#D8B46A', 7);
    tier(ctx, 0, -130, 138, 30, 120, '#FFF1E2', '#FFF8F0');
    pearls(ctx, 0, -10, 138, 30, rot + 0.3, '#D8B46A', 6);
    drips(ctx, 0, -130, 138, 30, '#C68B59', 1, 9, rot);

    // ягоды и золотые листочки по кругу — именно они «продают» вращение
    const items = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + rot;
      items.push({ x: Math.cos(a) * 88, y: -136 + Math.sin(a) * 19, d: Math.sin(a), i });
    }
    items.sort((a, b) => a.y - b.y);
    items.forEach((it) => {
      const sz = 15 + it.d * 3;
      if (it.i % 3 === 0) goldLeaf(ctx, it.x, it.y - 10, sz * 0.8, it.i + rot);
      else raspberry(ctx, it.x, it.y - 8, sz);
    });
    cherry(ctx, 0, -150, 20);
    ctx.restore();

    // сахарная пудра в луче
    ctx.fillStyle = '#FFF4E6';
    dust.forEach((d) => {
      const yy = ((d.o + t * d.sp) % 1) * h;
      const xx = (d.x + Math.sin(t * 0.5 + d.sw) * 0.01) * w;
      ctx.globalAlpha = 0.25 + 0.5 * Math.sin(d.sw + t) ** 2;
      ctx.beginPath(); ctx.arc(xx, yy, d.sz, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // виньетка усиливается к концу скролла
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(23,13,9,0)'); v.addColorStop(1, `rgba(23,13,9,${0.55 + p * 0.3})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }

  /* ---------- ПРОЦЕСС: четыре зацикленных клипа ---------- */
  function warmBg(ctx, w, h, a = '#FBEFE3', b = '#EBD3BF') {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  function fit(ctx, w, h, vw, vh) {
    const s = Math.min(w / vw, h / vh);
    ctx.translate((w - vw * s) / 2, (h - vh * s) / 2);
    ctx.scale(s, s);
  }

  // 1. Замес: керамическая миска, венчик вращается вокруг своей оси и ходит по кругу
  function drawMix(ctx, w, h, p, t) {
    warmBg(ctx, w, h);
    ctx.save(); fit(ctx, w, h, 600, 450);

    const cx = 300, rimY = 200, rx = 190, ry = 44;   // край миски
    const batterY = 214, brx = 170, bry = 36;        // поверхность теста

    // стол: мягкая линия горизонта и тень под миской
    ctx.fillStyle = 'rgba(62,39,35,0.05)'; ctx.fillRect(0, 330, 600, 120);
    const sh = ctx.createRadialGradient(cx, 374, 10, cx, 374, 170);
    sh.addColorStop(0, 'rgba(62,39,35,0.28)'); sh.addColorStop(1, 'rgba(62,39,35,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(cx, 374, 165, 14, 0, 0, TAU); ctx.fill();

    // яйца и горка муки на столе
    [[78, 392, -0.35], [124, 398, 0.2]].forEach(([x, y, a]) => {
      ctx.fillStyle = 'rgba(62,39,35,0.12)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 22, 24, 6, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(x - 8, y - 10, 2, x, y, 30);
      g.addColorStop(0, '#FFF6EA'); g.addColorStop(0.6, '#F1DCC0'); g.addColorStop(1, '#C9A98A');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 20, 26, a, 0, TAU); ctx.fill();
    });
    const fl = ctx.createLinearGradient(0, 372, 0, 404);
    fl.addColorStop(0, '#FFFFFF'); fl.addColorStop(1, '#EDE3D6');
    ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(478, 404); ctx.quadraticCurveTo(520, 360, 562, 404); ctx.closePath(); ctx.fill();

    // внутренняя стенка миски (видна в проёме)
    const inner = ctx.createLinearGradient(0, rimY - ry, 0, rimY + ry);
    inner.addColorStop(0, '#B97C82'); inner.addColorStop(1, '#E9C0C3');
    ctx.fillStyle = inner; ctx.beginPath(); ctx.ellipse(cx, rimY, rx, ry, 0, 0, TAU); ctx.fill();

    // тесто + спираль (обрезаем по проёму миски)
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, rimY, rx - 4, ry - 2, 0, 0, TAU); ctx.clip();
    const bat = ctx.createRadialGradient(cx - 40, batterY - 14, 10, cx, batterY, brx);
    bat.addColorStop(0, '#FBE6B8'); bat.addColorStop(1, '#E9C47F');
    ctx.fillStyle = bat; ctx.beginPath(); ctx.ellipse(cx, batterY, brx, bry, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(cx, batterY); ctx.scale(1, bry / brx);
    ctx.strokeStyle = 'rgba(198,139,89,0.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0.4; a < TAU * 2.6; a += 0.06) {
      const r = 12 + a * 9.2, aa = a - t * 2.6;
      ctx[a === 0.4 ? 'moveTo' : 'lineTo'](Math.cos(aa) * r, Math.sin(aa) * r);
    }
    ctx.stroke(); ctx.restore();
    ctx.restore();

    // венчик: низ ходит по кругу в тесте, сам вращается вокруг оси
    const bx = cx + Math.cos(t * 2.6) * 52, by = batterY + 4 + Math.sin(t * 2.6) * 11;
    const ax = 0.36, ay = -1, al = Math.hypot(ax, ay);          // наклон оси
    const ux = ax / al, uy = ay / al, nx = -uy, ny = ux;        // ось и перпендикуляр
    const L = 118, W = 36, spin = t * 7;
    const jx = bx + ux * L, jy = by + uy * L;                   // место крепления к ручке
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const ph = spin + (k / 5) * Math.PI;
      const wv = W * Math.cos(ph);
      const depth = Math.sin(ph);                              // передние проволоки светлее
      ctx.strokeStyle = depth > 0 ? '#E6E1DA' : '#A8A098';
      ctx.lineWidth = depth > 0 ? 2.6 : 2;
      const P = (s, off) => [bx + ux * L * s + nx * off, by + uy * L * s + ny * off];
      const a0 = P(1, 0), c1 = P(0.72, wv * 0.7), c2 = P(0.12, wv * 1.1), b0 = P(0, 0), c3 = P(0.12, -wv * 1.1), c4 = P(0.72, -wv * 0.7);
      ctx.beginPath(); ctx.moveTo(...a0); ctx.bezierCurveTo(...c1, ...c2, ...b0); ctx.bezierCurveTo(...c3, ...c4, ...a0); ctx.stroke();
    }
    // металлическая втулка и деревянная ручка
    ctx.strokeStyle = '#C9C3BB'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(jx - ux * 4, jy - uy * 4); ctx.lineTo(jx + ux * 22, jy + uy * 22); ctx.stroke();
    const hx = jx + ux * 22, hy = jy + uy * 22, ex = jx + ux * 120, ey = jy + uy * 120;
    const hg = ctx.createLinearGradient(hx + nx * 8, hy + ny * 8, hx - nx * 8, hy - ny * 8);
    hg.addColorStop(0, '#7A4E30'); hg.addColorStop(0.5, '#C68B59'); hg.addColorStop(1, '#8B5E3C');
    ctx.strokeStyle = hg; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();

    // «воронка» теста вокруг проволок — прячет кончик венчика
    ctx.fillStyle = '#F2D59C';
    ctx.beginPath(); ctx.ellipse(bx, by, 34, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,230,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(bx, by - 1, 24 + Math.sin(t * 8) * 3, 5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();

    // передняя стенка миски
    const body = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    body.addColorStop(0, '#C98E93'); body.addColorStop(0.3, '#F4D3D5'); body.addColorStop(0.42, '#EBC1C4');
    body.addColorStop(0.8, '#D39EA2'); body.addColorStop(1, '#B07378');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(cx - rx, rimY);
    ctx.bezierCurveTo(cx - rx + 6, 318, cx - 96, 374, cx, 374);
    ctx.bezierCurveTo(cx + 96, 374, cx + rx - 6, 318, cx + rx, rimY);
    ctx.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath(); ctx.fill();
    // блик на керамике
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(cx - 128, 262); ctx.bezierCurveTo(cx - 122, 316, cx - 92, 346, cx - 60, 356);
    ctx.bezierCurveTo(cx - 84, 336, cx - 104, 304, cx - 108, 266); ctx.closePath(); ctx.fill();
    // золотой поясок под краем
    ctx.strokeStyle = 'rgba(201,164,92,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, rimY + 18, rx - 3, ry, 0, 0.12, Math.PI - 0.12); ctx.stroke();
    // толщина края
    ctx.strokeStyle = '#F7E1E2'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(cx, rimY, rx - 2, ry - 1, 0, 0, TAU); ctx.stroke();

    // лёгкие облачка муки над миской
    for (let i = 0; i < 9; i++) {
      const ph = (t * 0.3 + i / 9) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.35;
      ctx.fillStyle = '#FFFDF8';
      ctx.beginPath(); ctx.arc(bx - 60 + i * 15 + Math.sin(t * 0.8 + i) * 8, by - 20 - ph * 110, 4 + ph * 12, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // 2. Выпечка: окно духовки, бисквит поднимается, тёплое свечение
  function drawBake(ctx, w, h, p, t) {
    warmBg(ctx, w, h, '#4A2E22', '#1E120D');
    ctx.save(); fit(ctx, w, h, 600, 450);
    const body = ctx.createLinearGradient(0, 40, 0, 420); body.addColorStop(0, '#5A3E30'); body.addColorStop(1, '#2B1B15');
    ctx.fillStyle = body; roundRect(ctx, 80, 40, 440, 380, 26); ctx.fill();
    // ручки-таймер
    ['#C9A45C', '#C9A45C', '#C9A45C'].forEach((c, i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(170 + i * 130, 80, 13, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3E2723'; ctx.lineWidth = 3; const a = t * (i === 1 ? 0.6 : 0) - 1.2;
      ctx.beginPath(); ctx.moveTo(170 + i * 130, 80); ctx.lineTo(170 + i * 130 + Math.cos(a) * 10, 80 + Math.sin(a) * 10); ctx.stroke();
    });
    // окно со свечением
    const pulse = 0.85 + Math.sin(t * 2.2) * 0.08;
    const glow = ctx.createRadialGradient(300, 270, 10, 300, 270, 240);
    glow.addColorStop(0, `rgba(255,190,110,${pulse})`); glow.addColorStop(0.6, 'rgba(214,112,48,0.85)'); glow.addColorStop(1, 'rgba(90,40,18,1)');
    ctx.fillStyle = glow; roundRect(ctx, 125, 125, 350, 255, 18); ctx.fill();
    // решётка и форма
    ctx.strokeStyle = 'rgba(40,20,10,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(135, 330); ctx.lineTo(465, 330); ctx.stroke();
    const phase = (t % 6) / 6;
    const rise = easeOut(clamp(phase * 1.4));
    const sh = lerp(14, 58, rise);
    ctx.fillStyle = '#9A9189'; ctx.fillRect(210, 300, 180, 30);
    const sponge = ctx.createLinearGradient(0, 300 - sh, 0, 305);
    sponge.addColorStop(0, lerp(0, 1, rise) > 0.6 ? '#B8743A' : '#E6C184'); sponge.addColorStop(1, '#F1D49C');
    ctx.fillStyle = sponge;
    ctx.beginPath(); ctx.moveTo(212, 302); ctx.lineTo(212, 300 - sh * 0.7); ctx.quadraticCurveTo(300, 300 - sh * 1.35, 388, 300 - sh * 0.7); ctx.lineTo(388, 302); ctx.fill();
    ctx.fillStyle = '#B7ADA4'; ctx.fillRect(206, 300, 188, 6);
    // тепловые волны
    ctx.strokeStyle = 'rgba(255,230,190,0.35)'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      for (let yy = 0; yy < 110; yy += 4) { const xx = 240 + k * 40 + Math.sin(yy * 0.08 - t * 4 + k) * 6; ctx[yy ? 'lineTo' : 'moveTo'](xx, 240 - yy - (sh - 14)); }
      ctx.stroke();
    }
    // блик стекла
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(140, 140); ctx.lineTo(240, 140); ctx.lineTo(160, 360); ctx.lineTo(140, 360); ctx.fill();
    ctx.strokeStyle = '#C9A45C'; ctx.lineWidth = 3; roundRect(ctx, 125, 125, 350, 255, 18); ctx.stroke();
    // термометр-подпись
    ctx.fillStyle = '#F3DA92'; ctx.font = '600 22px "Inter Tight", system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('170 °C', 505, 408);
    ctx.restore();
  }

  // 3. Сборка: цикл сборки медовика
  function drawAssemble(ctx, w, h, p, t) {
    const loop = (t % 7) / 7;
    drawAssembly(ctx, w, h, clamp(loop * 1.25), t, CAKES.raspberry, { bg: null });
  }

  // 4. Декор: кондитерский мешок отсаживает розочки по кругу
  function drawDecor(ctx, w, h, p, t) {
    warmBg(ctx, w, h);
    ctx.save(); fit(ctx, w, h, 600, 450);
    ctx.fillStyle = 'rgba(62,39,35,0.12)'; ctx.beginPath(); ctx.ellipse(300, 400, 230, 26, 0, 0, TAU); ctx.fill();
    tier(ctx, 300, 380, 240, 50, 10, '#EDE2D6', '#FBF6F0');
    tier(ctx, 300, 215, 190, 48, 150, '#FFF3E6', '#FFF8F0');
    pearls(ctx, 300, 365, 190, 48, 0, '#D8B46A', 5);
    const n = 12, cycle = 6;
    const ph = (t % cycle) / cycle;
    const done = ph * (n + 2);
    const ros = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.5 + (i / n) * TAU; // начинаем спереди
      ros.push({ x: 300 + Math.cos(a) * 158, y: 215 + Math.sin(a) * 38, i });
    }
    const sorted = ros.slice().sort((a, b) => a.y - b.y);
    sorted.forEach((r) => {
      const g = clamp(done - r.i);
      if (g <= 0) return;
      rosette(ctx, r.x, r.y, 15 * easeOutBack(g));
    });
    // мешок
    const cur = Math.min(n - 1, Math.floor(done));
    const nextT = clamp(done - Math.floor(done));
    const a = ros[cur], b = ros[Math.min(n - 1, cur + 1)];
    const bx = done >= n ? a.x : lerp(a.x, b.x, easeInOut(nextT));
    const by = (done >= n ? a.y : lerp(a.y, b.y, easeInOut(nextT))) - 26 - Math.sin(nextT * Math.PI) * 18;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.35);
    const bag = ctx.createLinearGradient(-40, 0, 40, 0); bag.addColorStop(0, '#E8B4B8'); bag.addColorStop(1, '#F7DCDD');
    ctx.fillStyle = bag;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-44, -150); ctx.quadraticCurveTo(0, -175, 44, -150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C9A45C'; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(0, 4); ctx.lineTo(8, -14); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function rosette(ctx, x, y, r) {
    if (r <= 0.5) return;
    ctx.fillStyle = '#E8B4B8';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#C98E93'; ctx.lineWidth = Math.max(1, r * 0.13);
    ctx.beginPath();
    for (let a = 0; a < TAU * 2; a += 0.2) { const rr = r * (0.85 - a / (TAU * 2.6)); ctx[a ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7 - r * 0.1); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.15, 0, TAU); ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---------- ПОРТРЕТ: тёплый свет и боке (место под портрет Higgsfield) ---------- */
  const bokeh = (() => { const r = rng(88); return Array.from({ length: 22 }, () => ({ x: r(), y: r(), r: 20 + r() * 60, s: r() * TAU, sp: 0.1 + r() * 0.3 })); })();
  function drawPortrait(ctx, w, h, p, t) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#6B4430'); g.addColorStop(0.55, '#3E2723'); g.addColorStop(1, '#1E120D');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const win = ctx.createRadialGradient(w * 0.15, h * 0.2, 10, w * 0.15, h * 0.2, Math.max(w, h) * 0.9);
    win.addColorStop(0, 'rgba(255,205,140,0.55)'); win.addColorStop(1, 'rgba(255,205,140,0)');
    ctx.fillStyle = win; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    bokeh.forEach((b) => {
      const x = (b.x + Math.sin(t * b.sp + b.s) * 0.03) * w, y = (b.y + Math.cos(t * b.sp + b.s) * 0.03) * h;
      const rr = b.r * Math.min(w, h) / 500;
      const bg = ctx.createRadialGradient(x, y, 0, x, y, rr);
      bg.addColorStop(0, 'rgba(255,196,120,0.18)'); bg.addColorStop(0.8, 'rgba(232,180,184,0.08)'); bg.addColorStop(1, 'rgba(232,180,184,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- Иллюстрации десертов (статичные) ---------- */
  function dessertBg(ctx, w, h, c1, c2) {
    const g = ctx.createRadialGradient(w / 2, h * 0.45, 5, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  const DESSERTS = {
    macaron(ctx, w, h) {
      dessertBg(ctx, w, h, '#FFF6F2', '#F5DCDD');
      ctx.save(); fit(ctx, w, h, 400, 300);
      const colors = [['#E8B4B8', '#F4D0D2'], ['#C8D59A', '#DDE6B8'], ['#C68B59', '#DDB08A']];
      colors.forEach((c, i) => {
        const x = 130 + i * 70, y = 190 - i * 36;
        ctx.fillStyle = 'rgba(62,39,35,0.10)'; ctx.beginPath(); ctx.ellipse(x, y + 44, 62, 11, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(x, y + 20, 58, 20, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = shade(c[0].slice(0), -0.08); ctx.fillRect(x - 58, y + 8, 116, 12);
        ctx.fillStyle = '#FFF4E6'; ctx.fillRect(x - 52, y, 104, 10);
        ctx.fillStyle = c[1]; ctx.beginPath(); ctx.ellipse(x, y, 58, 30, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - 18, y - 16, 18, 6, -0.2, 0, TAU); ctx.fill();
      });
      ctx.restore();
    },
    eclair(ctx, w, h) {
      dessertBg(ctx, w, h, '#FFF6EA', '#F0DCC6');
      ctx.save(); fit(ctx, w, h, 400, 300); ctx.translate(200, 160); ctx.rotate(-0.12);
      ctx.fillStyle = 'rgba(62,39,35,0.12)'; ctx.beginPath(); ctx.ellipse(0, 46, 150, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#D9A15C'; roundRect(ctx, -145, -30, 290, 72, 36); ctx.fill();
      ctx.fillStyle = '#3E2723'; roundRect(ctx, -140, -36, 280, 40, 20); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, -110, -30, 170, 8, 4); ctx.fill();
      for (let i = 0; i < 7; i++) { ctx.fillStyle = '#E3C27A'; ctx.beginPath(); ctx.arc(-90 + i * 30, -18 + (i % 2) * 4, 5, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    tart(ctx, w, h) {
      dessertBg(ctx, w, h, '#FFF6F2', '#F2D6D2');
      ctx.save(); fit(ctx, w, h, 400, 300);
      tier(ctx, 200, 150, 140, 42, 44, '#D9A15C', '#FFF1DC');
      for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; if (Math.sin(a) < -0.2) continue; ctx.fillStyle = '#C98A48'; ctx.beginPath(); ctx.arc(200 + Math.cos(a) * 140, 150 + Math.sin(a) * 42, 7, 0, TAU); ctx.fill(); }
      const r = rng(4); const items = [];
      for (let i = 0; i < 16; i++) { const a = r() * TAU, d = r() * 0.8; items.push({ x: 200 + Math.cos(a) * d * 115, y: 146 + Math.sin(a) * d * 32, k: i }); }
      items.sort((a, b) => a.y - b.y).forEach((it) => (it.k % 3 ? raspberry(ctx, it.x, it.y, 14) : blueberry(ctx, it.x, it.y, 11)));
      ctx.restore();
    },
    choux(ctx, w, h) {
      dessertBg(ctx, w, h, '#FFF8EE', '#EFDCC4');
      ctx.save(); fit(ctx, w, h, 400, 300);
      [[140, 180, 60], [255, 175, 66]].forEach(([x, y, r]) => {
        ctx.fillStyle = 'rgba(62,39,35,0.12)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 1.05, 12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#D9A15C'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r, r * 0.38, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFF6EC'; ctx.fillRect(x - r * 0.95, y - 4, r * 1.9, r * 0.3);
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.6, 4, x, y - r * 0.2, r);
        g.addColorStop(0, '#E8B878'); g.addColorStop(1, '#A8672F');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,0.5)'; ctx.lineWidth = 2; const rr = rng(x);
        for (let k = 0; k < 8; k++) { const px = x - r * 0.7 + rr() * r * 1.4, py = y - r * 0.55 + rr() * r * 0.45; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 12, py + 4); ctx.lineTo(px + 18, py - 3); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let k = 0; k < 40; k++) { ctx.beginPath(); ctx.arc(x - r * 0.6 + rr() * r * 1.2, y - r * 0.75 + rr() * r * 0.35, 1.3, 0, TAU); ctx.fill(); }
      });
      ctx.restore();
    },
    bento(ctx, w, h) {
      dessertBg(ctx, w, h, '#FFF6F2', '#F5DCDD');
      ctx.save(); fit(ctx, w, h, 400, 300);
      ctx.fillStyle = 'rgba(62,39,35,0.12)'; ctx.beginPath(); ctx.ellipse(200, 230, 130, 18, 0, 0, TAU); ctx.fill();
      tier(ctx, 200, 130, 115, 34, 92, '#F2C9CC', '#F7DCDD');
      pearls(ctx, 200, 222, 115, 34, 0.2, '#FFF4E6', 7);
      for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; rosette(ctx, 200 + Math.cos(a) * 100, 130 + Math.sin(a) * 29, 8); }
      ctx.fillStyle = '#3E2723'; ctx.font = 'italic 600 26px "Playfair Display", Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('с любовью', 200, 139);
      ctx.restore();
    },
    cheesecake(ctx, w, h) {
      dessertBg(ctx, w, h, '#FFF8EE', '#EFDCC4');
      ctx.save(); fit(ctx, w, h, 400, 300);
      // тарелка
      ctx.fillStyle = 'rgba(62,39,35,0.10)'; ctx.beginPath(); ctx.ellipse(208, 244, 176, 42, 0, 0, TAU); ctx.fill();
      const pl = ctx.createLinearGradient(0, 190, 0, 280);
      pl.addColorStop(0, '#FFFFFF'); pl.addColorStop(1, '#EDE5DB');
      ctx.fillStyle = pl; ctx.beginPath(); ctx.ellipse(205, 234, 176, 44, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(62,39,35,0.08)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(205, 236, 140, 33, 0, 0, TAU); ctx.stroke();

      // геометрия клина: T — острый кончик, B1/B2 — задние углы, H — высота
      const T = [92, 176], B1 = [222, 108], B2 = [318, 146], H = 72, CR = 13;
      const on = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];

      // тень от кусочка на тарелке
      ctx.fillStyle = 'rgba(62,39,35,0.16)';
      ctx.beginPath(); ctx.moveTo(T[0] + 6, T[1] + H + 4); ctx.lineTo(B2[0] + 14, B2[1] + H + 2); ctx.lineTo(B2[0] - 10, B2[1] + H - 10); ctx.closePath(); ctx.fill();

      // срез: сливочная начинка
      const cut = ctx.createLinearGradient(0, T[1], 0, T[1] + H);
      cut.addColorStop(0, '#F7EBD2'); cut.addColorStop(0.55, '#FBF3E3'); cut.addColorStop(1, '#F1E0C2');
      ctx.fillStyle = cut;
      ctx.beginPath(); ctx.moveTo(...T); ctx.lineTo(...B2); ctx.lineTo(B2[0], B2[1] + H); ctx.lineTo(T[0], T[1] + H); ctx.closePath(); ctx.fill();
      // лёгкая тень к кончику и следы ножа
      const sideShade = ctx.createLinearGradient(T[0], 0, B2[0], 0);
      sideShade.addColorStop(0, 'rgba(160,120,70,0.14)'); sideShade.addColorStop(0.4, 'rgba(160,120,70,0)');
      ctx.fillStyle = sideShade; ctx.fill();
      const r = rng(12);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 26; i++) { // мелкие пузырьки воздуха
        const s = 0.05 + r() * 0.9, [x, y] = on(T, B2, s);
        ctx.beginPath(); ctx.arc(x, y + 8 + r() * (H - CR - 14), 0.8 + r() * 1.1, 0, TAU); ctx.fill();
      }
      // песочная основа
      const crust = ctx.createLinearGradient(0, T[1] + H - CR, 0, T[1] + H);
      crust.addColorStop(0, '#C48A4E'); crust.addColorStop(1, '#9A6533');
      ctx.fillStyle = crust;
      ctx.beginPath(); ctx.moveTo(T[0], T[1] + H - CR); ctx.lineTo(B2[0], B2[1] + H - CR); ctx.lineTo(B2[0], B2[1] + H); ctx.lineTo(T[0], T[1] + H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(90,55,25,0.5)';
      for (let i = 0; i < 40; i++) { const s = r(), [x, y] = on(T, B2, s); ctx.beginPath(); ctx.arc(x, y + H - CR + 2 + r() * (CR - 4), 0.9 + r(), 0, TAU); ctx.fill(); }

      // верх: запечённая золотистая поверхность
      const topPath = () => { ctx.beginPath(); ctx.moveTo(...T); ctx.lineTo(...B1); ctx.quadraticCurveTo(298, 100, ...B2); ctx.closePath(); };
      const top = ctx.createRadialGradient(215, 130, 10, 215, 135, 150);
      top.addColorStop(0, '#F5DFAE'); top.addColorStop(0.75, '#EACB8C'); top.addColorStop(1, '#D8A964');
      ctx.fillStyle = top; topPath(); ctx.fill();
      // подрумяненный край по дуге
      ctx.strokeStyle = 'rgba(190,130,60,0.75)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(...B1); ctx.quadraticCurveTo(298, 100, ...B2); ctx.stroke();

      // ягодный соус: покрывает заднюю часть верха, стекает по срезу
      const sauce = ctx.createLinearGradient(200, 100, 300, 180);
      sauce.addColorStop(0, '#B8243F'); sauce.addColorStop(1, '#86122A');
      const P1 = on(T, B1, 0.36), P2 = on(T, B2, 0.3);
      ctx.save(); topPath(); ctx.clip();
      ctx.fillStyle = sauce;
      ctx.beginPath(); ctx.moveTo(...P1);
      ctx.bezierCurveTo(P1[0] + 26, P1[1] + 18, P2[0] - 10, P2[1] - 22, ...P2);
      ctx.lineTo(420, 140); ctx.lineTo(260, 40); ctx.closePath(); ctx.fill();
      ctx.restore();
      // слой соуса на срезе и подтёки
      ctx.fillStyle = sauce;
      ctx.beginPath(); ctx.moveTo(...P2); ctx.lineTo(...B2); ctx.lineTo(B2[0], B2[1] + 5); ctx.lineTo(P2[0], P2[1] + 3); ctx.closePath(); ctx.fill();
      [[0.48, 24, 7], [0.72, 36, 8], [0.9, 16, 6]].forEach(([s, len, wd]) => {
        const [x, y] = on(T, B2, s);
        ctx.beginPath(); ctx.moveTo(x - wd / 2, y); ctx.lineTo(x - wd / 2, y + len); ctx.arc(x, y + len, wd / 2, Math.PI, 0, true); ctx.lineTo(x + wd / 2, y); ctx.closePath(); ctx.fill();
      });
      // глянец соуса
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(250, 118, 26, 4, 0.28, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(on(T, B2, 0.72)[0] + 1, on(T, B2, 0.72)[1] + 28, 1.5, 4, 0, 0, TAU); ctx.fill();
      // лёгкий блик по верхней кромке среза
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(T[0] + 2, T[1] + 1); ctx.lineTo(...on(T, B2, 0.29)); ctx.stroke();

      // капли соуса на тарелке
      ctx.fillStyle = '#9E1A33';
      [[348, 232, 7], [362, 244, 4.5], [371, 254, 3], [120, 262, 3.5]].forEach(([x, y, rr]) => { ctx.beginPath(); ctx.ellipse(x, y, rr * 1.4, rr, 0, 0, TAU); ctx.fill(); });

      // ягоды и лист мяты
      ctx.fillStyle = 'rgba(60,10,20,0.35)';
      ctx.beginPath(); ctx.ellipse(240, 130, 16, 5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(276, 142, 15, 5, 0, 0, TAU); ctx.fill();
      raspberry(ctx, 238, 116, 17);
      raspberry(ctx, 274, 128, 16);
      ctx.save(); ctx.translate(258, 100); ctx.rotate(-0.5);
      ctx.fillStyle = '#6E9A3E'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(230,245,200,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
      ctx.restore();
      ctx.restore();
    },
  };
  function blueberry(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, '#6D7BB0'); g.addColorStop(1, '#2C2F57');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(210,215,240,0.5)'; ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.25, 0, TAU); ctx.fill();
  }

  // Публичный API
  window.MMScenes = {
    hero: drawHero,
    mix: drawMix,
    bake: drawBake,
    assemble: drawAssemble,
    decor: drawDecor,
    portrait: drawPortrait,
    cake: (key) => (ctx, w, h, p, t) => drawAssembly(ctx, w, h, p, t, CAKES[key]),
    desserts: DESSERTS,
  };
})();
