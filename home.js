(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 项目详情数据 ---------- */
  const PROJECTS = {
    grounded: {
      meta: '代表项目 · 2026.07 至今 · Python',
      title: 'GroundedAgent',
      media: '<img src="assets/groundedagent-demo.webp" alt="GroundedAgent 待审批界面截图">',
      lede: '面向电商售后的客服 Agent。顾客可以查询订单、物流和售后规则，也可以发起退换货。重点不在“能回答”，而在“写入之前怎么证明它该被放行”。',
      points: [
        '<b>模型只提议，后端来放行。</b>动作参数先过闭合契约，再过 grounding gate：订单和商品必须来自本轮的真实读取，否则直接拦下，不调用写入网关。',
        '<b>确定性 Policy Guard + 人工审批。</b>退货一律需要操作员批准；批准后用新的数据库快照重新判定，状态变了就不执行。',
        '<b>崩溃后不重复写入。</b>LangGraph 状态持久化 + in-flight marker + 幂等键：业务已写入、会话还没记录时进程退出，重启只重跑网关节点。',
        '<b>封存评测。</b>holdout 由隔离上下文编写，冻结后只开封一次、不调参；4 个失败都写在 README 里。',
        '<b>售后知识库。</b>BM25 + bge-m3 混合检索，回答附文档出处；知识库不能作为提交动作的依据。',
      ],
      stats: [['21/25', '封存集端到端通过'], ['25/25', '六项硬性安全约束'], ['9', '真实杀进程的崩溃场景'], ['2515', '后端离线测试，零失败']],
      note: '样本小（DEV 40 条、holdout 25 条，各一轮，单一模型），不能当作统计结论，也不代表生产可用。',
      tags: ['Python', 'FastAPI', 'LangGraph', 'DeepSeek Function Calling', 'BM25 + bge-m3', 'SQLite', 'Vue 3'],
      links: [['项目详情页 · 动作回放', 'projects/groundedagent.html', true], ['源码 ↗', 'https://github.com/sjhesjaj/GroundedAgent'], ['笔记：动作校验', 'notes/action-grounding.html']],
    },
    library: {
      meta: '2026.08 · Java',
      title: '校园智慧图书馆',
      media: '<img src="assets/lib-librarian-workflow.png" alt="馆员工作台截图">',
      lede: '面向考试周突发流量的座位预约系统。第一版先把“多人同时抢同一个座位不超卖、客户端重试不重复创建”做成可运行、可测试的最小闭环。',
      points: [
        '<b>并发正确性。</b>数据库唯一约束同时保护“座位 + 时段”和“学生 + 时段”，16 个线程抢同一座位只有一个成功。',
        '<b>安全重试。</b>学生级幂等键，重放返回同一条预约；取消后在同一事务里释放占用，可以用新的幂等键重新预约。',
        '<b>认证边界。</b>生产走无状态 OIDC / JWT，从已验签令牌里取学号；本地开发的固定身份只绑定回环地址。',
        '<b>馆员工作台。</b>停用座位 → 看到仍有几条预约 → 一键查出明细 → 逐条代取消，启停与代取消都写审计、必须填原因。',
        '<b>版本说明也讲究。</b>README 不写“推荐版本”，因为会漂的东西不该抄成文本，最新版本交给 GitHub Releases 标注。',
      ],
      stats: [['16 → 1', '线程抢同一座位，只有一个成功'], ['14 天', '可预约范围，三个时段']],
      tags: ['Java 17', 'Spring Boot', 'Vue 3', 'TypeScript', 'H2 / MySQL', 'Flyway', 'OIDC / JWT'],
      links: [['源码 ↗', 'https://github.com/sjhesjaj/campus-library-system', true]],
    },
    ticket: {
      meta: '2026.07 · Python',
      title: 'Agent 工单平台',
      media: '<div class="media code"><span class="c"># 主流程（端到端测试覆盖）</span><span>创建工单（不预填分类）</span><span>→ Agent 分类</span><span>→ 查询订单和支付记录</span><span>→ Policy Guard: REQUIRE_APPROVAL</span><span>→ 保存不可变审批，LangGraph interrupt</span><span>→ 人工批准，Command(resume=...)</span><span>→ 校验参数哈希、审批有效期、订单版本</span><span>→ 订单修改为 PAID</span></div>',
      lede: '一个面向后端可靠性的工单 Agent。当前只自动处理一个闭环：支付记录已经成功，但订单仍是待支付。Ollama 负责结构化分类，其余全部由确定性代码控制。',
      points: [
        '<b>模型权限最小化。</b>模型只决定分类，订单号永远取自工单绑定字段，模型输出覆盖不了。',
        '<b>不可变审批。</b>审批记录绑定工具名、规范化参数哈希、订单版本和过期时间，任何一项不符都不执行。',
        '<b>暂停与恢复。</b>LangGraph interrupt / Command(resume) 等待人工审批，支持 SQLite 和 PostgreSQL checkpointer。',
        '<b>可靠投递。</b>Transactional Outbox + Celery / Redis，late ack、协作式取消；提交后 Worker 崩溃重投不会重复修改订单。',
        '<b>写清楚边界。</b>没有退款工具，也不宣称支持自动退款；90 条评估集只代表确定性回归，不是模型质量报告。',
      ],
      stats: [['90', '条确定性回归评估'], ['0%', '未授权写入 / 重复副作用']],
      tags: ['FastAPI', 'SQLAlchemy', 'Alembic', 'LangGraph', 'Celery', 'Redis', 'PostgreSQL', 'Ollama'],
      links: [['源码 ↗', 'https://github.com/sjhesjaj/agent-ticket-platform', true]],
    },
  };

  /* ---------- 项目弹层 ---------- */
  const dlg = document.querySelector('dialog.sheet');
  const inner = dlg.querySelector('.sheet-inner');
  let opener = null;

  function openProject(key, from) {
    const p = PROJECTS[key];
    if (!p) return;
    opener = from;
    inner.innerHTML = `
      <div class="sheet-hero">${p.media}</div>
      <div class="sheet-body">
        <p class="meta">${p.meta}</p>
        <h3 id="sheet-title">${p.title}</h3>
        <p class="lede">${p.lede}</p>
        <div class="sheet-stats">${p.stats.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
        ${p.note ? `<p class="sheet-note">${p.note}</p>` : ''}
        <h4>做了什么</h4>
        <ul class="points">${p.points.map((x) => `<li>${x}</li>`).join('')}</ul>
        <h4>技术栈</h4>
        <ul class="tags">${p.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
        <div class="sheet-links">${p.links.map(([t, h, main]) => `<a class="btn${main ? ' dark' : ''}" href="${h}">${t}</a>`).join('')}</div>
      </div>`;
    inner.scrollTop = 0;
    dlg.showModal();
    document.body.style.overflow = 'hidden';
  }
  function closeProject() { dlg.close(); }
  dlg.addEventListener('close', () => { document.body.style.overflow = ''; opener?.focus(); });
  dlg.querySelector('.sheet-close').addEventListener('click', closeProject);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeProject(); });
  document.querySelectorAll('[data-project]').forEach((b) => b.addEventListener('click', () => openProject(b.dataset.project, b)));

  /* ---------- 卡片光斑 ---------- */
  document.querySelectorAll('.pcard').forEach((c) => c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* ---------- 头像倾斜 ---------- */
  const tilt = document.querySelector('[data-tilt]');
  if (tilt && !reduce && matchMedia('(hover: hover)').matches) {
    const box = tilt.parentElement;
    box.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
      tilt.style.setProperty('--gx', (x + 0.5) * 100 + '%');
      tilt.style.setProperty('--gy', (y + 0.5) * 100 + '%');
    });
    box.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
  }

  /* ---------- 首屏轮换文字 ---------- */
  const words = [...document.querySelectorAll('.rotator .slot span')];
  if (words.length > 1 && !reduce) {
    let i = 0;
    setInterval(() => {
      const cur = words[i], next = words[(i + 1) % words.length];
      cur.classList.remove('on'); cur.classList.add('out');
      next.classList.remove('out'); next.classList.add('on');
      setTimeout(() => cur.classList.remove('out'), 500);
      i = (i + 1) % words.length;
    }, 2400);
  }

  /* ---------- 滚动出现 + 数字滚动 ---------- */
  const countUp = (el) => {
    const end = +el.dataset.count; if (reduce || !end) return;
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- 时间线进度 + 顶栏 + 导航高亮 ---------- */
  const tlBox = document.querySelector('.timeline'), fill = tlBox?.querySelector('.fill');
  const bar = document.querySelector('.bar');
  const navLinks = [...document.querySelectorAll('.bar nav a')];
  const secs = navLinks.map((a) => document.querySelector(a.hash)).filter(Boolean);
  let ticking = false;
  function onScroll() {
    ticking = false;
    bar.classList.toggle('solid', scrollY > 10);
    if (tlBox && fill) {
      const r = tlBox.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / (r.height - 12)));
      fill.style.height = p * (r.height - 12) + 'px';
    }
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s.id;
    navLinks.forEach((a) => a.classList.toggle('on', a.hash === '#' + cur));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- 复制邮箱 ---------- */
  document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const ok = b.querySelector('.copy-ok');
    try { await navigator.clipboard.writeText(b.dataset.copy); ok.textContent = '已复制'; }
    catch { ok.textContent = b.dataset.copy; }
    ok.classList.add('show'); setTimeout(() => ok.classList.remove('show'), 1800);
  }));
})();
