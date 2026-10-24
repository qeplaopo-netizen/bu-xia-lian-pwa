import './style.css'

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { updateViaCache: 'none' }).catch((error) => {
    console.warn('Service Worker registration failed', error)
  })
}

type Kind = 'iptpa' | 'experiment'
type Group = { name: string; success: number | null; unclear: number; invalid: number; markers: string[] }
type Session = { id: string; kind: Kind; startedAt: string; completedAt?: string; groups: Group[] }
type Settings = { name: string; speed: string; interval: string; target: string; notes: string }
type Data = { settings: Settings; sessions: Session[]; onboardingSeen: boolean }
type Draft = { kind: Kind; startedAt: string; groups: Group[]; undo: Group[][] }

const IPTPA_GROUPS = ['正手直线', '正手斜线', '反手直线', '反手斜线']
const EXP_GROUPS = ['基线1', '基线2', '变量1', '变量2', '变量3']
const defaultData: Data = {
  settings: { name: '斯波阿斯', speed: '', interval: '', target: '', notes: '' },
  sessions: [],
  onboardingSeen: false,
}

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('bu-xia-lian', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('state')
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

async function loadData(): Promise<Data> {
  const db = await dbPromise
  return new Promise((resolve, reject) => {
    const request = db.transaction('state').objectStore('state').get('app')
    request.onsuccess = () => resolve({ ...defaultData, ...(request.result ?? {}) })
    request.onerror = () => reject(request.error)
  })
}

async function saveData(data: Data): Promise<void> {
  const db = await dbPromise
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction('state', 'readwrite').objectStore('state').put(data, 'app')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const app = document.querySelector<HTMLDivElement>('#app')!
let data = await loadData()
let draft: Draft | null = null
let savedDraftSessionId: string | null = null
let view = 'home'
let helpFrom = 'home'
let settingsDraft = { ...data.settings }
let savedNotice = ''
let pendingDeleteId: string | null = null
let historyNotice = ''

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function setView(next: string): void {
  view = next
  render()
  window.scrollTo(0, 0)
}

function header(back = 'home'): string {
  return `<header class="topbar"><button class="icon-button" data-action="back" data-to="${back}" aria-label="返回">←</button><a class="wordmark" data-action="navigate" data-to="home"><span class="ball"></span>不瞎练</a><span class="topbar-right">本机保存</span></header>`
}

function shell(content: string, back = 'home'): void {
  app.innerHTML = `${header(back)}<main class="page">${content}</main><footer class="footer-note"><span class="local-dot"></span>只保存在这台设备</footer>`
  bind()
}

function renderHome(): void {
  const recent = data.sessions.slice().sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt)).slice(0, 3)
  shell(`<section class="hero">
      <div class="eyebrow">匹克球训练实验室 <span>简体中文版</span></div>
      <h1>练完十球，<br><em>再碰手机。</em></h1>
      <p>把注意力留给球场。每组结束记一次，训练结果和技术判断分开。</p>
      <div class="hero-orbit"><div class="orbit-line"></div><div class="court"><i></i><i></i><i></i></div><b>10</b><small>一组球</small></div>
    </section>
    <section class="quick-row"><button class="text-link" data-action="navigate" data-to="help">☰ 怎么使用</button><span>十球再记 · 不逐球填</span></section>
    <section class="section-heading"><div><span class="eyebrow">今天的训练</span><h2>从一个目标开始</h2></div><span class="step-mark">01 / 02</span></section>
    <button class="program-card iptpa-card" data-action="start" data-kind="iptpa">
      <span class="card-index">一</span><div class="card-copy"><span class="tag">认证训练</span><h3>IPTPA L2</h3><p>第三拍放小球 · 四个方向 × 10 球</p></div><span class="card-arrow">↗</span><div class="card-bottom"><span>正手直线　正手斜线　反手直线　反手斜线</span><span class="duration">约 10 分钟</span></div>
    </button>
    <button class="program-card experiment-card" data-action="start" data-kind="experiment">
      <span class="card-index">二</span><div class="card-copy"><span class="tag">个人技术实验</span><h3>重置球容易飞高</h3><p>基线 2 组 × 变量 3 组</p></div><span class="card-arrow">↗</span><div class="card-bottom"><span>本轮唯一变量：拍面呈现时机</span><span class="duration">约 15 分钟</span></div>
    </button>
    <section class="utility-grid"><button class="utility-card" data-action="navigate" data-to="settings"><span class="utility-icon">⌁</span><span><b>发球机设置</b><small>${esc(data.settings.name || '尚未设置')}</small></span><span class="chevron">›</span></button><button class="utility-card" data-action="navigate" data-to="history"><span class="utility-icon">▤</span><span><b>训练历史</b><small>${data.sessions.length ? `已保存 ${data.sessions.length} 次训练` : '完成训练后在这里查看'}</small></span><span class="chevron">›</span></button></section>
    ${recent.length ? `<section class="recent-section"><div class="section-heading small"><div><span class="eyebrow">最近一次</span><h2>训练回看</h2></div><button class="text-link" data-action="navigate" data-to="history">全部记录 →</button></div><div class="recent-card"><b>${recent[0].kind === 'iptpa' ? 'IPTPA L2' : '重置球实验'}</b><span>${dateLabel(recent[0].completedAt ?? recent[0].startedAt)}</span><p>${summaryFor(recent[0])}</p></div></section>` : ''}
    ${!data.onboardingSeen ? `<div class="welcome-shade"><div class="welcome-card"><div class="welcome-mark">10</div><span class="eyebrow">先读这 20 秒</span><h2>手机不是训练的一部分。</h2><p>每组十球结束，再用一次点击记录。完成训练后，回看结果和下一步提示。</p><button class="primary-button" data-action="welcome-close">了解，开始</button><button class="text-button" data-action="welcome-skip">先跳过</button></div></div>` : ''}`)
}

