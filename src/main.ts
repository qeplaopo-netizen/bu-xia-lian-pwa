import './style.css'
import {
  appendTrainingSessionEvidence,
  buildSessionConditionSnapshot,
  canSetOfficialConfirmation,
  derivedSkillTrainingStatus,
  displayCertificationStatus,
  displayPciBlockerResolution,
  displayPciEvidenceType,
  displayPciTaskStatus,
  displayTestConditionStatus,
  displayTrainingStatus,
  GROUP_KEY_TO_REQUIREMENT,
  IPTPA_SKILL_CATEGORIES,
  IPTPA_SKILL_DISPLAY,
  iptpaResultMessage,
  migrateAppRecord,
  protocolForRequirement,
  recentSkillResultLabel,
  recommendNextTask,
  removeSessionEvidence,
  skillDisplayForRequirement,
  type AppRecord,
  type LegacyGroup,
  type LegacySession,
  type PciBlockerResolution,
  type PciOfficialConfirmation,
  type PciTaskEvidence,
  type PciTaskStatus,
  type RecentSkillResult,
  type SessionConditionSnapshot,
} from './certification-core'

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { updateViaCache: 'none' }).catch((error) => {
    console.warn('Service Worker registration failed', error)
  })
}

type Kind = 'iptpa' | 'experiment'
type Group = LegacyGroup
type Session = LegacySession
type Data = AppRecord
type Draft = {
  kind: Kind
  startedAt: string
  groups: Group[]
  undo: Group[][]
  isSkillTraining?: boolean
  skillRequirementId?: string
  skillDisplayName?: string
  skillCategory?: string
  conditionSnapshot?: SessionConditionSnapshot
  attemptUnit?: 'BALL' | 'SET' | 'SPLIT'
  splitStep?: number
  splitScores?: { forehand: number | null; backhand: number | null }
}

const EXP_GROUPS = ['基线1', '基线2', '变量1', '变量2', '变量3']

type PciTaskInfo = {
  course: string
  summary: string
  template?: string
  complete: string
  evidence: string
  next: string
}

const PCI_TASK_INFO: Record<string, PciTaskInfo> = {
  'PCI-L2-COURSE-PATHWAY': {
    course: '资格与课程 · 不在 13 个模块课目内',
    summary: '加速通道的获证条件与个人适用性。',
    complete: '核对个人课程账户与加速通道邮件。',
    evidence: '个人账户一手信息（不在本机课程包内）。',
    next: '先核对课程账户。',
  },
  'PCI-L2-COURSE-VERSION': {
    course: '资格与课程 · 课程包 rev 006-fix1 可作版本对照参考',
    summary: '已购课程版本与公开目录的对应关系。',
    complete: '核对个人已购版本。',
    evidence: '个人账户信息。',
    next: '先核对课程账户。',
  },
  'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST': {
    course: '资格与课程 · 一级考核，不在二级课目内',
    summary: '一级知识测试。',
    complete: '在个人账户核对是否已完成。',
    evidence: '个人账户信息。',
    next: '先核对课程账户。',
  },
  'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER': {
    course: '资格与课程 · 一级评估作业豁免',
    summary: '一级评估作业豁免的个人适用性。',
    complete: '核对个人账户豁免状态。',
    evidence: '个人账户信息。',
    next: '先核对课程账户。',
  },
  'PCI-L2-COURSE-LESSONS': {
    course: '课程 · m01–m12',
    summary: '二级课程章节与知识检查，按模块学习并在个人账户完成章节测验。',
    complete: '学完 m01–m12，并在个人账户完成章节测验。',
    evidence: '个人账户测验记录（本页不代答）。',
    next: '按模块学习，测验在个人账户完成。',
  },
  'PCI-L2-SUBMISSION-LESSON-PLAN': {
    course: '作业 · m13-a01 + m12-l04 示例',
    summary: '设计一份 60–90 分钟教案。',
    template: 'm13-a01-lesson-planning-template.pdf（本地引用，不打包进应用）',
    complete: '按模板起草教案，转 PDF 后留待最终评估提交。',
    evidence: '起草的教案 PDF（本地准备，不在本页提交）。',
    next: '按模板起草，不提交。',
  },
  'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY': {
    course: '作业 · m13-a02 + m04',
    summary: '调整训练活动难度。',
    template: 'm13-a02-adjusting-difficulty-template.docx（本地引用，不打包进应用）',
    complete: '选 5 个活动，每个写 3 种增加难度、3 种降低难度的方法。',
    evidence: '填写后的模板（本地准备，期末统一提交）。',
    next: '按模板准备，不提交。',
  },
  'PCI-L2-SUBMISSION-PPP': {
    course: '作业 · m13-a03 + m05',
    summary: '在教案中应用 Play-Practice-Play。',
    template: 'm13-a03-play-practice-play-template.pdf（本地引用，不打包进应用）',
    complete: '设计 3 个连续环节（各 15–25 分钟）：Play → Practice → Play。',
    evidence: '设计的教案（本地准备，期末统一提交）。',
    next: '按模板设计，不提交。',
  },
  'PCI-L2-SUBMISSION-QKOC': {
    course: '作业 · m13-a04 + m08',
    summary: '带练 Queen and King of the Court（标准版 + 一个修改版）。',
    template: '无文档附件；课程视频 m08-v01 / m08-v02（本地引用，不打包进应用）',
    complete: '演示并带练标准版 + 一个修改版，提供积极鼓励与清晰带练领导力。',
    evidence: '练习视频链接（考核视频按约定不由本页代录、不上传）。',
    next: '先学 m08，再自行练习。',
  },
  'PCI-L2-SUBMISSION-CHARTING': {
    course: '作业 · m13-l02 + m06',
    summary: '比赛记录分析：记录发球落点、接发深度、第三拍决策。',
    template: 'm13-l02-charting-template.docx / .pdf（本地引用，不打包进应用）',
    complete: '用模板做一次比赛分析，保存到自己设备。',
    evidence: '完成的分析文件（本地准备，作为评估材料包一部分在最终评估提交）。',
    next: '用模板做一次练习。',
  },
  'PCI-L2-SUBMISSION-PLAYING-SKILLS': {
    course: '作业 · m13-a05 + m10',
    summary: '打球技能评估：正反手底线球、截击、发球，精度需达到能向学员示范的标准。',
    template: '无文档附件；页内嵌示例视频已归档（本地引用，不打包进应用）',
    complete: '自行练习并录制练习视频（考核视频按约定不代录）。',
    evidence: '练习视频链接（最终评估提交时使用）。',
    next: '按 m10 技术基础练习；通过线未量化，不自行设定。',
  },
  'PCI-L2-SUBMISSION-FINAL-PACKAGE': {
    course: '最终完成 · m02-l03 + m13',
    summary: '最终评估材料 / 提交。',
    complete: '学完所有章节和课目后，按最终评估清单统一提交。',
    evidence: '全部作业材料包。',
    next: '学完课程后再核对提交清单。',
  },
  'PCI-L2-CREDENTIAL-ISSUED': {
    course: '最终完成 · 官方结果',
    summary: 'PCI 一级 + 二级证书颁发。',
    complete: '等待官方评估与颁发。',
    evidence: '官方颁发记录。',
    next: '等官方结果，不由本页判定。',
  },
}

const PCI_TASK_GROUPS: Array<{ title: string; ids: string[] }> = [
  {
    title: '资格与课程',
    ids: ['PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER', 'PCI-L2-COURSE-LESSONS'],
  },
  {
    title: '作业与评估',
    ids: ['PCI-L2-SUBMISSION-LESSON-PLAN', 'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY', 'PCI-L2-SUBMISSION-PPP', 'PCI-L2-SUBMISSION-QKOC', 'PCI-L2-SUBMISSION-CHARTING', 'PCI-L2-SUBMISSION-PLAYING-SKILLS'],
  },
  {
    title: '最终完成',
    ids: ['PCI-L2-SUBMISSION-FINAL-PACKAGE', 'PCI-L2-CREDENTIAL-ISSUED'],
  },
]

