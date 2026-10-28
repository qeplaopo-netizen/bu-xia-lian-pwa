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
  skill_requirement_id?: string
  skill_name?: string
  conditionSnapshot?: SessionConditionSnapshot
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
  pciTaskStatus?: Record<string, PciTaskStatus>
  pciTaskEvidence?: PciTaskEvidence[]
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

export type TestConditionStatus = 'UNVERIFIED' | 'LOCAL_PROTOCOL' | 'DIRECTOR_VERIFIED' | 'OFFICIAL_VERIFIED'

export type IptpaProtocol = {
  requirement_id: string
  skill_name: string
  source_file: string
  condition_status: TestConditionStatus
  setup: string
  feed: string
  target: string
  success_definition: string
  invalid_definition: string
  fundamental_cues: string
  source_authority: string
  notes: string
}

const LOCAL_PROTOCOL_SOURCE = '斯波阿斯SS-C2401A发球机4周训练计划.md + 技能测试与观摩教学课评估清单.md'
const LOCAL_PROTOCOL_AUTHORITY = '本地训练计划（用户备考资料，非官方原文、非 Director 核实）'
const LOCAL_SUCCESS = '10 球中至少 8 球落入目标区'
const LOCAL_INVALID = '未在本地资料中明确定义'

export const IPTPA_PROTOCOL_MAP: IptpaProtocol[] = [
  { requirement_id: 'IPTPA-L2-SKILL-DINK-FH-STRAIGHT', skill_name: '正手直线网前小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器在对面 NVZ 后方或中场；你站 NVZ 线附近，正手前方接球', feed: '近网落点 + 定点球，低速低弧线', target: '厨房区前半段靠近球网，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '拍面稳，身前小钟摆，打完马上准备', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-DINK-FH-CROSS', skill_name: '正手斜线网前小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂正手侧；你站 NVZ 线附近', feed: '近网落点 + 交叉球，先定点再斜线', target: '对角厨房区前半段靠近球网', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '身体跟过去，拍面送到斜线，不加速', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-DINK-BH-STRAIGHT', skill_name: '反手直线网前小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器低速喂反手前方；你站 NVZ 线附近', feed: '近网落点 + 定点球', target: '厨房区前半段靠近球网，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '反手在身前接球，拍面安静，打完回中立', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-DINK-BH-CROSS', skill_name: '反手斜线网前小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂反手侧；你站 NVZ 线附近', feed: '近网落点 + 交叉球，先慢速定点再斜线', target: '对角厨房区前半段靠近球网', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '脚先到位，拍面朝目标，小幅送球', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-WINDSHIELD-WIPER-DINKS', skill_name: '横向扫动网前小球（Windshield-wiper）', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '你从中间开始；机器中-左-中-右循环', feed: '两线球 + 可编程球，宽度从窄两线开始', target: '每球都落厨房区前半段靠近球网', success_definition: '10 组中至少 8 组成功，每组包含左到右和右到左移动', invalid_definition: LOCAL_INVALID, fundamental_cues: '中间开始，侧滑步像雨刷，身体跟球不后退', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-FH-STRAIGHT', skill_name: '正手直线第三拍放小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器在对面底线或中后场；你从中后场吊球', feed: '定点球 + 深浅球', target: '回球落入对面厨房区前半段靠近球网，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '慢节奏吊进厨房，身体前进但拍不甩', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-FH-CROSS', skill_name: '正手斜线第三拍放小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂正手中后场；你从中后场吊球', feed: '深浅球 + 交叉球，第二组加入斜线角度', target: '对角厨房区前半段靠近球网', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '弧线安全过网，落点短，给自己上网时间', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-BH-STRAIGHT', skill_name: '反手直线第三拍放小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂反手中后场', feed: '定点球 + 深浅球，先不加旋转', target: '厨房区前半段靠近球网，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '肩膀带拍，击球在身前，球落短', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-DROP-BH-CROSS', skill_name: '反手斜线第三拍放小球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂反手中后场', feed: '深浅球 + 交叉球，目标改为斜线厨房', target: '对角厨房区前半段靠近球网', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '先稳住身体，再用小弧线送到斜线', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-FH-STRAIGHT', skill_name: '正手直线截击', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '你站 NVZ 线后；机器在对面中后场，喂胸口到正手侧', feed: '截击球 + 定点球', target: '后场 1/3，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '短挡短推，拍面稳，球要深', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-FH-CROSS', skill_name: '正手斜线截击', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '你站 NVZ 线后；机器喂正手侧', feed: '截击球 + 交叉球，第二组加入两线移动', target: '对角后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '角度够用就行，深度第一，打完回拍', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-BH-STRAIGHT', skill_name: '反手直线截击', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '你站 NVZ 线后；机器喂反手胸前，速度中低', feed: '截击球 + 定点球', target: '后场 1/3，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '拍头立住，身前挡深，马上准备', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-VOLLEY-BH-CROSS', skill_name: '反手斜线截击', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '你站 NVZ 线后；机器喂反手侧', feed: '截击球 + 交叉球，目标改斜线深区', target: '对角后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '脚先到，拍面顶住，深到后场', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-FH-STRAIGHT', skill_name: '正手直线落地击球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器在对面底线或中线；你站底线，正手深球', feed: '平击球 + 定点球', target: '后场 1/3，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '早准备，身前击球，穿过目标区', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-FH-CROSS', skill_name: '正手斜线落地击球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂正手深球；你站底线', feed: '平击球 + 交叉球，第二组加入轻微上旋', target: '对角后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '完整转体，打高过网，深度优先', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-BH-STRAIGHT', skill_name: '反手直线落地击球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂反手深球；你站底线', feed: '平击球 + 定点球，先不加随机', target: '后场 1/3，直线方向', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '肩髋带动，拍面穿过球，打深', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-GROUNDSTROKE-BH-CROSS', skill_name: '反手斜线落地击球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂反手深球；你站底线', feed: '平击球 + 交叉球，目标对角深区', target: '对角后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '重心向前，稳定过网，落到深区', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-RETURN-DEUCE', skill_name: '接发球 · 右区（Deuce）', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器在对面右边发球位；你站右边接发区', feed: '平击球 + 上/下旋球 + 定点球，模拟发球', target: '回球到对方后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '先分腿垫步，看清旋转，接深不抢攻', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-RETURN-AD', skill_name: '接发球 · 左区（Ad）', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器在对面左边发球位；你站左边接发区', feed: '平击球 + 上/下旋球 + 定点球，模拟发球', target: '回球到对方后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '深回球，稳定上步，准备第三拍', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-SERVE-DEUCE', skill_name: '发球 · 右区（Deuce）', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '你站右边发球区；不用机器', feed: '自发球', target: '发到对方后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '节奏固定，触球干净，深度第一', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '不用机器，自发球' },
  { requirement_id: 'IPTPA-L2-SKILL-SERVE-AD', skill_name: '发球 · 左区（Ad）', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '你站左边发球区；不用机器', feed: '自发球', target: '发到对方后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '同一个节奏，同一个高度，打深区', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '不用机器，自发球' },
  { requirement_id: 'IPTPA-L2-SKILL-OVERHEADS', skill_name: '高压球', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器在对面中后场；你站场内，喂高球到头顶前方', feed: '高吊球，从低高度逐步升高', target: '后场 1/3 或深区空档，优先安全落点', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '侧身找球，左手指球，向下控制', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '' },
  { requirement_id: 'IPTPA-L2-SKILL-OFFENSIVE-LOBS', skill_name: '进攻挑高球（正手与反手）', source_file: LOCAL_PROTOCOL_SOURCE, condition_status: 'LOCAL_PROTOCOL', setup: '机器喂短球或中性球到你 NVZ 线附近；你站 NVZ 线附近', feed: '近网落点 + 定点球 + 高吊球微调', target: '高度足够，并落到对方后场 1/3', success_definition: LOCAL_SUCCESS, invalid_definition: LOCAL_INVALID, fundamental_cues: '先过人，再落深，挑完立刻回位', source_authority: LOCAL_PROTOCOL_AUTHORITY, notes: '正手 5 球、反手 5 球；高度不够或落中场都不算' },
]

export function protocolForRequirement(requirementId: string): IptpaProtocol | undefined {
  return IPTPA_PROTOCOL_MAP.find((item) => item.requirement_id === requirementId)
}

export function displayTestConditionStatus(status: TestConditionStatus): string {
  return {
    UNVERIFIED: '未核实',
    LOCAL_PROTOCOL: '本地训练协议',
    DIRECTOR_VERIFIED: 'Director 已核实',
    OFFICIAL_VERIFIED: '官方已核实',
  }[status] ?? '未核实'
}

export function iptpaResultMessage(success: number, validBalls: number, conditionStatus: TestConditionStatus): string {
  if (validBalls < 10) {
    return `本次本地训练成绩：${success}/${validBalls} 有效球。有效球不足 10 球，不直接与 8/10 比较。`
  }
  if (conditionStatus === 'DIRECTOR_VERIFIED' || conditionStatus === 'OFFICIAL_VERIFIED') {
    return success >= 8 ? '本次数量达到 IPTPA 8/10 数量门槛。' : '本次数量未达到 8/10，继续训练。'
  }
  return success >= 8
    ? '本次本地训练成绩：8/10。达到本地记录的 8/10 水平，但当前训练条件尚未与正式考核条件核实。'
    : '本次数量未达到 8/10，继续训练。'
}

export type SessionConditionSnapshot = {
  test_condition_status: TestConditionStatus
  protocol_id: string
  protocol_version: string
  feed_source: string
  machine_name: string
  machine_speed: string
  machine_interval: string
  machine_spin: string
  feed_target: string
  player_start_position: string
  target_definition: string
  success_definition: string
  notes: string
}

export function buildSessionConditionSnapshot(
  settings: AppRecord['settings'],
  protocol: IptpaProtocol | undefined,
): SessionConditionSnapshot {
  return {
    test_condition_status: protocol?.condition_status ?? 'UNVERIFIED',
    protocol_id: protocol?.requirement_id ?? '',
    protocol_version: '',
    feed_source: settings.name ? `发球机：${settings.name}` : '未记录',
    machine_name: settings.name,
    machine_speed: settings.speed,
    machine_interval: settings.interval,
    machine_spin: '',
    feed_target: settings.target,
    player_start_position: protocol?.setup ?? '',
    target_definition: protocol?.target ?? '',
    success_definition: protocol?.success_definition ?? '',
    notes: settings.notes,
  }
}

export type PciTaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY' | 'SUBMITTED' | 'NEEDS_REVISION' | 'DONE_LOCAL' | 'OFFICIAL_CONFIRMED'

export function displayPciTaskStatus(status: PciTaskStatus): string {
  return {
    NOT_STARTED: '未开始',
    IN_PROGRESS: '进行中',
    READY: '已准备',
    SUBMITTED: '已提交',
    NEEDS_REVISION: '需修改',
    DONE_LOCAL: '本地已完成',
    OFFICIAL_CONFIRMED: '官方已确认',
  }[status] ?? '未开始'
}

export type PciTaskEvidence = {
  evidence_id: string
  task_id: string
  evidence_type: string
  local_path: string
  note: string
  url: string
  created_at: string
  status: string
  source: string
}

export const PCI_BLOCKER_IDS = ['PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER']

export const PCI_TASK_ORDER = [
  'PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER', 'PCI-L2-COURSE-LESSONS',
  'PCI-L2-SUBMISSION-LESSON-PLAN', 'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY', 'PCI-L2-SUBMISSION-PPP', 'PCI-L2-SUBMISSION-QKOC', 'PCI-L2-SUBMISSION-CHARTING', 'PCI-L2-SUBMISSION-PLAYING-SKILLS',
  'PCI-L2-SUBMISSION-FINAL-PACKAGE', 'PCI-L2-CREDENTIAL-ISSUED',
]

export type NextTaskRecommendation =
  | { kind: 'pci'; requirement_id: string; reason: string }
  | { kind: 'iptpa'; requirement_id: string; reason: string }

export function recommendNextTask(
  core: CertificationCore,
  pciTaskStatus: Record<string, PciTaskStatus>,
): NextTaskRecommendation | null {
  const pciStatus = (id: string): PciTaskStatus => pciTaskStatus[id] ?? 'NOT_STARTED'
  for (const id of PCI_BLOCKER_IDS) {
    if (pciStatus(id) !== 'DONE_LOCAL' && pciStatus(id) !== 'OFFICIAL_CONFIRMED') {
      return { kind: 'pci', requirement_id: id, reason: '因为这是当前最早阻塞 PCI 后续任务的一项。' }
    }
  }
  for (const id of PCI_TASK_ORDER) {
    const status = pciStatus(id)
    if (status === 'IN_PROGRESS' || status === 'READY') {
      return { kind: 'pci', requirement_id: id, reason: '因为这项正在进行中，先把它推进完。' }
    }
  }
  const byId = new Map(core.requirements.map((item) => [item.requirement_id, item]))
  for (const skill of IPTPA_SKILL_DISPLAY) {
    const requirement = byId.get(skill.requirement_id)
    if (requirement && derivedSkillTrainingStatus(requirement) === 'UNTESTED') {
      return { kind: 'iptpa', requirement_id: skill.requirement_id, reason: '因为 IPTPA 还有尚未建立基线的技能，先从第一项未测试技能开始。' }
    }
  }
  let best: { skill: (typeof IPTPA_SKILL_DISPLAY)[number]; count: number } | null = null
  for (const skill of IPTPA_SKILL_DISPLAY) {
    const requirement = byId.get(skill.requirement_id)
    if (!requirement) continue
    const count = requirement.evidence_available.length
    if (!best || count < best.count) best = { skill, count }
  }
  if (best) {
    return { kind: 'iptpa', requirement_id: best.skill.requirement_id, reason: '因为这项的训练证据最少，最值得补一次。' }
  }
  return null
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
  if (requirement.training_status === 'READY_FOR_REVIEW' || requirement.training_status === 'EVIDENCE_CAPTURED') {
    return requirement.training_status
  }
  if (!skillDisplayForRequirement(requirement.requirement_id)) {
    return requirement.training_status
  }
  const count = requirement.evidence_available.length
  if (count === 0) return 'UNTESTED'
  if (count === 1) return 'BASELINE_MEASURED'
  return 'TRAINING'
}

export function removeSessionEvidence(core: CertificationCore, sessionId: string): CertificationCore {
  const prefixes = [`session:${sessionId}:`, `legacy:${sessionId}:`]
  core.evidence = core.evidence.filter((item) => !prefixes.some((prefix) => item.evidence_id.startsWith(prefix)))
  for (const requirement of core.requirements) {
    requirement.evidence_available = requirement.evidence_available.filter((id) => !prefixes.some((prefix) => id.startsWith(prefix)))
    if (requirement.training_status === 'READY_FOR_REVIEW' || requirement.training_status === 'EVIDENCE_CAPTURED') {
      continue
    }
    requirement.training_status = derivedSkillTrainingStatus(requirement)
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
    if (skillDisplayForRequirement(merged.requirement_id)) {
      merged.training_status = derivedSkillTrainingStatus(merged)
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
  if (!record.pciTaskStatus || typeof record.pciTaskStatus !== 'object' || Array.isArray(record.pciTaskStatus)) {
    record.pciTaskStatus = {}
  }
  if (!Array.isArray(record.pciTaskEvidence)) {
    record.pciTaskEvidence = []
  }
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
    if (item.training_status !== 'READY_FOR_REVIEW' && item.training_status !== 'EVIDENCE_CAPTURED') {
      item.training_status = derivedSkillTrainingStatus(item)
    }
    item.next_action = '继续针对性训练；此记录不是 IPTPA 官方评分'
    nextSession.requirementIds.push(requirementId)
    nextSession.evidenceIds.push(evidenceId)
  }
  return { core: nextCore, session: nextSession }
}
