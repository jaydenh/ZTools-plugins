#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RELEASE_DIR = 'release';

function normalizePlatforms(plugin) {
  const values = Array.isArray(plugin.platforms)
    ? plugin.platforms
    : Array.isArray(plugin.platform) ? plugin.platform : [plugin.platform].filter(Boolean);
  const aliases = { windows: 'win32', win: 'win32', mac: 'darwin', macos: 'darwin', osx: 'darwin' };
  const normalized = values.map((value) => aliases[String(value).toLowerCase()] || String(value).toLowerCase());
  return normalized.length ? [...new Set(normalized)] : ['win32', 'darwin', 'linux'];
}

function categoryIndex(categories) {
  const result = new Map();
  for (const category of categories || []) {
    for (const pluginName of category.list || []) {
      if (!result.has(pluginName)) result.set(pluginName, category.key || 'other');
    }
  }
  return result;
}

function createPublishEntries({ plugins, categories, zipFiles }) {
  const byCategory = categoryIndex(categories);
  const zipSet = new Set(zipFiles.map((file) => basename(file)));
  return plugins
    .filter((plugin) => zipSet.has(`${plugin.name}-${plugin.version}.zip`))
    .map((plugin) => ({
      file: join(RELEASE_DIR, `${plugin.name}-${plugin.version}.zip`),
      metadata: {
        name: plugin.name,
        version: String(plugin.version),
        title: plugin.title || plugin.pluginName || plugin.name,
        description: plugin.description || '',
        author: typeof plugin.author === 'string' ? plugin.author : plugin.author?.name || '',
        homepage: plugin.homepage || '',
        logo: typeof plugin.logo === 'string' && plugin.logo.length <= 1000 ? plugin.logo : '',
        category: byCategory.get(plugin.name) || 'other',
        platforms: normalizePlatforms(plugin),
        packageFormat: 'zip'
      }
    }));
}

async function publishEntry(entry, { marketUrl, token, fetchImpl = fetch }) {
  const form = new FormData();
  const packageData = readFileSync(entry.file);
  form.append('file', new Blob([packageData], { type: 'application/zip' }), basename(entry.file));
  form.append('metadata', JSON.stringify(entry.metadata));
  const response = await fetchImpl(`${marketUrl.replace(/\/$/, '')}/admin/api/market/plugins`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`发布 ${entry.metadata.name}@${entry.metadata.version} 失败 (${response.status}): ${body.slice(0, 500)}`);
  }
}

async function main() {
  const token = process.env.QUICKDESK_MARKET_PUBLISH_TOKEN;
  const marketUrl = process.env.QUICKDESK_MARKET_URL || 'https://quick.kgjoys.com';
  if (!token) throw new Error('未配置 QUICKDESK_MARKET_PUBLISH_TOKEN GitHub Actions Secret');
  for (const required of ['plugins.json', 'categories.json']) {
    if (!existsSync(join(RELEASE_DIR, required))) throw new Error(`缺少 release/${required}`);
  }
  const plugins = JSON.parse(readFileSync(join(RELEASE_DIR, 'plugins.json'), 'utf8'));
  const categories = JSON.parse(readFileSync(join(RELEASE_DIR, 'categories.json'), 'utf8'));
  const zipFiles = readdirSync(RELEASE_DIR).filter((file) => file.endsWith('.zip'));
  const entries = createPublishEntries({ plugins, categories, zipFiles });
  if (!entries.length && zipFiles.length) throw new Error('构建产物无法与 plugins.json 中的插件名称和版本匹配');
  console.log(`准备发布 ${entries.length} 个插件到 QuickDesk 市场`);
  for (const entry of entries) {
    await publishEntry(entry, { marketUrl, token });
    console.log(`已发布 ${entry.metadata.name}@${entry.metadata.version}`);
  }
}

export { createPublishEntries, normalizePlatforms, publishEntry };

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main().catch((error) => { console.error(error.message); process.exit(1); });
