// 动作回放：按 GroundedAgent 设计文档与测试场景整理的示意数据，不是原始日志。
(function () {
  const root = document.querySelector('[data-trace]');
  if (!root) return;

  const STAGES = [
    ['model', '模型提议'],
    ['contract', '契约校验'],
    ['gate', 'Grounding'],
    ['guard', 'Policy Guard'],
    ['approval', '人工审批'],
    ['gateway', '网关写入'],
  ];

  const SCENARIOS = [
    {
      key: 'return',
      label: '正常退货',
      summary: '读过订单 → 需要审批 → 批准后复核再执行',
      steps: [
        { stage: 'model', who: '顾客', title: '“我买的耳机有质量问题，想退货。”', body: '顾客给出订单号。' },
        { stage: 'model', who: '模型 · 读取', title: 'get_order(order_id)', body: '读到订单和明细，记为本轮的一次观察。', code: 'observation turn:1:tool:1' },
        { stage: 'model', who: '模型 · 提议', title: 'create_return(order_id, order_item_id, reason_code)', body: '模型只给出动作名和参数，审批、身份类字段在契约里是禁用的。' },
        { stage: 'contract', who: '契约校验', title: '闭合契约通过', body: '动作名、枚举值、禁用字段都合规。', tone: 'ok' },
        { stage: 'gate', who: 'Grounding gate', title: '目标来自本轮读取，放行', body: '订单和明细出自同一次读取；服务端重建参数，与提议的 args_sha256 完全一致。', tone: 'ok' },
        { stage: 'guard', who: 'Policy Guard', title: 'REQUIRE_APPROVAL', body: '基于可信身份和数据库快照判定。风险策略 s6-risk/1：退货一律需要人工审批。', tone: 'warn' },
        { stage: 'gateway', who: 'ActionGateway', title: '创建待审批记录', body: '状态 WAITING_APPROVAL，审计记下 Guard 的决定。此时没有执行退货。', code: 'action.pending_created' },
        { stage: 'approval', who: '操作员', title: 'APPROVE', body: '审批只接受受信操作员的结构化决定，不接受模型或顾客的文本。' },
        { stage: 'guard', who: 'Policy Guard · 复核', title: '新快照重新判定：仍然允许', body: '批准后不直接执行。如果状态变了会判 STALE，规则不再允许会判 DENIED，两种都不执行。', tone: 'ok' },
        { stage: 'gateway', who: 'ActionGateway', title: 'EXECUTED · 1 张回执', body: '幂等键保证这次执行恰好一张回执，网关是唯一的写入方。', tone: 'ok', code: 'receipt issued' },
      ],
    },
    {
      key: 'guess',
      label: '跳过读取',
      summary: '模型没查订单就提交 → gate 拦下',
      steps: [
        { stage: 'model', who: '顾客', title: '顾客在消息里直接给了订单号和商品编号', body: '对应 DEV 中 s6-dev-025 一类的情况。' },
        { stage: 'model', who: '模型 · 提议', title: '第 1 步就提交 create_return', body: '本轮一次读取都没有做，参数直接取自顾客文本或按编号规律猜出。' },
        { stage: 'contract', who: '契约校验', title: '闭合契约通过', body: '格式完全合法，所以单靠契约校验发现不了问题。', tone: 'ok' },
        { stage: 'gate', who: 'Grounding gate', title: '拒绝：missing_order_observation', body: '本轮没有对这个订单的成功读取。拒绝是正常产品结果，不走失败回滚，回合结束。', tone: 'block', code: 'grounding_rejected' },
        { stage: 'gateway', who: 'ActionGateway', title: '未被调用', body: '没有待审批记录、没有回执、没有业务写入。', tone: 'skip' },
        { stage: 'model', who: '回复顾客', title: '固定话术，不声称已完成', body: '“抱歉，我还没有完成订单商品的核对，暂时不能提交这个申请……我会先查询核对，再继续为您处理。”' },
        { stage: 'gate', who: '对照组', title: '如果没有 gate', body: '同一提交会进入网关，由 Guard 判 DENY（他人订单）。这条恰好也守住了，但另一些猜中参数的提交会被正常执行。', tone: 'note' },
      ],
    },
    {
      key: 'crash',
      label: '写入后崩溃',
      summary: '网关已提交、会话未记录时进程退出 → 只重跑网关',
      steps: [
        { stage: 'gate', who: 'LangGraph', title: '在 gateway 节点前停下，得到 checkpoint G', body: '图编译时设置了 interrupt_before=["gateway"]，G 已同步落盘。' },
        { stage: 'gateway', who: '会话文件', title: '写入 in-flight marker', body: '{G, 幂等键, 动作名, 参数摘要}，一次原子替换。在这之前不可能有业务写入。', code: 'inflight = {...}' },
        { stage: 'gateway', who: 'ActionGateway', title: 'start_action 已提交待审批记录', body: '业务库里已经有这条退货申请。' },
        { stage: 'gateway', who: '进程', title: 'os._exit(17)', body: '在写入新 head、清除 marker 之前退出。会话不知道刚才的结果。', tone: 'crash' },
        { stage: 'gateway', who: '重启 · 启动扫描', title: '发现带 marker 的会话', body: '即使顾客不再回来，也会在启动时恢复。' },
        { stage: 'gate', who: '恢复校验', title: 'G 的下一个节点正好是 gateway，键和摘要都一致', body: '任何一项不符就返回 recovery_pending（409），不开新分支。', tone: 'ok' },
        { stage: 'gateway', who: 'ActionGateway', title: '只重跑网关节点：幂等重放命中', body: '核心的幂等键返回第一次的结果 WAITING_APPROVAL。不调用模型，不重复写入。', tone: 'ok', code: 'action.replay_hit' },
        { stage: 'gateway', who: '会话文件', title: '写入 head、清除 marker', body: '业务表与崩溃时逐行一致。连续恢复两次，结果相同。', tone: 'ok' },
      ],
    },
  ];

  const tabs = root.querySelector('.trace-tabs');
  const pipe = root.querySelector('.trace-pipe');
  const log = root.querySelector('.trace-log');
  const count = root.querySelector('.trace-count');
  const nextBtn = root.querySelector('[data-act="next"]');

  let current = SCENARIOS[0];
  let shown = 1;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  STAGES.forEach(([key, name], i) => {
    const li = el('li', null);
    li.dataset.stage = key;
    li.append(el('span', 'pipe-index', String(i + 1)), el('span', 'pipe-name', name));
    pipe.append(li);
  });

  SCENARIOS.forEach((s) => {
    const b = el('button', 'trace-tab');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.key = s.key;
    b.append(el('strong', null, s.label), el('span', null, s.summary));
    b.addEventListener('click', () => select(s.key));
    tabs.append(b);
  });

  function select(key) {
    current = SCENARIOS.find((s) => s.key === key);
    shown = 1;
    render();
  }

  function render() {
    tabs.querySelectorAll('.trace-tab').forEach((b) => {
      const on = b.dataset.key === current.key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
    });

    const visible = current.steps.slice(0, shown);
    const last = visible[visible.length - 1];
    const visited = new Set(visible.map((s) => s.stage));
    pipe.querySelectorAll('li').forEach((li) => {
      li.classList.toggle('is-visited', visited.has(li.dataset.stage));
      li.classList.toggle('is-current', li.dataset.stage === last.stage);
      li.dataset.tone = li.dataset.stage === last.stage ? (last.tone || '') : '';
    });

    log.replaceChildren(
      ...visible.map((s, i) => {
        const row = el('div', 'trace-step' + (s.tone ? ' tone-' + s.tone : '') + (i === shown - 1 ? ' is-new' : ''));
        const head = el('div', 'trace-step-head');
        head.append(el('span', 'trace-who', s.who), el('strong', null, s.title));
        row.append(head, el('p', null, s.body));
        if (s.code) row.append(el('code', null, s.code));
        return row;
      })
    );

    count.textContent = shown + ' / ' + current.steps.length;
    nextBtn.disabled = shown >= current.steps.length;
  }

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'next' && shown < current.steps.length) shown++;
    else if (act === 'all') shown = current.steps.length;
    else if (act === 'reset') shown = 1;
    else return;
    render();
    if (act === 'next') {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      log.lastElementChild.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
  });

  render();
})();
