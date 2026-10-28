import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appendTrainingSessionEvidence,
  buildSessionConditionSnapshot,
  createCertificationCore,
  derivedSkillTrainingStatus,
  displayPciTaskStatus,
  displayTestConditionStatus,
  IPTPA_PROTOCOL_MAP,
  IPTPA_SKILL_DISPLAY,
  iptpaResultMessage,
  migrateAppRecord,
  protocolForRequirement,
  recommendNextTask,
  removeSessionEvidence,
} from '../src/certification-core.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaults = {
  settings: { name: '默认设备', speed: '', interval: '', target: '', notes: '' },
  sessions: [],
  onboardingSeen: false,
}
const settings = { name: '斯波阿斯', speed: '5 档', interval: '4 秒', target: '厨房区前半段', notes: '低速' }

function singleSession(id, groupName, success = 8, invalid = 0, unclear = 0) {
  return {
    id,
    kind: 'iptpa',
    startedAt: '2026-10-28T11:00:00.000Z',
    completedAt: '2026-10-28T11:10:00.000Z',
    groups: [{ name: groupName, success, unclear, invalid, markers: [] }],
  }
}

// G1: unverified / local 8/10 must not claim the official threshold
test('G1 unverified and local-protocol 8/10 never show the official threshold', () => {
  for (const status of ['UNVERIFIED', 'LOCAL_PROTOCOL']) {
    const message = iptpaResultMessage(8, 10, status)
    assert.ok(message.includes('本次本地训练成绩：8/10'), status)
    assert.ok(message.includes('尚未与正式考核条件核实'), status)
    assert.ok(!message.includes('达到 IPTPA 8/10 数量门槛'), status)
    assert.ok(!message.includes('达到官方数量门槛'), status)
  }
})

// G2: verified conditions may show the official 8/10 threshold, still with the Director disclaimer in UI
test('G2 verified conditions may show the official 8/10 threshold', () => {
  for (const status of ['DIRECTOR_VERIFIED', 'OFFICIAL_VERIFIED']) {
    assert.equal(iptpaResultMessage(8, 10, status), '本次数量达到 IPTPA 8/10 数量门槛。')
    assert.equal(iptpaResultMessage(7, 10, status), '本次数量未达到 8/10，继续训练。')
  }
})

// G3 + G4: session snapshot copies current settings and later settings changes cannot rewrite it
test('G3/G4 session snapshot copies current settings and is immutable to later settings changes', () => {
  const protocol = protocolForRequirement('IPTPA-L2-SKILL-DINK-FH-STRAIGHT')
  const snapshot = buildSessionConditionSnapshot(settings, protocol)
  assert.equal(snapshot.test_condition_status, 'LOCAL_PROTOCOL')
  assert.equal(snapshot.machine_name, '斯波阿斯')
  assert.equal(snapshot.machine_speed, '5 档')
  assert.equal(snapshot.machine_interval, '4 秒')
  assert.equal(snapshot.feed_target, '厨房区前半段')
  assert.equal(snapshot.target_definition, '厨房区前半段靠近球网，直线方向')
  assert.equal(snapshot.success_definition, '10 球中至少 8 球落入目标区')
  assert.equal(snapshot.protocol_id, 'IPTPA-L2-SKILL-DINK-FH-STRAIGHT')
  const later = { ...settings, name: '另一台机器', speed: '9 档' }
  const laterSnapshot = buildSessionConditionSnapshot(later, protocol)
  assert.notEqual(laterSnapshot.machine_name, snapshot.machine_name)
  assert.equal(snapshot.machine_name, '斯波阿斯')
  const noProtocol = buildSessionConditionSnapshot(settings, undefined)
  assert.equal(noProtocol.test_condition_status, 'UNVERIFIED')
  assert.equal(noProtocol.protocol_id, '')
})

// G5: invalid feeds are excluded from the denominator
test('G5 invalid feeds and unclear balls are excluded from the denominator', () => {
  const message = iptpaResultMessage(7, 9, 'LOCAL_PROTOCOL')
  assert.ok(message.includes('7/9 有效球'), message)
  assert.ok(message.includes('不直接与 8/10 比较'), message)
  const full = iptpaResultMessage(8, 10, 'LOCAL_PROTOCOL')
  assert.ok(full.includes('8/10'), full)
})

// G6/G7/G8/G9: evidence-count derived status, including delete rollback
test('G6/G7/G8/G9 evidence count derives status and delete rolls it back', () => {
  const skill = IPTPA_SKILL_DISPLAY[0]
  const first = appendTrainingSessionEvidence(createCertificationCore([]), singleSession('g6-first', skill.groupKey, 8))
  let requirement = first.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  assert.equal(derivedSkillTrainingStatus(requirement), 'BASELINE_MEASURED')
  const second = appendTrainingSessionEvidence(first.core, singleSession('g7-second', skill.groupKey, 9))
  requirement = second.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  assert.equal(derivedSkillTrainingStatus(requirement), 'TRAINING')
  removeSessionEvidence(second.core, 'g7-second')
  requirement = second.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  assert.equal(derivedSkillTrainingStatus(requirement), 'BASELINE_MEASURED')
  removeSessionEvidence(second.core, 'g6-first')
  requirement = second.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  assert.equal(derivedSkillTrainingStatus(requirement), 'UNTESTED')
})

