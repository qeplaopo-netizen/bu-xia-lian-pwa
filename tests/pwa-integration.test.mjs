import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
import { existsSync } from 'node:fs'
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate)) ?? null
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function freePort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return port
}

async function waitFor(check, message, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await check()
      if (result) return result
    } catch {}
    await pause(200)
  }
  throw new Error(message)
}

if (!chromePath) {
  if (process.env.CI === 'true') {
    test('pwa integration requires Chrome in CI', () => {
      assert.fail('Chrome binary not found in CI; integration tests must not skip in CI')
    })
  } else {
    test('pwa integration skipped on this machine (no Chrome binary found)', () => {
      assert.ok(true, 'Chrome is only available on the Mac; core tests still cover migration')
    })
  }
} else test('migrates an existing v1 IndexedDB record additively and keeps the PWA usable offline', { timeout: 60000 }, async () => {
  const serverPort = await freePort()
  const debugPort = await freePort()
  const profile = await mkdtemp(path.join(os.tmpdir(), 'training-lab-implementation-slice-'))
  const server = spawn(path.join(projectRoot, 'node_modules/.bin/vite'), ['preview', '--host', '127.0.0.1', '--port', String(serverPort), '--strictPort'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] })

  let socket
  let serverOutput = ''
  let chromeOutput = ''
  server.stdout.setEncoding('utf8')
  server.stderr.setEncoding('utf8')
  chrome.stderr.setEncoding('utf8')
  server.stdout.on('data', (chunk) => { serverOutput += chunk })
  server.stderr.on('data', (chunk) => { serverOutput += chunk })
  chrome.stderr.on('data', (chunk) => { chromeOutput += chunk })

  try {
    const appUrl = `http://127.0.0.1:${serverPort}/`
    await waitFor(async () => (await fetch(appUrl).catch(() => null))?.ok, `Vite preview did not start: ${serverOutput}`)
    const targets = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`).catch(() => null)
      return response?.ok ? response.json() : null
    }, `Chrome remote debugging did not start: ${chromeOutput}`)
    const target = targets.find((item) => item.type === 'page')
    assert.ok(target, 'Chrome should expose a page target')

    socket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    let nextId = 0
    const pending = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result)
      }
    })
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
      return result.result.value
    }

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await send('Network.setBlockedURLs', { urls: ['*assets/*.js'] })
    await send('Page.navigate', { url: appUrl })
    await pause(350)

    const legacy = {
      settings: { name: '旧设备', speed: '6', interval: '4', target: '旧目标', notes: '保持不变' },
      onboardingSeen: true,
      sessions: [
        {
          id: 'legacy-iptpa-session',
          kind: 'iptpa',
          startedAt: '2026-10-27T10:00:00.000Z',
          completedAt: '2026-10-27T10:10:00.000Z',
          groups: ['正手直线', '正手斜线', '反手直线', '反手斜线'].map((name, index) => ({
            name, success: 5 + index, unclear: 0, invalid: 0, markers: [],
          })),
        },
        {
          id: 'legacy-experiment',
          kind: 'experiment',
          startedAt: '2026-10-26T10:00:00.000Z',
          groups: ['基线1', '基线2', '变量1', '变量2', '变量3'].map((name) => ({
            name, success: 4, unclear: 0, invalid: 0, markers: [],
          })),
        },
      ],
    }
    const legacyLiteral = JSON.stringify(legacy)
    await evaluate(`new Promise((resolve, reject) => {
      const open = indexedDB.open('bu-xia-lian', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('state');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction('state', 'readwrite');
        transaction.objectStore('state').put(${legacyLiteral}, 'app');
        transaction.oncomplete = () => { db.close(); resolve(true); };
        transaction.onerror = () => reject(transaction.error);
      };
    })`)

    await send('Network.setBlockedURLs', { urls: [] })
    await send('Page.reload', { ignoreCache: true })
    await waitFor(async () => (await evaluate('document.body.innerText')).includes('IPTPA L2'), 'Application did not render after migration')

    const migrated = await evaluate(`new Promise((resolve, reject) => {
      const open = indexedDB.open('bu-xia-lian');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const request = db.transaction('state').objectStore('state').get('app');
        request.onsuccess = () => {
          const record = request.result;
          resolve({
            version: db.version,
            settings: record.settings,
            sessions: record.sessions,
            onboardingSeen: record.onboardingSeen,
            core: record.certificationCore
          });
          db.close();
        };
        request.onerror = () => reject(request.error);
      };
    })`)

    assert.equal(migrated.version, 1, 'additive app-record migration must not bump / recreate the database')
    assert.deepEqual(migrated.settings, legacy.settings)
    assert.deepEqual(migrated.sessions, legacy.sessions, 'legacy sessions must remain byte-for-byte equivalent as data')
    assert.equal(migrated.onboardingSeen, true)
    assert.equal(migrated.core.schema_version, '0.1')
    assert.equal(migrated.core.evidence.length, 4)
    assert.ok(migrated.core.evidence.every((item) => item.evidence_class === 'TRAINING_EVIDENCE'))
    assert.ok(migrated.core.requirements.every((item) => item.certification_status === 'UNKNOWN'))
    assert.ok(migrated.core.requirements
      .filter((item) => item.requirement_id.includes('-SKILL-DROP-'))
      .every((item) => item.training_status === 'BASELINE_MEASURED'))

    await evaluate(`document.querySelector('[data-to="iptpa-skills"]').click()`)
    const pageText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('23 项技能') ? text : null
    }, 'IPTPA skills entry did not open')
    assert.ok(pageText.includes('IPTPA L2'))
    assert.ok(pageText.includes('尚未测试'))
    assert.ok(!pageText.includes('Certification Status'))
    assert.ok(!pageText.includes('Training Status'))
    assert.ok(!pageText.includes('CONFIRMED_OFFICIAL'))
    assert.ok(!pageText.includes('MAP_RECORDED_UNVERIFIED'))
    assert.ok(!/\d+\s*%/.test(pageText))
    assert.ok(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'))

    await evaluate(`document.querySelector('.wordmark[data-to="home"]').click()`)
    await evaluate(`document.querySelector('[data-to="pci-tasks"]').click()`)
    const pciText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('比赛记录分析') ? text : null
    }, 'PCI tasks entry did not open')
    assert.ok(pciText.includes('PCI L2'))
    assert.ok(pciText.includes('当前下一步'))
    assert.ok(pciText.includes('资料与证据说明'))
    assert.ok(!pciText.includes('认证状态：官方已确认'))

    await evaluate(`document.querySelector('.wordmark[data-to="home"]').click()`)
    await evaluate(`document.querySelector('[data-to="iptpa-skills"]').click()`)
    await evaluate(`document.querySelector('[data-action="skill-confirm"]').click()`)
    const confirmText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('本次训练条件') ? text : null
    }, 'Skill confirm page did not open')
    assert.ok(confirmText.includes('本地训练协议'))
    await evaluate(`document.querySelector('[data-action="skill-begin"]').click()`)
    await evaluate(`document.querySelector('[data-action="score"][data-score="8"]').click()`)
    const resultText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('训练完成 · 已保存') ? text : null
    }, 'Training result did not finish saving')
    assert.ok(resultText.includes('本次本地训练成绩：8/10'))
    assert.ok(resultText.includes('尚未与正式考核条件核实'))
    assert.ok(!resultText.includes('达到官方数量门槛'))
    assert.ok(resultText.includes('本地成绩不代表认证 PASS'))
    const afterTraining = await waitFor(async () => {
      const value = await evaluate(`new Promise((resolve, reject) => {
        const open = indexedDB.open('bu-xia-lian');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('state').objectStore('state').get('app');
          request.onsuccess = () => {
            resolve({ sessions: request.result.sessions, core: request.result.certificationCore });
            db.close();
          };
          request.onerror = () => reject(request.error);
        };
      })`)
      return value.sessions.length === legacy.sessions.length + 1 ? value : null
    }, 'New IPTPA Session was not persisted')
    assert.deepEqual(afterTraining.sessions.slice(0, legacy.sessions.length), legacy.sessions)
    assert.equal(afterTraining.sessions.at(-1).requirementIds.length, 1)
    assert.equal(afterTraining.sessions.at(-1).conditionSnapshot.test_condition_status, 'LOCAL_PROTOCOL')
    assert.equal(afterTraining.sessions.at(-1).conditionSnapshot.machine_name, '旧设备')
    assert.equal(afterTraining.sessions.at(-1).conditionSnapshot.protocol_version, 'LOCAL_IPTPA_L2_PROTOCOL_V1')
    assert.equal(afterTraining.sessions.at(-1).conditionSnapshot.machine_spin, 'UNKNOWN')
    assert.ok(afterTraining.core.requirements.every((item) => item.certification_status === 'UNKNOWN'))
    assert.ok(afterTraining.core.requirements
      .filter((item) => item.requirement_id.includes('-SKILL-DROP-'))
      .every((item) => item.training_status === 'BASELINE_MEASURED'))
    assert.equal(afterTraining.core.requirements
      .find((item) => item.requirement_id === 'IPTPA-L2-SKILL-DINK-FH-STRAIGHT').training_status, 'BASELINE_MEASURED')

    // v1.3.3: Windshield-wiper is 10 SETs, with a true 7/9 set denominator after one invalid set.
    await evaluate(`document.querySelector('.wordmark[data-to="home"]').click()`)
    await evaluate(`document.querySelector('[data-to="iptpa-skills"]').click()`)
    await evaluate(`document.querySelector('[data-requirement-id="IPTPA-L2-SKILL-WINDSHIELD-WIPER-DINKS"]').click()`)
    const wiperConfirm = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('本次训练条件') && text.includes('10 组') ? text : null
    }, 'Windshield confirm page did not show 10 sets')
    assert.ok(wiperConfirm.includes('10 组中至少 8 组成功'))
    await evaluate(`document.querySelector('[data-action="skill-begin"]').click()`)
    const wiperTraining = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('这 10 组成功几组？') ? text : null
    }, 'Windshield training page did not ask in sets')
    assert.ok(wiperTraining)
    await evaluate(`document.querySelector('[data-action="score"][data-score="8"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('训练完成 · 已保存') ? text : null
    }, 'Windshield 8/10 set training did not save')
    // Second windshield run: one invalid set, seven successes -> 7/9 sets.
    await evaluate(`document.querySelector('.wordmark[data-to="home"]').click()`)
    await evaluate(`document.querySelector('[data-to="iptpa-skills"]').click()`)
    await evaluate(`document.querySelector('[data-requirement-id="IPTPA-L2-SKILL-WINDSHIELD-WIPER-DINKS"]').click()`)
    await evaluate(`document.querySelector('[data-action="skill-begin"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('这 10 组成功几组？') ? text : null
    }, 'Windshield second training page did not open')
    await evaluate(`document.querySelector('[data-action="exception"][data-type="invalid"][data-delta="1"]').click()`)
    await evaluate(`document.querySelector('[data-action="score"][data-score="7"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('训练完成 · 已保存') ? text : null
    }, 'Windshield 7/9 set training did not save')

    // v1.3.3: Offensive Lob is forehand 5 then backhand 5, kept as a split in history.
    await evaluate(`document.querySelector('.wordmark[data-to="home"]').click()`)
    await evaluate(`document.querySelector('[data-to="iptpa-skills"]').click()`)
    await evaluate(`document.querySelector('[data-requirement-id="IPTPA-L2-SKILL-OFFENSIVE-LOBS"]').click()`)
    const lobConfirm = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('本次训练条件') && text.includes('正手 5 球 + 反手 5 球') ? text : null
    }, 'Offensive Lob confirm page did not show 5+5')
    assert.ok(lobConfirm)
    await evaluate(`document.querySelector('[data-action="skill-begin"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('正手 5 球打进目标区几球？') ? text : null
    }, 'Offensive Lob forehand step did not open')
    await evaluate(`document.querySelector('[data-action="split-score"][data-score="4"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('反手 5 球打进目标区几球？') ? text : null
    }, 'Offensive Lob backhand step did not open')
    await evaluate(`document.querySelector('[data-action="split-score"][data-score="4"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('训练完成 · 已保存') ? text : null
    }, 'Offensive Lob 4+4 training did not save')

    // History must show the structured results directly in the main score area.
    await evaluate(`document.querySelector('[data-action="navigate"][data-to="history"]').click()`)
    const historyText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('7/9 组') && text.includes('正手 4/5') ? text : null
    }, 'History did not show 7/9 sets and the 4/5 + 4/5 split')
    assert.ok(historyText.includes('8/10 组'))
    assert.ok(historyText.includes('反手 4/5'))

    // v1.3.3: Final Package gate blocks READY via the status dropdown until the gate passes.
    await evaluate(`document.querySelector('.wordmark[data-to="home"]').click()`)
    await evaluate(`document.querySelector('[data-to="pci-tasks"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('比赛记录分析') ? text : null
    }, 'PCI tasks did not reopen for the gate test')
    await evaluate(`(() => { const select = document.querySelector('#pci-task-PCI-L2-SUBMISSION-FINAL-PACKAGE select'); select.value = 'READY'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
    const gateText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('前置任务尚未完成') ? text : null
    }, 'Final Package gate did not refuse READY')
    assert.ok(gateText.includes('还差：'))
    const blockedStatus = await evaluate(`new Promise((resolve, reject) => {
      const open = indexedDB.open('bu-xia-lian');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const request = db.transaction('state').objectStore('state').get('app');
        request.onsuccess = () => { resolve(request.result.pciTaskStatus['PCI-L2-SUBMISSION-FINAL-PACKAGE']); db.close(); };
        request.onerror = () => reject(request.error);
      };
    })`)
    assert.notEqual(blockedStatus, 'READY', 'Final Package READY must not be written while the gate fails')
    // Satisfy the gate through the stored state, reload, then READY must be writable.
    await evaluate(`new Promise((resolve, reject) => {
      const open = indexedDB.open('bu-xia-lian');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction('state', 'readwrite');
        const store = transaction.objectStore('state');
        const request = store.get('app');
        request.onsuccess = () => {
          const record = request.result;
          record.pciBlockerResolution = { 'PCI-L2-COURSE-PATHWAY': 'RESOLVED_LOCAL', 'PCI-L2-COURSE-VERSION': 'RESOLVED_LOCAL', 'PCI-L2-ELIGIBILITY-KNOWLEDGE-TEST': 'RESOLVED_LOCAL', 'PCI-L2-ELIGIBILITY-L1-EVALUATION-WAIVER': 'RESOLVED_LOCAL' };
          record.pciTaskStatus = { ...record.pciTaskStatus, 'PCI-L2-COURSE-LESSONS': 'DONE_LOCAL', 'PCI-L2-SUBMISSION-LESSON-PLAN': 'DONE_LOCAL', 'PCI-L2-SUBMISSION-ADJUSTING-DIFFICULTY': 'DONE_LOCAL', 'PCI-L2-SUBMISSION-PPP': 'DONE_LOCAL', 'PCI-L2-SUBMISSION-QKOC': 'DONE_LOCAL', 'PCI-L2-SUBMISSION-CHARTING': 'DONE_LOCAL', 'PCI-L2-SUBMISSION-PLAYING-SKILLS': 'DONE_LOCAL' };
          store.put(record, 'app');
          transaction.oncomplete = () => { db.close(); resolve(true); };
          transaction.onerror = () => reject(transaction.error);
        };
        request.onerror = () => reject(request.error);
      };
    })`)
    await send('Page.reload', { ignoreCache: true })
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('IPTPA L2') ? text : null
    }, 'PWA did not reload after satisfying the gate')
    await evaluate(`document.querySelector('[data-to="pci-tasks"]').click()`)
    await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('比赛记录分析') ? text : null
    }, 'PCI tasks did not reload after satisfying the gate')
    await evaluate(`(() => { const select = document.querySelector('#pci-task-PCI-L2-SUBMISSION-FINAL-PACKAGE select'); select.value = 'READY'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
    const allowedStatus = await waitFor(async () => {
      const value = await evaluate(`new Promise((resolve, reject) => {
        const open = indexedDB.open('bu-xia-lian');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('state').objectStore('state').get('app');
          request.onsuccess = () => { resolve(request.result.pciTaskStatus['PCI-L2-SUBMISSION-FINAL-PACKAGE']); db.close(); };
          request.onerror = () => reject(request.error);
        };
      })`)
      return value === 'READY' ? value : null
    }, 'Final Package READY was not written after the gate passed')
    assert.equal(allowedStatus, 'READY')

    const worker = await waitFor(async () => evaluate(`(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.active?.state === 'activated' ? true : null;
    })()`), 'Service Worker did not activate')
    assert.equal(worker, true)
    const cacheState = await evaluate(`(async () => {
      const names = await caches.keys();
      const name = names.find((item) => item === 'bu-xia-lian-v7');
      const requests = name ? await (await caches.open(name)).keys() : [];
      return { name, paths: requests.map((request) => new URL(request.url).pathname) };
    })()`)
    assert.equal(cacheState.name, 'bu-xia-lian-v7')
    assert.ok(cacheState.paths.some((item) => item.endsWith('.js')))
    assert.ok(cacheState.paths.some((item) => item.endsWith('.css')))

    await send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    })
    await send('Page.reload', { ignoreCache: true })
    await waitFor(async () => (await evaluate('document.body.innerText')).includes('IPTPA L2'), 'PWA did not reload offline')
    assert.ok(await evaluate(`Boolean(navigator.serviceWorker.controller)`))
  } finally {
    const waitForExit = (child) => child.exitCode !== null ? Promise.resolve() : once(child, 'exit')
    try { socket?.close() } catch {}
    try { chrome.kill('SIGTERM') } catch {}
    try { server.kill('SIGTERM') } catch {}
    await Promise.race([Promise.allSettled([waitForExit(chrome), waitForExit(server)]), pause(5000)])
    try { chrome.kill('SIGKILL') } catch {}
    try { server.kill('SIGKILL') } catch {}
    await Promise.race([Promise.allSettled([waitForExit(chrome), waitForExit(server)]), pause(5000)])
    // Cleanup must never mask the test result: Chrome may still be flushing its
    // profile when it is killed, so retry once and then swallow any leftover error.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { await rm(profile, { recursive: true, force: true }); break } catch { await pause(500) }
    }
  }
})