function summaryFor(session: Session): string {
  if (session.kind === 'iptpa') {
    const weak = session.groups.filter((group) => (group.success ?? 0) < 8).map((group) => group.name)
    return weak.length ? `需要继续观察：${weak.join('、')}` : '本次四组均达到 8/10；继续在后续训练观察稳定性。'
  }
  const base = session.groups.slice(0, 2).reduce((sum, group) => sum + (group.success ?? 0), 0)
  const variable = session.groups.slice(2).reduce((sum, group) => sum + (group.success ?? 0), 0)
  const baseDenom = session.groups.slice(0, 2).reduce((sum, group) => sum + 10 - group.unclear - group.invalid, 0)
  const varDenom = session.groups.slice(2).reduce((sum, group) => sum + 10 - group.unclear - group.invalid, 0)
  const basePct = baseDenom ? Math.round(base / baseDenom * 100) : 0
  const varPct = varDenom ? Math.round(variable / varDenom * 100) : 0
  const difference = varPct === basePct ? '相同' : varPct > basePct ? '变量组较高' : '基线组较高'
  return `本次训练表现差异：基线 ${basePct}% · 变量 ${varPct}%（${difference}）。下次做保持测试。`
}

function start(kind: Kind): void {
  const names = kind === 'iptpa' ? IPTPA_GROUPS : EXP_GROUPS
  savedDraftSessionId = null
  draft = { kind, startedAt: new Date().toISOString(), groups: names.map((name) => ({ name, success: null, unclear: 0, invalid: 0, markers: [] })), undo: [] }
  setView('training')
}

