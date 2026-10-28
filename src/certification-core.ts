export type Certification = 'PCI_L2' | 'IPTPA_L2'
export type CertificationStatus =
  | 'UNKNOWN'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'NEEDS_REVISION'
  | 'PASSED'
  | 'FAILED'
  | 'EXEMPTED'
export type TrainingStatus =
  | 'UNKNOWN'
  | 'UNTESTED'
  | 'BASELINE_MEASURED'
  | 'TRAINING'
  | 'READY_FOR_REVIEW'
  | 'EVIDENCE_CAPTURED'
export type EvidenceType = 'SELF_RECORDED' | 'VIDEO' | 'DIRECTOR_CONFIRMED' | 'OFFICIAL'
export type EvidenceClass = 'TRAINING_EVIDENCE' | 'CERTIFICATION_EVIDENCE'

export type SourceReference = {
  kind: 'REQUIREMENT_MAP' | 'OFFICIAL_SOURCE'
  ref: string
  locator: string
}

export type CertificationRequirement = {
  requirement_id: string
  certification: Certification
  requirement_name: string
  requirement_type: 'ELIGIBILITY' | 'COURSE' | 'SKILL' | 'TEACHING' | 'SUBMISSION' | 'ADMIN' | 'CREDENTIAL' | 'UNKNOWN'
  source: SourceReference[]
  source_status: 'CONFIRMED_OFFICIAL' | 'CONFIRMED_PERSONAL' | 'MAP_RECORDED_UNVERIFIED' | 'UNKNOWN'
  certification_status: CertificationStatus
  training_status: TrainingStatus
  evidence_required: unknown[] | 'UNKNOWN'
  evidence_available: string[]
  last_verified_at: string
  next_action: string
  blocking_reason: string
  notes: string[]
}

export type TrainingEvidence = {
  evidence_id: string
  evidence_type: EvidenceType
  evidence_class: EvidenceClass
  captured_at: string
  source_ref: string
  captured_by: string
  subject: string
  requirement_ids: string[]
  verification_status: 'UNVERIFIED' | 'VERIFIED' | 'DISPUTED' | 'SUPERSEDED'
  authority: string
  notes: string[]
}

export type LegacyGroup = {
  name: string
  success: number | null
  unclear: number
  invalid: number
  markers: string[]
}

export type LegacySession = {
  id: string
  kind: 'iptpa' | 'experiment'
  startedAt: string
  completedAt?: string
  groups: LegacyGroup[]
  requirementIds?: string[]
  evidenceIds?: string[]
}

export type CertificationCore = {
  schema_version: '0.1'
  requirements: CertificationRequirement[]
  evidence: TrainingEvidence[]
  requirementEvents: unknown[]
}

export type AppRecord = {
  settings: { name: string; speed: string; interval: string; target: string; notes: string }
  sessions: LegacySession[]
  onboardingSeen: boolean
  certificationCore?: CertificationCore
  [key: string]: unknown
}

export const DROP_GROUP_TO_REQUIREMENT: Record<string, string> = {
  正手直线: 'IPTPA-L2-SKILL-DROP-FH-STRAIGHT',
  正手斜线: 'IPTPA-L2-SKILL-DROP-FH-CROSS',
  反手直线: 'IPTPA-L2-SKILL-DROP-BH-STRAIGHT',
  反手斜线: 'IPTPA-L2-SKILL-DROP-BH-CROSS',
}

export type IptpaSkillDisplay = {
  requirement_id: string
  name: string
  category: string
  groupKey: string
}

export const IPTPA_SKILL_CATEGORIES = ['网前小球', '第三拍放小球', '截击', '落地击球', '接发球', '发球', '专项球'] as const

