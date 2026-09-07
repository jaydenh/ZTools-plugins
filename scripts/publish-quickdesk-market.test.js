import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublishEntries, normalizePlatforms } from './publish-quickdesk-market.js';

test('publishes only zip packages produced by the current run', () => {
  const entries = createPublishEntries({
    plugins: [
      { name: 'changed', version: '2.0.0', pluginName: '已更新', description: 'Demo', author: 'QuickDesk' },
      { name: 'historical', version: '1.0.0', title: '历史插件' }
    ],
    categories: [{ key: 'productivity', list: ['changed'] }],
    zipFiles: ['release/changed-2.0.0.zip']
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].metadata.name, 'changed');
  assert.equal(entries[0].metadata.title, '已更新');
  assert.equal(entries[0].metadata.category, 'productivity');
  assert.deepEqual(entries[0].metadata.platforms, ['win32', 'darwin', 'linux']);
});

test('normalizes platform aliases for the QuickDesk API', () => {
  assert.deepEqual(normalizePlatforms({ platforms: ['windows', 'macOS', 'linux'] }), ['win32', 'darwin', 'linux']);
});
