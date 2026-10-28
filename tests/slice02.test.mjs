import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appendTrainingSessionEvidence,
  createCertificationCore,
  derivedSkillTrainingStatus,
  displayCertificationStatus,
  displaySourceStatus,
  displayTrainingStatus,
  IPTPA_SKILL_CATEGORIES,
  IPTPA_SKILL_DISPLAY,
  migrateAppRecord,
  refreshCertificationCore,
  removeSessionEvidence,
} from '../src/certification-core.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaults = {
  settings: { name: '默认设备', speed: '', interval: '', target: '', notes: '' },
  sessions: [],
  onboardingSeen: false,
}

function singleSession(id, groupName, success = 8) {
  return {
    id,
    kind: 'iptpa',
    startedAt: '2026-10-28T11:00:00.000Z',
    completedAt: '2026-10-28T11:10:00.000Z',
    groups: [{ name: groupName, success, unclear: 0, invalid: 0, markers: [] }],
  }
}

test('all 23 IPTPA skills exist in 7 categories with distinct requirement ids', () => {
  assert.equal(IPTPA_SKILL_DISPLAY.length, 23)
  assert.equal(IPTPA_SKILL_CATEGORIES.length, 7)
  assert.equal(new Set(IPTPA_SKILL_DISPLAY.map((skill) => skill.requirement_id)).size, 23)
  assert.ok(IPTPA_SKILL_DISPLAY.every((skill) => IPTPA_SKILL_CATEGORIES.includes(skill.category)))
  assert.ok(IPTPA_SKILL_DISPLAY.every((skill) => skill.name && skill.groupKey))
  const core = createCertificationCore([])
  const ids = new Set(core.requirements.map((item) => item.requirement_id))
  assert.ok(IPTPA_SKILL_DISPLAY.every((skill) => ids.has(skill.requirement_id)))
})

test('legacy four Drop group names still map to the four Drop skill requirements', () => {
  const core = createCertificationCore([])
  const legacy = {
    ...defaults,
    sessions: [['正手直线', '正手斜线', '反手直线', '反手斜线'].map((name) => ({ name, success: 6, unclear: 0, invalid: 0, markers: [] }))],
  }
  const session = {
    id: 'legacy-four',
    kind: 'iptpa',
    startedAt: '2026-10-27T10:00:00.000Z',
    completedAt: '2026-10-27T10:10:00.000Z',
    groups: legacy.sessions[0],
  }
  const migrated = migrateAppRecord({ ...defaults, sessions: [session] }, defaults)
  const drops = migrated.certificationCore.requirements.filter((item) => item.requirement_id.includes('-SKILL-DROP-'))
  assert.equal(drops.length, 4)
  assert.ok(drops.every((item) => item.training_status === 'BASELINE_MEASURED'))
  assert.ok(drops.every((item) => item.certification_status === 'UNKNOWN'))
  assert.ok(core.requirements.every((item) => item.certification_status !== 'PASSED'))
})

test('any of the 23 skills can produce training evidence', () => {
  const core = createCertificationCore([])
  for (const skill of IPTPA_SKILL_DISPLAY) {
    const result = appendTrainingSessionEvidence(createCertificationCore([]), singleSession(`s-${skill.requirement_id}`, skill.groupKey, 7))
    const requirement = result.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
    assert.equal(requirement.training_status, 'BASELINE_MEASURED', skill.requirement_id)
    assert.equal(requirement.certification_status, 'UNKNOWN', skill.requirement_id)
    assert.ok(result.core.evidence.some((item) => item.requirement_ids.includes(skill.requirement_id)))
  }
})

test('first skill training UNTESTED -> BASELINE_MEASURED, second -> TRAINING, never certification PASS', () => {
  const skill = IPTPA_SKILL_DISPLAY.find((item) => item.category === '网前小球')
  const first = appendTrainingSessionEvidence(createCertificationCore([]), singleSession('first', skill.groupKey, 8))
  const firstRequirement = first.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  assert.equal(firstRequirement.training_status, 'BASELINE_MEASURED')
  assert.equal(firstRequirement.certification_status, 'UNKNOWN')
  const second = appendTrainingSessionEvidence(first.core, singleSession('second', skill.groupKey, 9))
  const secondRequirement = second.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  assert.equal(secondRequirement.training_status, 'TRAINING')
  assert.equal(secondRequirement.certification_status, 'UNKNOWN')
  assert.ok(second.core.requirements.every((item) => item.certification_status !== 'PASSED'))
})

test('deleting a record removes only its evidence and resets its skill when nothing remains', () => {
  const skill = IPTPA_SKILL_DISPLAY[0]
  const first = appendTrainingSessionEvidence(createCertificationCore([]), singleSession('del-one', skill.groupKey, 8))
  removeSessionEvidence(first.core, 'del-one')
  const requirement = first.core.requirements.find((item) => item.requirement_id === skill.requirement_id)
  assert.equal(requirement.training_status, 'UNTESTED')
  assert.equal(requirement.evidence_available.length, 0)
  assert.equal(first.core.evidence.length, 0)
})

