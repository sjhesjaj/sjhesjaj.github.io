/* 侯俊安 · Personal Digital Space —— 全站共用的小交互 */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 滚动入场 */
  const rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('in'));

  /* 首页四个关键词轮流点亮 */
  const pillars = [...document.querySelectorAll('.pillar')];
  if (pillars.length && !reduce) {
    let i = 0, hover = false;
    pillars.forEach((p) => {
      p.addEventListener('pointerenter', () => { hover = true; pillars.forEach((x) => x.classList.remove('on')); });
      p.addEventListener('pointerleave', () => { hover = false; });
    });
    const tick = () => { if (hover) return; pillars.forEach((x, j) => x.classList.toggle('on', j === i)); i = (i + 1) % pillars.length; };
    tick(); setInterval(tick, 2200);
  }

  /* 列表筛选（Projects / Writing / Lab / Journal） */
  document.querySelectorAll('[data-filters]').forEach((bar) => {
    const scope = document.querySelector(bar.dataset.filters);
    if (!scope) return;
    const items = [...scope.querySelectorAll('[data-item]')];
    bar.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.f;
      items.forEach((it) => {
        const show = f === 'all' || it.dataset.item.split(' ').includes(f);
        it.classList.toggle('is-hidden', !show);
        it.classList.remove('is-in');
        if (show && !reduce) { void it.offsetWidth; it.classList.add('is-in'); }
      });
    });
  });

  /* 项目详情页：小目录高亮 */
  const toc = document.querySelector('.ptoc');
  if (toc) {
    const links = [...toc.querySelectorAll('a')];
    const secs = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const onScroll = () => {
      const y = scrollY + innerHeight * 0.3;
      let cur = secs[0];
      secs.forEach((s) => { if (s.offsetTop <= y) cur = s; });
      links.forEach((a) => {
        const on = a.getAttribute('href') === '#' + cur.id;
        if (on && !a.classList.contains('on')) a.scrollIntoView({ block: 'nearest', inline: 'center' });
        a.classList.toggle('on', on);
      });
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* 复制邮箱 */
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const ok = b.querySelector('.copy-ok');
    try { await navigator.clipboard.writeText(b.dataset.copy); if (ok) ok.textContent = ' ✓ 已复制'; }
    catch { if (ok) ok.textContent = ' 请手动复制'; }
    setTimeout(() => { if (ok) ok.textContent = ''; }, 2000);
  }));
})();