// A6 advanced statuses are not overwritten by count logic
test('A6 READY_FOR_REVIEW and EVIDENCE_CAPTURED are preserved by derived status', () => {
  const core = createCertificationCore([])
  const requirement = core.requirements.find((item) => item.requirement_id === IPTPA_SKILL_DISPLAY[0].requirement_id)
  requirement.training_status = 'READY_FOR_REVIEW'
  requirement.evidence_available = []
  assert.equal(derivedSkillTrainingStatus(requirement), 'READY_FOR_REVIEW')
  requirement.training_status = 'EVIDENCE_CAPTURED'
  requirement.evidence_available = ['x', 'y']
  assert.equal(derivedSkillTrainingStatus(requirement), 'EVIDENCE_CAPTURED')
})

// G10: training never auto-sets certification PASS
test('G10 training never auto-sets certification PASS', () => {
  const skill = IPTPA_SKILL_DISPLAY[0]
  const result = appendTrainingSessionEvidence(createCertificationCore([]), singleSession('g10', skill.groupKey, 10))
  assert.ok(result.core.requirements.every((item) => item.certification_status !== 'PASSED'))
  assert.ok(result.core.requirements.every((item) => item.certification_status === 'UNKNOWN'))
})

// A4: protocol map covers all 23 skills, all local, none director/official verified, no invented numeric machine settings
test('A4 protocol map covers all 23 skills as local protocol only, with targets and cues but no invented machine numbers', () => {
  assert.equal(IPTPA_PROTOCOL_MAP.length, 23)
  assert.equal(new Set(IPTPA_PROTOCOL_MAP.map((item) => item.requirement_id)).size, 23)
  assert.ok(IPTPA_PROTOCOL_MAP.every((item) => item.condition_status === 'LOCAL_PROTOCOL'))
  assert.ok(IPTPA_PROTOCOL_MAP.every((item) => item.target && item.success_definition && item.fundamental_cues))
  assert.ok(IPTPA_PROTOCOL_MAP.every((item) => item.source_authority.includes('非 Director 核实')))
  assert.ok(IPTPA_PROTOCOL_MAP.every((item) => item.invalid_definition === '未在本地资料中明确定义'))
  const serves = IPTPA_PROTOCOL_MAP.filter((item) => item.requirement_id.includes('-SERVE-'))
  assert.ok(serves.every((item) => item.feed === '自发球'))
  const main = readFileSync(path.join(projectRoot, 'src/certification-core.ts'), 'utf8')
  assert.ok(!/速度：\d|频率：\d|档位：\d/.test(main))
})

// G11/G12/G13: PCI task status and evidence metadata persist and never change certification status
test('G11/G12/G13 PCI task status and evidence metadata persist without changing certification status', () => {
  const record = migrateAppRecord({
    ...defaults,
    pciTaskStatus: { 'PCI-L2-SUBMISSION-CHARTING': 'READY' },
    pciTaskEvidence: [{ evidence_id: 'pci:chart:1', task_id: 'PCI-L2-SUBMISSION-CHARTING', evidence_type: 'LOCAL_REFERENCE', local_path: '本地/Charting-练习.docx', note: '本地/Charting-练习.docx', url: '', created_at: '2026-10-28T11:00:00.000Z', status: 'SAVED', source: '用户本地引用' }],
  }, defaults)
  assert.equal(record.pciTaskStatus['PCI-L2-SUBMISSION-CHARTING'], 'READY')
  assert.equal(record.pciTaskEvidence.length, 1)
  assert.equal(record.pciTaskEvidence[0].local_path, '本地/Charting-练习.docx')
  assert.ok(record.certificationCore.requirements.every((item) => item.certification_status === 'UNKNOWN'))
  const fresh = migrateAppRecord({ ...defaults }, defaults)
  assert.deepEqual(fresh.pciTaskStatus, {})
  assert.deepEqual(fresh.pciTaskEvidence, [])
  assert.equal(displayPciTaskStatus('NOT_STARTED'), '未开始')
  assert.equal(displayPciTaskStatus('IN_PROGRESS'), '进行中')
  assert.equal(displayPciTaskStatus('READY'), '已准备')
  assert.equal(displayPciTaskStatus('SUBMITTED'), '已提交')
  assert.equal(displayPciTaskStatus('NEEDS_REVISION'), '需修改')
  assert.equal(displayPciTaskStatus('DONE_LOCAL'), '本地已完成')
  assert.equal(displayPciTaskStatus('OFFICIAL_CONFIRMED'), '官方已确认')
  assert.equal(displayTestConditionStatus('UNVERIFIED'), '未核实')
  assert.equal(displayTestConditionStatus('LOCAL_PROTOCOL'), '本地训练协议')
  assert.equal(displayTestConditionStatus('DIRECTOR_VERIFIED'), 'Director 已核实')
  assert.equal(displayTestConditionStatus('OFFICIAL_VERIFIED'), '官方已核实')
})