export const IPTPA_SKILL_DISPLAY: IptpaSkillDisplay[] = [
  { requirement_id: 'IPTPA-L2-SKILL-DINK-FH-STRAIGHT', name: '正手直线网前小球', category: '网前小球', groupKey: '正手直线网前小球' },
  { requirement_id: 'IPTPA-L2-SKILL-DINK-FH-CROSS', name: '正手斜线网前小球', category: '网前小球', groupKey: '正手斜线网前小球' },
  { requirement_id: 'IPTPA-L2-SKILL-DINK-BH-STRAIGHT', name: '反手直线网前小球', category: '网前小球', groupKey: '反手直线网前小球' },
  { requirement_id: 'IPTPA-L2-SKILL-DINK-BH-CROSS', name: '反手斜线网前小球', category: '网前小球', groupKey: '反手斜线网前小球' },
  { requirement_id: 'IPTPA-L2-SKILL-WINDSHIELD-WIPER-DINKS', name: '横向扫动网前小球（Windshield-wiper）', category: '网前小球', groupKey: '横向扫动网前小球（Windshield-wiper）' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-FH-STRAIGHT', name: '正手直线第三拍放小球', category: '第三拍放小球', groupKey: '正手直线' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-FH-CROSS', name: '正手斜线第三拍放小球', category: '第三拍放小球', groupKey: '正手斜线' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-BH-STRAIGHT', name: '反手直线第三拍放小球', category: '第三拍放小球', groupKey: '反手直线' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-BH-CROSS', name: '反手斜线第三拍放小球', category: '第三拍放小球', groupKey: '反手斜线' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-FH-STRAIGHT', name: '正手直线截击', category: '截击', groupKey: '正手直线截击' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-FH-CROSS', name: '正手斜线截击', category: '截击', groupKey: '正手斜线截击' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-BH-STRAIGHT', name: '反手直线截击', category: '截击', groupKey: '反手直线截击' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-BH-CROSS', name: '反手斜线截击', category: '截击', groupKey: '反手斜线截击' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-FH-STRAIGHT', name: '正手直线落地击球', category: '落地击球', groupKey: '正手直线落地击球' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-FH-CROSS', name: '正手斜线落地击球', category: '落地击球', groupKey: '正手斜线落地击球' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-BH-STRAIGHT', name: '反手直线落地击球', category: '落地击球', groupKey: '反手直线落地击球' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-BH-CROSS', name: '反手斜线落地击球', category: '落地击球', groupKey: '反手斜线落地击球' },
  { requirement_id: 'IPTPA-L2-SKILL-RETURN-DEUCE', name: '接发球 · 右区（Deuce）', category: '接发球', groupKey: '接发球 · 右区（Deuce）' },
  { requirement_id: 'IPTPA-L2-SKILL-RETURN-AD', name: '接发球 · 左区（Ad）', category: '接发球', groupKey: '接发球 · 左区（Ad）' },
  { requirement_id: 'IPTPA-L2-SKILL-SERVE-DEUCE', name: '发球 · 右区（Deuce）', category: '发球', groupKey: '发球 · 右区（Deuce）' },
  { requirement_id: 'IPTPA-L2-SKILL-SERVE-AD', name: '发球 · 左区（Ad）', category: '发球', groupKey: '发球 · 左区（Ad）' },
  { requirement_id: 'IPTPA-L2-SKILL-OVERHEADS', name: '高压球', category: '专项球', groupKey: '高压球' },
  { requirement_id: 'IPTPA-L2-SKILL-OFFENSIVE-LOBS', name: '进攻挑高球（正手与反手）', category: '专项球', groupKey: '进攻挑高球（正手与反手）' },
]

export const GROUP_KEY_TO_REQUIREMENT: Record<string, string> = (() => {
  const map: Record<string, string> = { ...DROP_GROUP_TO_REQUIREMENT }
  for (const skill of IPTPA_SKILL_DISPLAY) {
    if (!(skill.groupKey in map)) map[skill.groupKey] = skill.requirement_id
  }
  return map
})()

export function skillDisplayForRequirement(requirementId: string): IptpaSkillDisplay | undefined {
  return IPTPA_SKILL_DISPLAY.find((skill) => skill.requirement_id === requirementId)
}

export function displayTrainingStatus(status: TrainingStatus): string {
  return {
    UNKNOWN: '待核实',
    UNTESTED: '尚未测试',
    BASELINE_MEASURED: '已建立基线',
    TRAINING: '训练中',
    READY_FOR_REVIEW: '待复核',
    EVIDENCE_CAPTURED: '已留存证据',
  }[status] ?? '待核实'
}

export function displayCertificationStatus(status: CertificationStatus): string {
  return {
    UNKNOWN: '待核实',
    NOT_STARTED: '尚未开始',
    IN_PROGRESS: '进行中',
    SUBMITTED: '已提交',
    NEEDS_REVISION: '需修改',
    PASSED: '官方已通过',
    FAILED: '未通过',
    EXEMPTED: '已豁免',
  }[status] ?? '待核实'
}

export function displaySourceStatus(status: CertificationRequirement['source_status']): string {
  return {
    CONFIRMED_OFFICIAL: '官方已确认',
    CONFIRMED_PERSONAL: '个人一手信息已确认',
    MAP_RECORDED_UNVERIFIED: '已记录，待个人核实',
    UNKNOWN: '待核实',
  }[status] ?? '待核实'
}

