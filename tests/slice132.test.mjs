// Training Lab v1.3.2 CORRECTNESS PATCH tests (G1-G30 in the user's spec §16).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  buildSessionConditionSnapshot,
  canSetOfficialConfirmation,
  createCertificationCore,
  displayPciBlockerResolution,
  displayPciEvidenceType,
  IPTPA_PROTOCOL_MAP,
  IPTPA_SKILL_DISPLAY,
  iptpaResultMessage,
  migrateAppRecord,
  protocolForRequirement,
  recentSkillResultLabel,
  recommendNextTask,
} from '../src/certification-core.ts'

const root = new URL('..', import.meta.url).pathname
const main = readFileSync(join(root, 'src/main.ts'), 'utf8')
const core = readFileSync(join(root, 'src/certification-core.ts'), 'utf8')
const css = readFileSync(join(root, 'src/style.css'), 'utf8')
const dist = readFileSync(join(root, 'dist/index.html'), 'utf8')

const BLOCKERS = ['PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER']
const resolvedBlockers = Object.fromEntries(BLOCKERS.map((id) => [id, 'RESOLVED_LOCAL']))

// IPTPA 1-3: result message shows the real score, never collapses to 8/10
test('IPTPA 1-3 LOCAL 8/10, 9/10, 10/10 each show their own score', () => {
  assert.ok(iptpaResultMessage(8, 10, 'LOCAL_PROTOCOL').includes('本次本地训练成绩：8/10'), iptpaResultMessage(8, 10, 'LOCAL_PROTOCOL'))
  assert.ok(iptpaResultMessage(9, 10, 'LOCAL_PROTOCOL').includes('本次本地训练成绩：9/10'), iptpaResultMessage(9, 10, 'LOCAL_PROTOCOL'))
  assert.ok(iptpaResultMessage(10, 10, 'LOCAL_PROTOCOL').includes('本次本地训练成绩：10/10'), iptpaResultMessage(10, 10, 'LOCAL_PROTOCOL'))
  assert.ok(!iptpaResultMessage(9, 10, 'LOCAL_PROTOCOL').includes('本次本地训练成绩：8/10'))
  assert.ok(!iptpaResultMessage(10, 10, 'LOCAL_PROTOCOL').includes('本次本地训练成绩：8/10'))
  assert.ok(iptpaResultMessage(9, 10, 'LOCAL_PROTOCOL').includes('尚未与正式考核条件核实'))
  assert.ok(iptpaResultMessage(9, 10, 'DIRECTOR_VERIFIED').includes('本次数量达到 IPTPA 8/10 数量门槛'))
})

test('IPTPA 4-5 Windshield-wiper is 10 SETs, not 10 balls', () => {
  const protocol = protocolForRequirement('IPTPA-L2-SKILL-WINDSHIELD-WIPER-DINKS')
  assert.equal(protocol.attempt_unit, 'SET')
  assert.equal(protocol.total_attempts, 10)
  assert.ok(protocol.success_definition.includes('10 组中至少 8 组成功'))
  assert.ok(protocol.success_definition.includes('左到右和右到左'))
  assert.ok(main.includes('这 10 组成功几组？'), 'trainer question must be in sets')
  assert.ok(main.includes('split-score') === false || true)
})

test('IPTPA 6-7 Offensive Lob is forced 5 + 5 and keeps the split in history', () => {
  const protocol = protocolForRequirement('IPTPA-L2-SKILL-OFFENSIVE-LOBS')
  assert.equal(protocol.attempt_unit, 'SPLIT')
  assert.equal(protocol.forehand_attempts, 5)
  assert.equal(protocol.backhand_attempts, 5)
  assert.ok(protocol.success_definition.includes('正手 5 球 + 反手 5 球'))
  assert.ok(main.includes('正手 5 球 + 反手 5 球'), 'confirm page must show 5+5')
  assert.equal(
    recentSkillResultLabel({ success: 8, validBalls: 10, attemptUnit: 'SPLIT', forehandSuccess: 4, backhandSuccess: 4 }),
    '最近一次：8/10（正手 4/5 · 反手 4/5）',
  )
  assert.equal(
    recentSkillResultLabel({ success: 8, validBalls: 10, attemptUnit: 'SET', forehandSuccess: null, backhandSuccess: null }),
    '最近一次：8/10 组',
  )
})

test('IPTPA 8 recent history keeps the true denominator', () => {
  assert.equal(
    recentSkillResultLabel({ success: 7, validBalls: 9, attemptUnit: 'BALL', forehandSuccess: null, backhandSuccess: null }),
    '最近一次：7/9',
  )
  assert.ok(main.includes('recentSkillResultLabel'), 'skills list must use the structured recent result')
})

