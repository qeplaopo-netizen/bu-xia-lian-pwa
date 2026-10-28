// Training Lab v1.3.3 CORRECTNESS CLOSURE tests.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  canSetPciTaskStatus,
  createCertificationCore,
  finalGateMissingIds,
  formatSessionResult,
  IPTPA_SKILL_DISPLAY,
  migrateAppRecord,
  recentSkillResultLabel,
  recommendNextTask,
} from '../src/certification-core.ts'

const root = new URL('..', import.meta.url).pathname
const main = readFileSync(join(root, 'src/main.ts'), 'utf8')
const workflow = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8')

const BLOCKERS = ['PCI-L2-COURSE-PATHWAY', 'PCI-L2-COURSE-VERSION', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER']
const resolved = Object.fromEntries(BLOCKERS.map((id) => [id, 'RESOLVED_LOCAL']))

test('recommendation: blockers resolved + lessons NOT_STARTED -> lessons', () => {
  const recommendation = recommendNextTask(createCertificationCore([]), {}, resolved)
  assert.equal(recommendation.kind, 'pci')
  assert.equal(recommendation.requirement_id, 'PCI-L2-COURSE-LESSONS')
  assert.ok(recommendation.reason.includes('尚未开始'))
})

test('recommendation: lessons DONE_LOCAL + Lesson Plan NOT_STARTED -> Lesson Plan', () => {
  const recommendation = recommendNextTask(createCertificationCore([]), { 'PCI-L2-COURSE-LESSONS': 'DONE_LOCAL' }, resolved)
  assert.equal(recommendation.requirement_id, 'PCI-L2-SUBMISSION-LESSON-PLAN')
})

test('recommendation: Charting NEEDS_REVISION still beats Lesson Plan NOT_STARTED', () => {
  const recommendation = recommendNextTask(createCertificationCore([]), { 'PCI-L2-SUBMISSION-CHARTING': 'NEEDS_REVISION' }, resolved)
  assert.equal(recommendation.requirement_id, 'PCI-L2-SUBMISSION-CHARTING')
})

test('recommendation: Final Package SUBMITTED never recommends credential issued as a user task', () => {
  const allDone = {
    'PCI-L2-COURSE-LESSONS': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-LESSON-PLAN': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-PPP': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-QKOC': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-CHARTING': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-PLAYING-SKILLS': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-FINAL-PACKAGE': 'SUBMITTED',
  }
  const recommendation = recommendNextTask(createCertificationCore([]), allDone, resolved)
  assert.equal(recommendation.kind, 'iptpa')
  assert.notEqual(recommendation.requirement_id, 'PCI-L2-CREDENTIAL-ISSUED')
})

test('recommendation: resolved blockers with NOT_STARTED task status are not re-recommended', () => {
  const recommendation = recommendNextTask(createCertificationCore([]), { 'PCI-L2-COURSE-PATHWAY': 'NOT_STARTED' }, resolved)
  assert.equal(recommendation.requirement_id, 'PCI-L2-COURSE-LESSONS')
})

test('final gate: READY / SUBMITTED / DONE_LOCAL blocked while missing, allowed when satisfied', () => {
  const blocked = canSetPciTaskStatus('PCI-L2-SUBMISSION-FINAL-PACKAGE', 'READY', {}, {})
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.missing.length >= 11, `gate must list all missing items, got ${blocked.missing.length}`)
  const satisfied = canSetPciTaskStatus('PCI-L2-SUBMISSION-FINAL-PACKAGE', 'READY', {
    'PCI-L2-COURSE-LESSONS': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-LESSON-PLAN': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-PPP': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-QKOC': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-CHARTING': 'DONE_LOCAL',
    'PCI-L2-SUBMISSION-PLAYING-SKILLS': 'DONE_LOCAL',
  }, resolved)
  assert.equal(satisfied.allowed, true)
  assert.equal(canSetPciTaskStatus('PCI-L2-SUBMISSION-FINAL-PACKAGE', 'IN_PROGRESS', {}, {}).allowed, true)
  assert.equal(canSetPciTaskStatus('PCI-L2-SUBMISSION-CHARTING', 'READY', {}, {}).allowed, true)
  assert.ok(finalGateMissingIds({}, {}).length === 11)
})