export function displayEvidenceClass(evidenceClass: EvidenceClass): string {
  return evidenceClass === 'CERTIFICATION_EVIDENCE' ? '官方证据' : '训练证据'
}

export function displayEvidenceType(evidenceType: EvidenceType): string {
  return {
    SELF_RECORDED: '本人记录',
    VIDEO: '视频',
    DIRECTOR_CONFIRMED: 'Director 已确认',
    OFFICIAL: '官方',
  }[evidenceType] ?? '本人记录'
}

export function derivedSkillTrainingStatus(requirement: CertificationRequirement): TrainingStatus {
  if (requirement.training_status === 'UNKNOWN' && requirement.evidence_available.length === 0
    && skillDisplayForRequirement(requirement.requirement_id)) {
    return 'UNTESTED'
  }
  return requirement.training_status
}

export function removeSessionEvidence(core: CertificationCore, sessionId: string): CertificationCore {
  const prefixes = [`session:${sessionId}:`, `legacy:${sessionId}:`]
  core.evidence = core.evidence.filter((item) => !prefixes.some((prefix) => item.evidence_id.startsWith(prefix)))
  for (const requirement of core.requirements) {
    requirement.evidence_available = requirement.evidence_available.filter((id) => !prefixes.some((prefix) => id.startsWith(prefix)))
    if (requirement.evidence_available.length === 0
      && (requirement.training_status === 'BASELINE_MEASURED' || requirement.training_status === 'TRAINING'
        || requirement.training_status === 'READY_FOR_REVIEW' || requirement.training_status === 'EVIDENCE_CAPTURED')) {
      requirement.training_status = 'UNTESTED'
    }
  }
  return core
}

const IPTPA_SKILLS: Array<[string, string]> = IPTPA_SKILL_DISPLAY.map((skill) => [skill.requirement_id, skill.name] as [string, string])

const PCI_REQUIREMENTS: Array<[string, string, CertificationRequirement['requirement_type']]> = [
  ['PCI-L2-COURSE-PATHWAY', '我的加速通道及获证条件', 'ELIGIBILITY'],
  ['PCI-L2-COURSE-VERSION', '已购课程版本', 'COURSE'],
  ['PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', '一级知识测试', 'ELIGIBILITY'],
  ['PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER', '一级评估作业豁免', 'ELIGIBILITY'],
  ['PCI-L2-COURSE-LESSONS', '二级课程章节与知识检查', 'COURSE'],
  ['PCI-L2-SUBMISSION-LESSON-PLAN', '课程教案（Lesson Plan）', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY', '难度调整（Adjusting Difficulty）', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-PPP', 'PPP 教学评估', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-QKOC', 'QKOC 评估', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-CHARTING', '比赛记录分析（Charting）', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-PLAYING-SKILLS', '球技评估（Playing Skills）', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-FINAL-PACKAGE', '最终评估材料 / 提交', 'SUBMISSION'],
  ['PCI-L2-CREDENTIAL-ISSUED', 'PCI 一级 + 二级证书颁发', 'CREDENTIAL'],
]

const IPTPA_OTHER_REQUIREMENTS: Array<[string, string, CertificationRequirement['requirement_type'], CertificationRequirement['source_status']]> = [
  ['IPTPA-L2-ELIGIBILITY-L1-CREDENTIAL', '一级证书', 'ELIGIBILITY', 'MAP_RECORDED_UNVERIFIED'],
  ['IPTPA-L2-ELIGIBILITY-MEMBERSHIP', '会员 / 报名资格', 'ELIGIBILITY', 'MAP_RECORDED_UNVERIFIED'],
  ['IPTPA-L2-SKILL-SEQUENCE-VERSION', '23 项技能测试', 'SKILL', 'CONFIRMED_OFFICIAL'],
  ['IPTPA-L2-TEACHING-OBSERVED-LESSON', '1 小时观摩教学课', 'TEACHING', 'CONFIRMED_OFFICIAL'],
  ['IPTPA-L2-ELIGIBILITY-WRITTEN-EXAM', '书面考试（Written Exam）', 'ELIGIBILITY', 'CONFIRMED_OFFICIAL'],
  ['IPTPA-L2-ADMIN-EXAM-BOOKING', '考试预约', 'ADMIN', 'MAP_RECORDED_UNVERIFIED'],
  ['IPTPA-L2-CREDENTIAL-ISSUED', '正式认证授予', 'CREDENTIAL', 'CONFIRMED_OFFICIAL'],
]