const IPTPA_ADMIN_IDS = [
  'IPTPA-L2-ELIGIBILITY-L1-CREDENTIAL',
  'IPTPA-L2-ELIGIBILITY-MEMBERSHIP',
  'IPTPA-L2-SKILL-SEQUENCE-VERSION',
  'IPTPA-L2-ELIGIBILITY-WRITTEN-EXAM',
  'IPTPA-L2-TEACHING-OBSERVED-LESSON',
  'IPTPA-L2-ADMIN-EXAM-BOOKING',
  'IPTPA-L2-CREDENTIAL-ISSUED',
]
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
    const transaction = db.transaction('state', 'readwrite')
    const store = transaction.objectStore('state')
    const request = store.get('app')
    let migrated: Data | null = null
    let migrationError: unknown = null

    request.onsuccess = () => {
      try {
        const raw = request.result as Partial<Data> | undefined
        migrated = migrateAppRecord(raw, defaultData)
        store.put(migrated, 'app')
      } catch (error) {
        migrationError = error
        transaction.abort()
      }
    }
    request.onerror = () => {
      migrationError = request.error
      transaction.abort()
    }
    transaction.oncomplete = () => migrated ? resolve(migrated) : reject(new Error('BLOCKED_MIGRATION_RISK: state/app 未能读取'))
    transaction.onabort = transaction.onerror = () => reject(migrationError ?? transaction.error ?? new Error('BLOCKED_MIGRATION_RISK: IndexedDB 迁移事务失败'))
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
let certificationCoreError = ''
let data: Data
try {
  data = await loadData()
} catch (error) {
  certificationCoreError = error instanceof Error ? error.message : 'BLOCKED_MIGRATION_RISK: 未知的 IndexedDB 错误'
  data = { ...defaultData, sessions: [] }
}
let draft: Draft | null = null
let savedDraftSessionId: string | null = null
let confirmSkillId: string | null = null
let pciEvidenceDraft: Record<string, string> = {}
let pendingPciFocusId: string | null = null
let pendingPciEvidenceDeleteId: string | null = null
let pciOfficialDraft: Record<string, { source: string; date: string }> = {}
let pciOfficialError: Record<string, string> = {}
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

function iptpaSkillCounts(): { untested: number; baseline: number; training: number } {
  const core = data.certificationCore
  const counts = { untested: 0, baseline: 0, training: 0 }
  if (!core) return counts
  const byId = new Map(core.requirements.map((item) => [item.requirement_id, item]))
  for (const skill of IPTPA_SKILL_DISPLAY) {
    const requirement = byId.get(skill.requirement_id)
    if (!requirement) continue
    const status = derivedSkillTrainingStatus(requirement)
    if (status === 'UNTESTED') counts.untested += 1
    else if (status === 'BASELINE_MEASURED') counts.baseline += 1
    else if (status === 'TRAINING') counts.training += 1
  }
  return counts
}

function recentResultForSkill(requirementId: string): RecentSkillResult | null {
  const sessions = data.sessions.slice().sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))
  for (const session of sessions) {
    if (session.kind !== 'iptpa') continue
    for (const group of session.groups) {
      if (GROUP_KEY_TO_REQUIREMENT[group.name] === requirementId && group.success !== null) {
        const attemptUnit = session.attempt_unit ?? (session.skill_requirement_id === requirementId ? session.conditionSnapshot?.attempt_unit ?? 'BALL' : 'BALL')
        return {
          success: group.success,
          validBalls: Math.max(0, 10 - group.unclear - group.invalid),
          attemptUnit,
          forehandSuccess: session.forehand_success ?? null,
          backhandSuccess: session.backhand_success ?? null,
        }
      }
    }
  }
  return null
}

function pciTaskStatusMap(): Record<string, PciTaskStatus> {
  return data.pciTaskStatus ?? {}
}

function pciTaskStatusOf(id: string): PciTaskStatus {
  return pciTaskStatusMap()[id] ?? 'NOT_STARTED'
}

function pciEvidenceFor(taskId: string): PciTaskEvidence[] {
  return (data.pciTaskEvidence ?? []).filter((item) => item.task_id === taskId)
}

function pciBlockerResolutionMap(): Record<string, PciBlockerResolution> {
  return data.pciBlockerResolution ?? {}
}

function pciBlockerResolutionOf(id: string): PciBlockerResolution {
  return pciBlockerResolutionMap()[id] ?? 'NOT_CHECKED'
}

function pciNextStepText(): string {
  const core = data.certificationCore
  if (!core) return '先核对课程账户'
  const recommendation = recommendNextTask(core, pciTaskStatusMap(), pciBlockerResolutionMap())
  if (recommendation?.kind === 'pci') {
    const item = core.requirements.find((entry) => entry.requirement_id === recommendation.requirement_id)
    return item ? `先核对或推进：${item.requirement_name}` : '先核对课程账户'
  }
  return '当前没有更高优先级的 PCI 任务，可继续 IPTPA 训练'
}

function pciHomeCardText(): string {
  const core = data.certificationCore
  if (!core) return '个人状态未知，不编造完成状态'
  const recommendation = recommendNextTask(core, pciTaskStatusMap(), pciBlockerResolutionMap())
  if (recommendation?.kind === 'pci') {
    const item = core.requirements.find((entry) => entry.requirement_id === recommendation.requirement_id)
    if (!item) return '个人状态未知，不编造完成状态'
    return `当前：${displayPciTaskStatus(pciTaskStatusOf(item.requirement_id))} ${item.requirement_name}`
  }
  return '当前无更高优先级任务'
}

function homeRecommendationHtml(): string {
  const core = data.certificationCore
  if (!core) return ''
  const recommendation = recommendNextTask(core, pciTaskStatusMap(), pciBlockerResolutionMap())
  if (!recommendation) return ''
  if (recommendation.kind === 'pci') {
    const item = core.requirements.find((entry) => entry.requirement_id === recommendation.requirement_id)
    if (!item) return ''
    return `<button class="program-card" data-action="navigate" data-to="pci-tasks" data-focus-task-id="${esc(item.requirement_id)}">
      <span class="card-index">★</span><div class="card-copy"><span class="tag">今天最值得做</span><h3>PCI L2 · ${esc(item.requirement_name)}</h3><p>为什么推荐这个：${esc(recommendation.reason)}</p></div><span class="card-arrow">↗</span><div class="card-bottom"><span>任务状态：${displayPciTaskStatus(pciTaskStatusOf(item.requirement_id))}</span><span class="duration">进入 PCI 任务页并定位到该任务</span></div>
    </button>`
  }
  const skill = skillDisplayForRequirement(recommendation.requirement_id)
  if (!skill) return ''
  return `<button class="program-card iptpa-card" data-action="skill-confirm" data-requirement-id="${esc(skill.requirement_id)}">
    <span class="card-index">★</span><div class="card-copy"><span class="tag">今天最值得做</span><h3>IPTPA L2 · ${esc(skill.name)}</h3><p>为什么推荐这个：${esc(recommendation.reason)}</p></div><span class="card-arrow">↗</span><div class="card-bottom"><span>先确认本次训练条件，再开始 10 球</span><span class="duration">进入训练条件确认</span></div>
  </button>`
}

