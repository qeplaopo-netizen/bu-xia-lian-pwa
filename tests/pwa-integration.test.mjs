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
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
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

test('migrates an existing v1 IndexedDB record additively and keeps the PWA usable offline', { timeout: 60000 }, async () => {
  const serverPort = await freePort()
  const debugPort = await freePort()
  const profile = await mkdtemp(path.join(os.tmpdir(), 'training-lab-implementation-slice-'))
  const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(serverPort), '--strictPort'], {
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

    await evaluate(`document.querySelector('[data-to="certification"]').click()`)
    const pageText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('认证记录') ? text : null
    }, 'Certification entry did not open')
    assert.ok(pageText.includes('PCI L2'))
    assert.ok(pageText.includes('IPTPA L2'))
    assert.ok(pageText.includes('Certification Status：UNKNOWN'))
    assert.ok(!pageText.includes('91%'))
    assert.ok(!pageText.includes('1/7'))
    assert.ok(!/\d+\s*%/.test(pageText))
    assert.ok(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'))

    await evaluate(`document.querySelector('.wordmark[data-to="home"]').click()`)
    await evaluate(`document.querySelector('[data-action="start"][data-kind="iptpa"]').click()`)
    for (let group = 0; group < 4; group += 1) {
      await evaluate(`document.querySelector('[data-action="score"][data-score="8"]').click()`)
    }
    const resultText = await waitFor(async () => {
      const text = await evaluate('document.body.innerText')
      return text.includes('训练完成 · 已保存') ? text : null
    }, 'Training result did not finish saving')
    assert.ok(resultText.includes('本地训练证据不代表 Director 正式评分或认证 PASS'))
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
    assert.equal(afterTraining.sessions.at(-1).requirementIds.length, 4)
    assert.ok(afterTraining.core.requirements.every((item) => item.certification_status === 'UNKNOWN'))
    assert.ok(afterTraining.core.requirements
      .filter((item) => item.requirement_id.includes('-SKILL-DROP-'))
      .every((item) => item.training_status === 'TRAINING'))

    const worker = await waitFor(async () => evaluate(`(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.active?.state === 'activated' ? true : null;
    })()`), 'Service Worker did not activate')
    assert.equal(worker, true)
    const cacheState = await evaluate(`(async () => {
      const names = await caches.keys();
      const name = names.find((item) => item === 'bu-xia-lian-v2');
      const requests = name ? await (await caches.open(name)).keys() : [];
      return { name, paths: requests.map((request) => new URL(request.url).pathname) };
    })()`)
    assert.equal(cacheState.name, 'bu-xia-lian-v2')
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
    const chromeExit = waitForExit(chrome)
    const serverExit = waitForExit(server)
    socket?.close()
    chrome.kill('SIGTERM')
    server.kill('SIGTERM')
    await Promise.allSettled([chromeExit, serverExit])
    await rm(profile, { recursive: true, force: true })
  }
})