test('migration: illegal old Final Package state falls back to IN_PROGRESS, valid state is kept', () => {
  const illegal = migrateAppRecord({
    settings: { name: '', speed: '', interval: '', target: '', notes: '' },
    sessions: [],
    certificationCore: createCertificationCore([]),
    onboardingSeen: true,
    pciTaskStatus: { 'PCI-L2-SUBMISSION-FINAL-PACKAGE': 'READY' },
    pciBlockerResolution: {},
  })
  assert.equal(illegal.pciTaskStatus['PCI-L2-SUBMISSION-FINAL-PACKAGE'], 'IN_PROGRESS')
  const legal = migrateAppRecord({
    settings: { name: '', speed: '', interval: '', target: '', notes: '' },
    sessions: [],
    certificationCore: createCertificationCore([]),
    onboardingSeen: true,
    pciTaskStatus: {
      'PCI-L2-COURSE-LESSONS': 'DONE_LOCAL',
      'PCI-L2-SUBMISSION-LESSON-PLAN': 'DONE_LOCAL',
      'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY': 'DONE_LOCAL',
      'PCI-L2-SUBMISSION-PPP': 'DONE_LOCAL',
      'PCI-L2-SUBMISSION-QKOC': 'DONE_LOCAL',
      'PCI-L2-SUBMISSION-CHARTING': 'DONE_LOCAL',
      'PCI-L2-SUBMISSION-PLAYING-SKILLS': 'DONE_LOCAL',
      'PCI-L2-SUBMISSION-FINAL-PACKAGE': 'SUBMITTED',
    },
    pciBlockerResolution: resolved,
  })
  assert.equal(legal.pciTaskStatus['PCI-L2-SUBMISSION-FINAL-PACKAGE'], 'SUBMITTED')
})

test('formatSessionResult: BALL 7/9, SET 7/9 sets, SPLIT 8/10 with 4/5 + 4/5, old sessions stay BALL', () => {
  const ball = formatSessionResult({ kind: 'iptpa', groups: [{ success: 7, unclear: 0, invalid: 1 }] })
  assert.equal(ball.main, '7/9')
  assert.equal(ball.attemptUnit, 'BALL')
  const set = formatSessionResult({ kind: 'iptpa', groups: [{ success: 7, unclear: 0, invalid: 1 }], attempt_unit: 'SET' })
  assert.equal(set.main, '7/9 组')
  assert.equal(set.detail, '9 有效组')
  assert.equal(recentSkillResultLabel({ success: 7, validAttempts: 9, attemptUnit: 'SET', forehandSuccess: null, backhandSuccess: null }), '最近一次：7/9 组')
  const split = formatSessionResult({ kind: 'iptpa', groups: [{ success: 8, unclear: 0, invalid: 0 }], attempt_unit: 'SPLIT', forehand_success: 4, backhand_success: 4 })
  assert.equal(split.main, '8/10')
  assert.equal(split.detail, '正手 4/5 · 反手 4/5')
  const old = formatSessionResult({ kind: 'iptpa', groups: [{ success: 8, unclear: 0, invalid: 0 }] })
  assert.equal(old.attemptUnit, 'BALL')
  assert.ok(IPTPA_SKILL_DISPLAY.length === 23)
})

test('home copy no longer implies every training is ten balls, and IPTPA recommendation uses the real unit', () => {
  assert.ok(main.includes('做完一组，'))
  assert.ok(main.includes('<b>1</b><small>一组</small>'))
  assert.ok(!main.includes('练完十球'))
  assert.ok(main.includes('先确认条件，再完成 10 组'))
  assert.ok(main.includes('先确认条件，再完成正手 5 球 + 反手 5 球'))
  assert.ok(main.includes('先确认条件，再开始本组训练'))
  assert.ok(!main.includes('先确认本次训练条件，再开始 10 球'))
})

test('workflow runs tests with Chrome before any Pages upload or deploy', () => {
  const testIndex = workflow.indexOf('npm test')
  const uploadIndex = workflow.indexOf('upload-pages-artifact')
  const deployIndex = workflow.indexOf('deploy-pages')
  assert.ok(testIndex > 0, 'workflow must run npm test')
  assert.ok(testIndex < uploadIndex && testIndex < deployIndex, 'tests must run before upload and deploy')
  assert.ok(workflow.includes('setup-chrome') || workflow.includes('CHROME_PATH'), 'workflow must prepare Chrome')
  assert.ok(workflow.includes('npm run build'))
})

test('no tautological asserts remain in the test suite', () => {
  const fs = readFileSync(join(root, 'tests/slice132.test.mjs'), 'utf8')
  const slice133 = readFileSync(join(root, 'tests/slice133.test.mjs'), 'utf8')
  for (const content of [fs, slice133]) {
    assert.ok(!content.includes('|' + '| true'), 'a test must not contain an always-true disjunction')
  }
})