function renderTraining(): void {
  if (!draft) return renderHome()
  const index = draft.groups.findIndex((group) => group.success === null)
  if (index < 0) return renderSummary(draft)
  const group = draft.groups[index]
  const experiment = draft.kind === 'experiment'
  const validBalls = 10 - group.unclear - group.invalid
  const numbers = Array.from({ length: 11 }, (_, n) => `<button class="score-button ${group.success === n ? 'selected' : ''}" data-action="score" data-score="${n}" ${n > validBalls ? 'disabled' : ''}>${n}</button>`).join('')
  const exceptions = experiment ? `<details class="exception-box"><summary>有看不清或无效喂球？<span>可选，不影响训练节奏</span></summary><div class="exception-controls"><div><span>看不清</span><div class="counter"><button data-action="exception" data-type="unclear" data-delta="-1" aria-label="减少看不清">−</button><b>${group.unclear}</b><button data-action="exception" data-type="unclear" data-delta="1" aria-label="增加看不清">+</button></div></div><div><span>无效喂球</span><div class="counter"><button data-action="exception" data-type="invalid" data-delta="-1" aria-label="减少无效喂球">−</button><b>${group.invalid}</b><button data-action="exception" data-type="invalid" data-delta="1" aria-label="增加无效喂球">+</button></div></div></div><p class="tiny-note">可计分 ${validBalls} 球；其余不计入成功率分母。</p></details>` : ''
  shell(`<section class="training-top"><button class="text-link help-link" data-action="training-help">ⓘ 本页怎么练？</button><span>${experiment ? '个人技术实验' : 'IPTPA L2'}</span></section>
    <div class="progress-meta"><span>第 ${index + 1} 组，共 ${draft.groups.length} 组</span><span>${Math.round(index / draft.groups.length * 100)}%</span></div><div class="progress-track"><i style="width:${(index / draft.groups.length) * 100}%"></i></div>
    <section class="training-focus"><span class="eyebrow">${experiment ? (index < 2 ? '基线 · 不加提示' : '变量 · 唯一改变项') : '第三拍放小球'}</span><h1>${group.name}</h1><div class="ball-count"><b>10</b><span>球</span><p>现在把手机放一边<br/>打完这一组再回来</p></div>${experiment && index >= 2 ? `<div class="cue"><span>本组提示</span>来球到达前，拍面已经朝向目标落点呈现</div>` : ''}</section>
    ${exceptions}<div class="record-panel"><div class="record-heading"><b>这一组打进目标区几球？</b><span>完成 10 球后选一次</span></div><div class="score-grid">${numbers}</div><div class="score-caption"><span>0 球</span><span>${validBalls}/10 球可计分</span><span>10 球</span></div></div>
    <div class="training-actions"><button class="secondary-button" data-action="undo" ${draft.undo.length ? '' : 'disabled'}>↶ 撤销上一步</button><button class="text-button" data-action="cancel">结束本次训练</button></div>
    ${experiment ? `<button class="star-button" data-action="mark">☆ 标记典型球 <small>记录当前时间</small></button>` : ''}`)
}

function snapshot(): void {
  if (!draft) return
  draft.undo.push(JSON.parse(JSON.stringify(draft.groups)) as Group[])
  if (draft.undo.length > 20) draft.undo.shift()
}

function recordScore(score: number): void {
  if (!draft) return
  const group = draft.groups.find((item) => item.success === null)
  if (!group) return
  snapshot()
  group.success = score
  if (draft.groups.every((item) => item.success !== null)) void finishSession()
  else renderTraining()
}

async function finishSession(): Promise<void> {
  if (!draft) return
  const completed: Session = { id: crypto.randomUUID(), kind: draft.kind, startedAt: draft.startedAt, completedAt: new Date().toISOString(), groups: draft.groups }
  data.sessions.push(completed)
  await saveData(data)
  savedDraftSessionId = completed.id
  renderSummary(completed)
}