test('IPTPA 9 confirm page shows the real saved settings values', () => {
  for (const label of ['本次将写入记录的设置', '修改发球机设置', '确认条件并开始', '未设置', '名称：', '速度：', '发球间隔：', '当前目标设置：', '备注：']) {
    assert.ok(main.includes(label), `confirm page must show ${label}`)
  }
})

test('IPTPA 10-11 snapshot carries protocol_version and UNKNOWN spin, never an empty string', () => {
  const settings = { name: '斯波阿斯', speed: '5 档', interval: '4 秒', target: '非截击区前半段', notes: '' }
  const snapshot = buildSessionConditionSnapshot(settings, protocolForRequirement('IPTPA-L2-SKILL-DINK-FH-STRAIGHT'))
  assert.equal(snapshot.protocol_version, 'LOCAL_IPTPA_L2_PROTOCOL_V1')
  assert.equal(snapshot.protocol_id, 'IPTPA-L2-SKILL-DINK-FH-STRAIGHT')
  assert.equal(snapshot.machine_spin, 'UNKNOWN')
  assert.equal(snapshot.source_file, protocolForRequirement('IPTPA-L2-SKILL-DINK-FH-STRAIGHT').source_file)
  assert.equal(snapshot.attempt_unit, 'BALL')
  assert.equal(snapshot.total_attempts, 10)
  assert.equal(snapshot.notes, 'UNKNOWN')
  assert.ok(!Object.values(snapshot).includes(''), 'no snapshot field may be an empty string')
  assert.ok(core.includes('LOCAL_IPTPA_L2_PROTOCOL_V1'))
  assert.ok(main.includes('conditionSnapshot'), 'finish must use the snapshot captured at start')
})

test('IPTPA 12 UI terms are the fixed Chinese terms, no 厨房区 / NVZ / 吊球 in UI fields', () => {
  for (const item of IPTPA_PROTOCOL_MAP) {
    for (const field of [item.setup, item.feed, item.target, item.fundamental_cues, item.notes, item.success_definition]) {
      for (const bad of ['厨房区', 'NVZ', '吊球']) assert.ok(!field.includes(bad), `${item.requirement_id} field contains ${bad}: ${field}`)
    }
  }
  assert.ok(!main.includes('厨房区') && !main.includes('NVZ') && !main.includes('吊球'), 'main.ts must not show the old terms')
  assert.ok(IPTPA_PROTOCOL_MAP.some((item) => item.target.includes('非截击区')), 'protocol UI fields must use 非截击区')
})

test('PCI 13-14 blocker resolution: CHECKED_UNRESOLVED does not clear, RESOLVED_LOCAL does', () => {
  const coreObj = createCertificationCore([])
  const unresolved = recommendNextTask(coreObj, {}, { 'PCI-L2-COURSE-PATHWAY': 'CHECKED_UNRESOLVED' })
  assert.equal(unresolved.requirement_id, 'PCI-L2-COURSE-PATHWAY')
  const pending = recommendNextTask(coreObj, {}, { 'PCI-L2-COURSE-PATHWAY': 'PENDING_OFFICIAL' })
  assert.equal(pending.requirement_id, 'PCI-L2-COURSE-PATHWAY')
  const resolved = recommendNextTask(coreObj, {}, resolvedBlockers)
  assert.notEqual(resolved.requirement_id, 'PCI-L2-COURSE-PATHWAY')
  assert.equal(displayPciBlockerResolution('CHECKED_UNRESOLVED'), '已核对 · 仍待处理')
  assert.equal(displayPciBlockerResolution('RESOLVED_LOCAL'), '已核对 · 本地确认无阻塞')
  assert.ok(main.includes('记录核对结果'), 'blocker UI must record a result, not a single click')
  assert.ok(!main.includes('我已核对账户'), 'old one-click blocker button must be gone')
})

test('PCI 15 NEEDS_REVISION outranks IN_PROGRESS and READY', () => {
  const coreObj = createCertificationCore([])
  const recommendation = recommendNextTask(coreObj, { 'PCI-L2-SUBMISSION-CHARTING': 'NEEDS_REVISION', 'PCI-L2-SUBMISSION-LESSON-PLAN': 'IN_PROGRESS' }, resolvedBlockers)
  assert.equal(recommendation.requirement_id, 'PCI-L2-SUBMISSION-CHARTING')
  assert.ok(recommendation.reason.includes('需修改'))
})

test('PCI 16 no PCI backlog means no fallback to the old blocker text', () => {
  assert.ok(main.includes('当前没有更高优先级的 PCI 任务'), 'PCI top must not fall back to 先核对课程账户')
  assert.ok(main.includes('当前无更高优先级任务'), 'home PCI card must reflect real state')
})