const DROP_IDS = new Set(Object.values(DROP_GROUP_TO_REQUIREMENT))
const IPTPA_SKILLS_URL = 'https://iptpa.com/level-2-skills.html'

function requirement(
  id: string,
  certification: Certification,
  name: string,
  type: CertificationRequirement['requirement_type'],
  sourceStatus: CertificationRequirement['source_status'],
  sourceFile: string,
  trainingStatus: TrainingStatus = 'UNKNOWN',
  nextAction = '核对个人账号 / 考次的一手信息',
): CertificationRequirement {
  const source: SourceReference[] = [
    { kind: 'REQUIREMENT_MAP', ref: sourceFile, locator: name },
  ]
  if (sourceStatus === 'CONFIRMED_OFFICIAL' && certification === 'IPTPA_L2' && type === 'SKILL') {
    source.push({ kind: 'OFFICIAL_SOURCE', ref: IPTPA_SKILLS_URL, locator: name })
  }
  if (id === 'IPTPA-L2-TEACHING-OBSERVED-LESSON') {
    source.push({ kind: 'OFFICIAL_SOURCE', ref: 'https://www.iptpa.com/certification.html', locator: name })
  }
  if (id === 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER') {
    source.push({
      kind: 'OFFICIAL_SOURCE',
      ref: 'https://www.pickleballcoachinginternational.com/collections/pci-accelerated-instructor-certification-program-level-2',
      locator: name,
    })
  }
  return {
    requirement_id: id,
    certification,
    requirement_name: name,
    requirement_type: type,
    source,
    source_status: sourceStatus,
    certification_status: 'UNKNOWN',
    training_status: trainingStatus,
    evidence_required: 'UNKNOWN',
    evidence_available: [],
    last_verified_at: 'UNKNOWN',
    next_action: DROP_IDS.has(id) ? '检查本机训练历史；必要时建立本地基线' : nextAction,
    blocking_reason: 'UNKNOWN',
    notes: id === 'IPTPA-L2-ELIGIBILITY-WRITTEN-EXAM'
      ? ['书面考试属于 L2；个人考试状态仍待核实。']
      : ['个人适用性与官方认证状态须由一手证据核实。'],
  }
}

function seedRequirements(): CertificationRequirement[] {
  const pci = PCI_REQUIREMENTS.map(([id, name, type]) => requirement(
    id,
    'PCI_L2',
    name,
    type,
    id === 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER' ? 'CONFIRMED_OFFICIAL' : 'MAP_RECORDED_UNVERIFIED',
    'outputs/PCI_L2_REQUIREMENT_MAP.md',
    'UNKNOWN',
    id === 'PCI-L2-COURSE-PATHWAY'
      ? '核对个人课程账户、加速通道邮件、期限与提交清单'
      : '在当前个人账户核对适用要求及真实状态',
  ))
  const iptpaSkills = IPTPA_SKILLS.map(([id, name]) => requirement(
    id,
    'IPTPA_L2',
    name,
    'SKILL',
    'CONFIRMED_OFFICIAL',
    'outputs/IPTPA_L2_REQUIREMENT_MAP.md',
    'UNTESTED',
    DROP_IDS.has(id) ? '检查本机训练历史；必要时建立本地基线' : '个人考次训练映射与判分口径待核',
  ))
  const other = IPTPA_OTHER_REQUIREMENTS.map(([id, name, type, sourceStatus]) => requirement(
    id,
    'IPTPA_L2',
    name,
    type,
    sourceStatus,
    'outputs/IPTPA_L2_REQUIREMENT_MAP.md',
    'UNKNOWN',
    id === 'IPTPA-L2-ELIGIBILITY-WRITTEN-EXAM'
      ? '核对个人书面考试状态；个人状态仍待核实'
      : '核对个人账户 / Director 的当前记录',
  ))
  return [...pci, ...iptpaSkills, ...other]
}

function isUsableGroup(group: LegacyGroup): boolean {
  return Number.isInteger(group.success) && group.success !== null && group.success >= 0 && group.success <= 10
}

function legacyEvidenceId(sessionId: string, requirementId: string): string {
  return `legacy:${sessionId}:${requirementId}`
}

