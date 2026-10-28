import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendTrainingSessionEvidence,
  createCertificationCore,
  migrateAppRecord,
} from '../src/certification-core.ts'

const defaults = {
  settings: { name: '默认设备', speed: '', interval: '', target: '', notes: '' },
  sessions: [],
  onboardingSeen: false,
}

const directions = ['正手直线', '正手斜线', '反手直线', '反手斜线']

function session(id, kind = 'iptpa') {
  return {
    id,
    kind,
    startedAt: '2026-10-28T10:00:00.000Z',
    completedAt: '2026-10-28T10:10:00.000Z',
    groups: directions.map((name, index) => ({
      name,
      success: index + 5,
      unclear: 0,
      invalid: 0,
      markers: [],
    })),
  }
}

test('adds certification data while preserving an old app record and its sessions', () => {
  const oldSession = session('old-drop-session')
  const oldExperiment = session('old-experiment', 'experiment')
  const legacy = {
    settings: { name: '旧发球机', speed: '4', interval: '5', target: '厨房线', notes: '保留' },
    sessions: [oldSession, oldExperiment],
    onboardingSeen: true,
    futureLegacyField: { keep: true },
  }
  const before = structuredClone(legacy)

  const migrated = migrateAppRecord(legacy, defaults)

  assert.deepEqual(migrated.settings, before.settings)
  assert.deepEqual(migrated.sessions, before.sessions)
  assert.equal(migrated.onboardingSeen, true)
  assert.deepEqual(migrated.futureLegacyField, { keep: true })
  assert.deepEqual(legacy, before)
  assert.equal(migrated.certificationCore.schema_version, '0.1')
  assert.ok(migrated.certificationCore.requirements.every((item) => item.certification_status === 'UNKNOWN'))
  assert.ok(migrated.certificationCore.requirements
    .filter((item) => item.certification === 'IPTPA_L2' && item.requirement_type === 'SKILL')
    .every((item) => item.training_status === 'BASELINE_MEASURED' || item.training_status === 'UNKNOWN'))
  assert.equal(migrated.certificationCore.requirements.find((item) => item.requirement_id === 'IPTPA-L2-SKILL-DROP-FH-STRAIGHT').training_status, 'BASELINE_MEASURED')
  assert.equal(migrated.certificationCore.evidence.length, 4)
  assert.ok(migrated.certificationCore.evidence.every((item) => item.evidence_class === 'TRAINING_EVIDENCE'))
  assert.ok(migrated.certificationCore.requirements.every((item) => item.certification_status !== 'PASSED'))
})

test('sets Drop to UNTESTED only after reading a real store with no comparable Drop session', () => {
  const migrated = migrateAppRecord({
    ...defaults,
    sessions: [session('experiment-only', 'experiment')],
  }, defaults)
  const drops = migrated.certificationCore.requirements.filter((item) => item.requirement_id.includes('-SKILL-DROP-'))

  assert.equal(drops.length, 4)
  assert.ok(drops.every((item) => item.training_status === 'UNTESTED'))
  assert.ok(drops.every((item) => item.certification_status === 'UNKNOWN'))
  assert.equal(migrated.certificationCore.evidence.length, 0)
})

test('ignores non-IPTPA sessions when looking for Drop history', () => {
  const core = createCertificationCore([session('wrong-kind', 'experiment')])
  assert.equal(core.evidence.length, 0)
  assert.ok(core.requirements
    .filter((item) => item.requirement_id.includes('-SKILL-DROP-'))
    .every((item) => item.training_status === 'UNTESTED'))
})

test('new training evidence updates only training status and never certification status', () => {
  const core = createCertificationCore([])
  const completed = {
    id: 'new-session',
    kind: 'iptpa',
    startedAt: '2026-10-28T11:00:00.000Z',
    completedAt: '2026-10-28T11:10:00.000Z',
    groups: [session('template').groups[0]],
  }

  const result = appendTrainingSessionEvidence(core, completed)
  const requirement = result.core.requirements.find((item) => item.requirement_id === 'IPTPA-L2-SKILL-DROP-FH-STRAIGHT')

  assert.equal(requirement.training_status, 'BASELINE_MEASURED')
  assert.equal(requirement.certification_status, 'UNKNOWN')
  assert.equal(result.core.evidence[0].evidence_type, 'SELF_RECORDED')
  assert.equal(result.core.evidence[0].evidence_class, 'TRAINING_EVIDENCE')
  assert.deepEqual(result.session.requirementIds, ['IPTPA-L2-SKILL-DROP-FH-STRAIGHT'])
  assert.equal(completed.requirementIds, undefined)
})

test('a later Drop session advances training status without changing certification status', () => {
  const core = createCertificationCore([])
  const baseline = {
    id: 'baseline-session',
    kind: 'iptpa',
    startedAt: '2026-10-28T11:00:00.000Z',
    groups: [{ ...session('template').groups[0] }],
  }
  const training = {
    ...baseline,
    id: 'follow-up-session',
    startedAt: '2026-10-29T11:00:00.000Z',
    groups: [{ ...baseline.groups[0] }],
  }
  const first = appendTrainingSessionEvidence(core, baseline)
  const second = appendTrainingSessionEvidence(first.core, training)
  const requirement = second.core.requirements.find((item) => item.requirement_id === 'IPTPA-L2-SKILL-DROP-FH-STRAIGHT')

  assert.equal(requirement.training_status, 'TRAINING')
  assert.equal(requirement.certification_status, 'UNKNOWN')
})

test('rejects unreadable existing core without replacing it', () => {
  const legacy = { ...defaults, certificationCore: { schema_version: 'future', requirements: [] } }
  const before = structuredClone(legacy)

  assert.throws(() => migrateAppRecord(legacy, defaults), /BLOCKED_MIGRATION_RISK/)
  assert.deepEqual(legacy, before)

  const malformed = { ...defaults, certificationCore: { schema_version: '0.1', requirements: [{}], evidence: [], requirementEvents: [] } }
  assert.throws(() => migrateAppRecord(malformed, defaults), /BLOCKED_MIGRATION_RISK/)
})

test('all seeded records use the schema fields and do not contain aggregate percentages', () => {
  const core = createCertificationCore([])
  const requiredFields = [
    'requirement_id', 'certification', 'requirement_name', 'requirement_type',
    'source', 'source_status', 'certification_status', 'training_status',
    'evidence_required', 'evidence_available', 'last_verified_at',
    'next_action', 'blocking_reason', 'notes',
  ]

  assert.ok(core.requirements.length >= 40)
  assert.ok(core.requirements.every((item) => requiredFields.every((field) => field in item)))
  assert.ok(core.requirements.every((item) => !('completion_percent' in item)))
})