function overallCertificationText(certification: 'PCI_L2' | 'IPTPA_L2'): string {
  const core = data.certificationCore
  if (!core) return '待核实'
  const statuses = [...new Set(core.requirements.filter((item) => item.certification === certification).map((item) => item.certification_status))]
  if (statuses.length === 1) return displayCertificationStatus(statuses[0])
  return statuses.map((status) => displayCertificationStatus(status)).join('、')
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
  const counts = iptpaSkillCounts()
  shell(`<section class="hero">
      <div class="eyebrow">匹克球训练实验室 <span>简体中文版</span></div>
      <h1>练完十球，<br><em>再碰手机。</em></h1>
      <p>把注意力留给球场。每组结束记一次，训练结果和技术判断分开。</p>
      <div class="hero-orbit"><div class="orbit-line"></div><div class="court"><i></i><i></i><i></i></div><b>10</b><small>一组球</small></div>
    </section>
    <section class="quick-row"><button class="text-link" data-action="navigate" data-to="help">☰ 怎么使用</button><button class="text-link" data-action="navigate" data-to="history">训练历史 →</button></section>
    <section class="section-heading"><div><span class="eyebrow">今天推进认证</span><h2>先做认证真正需要的那一步</h2></div></section>
    ${homeRecommendationHtml()}
    <button class="program-card iptpa-card" data-action="navigate" data-to="iptpa-skills">
      <span class="card-index">一</span><div class="card-copy"><span class="tag">认证训练</span><h3>IPTPA L2</h3><p>23 项技能训练</p></div><span class="card-arrow">↗</span><div class="card-bottom"><span>尚未测试 ${counts.untested} · 已建立基线 ${counts.baseline} · 训练中 ${counts.training}</span><span class="duration">训练状态统计，不是认证完成度</span></div>
    </button>
    <button class="program-card" data-action="navigate" data-to="pci-tasks">
      <span class="card-index">二</span><div class="card-copy"><span class="tag">认证任务</span><h3>PCI L2</h3><p>课程 / 作业 / 评估任务</p></div><span class="card-arrow">↗</span><div class="card-bottom"><span>${esc(pciHomeCardText())}</span><span class="duration">个人状态未知，不编造完成状态</span></div>
    </button>
    <section class="section-heading small"><div><span class="eyebrow">其他训练</span><h2>认证主线之外</h2></div></section>
    <button class="program-card experiment-card" data-action="start" data-kind="experiment">
      <span class="card-index">三</span><div class="card-copy"><span class="tag">个人技术实验</span><h3>重置球容易飞高</h3><p>基线 2 组 × 变量 3 组</p></div><span class="card-arrow">↗</span><div class="card-bottom"><span>本轮唯一变量：拍面呈现时机</span><span class="duration">约 15 分钟</span></div>
    </button>
    <section class="utility-grid"><button class="utility-card" data-action="navigate" data-to="settings"><span class="utility-icon">⌁</span><span><b>发球机设置</b><small>${esc(data.settings.name || '尚未设置')}</small></span><span class="chevron">›</span></button><button class="utility-card" data-action="navigate" data-to="history"><span class="utility-icon">▤</span><span><b>训练历史</b><small>${data.sessions.length ? `已保存 ${data.sessions.length} 次训练` : '完成训练后在这里查看'}</small></span><span class="chevron">›</span></button></section>
    ${recent.length ? `<section class="recent-section"><div class="section-heading small"><div><span class="eyebrow">最近一次</span><h2>训练回看</h2></div><button class="text-link" data-action="navigate" data-to="history">全部记录 →</button></div><div class="recent-card"><b>${recent[0].kind === 'iptpa' ? 'IPTPA L2' : '重置球实验'}</b><span>${dateLabel(recent[0].completedAt ?? recent[0].startedAt)}</span><p>${summaryFor(recent[0])}</p></div></section>` : ''}
    ${!data.onboardingSeen ? `<div class="welcome-shade"><div class="welcome-card"><div class="welcome-mark">10</div><span class="eyebrow">先读这 20 秒</span><h2>手机不是训练的一部分。</h2><p>训练时把手机放下；完成一组再记录。PCI 用任务状态推进，IPTPA 用训练结果留证据。</p><button class="primary-button" data-action="welcome-close">了解，开始</button><button class="text-button" data-action="welcome-skip">先跳过</button></div></div>` : ''}`)
}