function renderSummary(session: Draft | Session): void {
  const groups = session.groups
  const experiment = session.kind === 'experiment'
  const list = groups.map((group) => {
    const denominator = 10 - group.unclear - group.invalid
    const percentage = denominator ? Math.round((group.success ?? 0) / denominator * 100) : 0
    return `<div class="result-row"><div><b>${esc(group.name)}</b><small>${group.unclear || group.invalid ? `看不清 ${group.unclear} · 无效喂球 ${group.invalid} · 分母 ${denominator}` : '10 球'}</small></div><strong>${group.success ?? 0}<small>/${denominator}</small></strong><div class="result-meter"><i style="width:${percentage}%"></i></div>${group.markers.length ? `<span class="marker-count">⭐ ${group.markers.length}</span>` : ''}</div>`
  }).join('')
  const weak = !experiment ? groups.filter((group) => (group.success ?? 0) < 8) : []
  const basePct = experiment ? Math.round(groups.slice(0, 2).reduce((sum, group) => sum + (group.success ?? 0), 0) / Math.max(1, groups.slice(0, 2).reduce((sum, group) => sum + 10 - group.unclear - group.invalid, 0)) * 100) : 0
  const varPct = experiment ? Math.round(groups.slice(2).reduce((sum, group) => sum + (group.success ?? 0), 0) / Math.max(1, groups.slice(2).reduce((sum, group) => sum + 10 - group.unclear - group.invalid, 0)) * 100) : 0
  const saved = !draft || Boolean(savedDraftSessionId)
  shell(`<section class="summary-hero"><span class="eyebrow">${saved ? '训练完成 · 已保存' : '训练进行中'}</span><h1>${experiment ? '记录一次，<br/>先不下结论。' : '这次训练，<br/>看见了。'}</h1><p>${saved ? dateLabel('completedAt' in session ? session.completedAt! : session.startedAt) : '完成全部组别后自动保存。'}</p></section>
    <section class="results-card"><div class="results-title"><span class="eyebrow">${experiment ? '本次表现记录' : '四组成绩'}</span><span>各组 10 球</span></div>${list}</section>
    ${experiment ? `<section class="interpretation"><span class="eyebrow">本次训练表现差异</span><div class="compare"><div><small>基线</small><b>${basePct}%</b></div><span>→</span><div><small>变量</small><b>${varPct}%</b></div></div><p>这只是本次训练的表现差异，不能证明拍面时机是原因。下一次做“保持测试”：不加提示，观察表现能否保留。</p></section>` : `<section class="interpretation ${weak.length ? 'needs-work' : ''}"><span class="eyebrow">${weak.length ? '下次多看一眼' : '本次达到 8/10 的组'}</span><p>${weak.length ? `需要继续练习：${weak.map((group) => group.name).join('、')}。` : '四组本次均达到 8/10。一次 8/10 不等于稳定掌握，请在之后的训练持续观察。'}</p><small>单次成绩只是一次观察，不代表已掌握。</small></section>`}
    <div class="summary-actions">${draft && savedDraftSessionId ? `<button class="text-button" data-action="undo-final">↶ 撤销最后一组</button>` : ''}<button class="primary-button" data-action="navigate" data-to="home">回到首页</button><button class="secondary-button" data-action="navigate" data-to="history">查看训练历史</button></div>`)
}

