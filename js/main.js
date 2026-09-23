/* ==========================================================================
   main.js — анимации сайта «Мука & Мёд»
   Стек: GSAP + ScrollTrigger (скролл-сценарии), Lenis (плавный скролл)
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. АССЕТЫ HIGGSFIELD
     Когда видео будут сгенерированы, положите файлы в assets/video/ и
     впишите пути ниже. null = используется canvas-сцена-заглушка.
     Для scroll-scrub видео лучше перекодировать с частыми ключевыми кадрами:
       ffmpeg -i in.mp4 -c:v libx264 -g 1 -crf 22 -an -movflags +faststart out.mp4
     ------------------------------------------------------------------------ */
  const MM_ASSETS = {
    hero: null,              // 'assets/video/hero.mp4'
    'cake-honey': null,      // 'assets/video/cake-honey.mp4'
    'cake-raspberry': null,  // 'assets/video/cake-raspberry.mp4'
    'cake-cherry': null,     // 'assets/video/cake-cherry.mp4'
    'cake-pear': null,       // 'assets/video/cake-pear.mp4'
    'step-mix': null,        // 'assets/video/step-mix.mp4'
    'step-bake': null,       // 'assets/video/step-bake.mp4'
    'step-assemble': null,   // 'assets/video/step-assemble.mp4'
    'step-decor': null,      // 'assets/video/step-decor.mp4'
    portrait: null,          // 'assets/img/portrait.jpg' (картинка, не видео)
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;
  root.classList.add('js', hasGSAP ? 'has-gsap' : 'no-gsap');
  if (reduced) root.classList.add('is-reduced');

  /* ------------------------------------------------------------------------
     2. СЛОТ МЕДИА: <video> если есть ассет, иначе canvas-сцена
     ------------------------------------------------------------------------ */
  const S = window.MMScenes;
  const sceneFor = (key) => ({
    hero: S.hero,
    'cake-honey': S.cake('honey'),
    'cake-raspberry': S.cake('raspberry'),
    'cake-cherry': S.cake('cherry'),
    'cake-pear': S.cake('pear'),
    'step-mix': S.mix,
    'step-bake': S.bake,
    'step-assemble': S.assemble,
    'step-decor': S.decor,
    portrait: S.portrait,
  }[key]);

  const slots = [];

  class MediaSlot {
    constructor(el) {
      this.el = el;
      this.key = el.dataset.slot;
      this.mode = el.dataset.mode || 'loop'; // scrub | loop
      this.progress = reduced ? 1 : 0;
      this.visible = false;
      this.asset = MM_ASSETS[this.key];
      this.asset ? this.initAsset() : this.initCanvas();
      // Ленивая загрузка и пауза вне вьюпорта
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          this.visible = e.isIntersecting;
          if (this.video) {
            if (e.isIntersecting && !this.video.src) { this.video.src = this.asset; this.video.load(); }
            if (this.mode === 'loop') (e.isIntersecting && !reduced) ? this.video.play().catch(() => {}) : this.video.pause();
          }
          if (e.isIntersecting) this.draw(performance.now() / 1000);
        });
      }, { rootMargin: '200px 0px' }).observe(el);
    }

    initAsset() {
      if (/\.(jpe?g|png|webp|avif)$/i.test(this.asset)) {
        const img = new Image(); img.src = this.asset; img.alt = this.el.dataset.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
        this.el.appendChild(img); return;
      }
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'none';
      v.loop = this.mode === 'loop';
      v.setAttribute('aria-hidden', 'true');
      this.el.appendChild(v);
      this.video = v;
    }

    initCanvas() {
      this.scene = sceneFor(this.key);
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      this.ctx = this.canvas.getContext('2d');
      this.el.appendChild(this.canvas);
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = this.el.getBoundingClientRect();
        this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
        this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.draw(performance.now() / 1000);
      };
      new ResizeObserver(resize).observe(this.el);
      resize();
    }

    setProgress(p) {
      this.progress = p;
      if (this.video && this.video.duration) {
        // scroll-scrub настоящего видео: перематываем по прогрессу скролла
        this.video.currentTime = p * (this.video.duration - 0.05);
      }
    }

    draw(t) {
      if (!this.scene || !this.ctx) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      // при reduced-motion «замораживаем» время — сцена статична
      this.scene(this.ctx, this.w, this.h, this.progress, reduced ? 5.5 : t);
    }
  }

  document.querySelectorAll('[data-slot]').forEach((el) => slots.push(new MediaSlot(el)));
  const slot = (key) => slots.find((s) => s.key === key);

  // Единый цикл отрисовки: рисуем только видимые canvas-сцены
  function tick() {
    const t = performance.now() / 1000;
    for (const s of slots) if (s.visible && s.scene) s.draw(t);
    if (!reduced) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ------------------------------------------------------------------------
     3. Иллюстрации десертов (статичный canvas)
     ------------------------------------------------------------------------ */
  document.querySelectorAll('[data-dessert]').forEach((el) => {
    const fn = S.desserts[el.dataset.dessert];
    const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true');
    el.appendChild(c);
    const ctx = c.getContext('2d');
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = el.getBoundingClientRect();
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fn(ctx, r.width, r.height);
    };
    new ResizeObserver(draw).observe(el);
    // перерисовать, когда подгрузятся шрифты (надпись на бенто)
    document.fonts && document.fonts.ready.then(draw);
  });

  /* ------------------------------------------------------------------------
     4. Текстура «сахарной пудры» — шум генерируется один раз
     ------------------------------------------------------------------------ */
  (function sugarNoise() {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 120;
      img.data[i] = v; img.data[i + 1] = v * 0.94; img.data[i + 2] = v * 0.88;
      img.data[i + 3] = Math.random() * 28;
    }
    ctx.putImageData(img, 0, 0);
    root.style.setProperty('--noise', `url(${c.toDataURL()})`);
  })();

  /* ------------------------------------------------------------------------
     5. Форма заказа
     ------------------------------------------------------------------------ */
  (function orderForm() {
    const form = document.getElementById('order-form');
    if (!form) return;
    const date = form.querySelector('#order-date');
    const minDate = new Date(Date.now() + 3 * 864e5); // заказы — минимум за 3 дня
    date.min = minDate.toISOString().slice(0, 10);

    // Простая маска телефона: +7 (___) ___-__-__
    const phone = form.querySelector('#order-phone');
    phone.addEventListener('input', () => {
      let d = phone.value.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
      let out = '+7';
      if (p[0]) out += ' (' + p[0];
      if (p[0].length === 3) out += ')';
      if (p[1]) out += ' ' + p[1];
      if (p[2]) out += '-' + p[2];
      if (p[3]) out += '-' + p[3];
      phone.value = out;
    });

    const btn = form.querySelector('.btn-jelly');
    form.addEventListener('submit', (e) => {
      e.preventDefault(); // TODO: подключить отправку на бэкенд / в Telegram-бота
      const status = form.querySelector('.form-status');
      const digits = phone.value.replace(/\D/g, '');
      form.querySelectorAll('.field').forEach((f) => f.classList.remove('is-error'));
      const errors = [];
      if (!form.name.value.trim()) errors.push(['#order-name', 'Напишите, как к вам обращаться']);
      if (digits.length !== 11) errors.push(['#order-phone', 'Номер нужен полностью: +7 и 10 цифр']);
      if (!date.value || date.value < date.min) errors.push(['#order-date', 'Выберите дату не раньше, чем через 3 дня']);
      if (errors.length) {
        errors.forEach(([sel]) => form.querySelector(sel).closest('.field').classList.add('is-error'));
        status.textContent = errors[0][1];
        status.dataset.state = 'error';
        btn.classList.remove('is-wobble'); void btn.offsetWidth; btn.classList.add('is-wobble');
        return;
      }
      const d = new Date(date.value + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      status.textContent = `Спасибо, ${form.name.value.trim()}! Заявка на ${d} принята — перезвоним в течение часа.`;
      status.dataset.state = 'ok';
      btn.classList.remove('is-wobble'); void btn.offsetWidth; btn.classList.add('is-wobble');
    });
  })();

  /* ------------------------------------------------------------------------
     6. Без GSAP или при reduced-motion: всё показано, сцены в финале
     ------------------------------------------------------------------------ */
  if (!hasGSAP || reduced) {
    slots.forEach((s) => s.setProgress(1));
    slots.forEach((s) => s.draw(5.5));
    if (!hasGSAP) console.warn('[Мука & Мёд] GSAP не загрузился — анимации скролла отключены');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------------------
     7. Плавный скролл Lenis, синхронизированный с ScrollTrigger
     ------------------------------------------------------------------------ */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // Якорные ссылки
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(target, { offset: -10, duration: 1.4 }) : target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ------------------------------------------------------------------------
     8. HERO: закрепляем экран, скролл вращает торт и приближает камеру
     ------------------------------------------------------------------------ */
  const hero = slot('hero');
  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: '+=130%', pin: true, scrub: 0.6,
      onUpdate: (self) => hero && hero.setProgress(self.progress),
    },
  });
  heroTl
    .to('.hero__content', { yPercent: -30, opacity: 0, ease: 'none' }, 0.15)
    .to('.hero__hint', { opacity: 0, ease: 'none', duration: 0.1 }, 0)
    .to('.hero__veil', { opacity: 0.2, ease: 'none' }, 0);

  // Появление заголовка по буквам при загрузке
  gsap.from('.hero__title .char', { yPercent: 110, opacity: 0, duration: 1.2, stagger: 0.05, ease: 'power4.out', delay: 0.15 });
  gsap.from('.hero__eyebrow, .hero__sub, .hero__hint', { y: 20, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out', delay: 0.6 });

  // Шапка: прозрачная над hero, кремовая дальше
  ScrollTrigger.create({
    trigger: '#cakes', start: 'top 80px', end: 'max',
    toggleClass: { targets: '.nav', className: 'is-solid' },
  });

  /* ------------------------------------------------------------------------
     9. ГЛАВА 1 — горизонтальная галерея тортов (≥768px) / вертикаль на мобильных
     ------------------------------------------------------------------------ */
  const cakeSlots = gsap.utils.toArray('.cake-card [data-slot]').map((el) => slot(el.dataset.slot));
  const mm = gsap.matchMedia();

  mm.add('(min-width: 768px)', () => {
    const track = document.querySelector('.cakes__track');
    const dist = () => track.scrollWidth - window.innerWidth;
    const n = cakeSlots.length;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.cakes', start: 'top top', end: () => '+=' + dist() * 1.15, pin: true, scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set('.cakes__bar-fill', { scaleX: p });
          // каждый торт собирается в своём окне общего прогресса
          cakeSlots.forEach((s, i) => s && s.setProgress(gsap.utils.clamp(0, 1, (p - i / n * 0.92) / (1 / n * 1.05))));
        },
      },
    });
  });

  mm.add('(max-width: 767px)', () => {
    gsap.utils.toArray('.cake-card').forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card, start: 'top 85%', end: 'center 45%', scrub: 0.5,
        onUpdate: (self) => cakeSlots[i] && cakeSlots[i].setProgress(self.progress),
      });
    });
  });

  /* ------------------------------------------------------------------------
     10. Появление секций: fade + slide up со stagger
     ------------------------------------------------------------------------ */
  gsap.utils.toArray('[data-reveal]').forEach((group) => {
    const items = group.children.length && group.hasAttribute('data-stagger') ? group.children : [group];
    gsap.from(items, {
      y: 48, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: group, start: 'top 86%', once: true },
    });
  });

  /* ------------------------------------------------------------------------
     11. ГЛАВА 3 — линия таймлайна рисуется скроллом, шаги подсвечиваются
     ------------------------------------------------------------------------ */
  gsap.fromTo('.process__line-fill', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.process__list', start: 'top 65%', end: 'bottom 65%', scrub: true },
  });
  gsap.utils.toArray('.step').forEach((step) => {
    ScrollTrigger.create({ trigger: step, start: 'top 65%', toggleClass: 'is-active', once: false, end: 'bottom 35%' });
  });

  /* ------------------------------------------------------------------------
     12. Параллакс декора (сахарные шарики, ягоды): скорость 0.2–0.3
     ------------------------------------------------------------------------ */
  gsap.utils.toArray('[data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed) || 0.25;
    const section = el.closest('section, footer') || el.parentElement;
    gsap.fromTo(el, { y: () => window.innerHeight * speed * 0.5 }, {
      y: () => -window.innerHeight * speed * 0.5, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  });

  // Пересчитать после загрузки шрифтов (меняется ширина галереи)
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