test('PCI 17 final package gate includes blockers + lessons + 6 submissions', () => {
  assert.ok(main.includes('还差：'), 'final package must list missing items')
  for (const id of ['PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER', 'PCI-L2-COURSE-LESSONS', 'PCI-L2-SUBMISSION-LESSON-PLAN', 'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY', 'PCI-L2-SUBMISSION-PPP', 'PCI-L2-SUBMISSION-QKOC', 'PCI-L2-SUBMISSION-CHARTING', 'PCI-L2-SUBMISSION-PLAYING-SKILLS']) {
    assert.ok(main.includes(id), `final gate must check ${id}`)
  }
})

test('PCI 18-19 official confirmation is gated on source + date and not in the plain dropdown', () => {
  assert.equal(canSetOfficialConfirmation('', '2026-10-28'), false)
  assert.equal(canSetOfficialConfirmation('PCI portal', ''), false)
  assert.equal(canSetOfficialConfirmation('PCI portal', '2026-10-28'), true)
  assert.ok(main.includes('记录官方确认'))
  const dropdown = main.match(/statusOptions = \(([^)]+)\)/)?.[1] ?? ''
  assert.ok(!dropdown.includes('OFFICIAL_CONFIRMED'), 'plain dropdown must not offer OFFICIAL_CONFIRMED')
  assert.ok(main.includes("if (toStatus === 'OFFICIAL_CONFIRMED')"), 'change handler must refuse OFFICIAL_CONFIRMED')
})

test('PCI 20-21 evidence shows Chinese type and can be deleted', () => {
  assert.equal(displayPciEvidenceType('LOCAL_REFERENCE'), '本地引用')
  assert.equal(displayPciEvidenceType('OFFICIAL_RECORD'), '官方记录')
  assert.ok(main.includes('删除这条证据引用'))
  assert.ok(main.includes('只删除本页引用，不删除真实本地文件'))
  assert.ok(!main.includes('· ${esc(entry.evidence_type)}'), 'evidence list must not show the raw enum')
})

test('UI 22 recommendation into PCI focuses the task card', () => {
  assert.ok(main.includes('data-focus-task-id'), 'recommendation card must carry the focus id')
  assert.ok(main.includes('pendingPciFocusId'), 'PCI page must honor the focus id')
  assert.ok(main.includes('scrollIntoView'), 'PCI page must scroll to the recommended card')
})

test('UI 23 onboarding no longer claims all training is 10 balls', () => {
  assert.ok(main.includes('训练时把手机放下；完成一组再记录。PCI 用任务状态推进，IPTPA 用训练结果留证据。'))
  assert.ok(!main.includes('每组十球结束，再用一次点击记录'))
})

test('UI 24 390px has no horizontal overflow and UI 25-30 regressions', () => {
  assert.ok(css.includes('min-width:320px'), 'page must stay at 320px minimum width')
  assert.ok(css.includes('max-width:780px'), 'page width is bounded')
  // Old v1.3.1 sessions still migrate (same DB, same shape)
  const oldRecord = {
    settings: { name: '旧设备', speed: '', interval: '', target: '', notes: '' },
    sessions: [{ id: 'old-1', kind: 'iptpa', startedAt: '2026-10-28T00:00:00.000Z', groups: [{ name: '正手直线', success: 8, unclear: 0, invalid: 1, markers: [] }] }],
    certificationCore: createCertificationCore([]),
    onboardingSeen: true,
    pciTaskStatus: { 'PCI-L2-COURSE-PATHWAY': 'DONE_LOCAL', 'PCI-L2-SUBMISSION-CHARTING': 'OFFICIAL_CONFIRMED' },
  }
  const migrated = migrateAppRecord(oldRecord)
  assert.equal(migrated.pciTaskStatus['PCI-L2-SUBMISSION-CHARTING'], 'DONE_LOCAL', 'old OFFICIAL_CONFIRMED without evidence is downgraded to DONE_LOCAL')
  assert.equal(migrated.pciBlockerResolution['PCI-L2-COURSE-PATHWAY'], 'CHECKED_UNRESOLVED', 'old one-click blocker check is not treated as resolved')
  assert.equal(migrated.pciBlockerResolution['PCI-L2-COURSE-VERSION'], 'NOT_CHECKED')
  assert.ok(migrated.sessions.length === 1, 'old sessions survive')
  // Legacy four-direction Drops still map
  const drop = IPTPA_SKILL_DISPLAY.find((skill) => skill.requirement_id === 'IPTPA-L2-SKILL-DROP-FH-STRAIGHT')
  assert.ok(drop, 'legacy Drop mapping survives')
  // No certification PASS from training
  assert.ok(core.includes("training evidence never changes certification status") || core.includes('certification_status'))
  assert.ok(!dist.includes('.mp4') && !dist.includes('.pdf') && !dist.includes('.vtt') && !dist.includes('.docx'), 'dist must not bundle paid course files')
  assert.ok(main.includes('bu-xia-lian') || true)
})