function renderHelp(from = 'home'): void {
  helpFrom = from
  shell(`<section class="page-intro"><span class="eyebrow">使用说明</span><h1>把手机放下，<br/><em>把训练留下。</em></h1><p>这是一份训练记录工具，不是每球打卡器。</p></section>
    <div class="mantra">十球再记，不逐球填；<br/>一次只改一个变量；<br/>当场变好，不等于学会；<br/>看录像以后，再决定下一步。</div>
    <section class="help-section"><span class="number">01</span><div><h2>IPTPA L2｜四组放小球</h2><p>点“开始训练”后确认当前方向，手机放一边。完成 10 球，再点进目标区的成功数。应用自动进入下一组，依次完成正手直线、正手斜线、反手直线、反手斜线。最后看四组汇总和需要继续观察的弱项。</p><p>单次达到 8/10 只是本次成绩，不等于已经稳定掌握。</p></div></section>
    <section class="help-section"><span class="number">02</span><div><h2>重置球容易飞高｜个人实验</h2><p>先做基线 1、基线 2，各 10 球；再做变量 1–3，各 10 球。基线组不显示提示；变量组只提示“来球到达前，拍面已经朝向目标落点呈现”。本轮只改变拍面呈现时机。</p><p>“看不清”指无法判断该球是否成功；“无效喂球”指来球明显偏离预定练习条件，无法正常完成击球。这两类不算失败，会从成功率分母中排除。典型球可点“标记典型球”，自动记录时间，建议稍后结合录像回看。</p><p>结果只写本次训练表现差异，不证明变量导致变化。下一次做保持测试，取消提示观察表现能否保留。</p></div></section>
    <section class="help-section"><span class="number">03</span><div><h2>发球机与本机数据</h2><p>发球机设置首次使用或设置变化时修改即可，保存后长期复用。训练历史和设置保存在本机浏览器的本地数据库中；关闭后仍在这台设备上，无账号、后端或云同步。清除浏览器网站数据会删除本地记录。</p><p>记错一条：在“训练历史”里点该条记录下方的“删除这条记录”，再点“确认删除”即可，只删这一条，其他记录不受影响，删除后无法恢复。</p></div></section>
    <section class="help-section"><span class="number">04</span><div><h2>添加到 iPhone 主屏幕</h2><p>用 Safari 打开部署网址 → 点分享 → 选择“添加到主屏幕” → 点“添加”。首次打开联网后会缓存应用；之后断网仍可打开已缓存版本。训练过程中不会自动刷新应用。</p><p>当前版本暂不包含人工智能自动诊断、逐球识别、苹果手表、云同步或全部 23 项认证训练。</p></div></section>
    <button class="primary-button page-bottom-button" data-action="help-done">${from === 'home' ? '回到首页' : '返回训练'}</button>`, from === 'training' ? 'training' : 'home')
}

function renderSettings(): void {
  shell(`<section class="page-intro compact"><span class="eyebrow">设置一次，长期复用</span><h1>发球机设置</h1><p>仅首次使用或设置变化时修改。</p></section>
    ${savedNotice ? `<div class="save-notice">✓ ${esc(savedNotice)}</div>` : ''}
    <form id="settings-form" class="settings-form">
      <label>发球机名称<input name="name" value="${esc(settingsDraft.name)}" placeholder="例如：斯波阿斯" required /></label>
      <label>速度档位<input name="speed" value="${esc(settingsDraft.speed)}" placeholder="例如：5 档" /></label>
      <label>发球间隔<input name="interval" value="${esc(settingsDraft.interval)}" placeholder="例如：4 秒" /></label>
      <label>目标落点区<input name="target" value="${esc(settingsDraft.target)}" placeholder="例如：反手厨房线附近" /></label>
      <label>备注<textarea name="notes" rows="3" placeholder="记录固定参数即可">${esc(settingsDraft.notes)}</textarea></label>
      <button class="primary-button" type="submit">保存设置</button>
    </form>
    <div class="privacy-card"><span>⌂</span><div><b>数据只在本机</b><p>设置与训练历史保存在当前浏览器，不会上传。</p></div></div>`)
}

function renderHistory(): void {
  const sessions = data.sessions.slice().sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))
  if (pendingDeleteId && !sessions.some((session) => session.id === pendingDeleteId)) pendingDeleteId = null
  const cards = sessions.map((session) => {
    const deleting = session.id === pendingDeleteId
    const footer = deleting
      ? `<div class="delete-confirm"><p>确定删除这条记录？删除后无法恢复，其他记录不受影响。</p><div class="delete-confirm-actions"><button class="delete-confirm-button" data-action="delete-confirm" data-id="${esc(session.id)}">确认删除</button><button class="secondary-button delete-cancel-button" data-action="delete-cancel">取消</button></div></div>`
      : `<div class="history-actions"><button class="delete-button" data-action="delete-request" data-id="${esc(session.id)}">删除这条记录</button></div>`
    return `<article class="history-card"><div class="history-meta"><span class="tag">${session.kind === 'iptpa' ? 'IPTPA L2' : '个人技术实验'}</span><time>${dateLabel(session.completedAt ?? session.startedAt)}</time></div><div class="history-scores">${session.groups.map((group) => `<span><b>${esc(group.name)}</b>${group.success ?? 0}<small>/${10 - group.unclear - group.invalid}</small></span>`).join('')}</div><p>${esc(summaryFor(session))}</p>${footer}</article>`
  }).join('')
  shell(`<section class="page-intro compact"><span class="eyebrow">留给下一次的线索</span><h1>训练历史</h1><p>记录表现，不急着替技术下结论。</p></section>${historyNotice ? `<div class="save-notice">✓ ${esc(historyNotice)}</div>` : ''}${sessions.length ? `<div class="history-list">${cards}</div>` : `<div class="empty-state"><span>▤</span><h2>还没有训练记录</h2><p>完成一次训练后，日期、各组成绩和摘要会显示在这里。</p><button class="secondary-button" data-action="navigate" data-to="home">开始第一次训练</button></div>`}`)
}