test('v1.2 core with existing data is safely refreshed and keeps certification, evidence, sessions and training status', () => {
  const skill = IPTPA_SKILL_DISPLAY[0]
  const seeded = appendTrainingSessionEvidence(createCertificationCore([]), singleSession('keep-me', skill.groupKey, 8))
  const oldCore = seeded.core
  const refreshed = refreshCertificationCore(oldCore)
  assert.equal(refreshed.requirements.find((item) => item.requirement_id === skill.requirement_id).training_status, 'BASELINE_MEASURED')
  assert.equal(refreshed.requirements.find((item) => item.requirement_id === skill.requirement_id).certification_status, 'UNKNOWN')
  assert.equal(refreshed.evidence.length, oldCore.evidence.length)
  assert.ok(refreshed.requirements.every((item) => item.certification_status === 'UNKNOWN'))
  assert.ok(refreshed.requirements.length >= oldCore.requirements.length)
  const derived = derivedSkillTrainingStatus(refreshed.requirements.find((item) => item.requirement_id === skill.requirement_id))
  assert.equal(derived, 'BASELINE_MEASURED')
})

test('Chinese display mapping hides every raw status code used in the UI', () => {
  assert.equal(displayCertificationStatus('UNKNOWN'), '待核实')
  assert.equal(displayTrainingStatus('UNTESTED'), '尚未测试')
  assert.equal(displayTrainingStatus('BASELINE_MEASURED'), '已建立基线')
  assert.equal(displayTrainingStatus('TRAINING'), '训练中')
  assert.equal(displayTrainingStatus('READY_FOR_REVIEW'), '待复核')
  assert.equal(displayTrainingStatus('EVIDENCE_CAPTURED'), '已留存证据')
  assert.equal(displaySourceStatus('CONFIRMED_OFFICIAL'), '官方已确认')
  assert.equal(displaySourceStatus('MAP_RECORDED_UNVERIFIED'), '已记录，待个人核实')
  const main = readFileSync(path.join(projectRoot, 'src/main.ts'), 'utf8')
  for (const label of ['Certification Status', 'Training Status', 'Next Action', 'CONFIRMED_OFFICIAL', 'MAP_RECORDED_UNVERIFIED']) {
    assert.ok(!main.includes(label), `main.ts must not show ${label} in the UI`)
  }
  assert.ok(!/\d+\s*%/.test(main), 'main.ts must not render a numeric completion percentage')
})

test('main.ts contains no total completion percentage and no automatic PASS wording', () => {
  const main = readFileSync(path.join(projectRoot, 'src/main.ts'), 'utf8')
  for (const phrase of ['已通过', '考试合格', '技能已掌握']) {
    assert.ok(!main.includes(phrase), `main.ts must not claim ${phrase} for training results`)
  }
  assert.ok(main.includes('本地成绩不代表认证 PASS'))
  assert.ok(main.includes('正式技能通过仍需要 Director 判断动作基本功'))
})

test('PCI task page uses Learning Center references without claiming pending rules as officially confirmed', () => {
  const main = readFileSync(path.join(projectRoot, 'src/main.ts'), 'utf8')
  assert.ok(main.includes('m13-a01-lesson-planning-template.pdf'))
  assert.ok(main.includes('m13-l02-charting-template.docx'))
  assert.ok(main.includes('m13-a03-play-practice-play-template.pdf'))
  assert.ok(main.includes('尚未与官方公开规则交叉核对'))
  assert.ok(!main.includes('认证状态：官方已确认'))
  assert.ok(main.includes('Volley Sensation'))
  assert.ok(main.includes('不影响本页任务系统'))
  for (const id of ['PCI-L2-SUBMISSION-LESSON-PLAN', 'PCI-L2-SUBMISSION-CHARTING', 'PCI-L2-SUBMISSION-QKOC', 'PCI-L2-SUBMISSION-PLAYING-SKILLS']) {
    assert.ok(main.includes(id), id)
  }
})

test('IPTPA skill page does not depend on a Learning Center directory and does not invent feeding parameters', () => {
  const main = readFileSync(path.join(projectRoot, 'src/main.ts'), 'utf8')
  assert.ok(main.includes('不编造官方参数'))
  assert.ok(main.includes('未经 Director 或官方核实'))
  assert.ok(!main.includes('learning-center'))
  for (const phrase of ['发球机位置：', '球速：', '频率：', '目标区尺寸：']) {
    assert.ok(!main.includes(phrase), phrase)
  }
})

test('dist contains no PCI course original media, transcripts or PDFs', () => {
  const dist = path.join(projectRoot, 'dist')
  if (!existsSync(dist)) {
    assert.ok(true, 'dist not built yet; this check runs after build in CI')
    return
  }
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else files.push(full)
    }
  }
  walk(dist)
  const forbidden = files.filter((file) => /\.(mp4|pdf|vtt|docx)$/i.test(file))
  assert.deepEqual(forbidden, [])
  assert.ok(files.some((file) => file.endsWith('.js')))
  assert.ok(files.some((file) => file.endsWith('.css')))
})