function summaryFor(session: Session): string {
  if (session.kind === 'iptpa') {
    if (session.groups.length === 1) {
      const group = session.groups[0]
      const validBalls = Math.max(0, 10 - group.unclear - group.invalid)
      const conditionStatus = session.conditionSnapshot?.test_condition_status ?? 'UNVERIFIED'
      const attemptUnit = session.attempt_unit ?? 'BALL'
      const split = attemptUnit === 'SPLIT' && session.forehand_success !== undefined && session.forehand_success !== null && session.backhand_success !== undefined && session.backhand_success !== null
        ? { forehand: session.forehand_success, backhand: session.backhand_success }
        : undefined
      return `${iptpaResultMessage(group.success ?? 0, validBalls, conditionStatus, attemptUnit, split)}本地成绩不代表认证通过。`
    }
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
  if (kind === 'iptpa') {
    setView('iptpa-skills')
    return
  }
  savedDraftSessionId = null
  draft = { kind, startedAt: new Date().toISOString(), groups: EXP_GROUPS.map((name) => ({ name, success: null, unclear: 0, invalid: 0, markers: [] })), undo: [] }
  setView('training')
}

function startSkill(requirementId: string): void {
  const skill = skillDisplayForRequirement(requirementId)
  if (!skill) return
  const protocol = protocolForRequirement(requirementId)
  savedDraftSessionId = null
  draft = {
    kind: 'iptpa',
    startedAt: new Date().toISOString(),
    groups: [{ name: skill.groupKey, success: null, unclear: 0, invalid: 0, markers: [] }],
    undo: [],
    isSkillTraining: true,
    skillRequirementId: skill.requirement_id,
    skillDisplayName: skill.name,
    skillCategory: skill.category,
    conditionSnapshot: buildSessionConditionSnapshot(data.settings, protocol),
    attemptUnit: protocol?.attempt_unit ?? 'BALL',
    splitStep: 0,
    splitScores: { forehand: null, backhand: null },
  }
  setView('skill-training')
}

function renderSkillConfirm(): void {
  const skill = confirmSkillId ? skillDisplayForRequirement(confirmSkillId) : undefined
  const core = data.certificationCore
  if (!skill || !core) return renderHome()
  const requirement = core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  const protocol = protocolForRequirement(skill.requirement_id)
  const conditionStatus = protocol?.condition_status ?? 'UNVERIFIED'
  const currentStatus = requirement ? displayTrainingStatus(derivedSkillTrainingStatus(requirement)) : '待核实'
  const conditionNote = conditionStatus === 'UNVERIFIED'
    ? '本次仅建立本地训练基线，不与正式考核条件直接比较。'
    : conditionStatus === 'LOCAL_PROTOCOL'
      ? '本次按本地训练协议进行，不与正式考核条件直接比较；本地成绩不代表认证 PASS。'
      : '本次条件已核实。正式技能通过仍需要 Director 判断动作基本功；本地成绩不代表认证 PASS。'
  const unitText = protocol?.attempt_unit === 'SET'
    ? '10 组'
    : protocol?.attempt_unit === 'SPLIT'
      ? '正手 5 球 + 反手 5 球'
      : '10 球'
  const settingValue = (value: string): string => value || '未设置'
  shell(`<section class="page-intro compact"><span class="eyebrow">本次训练条件</span><h1>${esc(skill.name)}</h1><p>当前训练状态：${currentStatus} · 训练条件：${displayTestConditionStatus(conditionStatus)}</p></section>
    <section class="certification-card">
      <p class="certification-summary">训练单位：${unitText}</p>
      <p class="certification-summary">成功定义：${esc(protocol?.success_definition ?? '10 球中至少 8 球落入目标区（本地记录口径，条件未核实时不与正式考核直接比较）')}</p>
      <p class="certification-summary">当前协议来源：${esc(protocol ? `${protocol.source_file}（${protocol.source_authority}）` : '暂无本地协议，条件待核实')}</p>
      <p class="certification-summary">协议版本：${esc(protocol?.protocol_version ?? '未设置')}</p>
      <p class="certification-summary">发球 / 喂球条件：${esc(protocol?.feed ?? '未设置')}</p>
      <p class="certification-summary">目标：${esc(protocol?.target ?? '未设置')}</p>
      <p class="certification-summary">站位：${esc(protocol?.setup ?? '未设置')}</p>
      <p class="certification-summary">动作提示：${esc(protocol?.fundamental_cues ?? '未设置')}</p>
      <p class="certification-summary">无效喂球定义：${esc(protocol?.invalid_definition ?? '未在本地资料中明确定义')}</p>
      <p class="certification-next"><b>注意：</b>${conditionNote}</p>
    </section>
    <section class="certification-card">
      <div class="certification-card-heading"><div><span class="eyebrow">发球机</span><h2>本次将写入记录的设置</h2></div></div>
      <p class="certification-summary">名称：${esc(settingValue(data.settings.name))}</p>
      <p class="certification-summary">速度：${esc(settingValue(data.settings.speed))}</p>
      <p class="certification-summary">发球间隔：${esc(settingValue(data.settings.interval))}</p>
      <p class="certification-summary">当前目标设置：${esc(settingValue(data.settings.target))}</p>
      <p class="certification-summary">备注：${esc(settingValue(data.settings.notes))}</p>
      <p class="certification-summary">旋转：未设置（发球机设置里没有旋转字段，本次记录将明确保存为 UNKNOWN，不伪装成已记录）</p>
      <p class="certification-summary">点“确认条件并开始”后，本次训练的条件快照即已确定；训练开始后不再重新读取全局设置。</p>
    </section>
    <div class="summary-actions"><button class="primary-button" data-action="skill-begin">确认条件并开始</button><button class="secondary-button" data-action="navigate" data-to="settings">修改发球机设置</button><button class="secondary-button" data-action="navigate" data-to="iptpa-skills">返回技能页</button></div>`, 'iptpa-skills')
}

function renderSkillTraining(): void {
  if (!draft || !draft.isSkillTraining) return renderHome()
  const group = draft.groups[0]
  const skillCategory = draft.skillCategory ?? ''
  const skillDisplayName = draft.skillDisplayName ?? group.name
  const skillRequirementId = draft.skillRequirementId
  const core = data.certificationCore
  const requirement = core?.requirements.find((item) => item.requirement_id === skillRequirementId)
  const currentStatus = requirement ? displayTrainingStatus(derivedSkillTrainingStatus(requirement)) : '待核实'
  const attemptUnit = draft.attemptUnit ?? 'BALL'
  if (attemptUnit === 'SPLIT') {
    const step = draft.splitStep ?? 0
    const stepName = step === 0 ? '正手 5 球' : '反手 5 球'
    const numbers = Array.from({ length: 6 }, (_, n) => `<button class="score-button" data-action="split-score" data-score="${n}">${n}</button>`).join('')
    shell(`<section class="training-top"><span>IPTPA L2 · ${esc(skillCategory)}</span></section>
    <section class="training-focus"><span class="eyebrow">通用训练器 · 正手 5 球 + 反手 5 球</span><h1>${esc(skillDisplayName)}</h1><div class="ball-count"><b>5</b><span>球</span><p>现在把手机放一边<br/>打完 ${stepName} 再回来</p></div></section>
    <p class="certification-summary">当前训练状态：${currentStatus} · 第 ${step + 1} 步：${stepName}（正反手分开记录，不能只录一个总数）</p>
    <div class="record-panel"><div class="record-heading"><b>${stepName}打进目标区几球？</b><span>完成 5 球后选一次</span></div><div class="score-grid">${numbers}</div><div class="score-caption"><span>0</span><span>成功球数</span><span>5</span></div></div>
    <div class="training-actions"><button class="text-button" data-action="cancel">结束本次训练</button></div>`, 'iptpa-skills')
    return
  }
  const validBalls = Math.max(0, 10 - group.unclear - group.invalid)
  const numbers = Array.from({ length: 11 }, (_, n) => `<button class="score-button" data-action="score" data-score="${n}" ${n > validBalls ? 'disabled' : ''}>${n}</button>`).join('')
  const unitLabel = attemptUnit === 'SET' ? '组' : '球'
  const question = attemptUnit === 'SET' ? '这 10 组成功几组？' : '这一组打进目标区几球？'
  shell(`<section class="training-top"><span>IPTPA L2 · ${esc(skillCategory)}</span></section>
    <section class="training-focus"><span class="eyebrow">通用训练器</span><h1>${esc(skillDisplayName)}</h1><div class="ball-count"><b>10</b><span>${unitLabel}</span><p>现在把手机放一边<br/>打完这一组再回来</p></div></section>
    <p class="certification-summary">当前训练状态：${currentStatus}</p>
    <p class="certification-summary">怎么练：按确认页的训练条件完成 10${unitLabel}，记录成功数。无效喂球与看不清不计入成功 / 失败分母。</p>
    <details class="exception-box"><summary>有看不清或无效喂球？<span>可选，不影响训练节奏</span></summary><div class="exception-controls"><div><span>看不清</span><div class="counter"><button data-action="exception" data-type="unclear" data-delta="-1" aria-label="减少看不清">−</button><b>${group.unclear}</b><button data-action="exception" data-type="unclear" data-delta="1" aria-label="增加看不清">+</button></div></div><div><span>无效喂球</span><div class="counter"><button data-action="exception" data-type="invalid" data-delta="-1" aria-label="减少无效喂球">−</button><b>${group.invalid}</b><button data-action="exception" data-type="invalid" data-delta="1" aria-label="增加无效喂球">+</button></div></div></div><p class="tiny-note">可计分 ${validBalls}${unitLabel}；其余不计入成功率分母。</p></details>
    <div class="record-panel"><div class="record-heading"><b>${question}</b><span>完成 10${unitLabel}后选一次</span></div><div class="score-grid">${numbers}</div><div class="score-caption"><span>0</span><span>成功${unitLabel}数</span><span>${validBalls} 有效${unitLabel}</span></div></div>
    <div class="training-actions"><button class="text-button" data-action="cancel">结束本次训练</button></div>`, 'iptpa-skills')
}

function renderSkillSummary(session: Session): void {
  const group = session.groups[0]
  const success = group.success ?? 0
  const validBalls = Math.max(0, 10 - group.unclear - group.invalid)
  const conditionStatus = session.conditionSnapshot?.test_condition_status ?? 'UNVERIFIED'
  const attemptUnit = session.attempt_unit ?? 'BALL'
  const split = attemptUnit === 'SPLIT' && session.forehand_success !== undefined && session.forehand_success !== null && session.backhand_success !== undefined && session.backhand_success !== null
    ? { forehand: session.forehand_success, backhand: session.backhand_success }
    : undefined
  const message = iptpaResultMessage(success, validBalls, conditionStatus, attemptUnit, split)
  const reached = validBalls === 10 && success >= 8 && (conditionStatus === 'DIRECTOR_VERIFIED' || conditionStatus === 'OFFICIAL_VERIFIED')
  const saved = Boolean(savedDraftSessionId)
  const unitLabel = attemptUnit === 'SET' ? '组' : '球'
  const detail = attemptUnit === 'SPLIT' && split
    ? `正手 ${split.forehand}/5 · 反手 ${split.backhand}/5`
    : `10 次发球 · ${validBalls} 有效${unitLabel}${group.invalid ? ` · ${group.invalid} 无效喂球` : ''}${group.unclear ? ` · ${group.unclear} 看不清` : ''}`
  shell(`<section class="summary-hero"><span class="eyebrow">${saved ? '训练完成 · 已保存' : '训练进行中'}</span><h1>${esc(draft?.skillDisplayName ?? group.name)}</h1><p>${saved ? dateLabel(session.completedAt ?? session.startedAt) : '完成全部组别后自动保存。'}</p></section>
    <section class="results-card"><div class="results-title"><span class="eyebrow">本次 ${attemptUnit === 'SET' ? '10 组' : attemptUnit === 'SPLIT' ? '正手 5 球 + 反手 5 球' : '10 球'}</span><span>${esc(draft?.skillCategory ?? '')}</span></div><div class="result-row"><div><b>${esc(draft?.skillDisplayName ?? group.name)}</b><small>${detail}</small></div><strong>${success}<small>/${attemptUnit === 'SET' ? '10 组' : attemptUnit === 'SPLIT' ? '10' : `${validBalls} 有效球`}</small></strong><div class="result-meter"><i style="width:${validBalls ? success / validBalls * 100 : 0}%"></i></div></div></section>
    <section class="interpretation ${reached ? '' : 'needs-work'}"><span class="eyebrow">本次结果</span><p>${esc(message)}</p><small>正式技能通过仍需要 Director 判断动作基本功；本地成绩不代表认证 PASS。本次训练条件快照已随记录保存（协议版本：${esc(session.conditionSnapshot?.protocol_version ?? 'UNKNOWN')}），之后修改发球机设置不会改变这条记录。</small></section>
    <div class="summary-actions">${draft && savedDraftSessionId ? `<button class="text-button" data-action="undo-final">↶ 撤销最后一组</button>` : ''}<button class="primary-button" data-action="navigate" data-to="home">回到首页</button><button class="secondary-button" data-action="navigate" data-to="iptpa-skills">查看 IPTPA 技能</button><button class="secondary-button" data-action="navigate" data-to="history">查看训练历史</button></div>`, 'iptpa-skills')
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
    ${exceptions}<div class="record-panel"><div class="record-heading"><b>这一组打进目标区几球？</b><span>完成 10 球后选一次</span></div><div class="score-grid">${numbers}</div><div class="score-caption"><span>0</span><span>成功球数</span><span>10</span></div></div>
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

function recordSplitScore(score: number): void {
  if (!draft || !draft.isSkillTraining) return
  const scores = draft.splitScores ?? { forehand: null, backhand: null }
  if ((draft.splitStep ?? 0) === 0) {
    scores.forehand = score
    draft.splitScores = scores
    draft.splitStep = 1
    renderSkillTraining()
  } else {
    scores.backhand = score
    draft.splitScores = scores
    const group = draft.groups[0]
    group.success = (scores.forehand ?? 0) + (scores.backhand ?? 0)
    void finishSession()
  }
}

async function finishSession(): Promise<void> {
  if (!draft) return
  const baseSession: Session = { id: crypto.randomUUID(), kind: draft.kind, startedAt: draft.startedAt, completedAt: new Date().toISOString(), groups: draft.groups }
  if (draft.isSkillTraining && draft.skillRequirementId) {
    const protocol = protocolForRequirement(draft.skillRequirementId)
    baseSession.skill_requirement_id = draft.skillRequirementId
    baseSession.skill_name = draft.skillDisplayName ?? draft.groups[0]?.name
    baseSession.conditionSnapshot = draft.conditionSnapshot ?? buildSessionConditionSnapshot(data.settings, protocol)
    baseSession.attempt_unit = draft.attemptUnit ?? protocol?.attempt_unit ?? 'BALL'
    baseSession.total_attempts = protocol?.total_attempts ?? 10
    if (baseSession.attempt_unit === 'SPLIT') {
      baseSession.forehand_success = draft.splitScores?.forehand ?? null
      baseSession.backhand_success = draft.splitScores?.backhand ?? null
      baseSession.forehand_attempts = protocol?.forehand_attempts ?? 5
      baseSession.backhand_attempts = protocol?.backhand_attempts ?? 5
    }
  }
  const { core, session: completed } = appendTrainingSessionEvidence(data.certificationCore!, baseSession)
  data.certificationCore = core
  data.sessions.push(completed)
  await saveData(data)
  savedDraftSessionId = completed.id
  if (draft.isSkillTraining) renderSkillSummary(completed)
  else renderSummary(completed)
}

function renderIptpaSkills(): void {
  const core = data.certificationCore
  if (!core) {
    certificationCoreError = 'BLOCKED_MIGRATION_RISK：认证数据层尚未安全初始化；旧训练记录未改动。'
    shell(`<section class="page-intro compact"><span class="eyebrow">认证数据层</span><h1>暂不可用</h1><p>${esc(certificationCoreError)}</p></section>`)
    return
  }
  const counts = iptpaSkillCounts()
  const byId = new Map(core.requirements.map((item) => [item.requirement_id, item]))
  const categories = IPTPA_SKILL_CATEGORIES.map((category) => {
    const skills = IPTPA_SKILL_DISPLAY.filter((skill) => skill.category === category)
    const rows = skills.map((skill) => {
      const requirement = byId.get(skill.requirement_id)
      const status = requirement ? displayTrainingStatus(derivedSkillTrainingStatus(requirement)) : '待核实'
      const protocol = protocolForRequirement(skill.requirement_id)
      const condition = protocol ? displayTestConditionStatus(protocol.condition_status) : '条件待核实'
      const recent = recentResultForSkill(skill.requirement_id)
      const hasEvidence = Boolean(requirement && requirement.evidence_available.length)
      return `<li class="skill-row"><button class="skill-row-button" data-action="skill-confirm" data-requirement-id="${esc(skill.requirement_id)}"><span class="skill-row-main"><b>${esc(skill.name)}</b><small>${status} · ${condition}${recent !== null ? ` · ${recentSkillResultLabel(recent)}` : ''}</small></span><span class="skill-row-action">${hasEvidence ? '继续' : '开始'} →</span></button></li>`
    }).join('')
    const untestedInCategory = skills.filter((skill) => {
      const requirement = byId.get(skill.requirement_id)
      return requirement && derivedSkillTrainingStatus(requirement) === 'UNTESTED'
    }).length
    return `<section class="certification-card skill-category-card"><details open><summary>${category} · 尚未测试 ${untestedInCategory}</summary><ul class="skill-list">${rows}</ul></details></section>`
  }).join('')
  const adminRows = IPTPA_ADMIN_IDS.map((id) => {
    const item = byId.get(id)
    if (!item) return ''
    return `<li class="certification-requirement">
      <div class="certification-requirement-title"><b>${esc(item.requirement_name)}</b><span>认证状态：${displayCertificationStatus(item.certification_status)}</span></div>
      <small>下一步：${esc(item.next_action)}</small>
    </li>`
  }).join('')
  shell(`<section class="page-intro compact"><span class="eyebrow">认证训练</span><h1>IPTPA L2</h1><p>认证状态：${overallCertificationText('IPTPA_L2')}</p><p>本地训练记录 10 球成绩，但 8/10 不代表认证通过，正式通过还要求 Director 判断动作基本功。</p><p>本页不显示认证完成百分比。</p></section>
    <section class="certification-card"><div class="certification-card-heading"><div><span class="eyebrow">训练概览</span><h2>23 项技能</h2></div></div><p class="certification-summary">尚未测试 ${counts.untested} · 已建立基线 ${counts.baseline} · 训练中 ${counts.training}</p><p class="certification-summary">这是训练状态统计，不是认证完成度。怎么练：选择技能 → 确认本次训练条件 → 完成 10 球 → 记录成功数。训练条件来自本地训练协议，未经 Director 或官方核实，不直接与正式考核比较；本页不编造官方参数。</p></section>
    ${categories}
    <section class="certification-card"><details><summary>考试与认证要求</summary><ul class="certification-list">${adminRows}</ul></details><p class="certification-footnote">训练证据、成功次数和本地训练记录不代表官方认证通过。待核实表示尚未由合适的一手证据核实。</p></section>`)
}

function renderPciTasks(): void {
  const core = data.certificationCore
  if (!core) {
    certificationCoreError = 'BLOCKED_MIGRATION_RISK：认证数据层尚未安全初始化；旧训练记录未改动。'
    shell(`<section class="page-intro compact"><span class="eyebrow">认证数据层</span><h1>暂不可用</h1><p>${esc(certificationCoreError)}</p></section>`)
    return
  }
  const byId = new Map(core.requirements.map((item) => [item.requirement_id, item]))
  const isBlocker = (id: string): boolean => ['PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER'].includes(id)
  const taskReady = (id: string): boolean => {
    const status = pciTaskStatusOf(id)
    return status === 'READY' || status === 'DONE_LOCAL' || status === 'SUBMITTED'
  }
  const finalGateIds = [
    'PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER', 'PCI-L2-COURSE-LESSONS',
    'PCI-L2-SUBMISSION-LESSON-PLAN', 'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY', 'PCI-L2-SUBMISSION-PPP', 'PCI-L2-SUBMISSION-QKOC', 'PCI-L2-SUBMISSION-CHARTING', 'PCI-L2-SUBMISSION-PLAYING-SKILLS',
  ]
  const finalGateMissing = finalGateIds.filter((id) => {
    if (isBlocker(id)) {
      const resolution = pciBlockerResolutionOf(id)
      return resolution !== 'RESOLVED_LOCAL' && resolution !== 'OFFICIAL_CONFIRMED'
    }
    return !taskReady(id)
  }).map((id) => byId.get(id)?.requirement_name ?? id)
  const groups = PCI_TASK_GROUPS.map((group) => {
    const cards = group.ids.map((id) => {
      const item = byId.get(id)
      const info = PCI_TASK_INFO[id]
      if (!item || !info) return ''
      const taskStatus = pciTaskStatusOf(id)
      const evidenceList = pciEvidenceFor(id)
      const statusOptions = (['NOT_STARTED', 'IN_PROGRESS', 'READY', 'SUBMITTED', 'NEEDS_REVISION', 'DONE_LOCAL'] as PciTaskStatus[]).map((status) => `<option value="${status}" ${status === taskStatus ? 'selected' : ''}>${displayPciTaskStatus(status)}</option>`).join('')
      let primaryAction = ''
      if (isBlocker(id)) primaryAction = `<button class="secondary-button" data-action="pci-blocker" data-task-id="${id}" data-resolution="RESOLVED_LOCAL">记录核对结果：已核对，无阻塞</button><button class="secondary-button" data-action="pci-blocker" data-task-id="${id}" data-resolution="CHECKED_UNRESOLVED">记录核对结果：已核对，仍有问题</button><button class="secondary-button" data-action="pci-blocker" data-task-id="${id}" data-resolution="PENDING_OFFICIAL">记录核对结果：尚待官方确认</button>`
      else if (id === 'PCI-L2-COURSE-LESSONS') primaryAction = `<button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="IN_PROGRESS">开始学习</button><button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="DONE_LOCAL">本地标记已学</button>`
      else if (id === 'PCI-L2-SUBMISSION-FINAL-PACKAGE') primaryAction = finalGateMissing.length === 0
        ? `<button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="READY">已准备提交</button>`
        : `<p class="certification-summary">还差：${esc(finalGateMissing.join('、'))}</p>`
      else if (id === 'PCI-L2-CREDENTIAL-ISSUED') primaryAction = `<p class="certification-summary">等官方结果，不由本页判定；官方结果请用下面的“记录官方确认”附来源与日期。</p>`
      else if (id === 'PCI-L2-SUBMISSION-LESSON-PLAN') primaryAction = `<button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="IN_PROGRESS">开始准备</button><button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="READY">标记草稿完成</button>`
      else if (id === 'PCI-L2-SUBMISSION-CHARTING') primaryAction = `<button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="IN_PROGRESS">开始练习</button><button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="READY">已准备提交</button>`
      else if (id === 'PCI-L2-SUBMISSION-QKOC' || id === 'PCI-L2-SUBMISSION-PLAYING-SKILLS') primaryAction = `<button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="IN_PROGRESS">开始练习</button><button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="READY">已准备评估</button>`
      else primaryAction = `<button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="IN_PROGRESS">开始准备</button><button class="secondary-button" data-action="pci-primary" data-task-id="${id}" data-to-status="READY">标记已准备</button>`
      const evidenceHtml = evidenceList.length
        ? `<div class="pci-evidence-list">${evidenceList.map((entry) => {
          if (pendingPciEvidenceDeleteId === entry.evidence_id) {
            return `<div class="delete-confirm"><p>确定删除这条证据引用？只删除本页引用，不删除真实本地文件。</p><div class="delete-confirm-actions"><button class="delete-confirm-button" data-action="pci-evidence-delete-confirm" data-evidence-id="${esc(entry.evidence_id)}">确认删除</button><button class="secondary-button delete-cancel-button" data-action="pci-evidence-delete-cancel">取消</button></div></div>`
          }
          return `<p class="certification-summary">证据：${esc(entry.note || entry.local_path || entry.url)} · ${displayPciEvidenceType(entry.evidence_type)} · ${dateLabel(entry.created_at)} <button class="text-button" data-action="pci-evidence-delete-request" data-evidence-id="${esc(entry.evidence_id)}">删除这条证据引用</button></p>`
        }).join('')}</div>`
        : ''
      const official = (data.pciOfficialConfirmation ?? {})[id]
      const officialDraft = pciOfficialDraft[id] ?? { source: official?.source ?? '', date: official?.date ?? '' }
      const officialHtml = `<div class="pci-evidence-form"><label class="pci-status-label">官方来源 / portal / email / result reference<input type="text" data-pci-official-source="${id}" value="${esc(officialDraft.source)}" placeholder="例如：PCI portal 成绩页" /></label><label class="pci-status-label">日期<input type="date" data-pci-official-date="${id}" value="${esc(officialDraft.date)}" /></label>${pciOfficialError[id] ? `<p class="certification-summary">${esc(pciOfficialError[id])}</p>` : ''}<button class="secondary-button" data-action="pci-official-confirm" data-task-id="${id}">记录官方确认</button>${official ? `<p class="certification-summary">官方已确认：${esc(official.source)} · ${esc(official.date)}</p>` : '<p class="certification-summary">普通状态下拉不能直接选官方已确认；没有官方来源与日期时，禁止设置官方已确认。</p>'}</div>`
      return `<section class="certification-card" id="pci-task-${esc(id)}"><div class="certification-card-heading"><div><span class="eyebrow">${esc(info.course)}</span><h2>${esc(item.requirement_name)}</h2></div><strong>认证状态：${displayCertificationStatus(item.certification_status)}</strong></div>
        <p class="certification-summary">学什么：${esc(info.summary)}</p>
        ${info.template ? `<p class="certification-summary">已有模板：${esc(info.template)}</p>` : ''}
        <p class="certification-summary">要完成什么：${esc(info.complete)}</p>
        <p class="certification-summary">要保存什么证据：${esc(info.evidence)}</p>
        <p class="certification-summary">任务状态：${displayPciTaskStatus(taskStatus)}</p>
        ${isBlocker(id) ? `<p class="certification-summary">核对状态：${displayPciBlockerResolution(pciBlockerResolutionOf(id))}（点过“记录核对结果”不等于解除 blocker，只有“已核对 · 本地确认无阻塞”或“官方已确认”才解除）</p>` : ''}
        <div class="pci-actions">${primaryAction}</div>
        <label class="pci-status-label">改状态<select data-action="pci-status-change" data-task-id="${id}">${statusOptions}</select></label>
        <div class="pci-evidence-form"><input type="text" data-pci-evidence-input="${id}" value="${esc(pciEvidenceDraft[id] ?? '')}" placeholder="文件位置 / 链接 / 备注（只存引用，不上传文件）" /><button class="secondary-button" data-action="pci-evidence-save" data-task-id="${id}">保存证据引用</button></div>
        ${evidenceHtml}
        ${officialHtml}
        <p class="certification-next"><b>下一步：</b>${esc(info.next)}</p></section>`
    }).join('')
    return `<section class="section-heading small"><div><span class="eyebrow">任务分组</span><h2>${group.title}</h2></div></section>${cards}`
  }).join('')
  shell(`<section class="page-intro compact"><span class="eyebrow">认证任务</span><h1>PCI L2</h1><p>认证状态：${overallCertificationText('PCI_L2')}</p><p>当前下一步：${esc(pciNextStepText())}</p><p>课程 → 学习 → 作业 / 评估 → 证据 → 下一步。任务状态是本地推进记录，与官方认证状态分开保存；本地任务完成不改变官方认证状态。</p><p>本页不显示认证完成百分比。</p></section>
    <section class="certification-card"><details><summary>资料与证据说明</summary><p class="certification-summary">本页只保留课程 / 模块 ID、中文任务名、简短摘要、本地资产引用、任务状态与证据状态，不打包原始视频、完整字幕与 PDF。课程包版本 rev 006-fix1 仅作版本对照参考。</p><p class="certification-summary">课程包内 3 条考核规则尚未与官方公开规则交叉核对，本页不将其显示为官方已确认；个人状态仍待核实。技术基础示例视频 Volley Sensation 在课程包内记 missing，不影响本页任务系统。</p></details></section>
    ${groups}`)
  if (pendingPciFocusId) {
    const target = app.querySelector(`#pci-task-${CSS.escape(pendingPciFocusId)}`)
    pendingPciFocusId = null
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
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
    <section class="results-card"><div class="results-title"><span class="eyebrow">${experiment ? '本次表现记录' : '各组成绩'}</span><span>各组 10 球</span></div>${list}</section>
    ${experiment ? `<section class="interpretation"><span class="eyebrow">本次训练表现差异</span><div class="compare"><div><small>基线</small><b>${basePct}%</b></div><span>→</span><div><small>变量</small><b>${varPct}%</b></div></div><p>这只是本次训练的表现差异，不能证明拍面时机是原因。下一次做“保持测试”：不加提示，观察表现能否保留。</p></section>` : `<section class="interpretation ${weak.length ? 'needs-work' : ''}"><span class="eyebrow">${weak.length ? '下次多看一眼' : '本次达到 8/10 的组'}</span><p>${weak.length ? `需要继续练习：${weak.map((group) => group.name).join('、')}。` : '四组本次均达到 8/10。一次 8/10 不等于稳定掌握，请在之后的训练持续观察。'}</p><small>单次成绩只是一次观察，不代表已掌握。本地训练证据不代表 Director 正式评分或认证 PASS。</small></section>`}
    <div class="summary-actions">${draft && savedDraftSessionId ? `<button class="text-button" data-action="undo-final">↶ 撤销最后一组</button>` : ''}<button class="primary-button" data-action="navigate" data-to="home">回到首页</button><button class="secondary-button" data-action="navigate" data-to="history">查看训练历史</button></div>`)
}

function renderHelp(from = 'home'): void {
  helpFrom = from
  shell(`<section class="page-intro"><span class="eyebrow">使用说明</span><h1>把手机放下，<br/><em>把训练留下。</em></h1><p>这是一份训练记录工具，不是每球打卡器。</p></section>
    <div class="mantra">完成一组再记，不逐球填；<br/>一次只改一个变量；<br/>当场变好，不等于学会；<br/>看录像以后，再决定下一步。</div>
    <section class="help-section"><span class="number">01</span><div><h2>IPTPA L2｜23 项技能训练</h2><p>在 IPTPA 技能页点任意技能，先确认本次训练条件，再开始 10 球，手机放一边。完成 10 球，再点进目标区的成功数。第一次有效记录建立基线，之后进入训练中。单次达到 8/10 只是本次本地训练成绩达到本地记录的 8/10 水平，当前训练条件尚未与正式考核条件核实，不等于已经稳定掌握，更不代表认证通过；正式通过仍需要 Director 判断动作基本功。</p><p>训练条件来自本地训练协议，未经 Director 或官方核实；本页不编造官方参数。</p></div></section>
    <section class="help-section"><span class="number">02</span><div><h2>重置球容易飞高｜个人实验</h2><p>先做基线 1、基线 2，各 10 球；再做变量 1–3，各 10 球。基线组不显示提示；变量组只提示“来球到达前，拍面已经朝向目标落点呈现”。本轮只改变拍面呈现时机。</p><p>“看不清”指无法判断该球是否成功；“无效喂球”指来球明显偏离预定练习条件，无法正常完成击球。这两类不算失败，会从成功率分母中排除。典型球可点“标记典型球”，自动记录时间，建议稍后结合录像回看。</p><p>结果只写本次训练表现差异，不证明变量导致变化。下一次做保持测试，取消提示观察表现能否保留。</p></div></section>
    <section class="help-section"><span class="number">03</span><div><h2>发球机与本机数据</h2><p>发球机设置首次使用或设置变化时修改即可，保存后长期复用。训练历史和设置保存在本机浏览器的本地数据库中；关闭后仍在这台设备上，无账号、后端或云同步。清除浏览器网站数据会删除本地记录。</p><p>记错一条：在“训练历史”里点该条记录下方的“删除这条记录”，再点“确认删除”即可，只删这一条，其他记录不受影响，删除后无法恢复。</p></div></section>
    <section class="help-section"><span class="number">04</span><div><h2>添加到 iPhone 主屏幕</h2><p>用 Safari 打开部署网址 → 点分享 → 选择“添加到主屏幕” → 点“添加”。首次打开联网后会缓存应用；之后断网仍可打开已缓存版本。训练过程中不会自动刷新应用。</p><p>当前版本暂不包含人工智能自动诊断、逐球识别、苹果手表、云同步；23 项技能训练只记录本地 10 球成绩，不代表官方认证通过。</p></div></section>
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
  if (certificationCoreError) {
    app.innerHTML = `<main class="page"><section class="migration-warning"><h1>数据迁移已停止</h1><p>${esc(certificationCoreError)}</p><p>现有训练数据未主动清除或覆盖。请保留此浏览器数据并重试；如问题持续，先导出 / 备份后再处理。</p></section></main>`
    return
  }
  if (view === 'home') renderHome()
  else if (view === 'training') renderTraining()
  else if (view === 'skill-confirm') renderSkillConfirm()
  else if (view === 'skill-training') renderSkillTraining()
  else if (view === 'help') renderHelp(helpFrom)
  else if (view === 'settings') renderSettings()
  else if (view === 'history') renderHistory()
  else if (view === 'iptpa-skills') renderIptpaSkills()
  else if (view === 'pci-tasks') renderPciTasks()
}

function bind(): void {
  app.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', () => {
      const action = element.dataset.action
      if (action === 'navigate') { savedNotice = ''; historyNotice = ''; pendingDeleteId = null; if (element.dataset.focusTaskId) pendingPciFocusId = element.dataset.focusTaskId; setView(element.dataset.to ?? 'home') }
      if (action === 'delete-request') { pendingDeleteId = element.dataset.id ?? null; historyNotice = ''; renderHistory() }
      if (action === 'delete-cancel') { pendingDeleteId = null; renderHistory() }
      if (action === 'delete-confirm') {
        const targetId = element.dataset.id
        data.sessions = data.sessions.filter((session) => session.id !== targetId)
        if (savedDraftSessionId === targetId) savedDraftSessionId = null
        const core = data.certificationCore
        if (core && targetId) removeSessionEvidence(core, targetId)
        pendingDeleteId = null
        historyNotice = '已删除一条训练记录'
        void saveData(data)
        renderHistory()
      }
      if (action === 'skill-start') startSkill(element.dataset.requirementId ?? '')
      if (action === 'skill-confirm') { confirmSkillId = element.dataset.requirementId ?? null; setView('skill-confirm') }
      if (action === 'skill-begin' && confirmSkillId) startSkill(confirmSkillId)
      if (action === 'split-score') recordSplitScore(Number(element.dataset.score))
      if (action === 'pci-blocker') {
        const taskId = element.dataset.taskId ?? ''
        const resolution = element.dataset.resolution as PciBlockerResolution
        if (taskId && resolution) {
          data.pciBlockerResolution = { ...pciBlockerResolutionMap(), [taskId]: resolution }
          void saveData(data)
          renderPciTasks()
        }
      }
      if (action === 'pci-official-confirm') {
        const taskId = element.dataset.taskId ?? ''
        const draftOfficial = pciOfficialDraft[taskId] ?? { source: '', date: '' }
        if (!taskId) return
        if (!canSetOfficialConfirmation(draftOfficial.source, draftOfficial.date)) {
          pciOfficialError[taskId] = '请先填写官方来源与日期，否则不能设置官方已确认。'
          renderPciTasks()
          return
        }
        const evidenceId = `pci:official:${taskId}:${crypto.randomUUID()}`
        const confirmation: PciOfficialConfirmation = { task_id: taskId, evidence_id: evidenceId, source: draftOfficial.source.trim(), date: draftOfficial.date, created_at: new Date(draftOfficial.date).toISOString() }
        data.pciOfficialConfirmation = { ...(data.pciOfficialConfirmation ?? {}), [taskId]: confirmation }
        data.pciTaskEvidence = [...(data.pciTaskEvidence ?? []), { evidence_id: evidenceId, task_id: taskId, evidence_type: 'OFFICIAL_RECORD', local_path: '', note: draftOfficial.source.trim(), url: draftOfficial.source.trim().startsWith('http') ? draftOfficial.source.trim() : '', created_at: confirmation.created_at, status: 'SAVED', source: '官方确认记录' }]
        if (['PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER'].includes(taskId)) {
          data.pciBlockerResolution = { ...pciBlockerResolutionMap(), [taskId]: 'OFFICIAL_CONFIRMED' }
        }
        delete pciOfficialError[taskId]
        void saveData(data)
        renderPciTasks()
      }
      if (action === 'pci-evidence-delete-request') { pendingPciEvidenceDeleteId = element.dataset.evidenceId ?? null; renderPciTasks() }
      if (action === 'pci-evidence-delete-cancel') { pendingPciEvidenceDeleteId = null; renderPciTasks() }
      if (action === 'pci-evidence-delete-confirm') {
        const evidenceId = element.dataset.evidenceId ?? ''
        const entry = (data.pciTaskEvidence ?? []).find((item) => item.evidence_id === evidenceId)
        data.pciTaskEvidence = (data.pciTaskEvidence ?? []).filter((item) => item.evidence_id !== evidenceId)
        if (entry && entry.evidence_type === 'OFFICIAL_RECORD') {
          const confirmations = { ...(data.pciOfficialConfirmation ?? {}) }
          if (confirmations[entry.task_id]?.evidence_id === evidenceId) {
            delete confirmations[entry.task_id]
            data.pciOfficialConfirmation = confirmations
            if (pciBlockerResolutionOf(entry.task_id) === 'OFFICIAL_CONFIRMED') {
              data.pciBlockerResolution = { ...pciBlockerResolutionMap(), [entry.task_id]: 'CHECKED_UNRESOLVED' }
            }
          }
        }
        pendingPciEvidenceDeleteId = null
        void saveData(data)
        renderPciTasks()
      }
      if (action === 'pci-primary') {
        const taskId = element.dataset.taskId ?? ''
        const toStatus = element.dataset.toStatus as PciTaskStatus
        if (taskId && toStatus) {
          data.pciTaskStatus = { ...pciTaskStatusMap(), [taskId]: toStatus }
          void saveData(data)
          renderPciTasks()
        }
      }
      if (action === 'pci-evidence-save') {
        const taskId = element.dataset.taskId ?? ''
        const input = app.querySelector<HTMLInputElement>(`[data-pci-evidence-input="${taskId}"]`)
        const value = (input?.value ?? pciEvidenceDraft[taskId] ?? '').trim()
        if (!taskId || !value) return
        const entry: PciTaskEvidence = {
          evidence_id: `pci:${taskId}:${crypto.randomUUID()}`,
          task_id: taskId,
          evidence_type: 'LOCAL_REFERENCE',
          local_path: value.startsWith('http') ? '' : value,
          note: value,
          url: value.startsWith('http') ? value : '',
          created_at: new Date().toISOString(),
          status: 'SAVED',
          source: '用户本地引用',
        }
        data.pciTaskEvidence = [...(data.pciTaskEvidence ?? []), entry]
        pciEvidenceDraft[taskId] = ''
        void saveData(data)
        renderPciTasks()
      }
      if (action === 'back') {
        if ((view === 'training' || view === 'skill-training') && !confirm('放弃本次未完成训练？')) return
        if (view === 'training' || view === 'skill-training') draft = null
        setView(element.dataset.to ?? 'home')
      }
      if (action === 'start') start(element.dataset.kind as Kind)
      if (action === 'score') recordScore(Number(element.dataset.score))
      if (action === 'undo' && draft?.undo.length) { draft.groups = draft.undo.pop()!; renderTraining() }
      if (action === 'undo-final' && draft?.undo.length && savedDraftSessionId) {
        const removedId = savedDraftSessionId
        data.sessions = data.sessions.filter((session) => session.id !== removedId)
        const core = data.certificationCore!
        removeSessionEvidence(core, removedId)
        void saveData(data)
        draft.groups = draft.undo.pop()!
        savedDraftSessionId = null
        setView(draft.isSkillTraining ? 'skill-training' : 'training')
      }
      if (action === 'exception' && draft) {
        const group = draft.groups.find((item) => item.success === null)!
        const key = element.dataset.type as 'unclear' | 'invalid'
        snapshot()
        group[key] = Math.max(0, Math.min(10 - group[key === 'unclear' ? 'invalid' : 'unclear'], group[key] + Number(element.dataset.delta)))
        if (draft.isSkillTraining) renderSkillTraining()
        else renderTraining()
      }
      if (action === 'mark' && draft) {
        snapshot()
        draft.groups.find((item) => item.success === null)!.markers.push(new Date().toISOString())
        if (draft.isSkillTraining) renderSkillTraining()
        else renderTraining()
      }
      if (action === 'cancel') { if (confirm('结束本次训练？未完成的成绩不会保存。')) { const wasSkill = draft?.isSkillTraining; draft = null; setView(wasSkill ? 'iptpa-skills' : 'home') } }
      if (action === 'training-help') renderHelp('training')
      if (action === 'help-done') setView(helpFrom === 'training' ? 'training' : 'home')
      if (action === 'welcome-close' || action === 'welcome-skip') { data.onboardingSeen = true; void saveData(data); renderHome() }
    })
  })
  app.querySelectorAll<HTMLSelectElement>('select[data-action="pci-status-change"]').forEach((select) => {
    select.addEventListener('change', () => {
      const taskId = select.dataset.taskId ?? ''
      const toStatus = select.value as PciTaskStatus
      if (!taskId) return
      if (toStatus === 'OFFICIAL_CONFIRMED') { renderPciTasks(); return }
      data.pciTaskStatus = { ...pciTaskStatusMap(), [taskId]: toStatus }
      void saveData(data)
      renderPciTasks()
    })
  })
  app.querySelectorAll<HTMLInputElement>('[data-pci-evidence-input]').forEach((input) => {
    input.addEventListener('input', () => {
      const taskId = input.dataset.pciEvidenceInput ?? ''
      if (taskId) pciEvidenceDraft[taskId] = input.value
    })
  })
  app.querySelectorAll<HTMLInputElement>('[data-pci-official-source]').forEach((input) => {
    input.addEventListener('input', () => {
      const taskId = input.dataset.pciOfficialSource ?? ''
      if (taskId) pciOfficialDraft[taskId] = { ...(pciOfficialDraft[taskId] ?? { source: '', date: '' }), source: input.value }
    })
  })
  app.querySelectorAll<HTMLInputElement>('[data-pci-official-date]').forEach((input) => {
    input.addEventListener('input', () => {
      const taskId = input.dataset.pciOfficialDate ?? ''
      if (taskId) pciOfficialDraft[taskId] = { ...(pciOfficialDraft[taskId] ?? { source: '', date: '' }), date: input.value }
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
    if (confirmSkillId) setView('skill-confirm')
    else renderSettings()
  })
}

render()