function applyDropHistory(core: CertificationCore, sessions: LegacySession[]): void {
  const byId = new Map(core.requirements.map((item) => [item.requirement_id, item]))
  for (const item of core.requirements) {
    if (DROP_IDS.has(item.requirement_id)) item.training_status = 'UNTESTED'
  }

  for (const session of sessions) {
    if (session.kind !== 'iptpa' || !Array.isArray(session.groups)) continue
    for (const group of session.groups) {
      const requirementId = DROP_GROUP_TO_REQUIREMENT[group.name]
      const item = requirementId ? byId.get(requirementId) : undefined
      if (!item || !isUsableGroup(group)) continue
      const evidenceId = legacyEvidenceId(session.id, requirementId)
      if (!core.evidence.some((evidence) => evidence.evidence_id === evidenceId)) {
        core.evidence.push({
          evidence_id: evidenceId,
          evidence_type: 'SELF_RECORDED',
          evidence_class: 'TRAINING_EVIDENCE',
          captured_at: session.completedAt ?? session.startedAt,
          source_ref: `IndexedDB state/app sessions[${session.id}]`,
          captured_by: 'Holiis',
          subject: `${group.name}：${group.success}/10`,
          requirement_ids: [requirementId],
          verification_status: 'UNVERIFIED',
          authority: '用户本机历史训练记录',
          notes: ['旧 Session 原记录未改写；仅按明确的方向映射引用为训练证据，不构成官方认证证据。'],
        })
      }
      if (!item.evidence_available.includes(evidenceId)) item.evidence_available.push(evidenceId)
      item.training_status = 'BASELINE_MEASURED'
      item.next_action = '以之后的真实训练继续更新；本地记录不能代表 Director 正式评分'
    }
  }
}

export function createCertificationCore(sessions: LegacySession[]): CertificationCore {
  const core: CertificationCore = {
    schema_version: '0.1',
    requirements: seedRequirements(),
    evidence: [],
    requirementEvents: [],
  }
  applyDropHistory(core, sessions)
  return core
}

export function isValidCertificationCore(value: unknown): value is CertificationCore {
  if (!value || typeof value !== 'object') return false
  const core = value as Partial<CertificationCore>
  const certificationStatuses = new Set<CertificationStatus>([
    'UNKNOWN', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'PASSED', 'FAILED', 'EXEMPTED',
  ])
  const trainingStatuses = new Set<TrainingStatus>([
    'UNKNOWN', 'UNTESTED', 'BASELINE_MEASURED', 'TRAINING', 'READY_FOR_REVIEW', 'EVIDENCE_CAPTURED',
  ])
  const evidenceTypes = new Set<EvidenceType>(['SELF_RECORDED', 'VIDEO', 'DIRECTOR_CONFIRMED', 'OFFICIAL'])
  const evidenceClasses = new Set<EvidenceClass>(['TRAINING_EVIDENCE', 'CERTIFICATION_EVIDENCE'])
  const sourceStatuses = new Set(['CONFIRMED_OFFICIAL', 'CONFIRMED_PERSONAL', 'MAP_RECORDED_UNVERIFIED', 'UNKNOWN'])
  const validRequirements = Array.isArray(core.requirements) && core.requirements.every((item) =>
    Boolean(item)
      && typeof item.requirement_id === 'string'
      && (item.certification === 'PCI_L2' || item.certification === 'IPTPA_L2')
      && typeof item.requirement_name === 'string'
      && Array.isArray(item.source)
      && item.source.every((source) => typeof source.ref === 'string' && typeof source.locator === 'string')
      && sourceStatuses.has(item.source_status)
      && certificationStatuses.has(item.certification_status)
      && trainingStatuses.has(item.training_status)
      && (item.evidence_required === 'UNKNOWN' || Array.isArray(item.evidence_required))
      && Array.isArray(item.evidence_available)
      && item.evidence_available.every((id) => typeof id === 'string')
      && typeof item.last_verified_at === 'string'
      && typeof item.next_action === 'string'
      && typeof item.blocking_reason === 'string'
      && Array.isArray(item.notes))
  const validEvidence = Array.isArray(core.evidence) && core.evidence.every((item) =>
    Boolean(item)
      && typeof item.evidence_id === 'string'
      && evidenceTypes.has(item.evidence_type)
      && evidenceClasses.has(item.evidence_class)
      && typeof item.captured_at === 'string'
      && typeof item.source_ref === 'string'
      && Array.isArray(item.requirement_ids)
      && Array.isArray(item.notes))
  return core.schema_version === '0.1'
    && validRequirements
    && validEvidence
    && Array.isArray(core.requirementEvents)
}