// G14/G15: dist has no paid course media; migration keeps PCI task state across refresh
test('G14/G15 dist has no paid course media and PCI task state survives migration', () => {
  const dist = path.join(projectRoot, 'dist')
  if (existsSync(dist)) {
    const files = []
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else files.push(full)
      }
    }
    walk(dist)
    assert.deepEqual(files.filter((file) => /\.(mp4|pdf|vtt|docx)$/i.test(file)), [])
  }
  const record = migrateAppRecord({
    ...defaults,
    pciTaskStatus: { 'PCI-L2-COURSE-PATHWAY': 'DONE_LOCAL' },
    certificationCore: createCertificationCore([]),
  }, defaults)
  assert.equal(record.pciTaskStatus['PCI-L2-COURSE-PATHWAY'], 'DONE_LOCAL')
})

// G16/G17/G18/G19/G20: UI checks in main.ts
test('G16/G17/G18/G19/G20 UI: scale caption fixed, PCI top folded, no raw enums, home recommendation is rule-based', () => {
  const main = readFileSync(path.join(projectRoot, 'src/main.ts'), 'utf8')
  assert.ok(!main.includes('<span>0 球</span><span>10 球</span><span>10 球</span>'), 'old 0/10/10 caption must be gone')
  assert.ok(main.includes('成功球数'), 'fixed caption must show 成功球数')
  assert.ok(main.includes('资料与证据说明'), 'PCI engineering notes must be folded')
  const pciTopStart = main.indexOf('认证任务</span><h1>PCI L2</h1>')
  const pciTop = main.slice(pciTopStart, main.indexOf('</section>', pciTopStart))
  assert.ok(!pciTop.includes('rev 006-fix1'), 'PCI top must not show rev 006-fix1')
  assert.ok(!pciTop.includes('Volley Sensation'), 'PCI top must not show Volley Sensation')
  assert.ok(main.includes('今天最值得做'), 'home must show 今天最值得做')
  assert.ok(main.includes('为什么推荐这个'), 'home must explain the recommendation')
  assert.ok(main.includes('本次训练条件'), 'skill confirm page must exist')
  assert.ok(main.includes('开始 10 球'), 'skill confirm page must start 10 balls')
  assert.ok(main.includes('本次仅建立本地训练基线'), 'unverified confirm note must exist')
  for (const label of ['Certification Status', 'Training Status', 'Next Action', 'CONFIRMED_OFFICIAL', 'MAP_RECORDED_UNVERIFIED', 'TEST_CONDITION_STATUS']) {
    assert.ok(!main.includes(label), `main.ts must not show ${label} in the UI`)
  }
})

// C: home recommendation follows the four rules in order
test('C home recommendation follows blocker, in-progress, untested, fewest-evidence order', () => {
  const core = createCertificationCore([])
  let recommendation = recommendNextTask(core, {})
  assert.equal(recommendation.kind, 'pci')
  assert.equal(recommendation.requirement_id, 'PCI-L2-COURSE-PATHWAY')
  assert.ok(recommendation.reason.includes('最早阻塞'))
  const blockersDone = {
    'PCI-L2-COURSE-PATHWAY': 'DONE_LOCAL',
    'PCI-L2-COURSE-VERSION': 'DONE_LOCAL',
    'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST': 'DONE_LOCAL',
    'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-CHARTING': 'IN_PROGRESS',
  }
  recommendation = recommendNextTask(core, blockersDone)
  assert.equal(recommendation.kind, 'pci')
  assert.equal(recommendation.requirement_id, 'PCI-L2-SUBMISSION-CHARTING')
  assert.ok(recommendation.reason.includes('正在进行中'))
  recommendation = recommendNextTask(core, {
    'PCI-L2-COURSE-PATHWAY': 'DONE_LOCAL',
    'PCI-L2-COURSE-VERSION': 'DONE_LOCAL',
    'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST': 'DONE_LOCAL',
    'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER': 'DONE_LOCAL',
  })
  assert.equal(recommendation.kind, 'iptpa')
  assert.equal(recommendation.requirement_id, IPTPA_SKILL_DISPLAY[0].requirement_id)
  assert.ok(recommendation.reason.includes('尚未建立基线'))
})
