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

const IPTPA_SKILLS: Array<[string, string]> = [
  ['IPTPA-L2-SKILL-DINK-FH-STRAIGHT', '正手直线丁克'],
  ['IPTPA-L2-SKILL-DINK-FH-CROSS', '正手斜线丁克'],
  ['IPTPA-L2-SKILL-DINK-BH-STRAIGHT', '反手直线丁克'],
  ['IPTPA-L2-SKILL-DINK-BH-CROSS', '反手斜线丁克'],
  ['IPTPA-L2-SKILL-WINDSHIELD-WIPER-DINKS', 'Windshield-wiper dinks'],
  ...Object.entries(DROP_GROUP_TO_REQUIREMENT).map(([name, id]) => [id, name] as [string, string]),
  ['IPTPA-L2-SKILL-VOLLEY-FH-STRAIGHT', '正手直线 Volley'],
  ['IPTPA-L2-SKILL-VOLLEY-FH-CROSS', '正手斜线 Volley'],
  ['IPTPA-L2-SKILL-VOLLEY-BH-STRAIGHT', '反手直线 Volley'],
  ['IPTPA-L2-SKILL-VOLLEY-BH-CROSS', '反手斜线 Volley'],
  ['IPTPA-L2-SKILL-GROUNDSTROKE-FH-STRAIGHT', '正手直线 Groundstroke'],
  ['IPTPA-L2-SKILL-GROUNDSTROKE-FH-CROSS', '正手斜线 Groundstroke'],
  ['IPTPA-L2-SKILL-GROUNDSTROKE-BH-STRAIGHT', '反手直线 Groundstroke'],
  ['IPTPA-L2-SKILL-GROUNDSTROKE-BH-CROSS', '反手斜线 Groundstroke'],
  ['IPTPA-L2-SKILL-RETURN-DEUCE', 'Return of Serve · Deuce court'],
  ['IPTPA-L2-SKILL-RETURN-AD', 'Return of Serve · Ad court'],
  ['IPTPA-L2-SKILL-SERVE-DEUCE', 'Serve · Deuce court'],
  ['IPTPA-L2-SKILL-SERVE-AD', 'Serve · Ad court'],
  ['IPTPA-L2-SKILL-OVERHEADS', 'Overheads'],
  ['IPTPA-L2-SKILL-OFFENSIVE-LOBS', 'Offensive lobs（forehand & backhand）'],
]

const PCI_REQUIREMENTS: Array<[string, string, CertificationRequirement['requirement_type']]> = [
  ['PCI-L2-COURSE-PATHWAY', 'Holiis 的 Accelerated Pathway 及获证条件', 'ELIGIBILITY'],
  ['PCI-L2-COURSE-VERSION', '已购课程版本与公开目录的对应关系', 'COURSE'],
  ['PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'Accelerated Pathway · L1 Knowledge Test', 'ELIGIBILITY'],
  ['PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER', 'Accelerated Pathway · L1 evaluation assignments 豁免', 'ELIGIBILITY'],
  ['PCI-L2-COURSE-LESSONS', 'L2 课程章节与知识检查', 'COURSE'],
  ['PCI-L2-SUBMISSION-LESSON-PLAN', 'Lesson Plan', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY', 'Adjusting Difficulty', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-PPP', 'PPP teaching evaluation', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-QKOC', 'QKOC evaluation', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-CHARTING', 'Charting', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-PLAYING-SKILLS', 'Playing Skills evaluation', 'SUBMISSION'],
  ['PCI-L2-SUBMISSION-FINAL-PACKAGE', 'Final evaluation package / submission', 'SUBMISSION'],
  ['PCI-L2-CREDENTIAL-ISSUED', 'PCI L1 + L2 credential issued（Accelerated Pathway）', 'CREDENTIAL'],
]

const IPTPA_OTHER_REQUIREMENTS: Array<[string, string, CertificationRequirement['requirement_type'], CertificationRequirement['source_status']]> = [
  ['IPTPA-L2-ELIGIBILITY-L1-CREDENTIAL', 'IPTPA Level I 证书', 'ELIGIBILITY', 'MAP_RECORDED_UNVERIFIED'],
  ['IPTPA-L2-ELIGIBILITY-MEMBERSHIP', '当前会员有效性 / L2 报名资格', 'ELIGIBILITY', 'MAP_RECORDED_UNVERIFIED'],
  ['IPTPA-L2-SKILL-SEQUENCE-VERSION', '23 项技能测试清单与考次版本', 'SKILL', 'CONFIRMED_OFFICIAL'],
  ['IPTPA-L2-TEACHING-OBSERVED-LESSON', 'Observed Teaching Lesson', 'TEACHING', 'CONFIRMED_OFFICIAL'],
  ['IPTPA-L2-ELIGIBILITY-WRITTEN-EXAM', 'Written exam / assessment applicability', 'ELIGIBILITY', 'UNKNOWN'],
  ['IPTPA-L2-ADMIN-EXAM-BOOKING', '考试预约、费用与实际考次', 'ADMIN', 'MAP_RECORDED_UNVERIFIED'],
  ['IPTPA-L2-CREDENTIAL-ISSUED', 'IPTPA L2 正式认证授予', 'CREDENTIAL', 'CONFIRMED_OFFICIAL'],
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
    notes: ['个人适用性与官方认证状态须由一手证据核实。'],
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
      ? '核对个人课程账户、Accelerated Pathway 邮件、期限与提交清单'
      : '在当前 portal 核对个人适用要求及真实状态',
  ))
  const iptpaSkills = IPTPA_SKILLS.map(([id, name]) => requirement(
    id,
    'IPTPA_L2',
    name,
    'SKILL',
    'CONFIRMED_OFFICIAL',
    'outputs/IPTPA_L2_REQUIREMENT_MAP.md',
    DROP_IDS.has(id) ? 'UNKNOWN' : 'UNKNOWN',
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
      ? '从 portal / Director 确认本次是否适用'
      : '核对个人 portal / Director 的当前记录',
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
    const requirementId = DROP_GROUP_TO_REQUIREMENT[group.name]
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