export function refreshCertificationCore(existing: CertificationCore): CertificationCore {
  const seed = seedRequirements()
  const byId = new Map(existing.requirements.map((item) => [item.requirement_id, item]))
  const requirements = seed.map((seedItem) => {
    const old = byId.get(seedItem.requirement_id)
    if (!old) return seedItem
    const merged: CertificationRequirement = {
      ...seedItem,
      certification_status: old.certification_status,
      training_status: old.training_status,
      evidence_available: [...old.evidence_available],
      last_verified_at: old.last_verified_at,
      blocking_reason: old.blocking_reason,
    }
    if (skillDisplayForRequirement(merged.requirement_id)
      && merged.training_status === 'UNKNOWN' && merged.evidence_available.length === 0) {
      merged.training_status = 'UNTESTED'
    }
    return merged
  })
  for (const old of existing.requirements) {
    if (!requirements.some((item) => item.requirement_id === old.requirement_id)) requirements.push(old)
  }
  const refreshed: CertificationCore = {
    schema_version: '0.1',
    requirements,
    evidence: [...existing.evidence],
    requirementEvents: [...existing.requirementEvents],
  }
  if (!isValidCertificationCore(refreshed)) {
    throw new Error('BLOCKED_MIGRATION_RISK: 刷新后的 certificationCore 格式无法识别，未写入数据')
  }
  return refreshed
}

export function migrateAppRecord(raw: unknown, defaults: Omit<AppRecord, 'certificationCore'>): AppRecord {
  if (raw !== undefined && raw !== null && (typeof raw !== 'object' || Array.isArray(raw))) {
    throw new Error('BLOCKED_MIGRATION_RISK: state/app 不是可安全扩展的对象')
  }
  const original = (raw ?? {}) as Record<string, unknown>
  if ('certificationCore' in original && !isValidCertificationCore(original.certificationCore)) {
    throw new Error('BLOCKED_MIGRATION_RISK: 已有 certificationCore 格式无法识别，未写入数据')
  }
  if (original.sessions !== undefined && !Array.isArray(original.sessions)) {
    throw new Error('BLOCKED_MIGRATION_RISK: sessions 不是数组，未写入数据')
  }
  const record = { ...defaults, ...original } as AppRecord
  if (!record.certificationCore) {
    record.certificationCore = createCertificationCore(record.sessions)
  } else {
    record.certificationCore = refreshCertificationCore(record.certificationCore)
  }
  return record
}

export function appendTrainingSessionEvidence(
  core: CertificationCore,
  session: LegacySession,
): { core: CertificationCore; session: LegacySession } {
  const nextCore: CertificationCore = {
    ...core,
    requirements: core.requirements.map((item) => ({ ...item, evidence_available: [...item.evidence_available], notes: [...item.notes] })),
    evidence: [...core.evidence],
    requirementEvents: [...core.requirementEvents],
  }
  const nextSession = { ...session, requirementIds: [] as string[], evidenceIds: [] as string[] }
  if (session.kind !== 'iptpa') return { core: nextCore, session: nextSession }

  const requirements = new Map(nextCore.requirements.map((item) => [item.requirement_id, item]))
  for (const group of session.groups) {
    const requirementId = GROUP_KEY_TO_REQUIREMENT[group.name]
    const item = requirementId ? requirements.get(requirementId) : undefined
    if (!item || !isUsableGroup(group)) continue
    const evidenceId = `session:${session.id}:${requirementId}`
    const evidence: TrainingEvidence = {
      evidence_id: evidenceId,
      evidence_type: 'SELF_RECORDED',
      evidence_class: 'TRAINING_EVIDENCE',
      captured_at: session.completedAt ?? session.startedAt,
      source_ref: `Session ${session.id}`,
      captured_by: 'Holiis',
      subject: `${group.name}：${group.success}/10`,
      requirement_ids: [requirementId],
      verification_status: 'UNVERIFIED',
      authority: '用户本机训练记录',
      notes: ['训练结果不得改变 CERTIFICATION_STATUS。'],
    }
    nextCore.evidence.push(evidence)
    item.evidence_available.push(evidenceId)
    if (item.training_status === 'BASELINE_MEASURED' || item.training_status === 'TRAINING') {
      item.training_status = 'TRAINING'
    } else {
      item.training_status = 'BASELINE_MEASURED'
    }
    item.next_action = '继续针对性训练；此记录不是 IPTPA 官方评分'
    nextSession.requirementIds.push(requirementId)
    nextSession.evidenceIds.push(evidenceId)
  }
  return { core: nextCore, session: nextSession }
}