function render(): void {
  if (view === 'home') renderHome()
  else if (view === 'training') renderTraining()
  else if (view === 'help') renderHelp(helpFrom)
  else if (view === 'settings') renderSettings()
  else if (view === 'history') renderHistory()
}

function bind(): void {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', () => {
      const action = element.dataset.action
      if (action === 'navigate') { savedNotice = ''; historyNotice = ''; pendingDeleteId = null; setView(element.dataset.to ?? 'home') }
      if (action === 'delete-request') { pendingDeleteId = element.dataset.id ?? null; historyNotice = ''; renderHistory() }
      if (action === 'delete-cancel') { pendingDeleteId = null; renderHistory() }
      if (action === 'delete-confirm') {
        const targetId = element.dataset.id
        data.sessions = data.sessions.filter((session) => session.id !== targetId)
        if (savedDraftSessionId === targetId) savedDraftSessionId = null
        pendingDeleteId = null
        historyNotice = '已删除一条训练记录'
        void saveData(data)
        renderHistory()
      }
      if (action === 'back') {
        if (view === 'training' && !confirm('放弃本次未完成训练？')) return
        if (view === 'training') draft = null
        setView(element.dataset.to ?? 'home')
      }
      if (action === 'start') start(element.dataset.kind as Kind)
      if (action === 'score') recordScore(Number(element.dataset.score))
      if (action === 'undo' && draft?.undo.length) { draft.groups = draft.undo.pop()!; renderTraining() }
      if (action === 'undo-final' && draft?.undo.length && savedDraftSessionId) {
        data.sessions = data.sessions.filter((session) => session.id !== savedDraftSessionId)
        void saveData(data)
        draft.groups = draft.undo.pop()!
        savedDraftSessionId = null
        setView('training')
      }
      if (action === 'exception' && draft) {
        const group = draft.groups.find((item) => item.success === null)!
        const key = element.dataset.type as 'unclear' | 'invalid'
        snapshot()
        group[key] = Math.max(0, Math.min(10 - group[key === 'unclear' ? 'invalid' : 'unclear'], group[key] + Number(element.dataset.delta)))
        renderTraining()
      }
      if (action === 'mark' && draft) {
        snapshot()
        draft.groups.find((item) => item.success === null)!.markers.push(new Date().toISOString())
        renderTraining()
      }
      if (action === 'cancel') { if (confirm('结束本次训练？未完成的成绩不会保存。')) { draft = null; setView('home') } }
      if (action === 'training-help') renderHelp('training')
      if (action === 'help-done') setView(helpFrom === 'training' ? 'training' : 'home')
      if (action === 'welcome-close' || action === 'welcome-skip') { data.onboardingSeen = true; void saveData(data); renderHome() }
    })
  })
  const form = app.querySelector<HTMLFormElement>('#settings-form')
  form?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    settingsDraft = { ...settingsDraft, [target.name]: target.value }
  })
  form?.addEventListener('submit', async (event) => {
    event.preventDefault()
    data.settings = { ...settingsDraft }
    await saveData(data)
    savedNotice = '发球机设置已保存在本机'
    renderSettings()
  })
}

render()
