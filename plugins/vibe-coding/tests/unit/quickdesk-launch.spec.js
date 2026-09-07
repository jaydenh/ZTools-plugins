import assert from 'node:assert/strict'
import test from 'node:test'
import { createZToolsLaunchOptions } from '../e2e/ztools-launch.js'

test('QuickDesk launcher requires an explicit host and isolates its data', () => {
  const keys = ['ZTOOLS_E2E_APP_ROOT', 'ZTOOLS_E2E_EXECUTABLE_PATH']
  const saved = keys.map((key) => process.env[key])
  try {
    for (const key of keys) delete process.env[key]
    assert.throws(() => createZToolsLaunchOptions('isolated', 'legacy'), /QuickDesk/)
    process.env.ZTOOLS_E2E_EXECUTABLE_PATH = 'relative.exe'
    assert.throws(() => createZToolsLaunchOptions('isolated', 'legacy'), /绝对路径/)
    process.env.ZTOOLS_E2E_EXECUTABLE_PATH = process.execPath
    const options = createZToolsLaunchOptions('isolated', 'legacy')
    assert.equal(options.executablePath, process.execPath)
    assert.equal(options.env.ZTOOLS_DATA_ROOT, 'isolated')
    assert.equal(options.env.ZTOOLS_LEGACY_USER_DATA_PATH, 'legacy')
    assert.equal(options.env.ZTOOLS_E2E, '1')
  } finally {
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key]
      else process.env[key] = saved[index]
    })
  }
})
