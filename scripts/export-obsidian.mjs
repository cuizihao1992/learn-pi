import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'content-manifest.json');
const vaultRoot = path.join(root, 'obsidian-vault');
const assetRoot = path.join(vaultRoot, '_assets');
const siteBase = 'https://cuizihao1992.github.io/learn-pi/';

const moduleOrder = [
  'pi-agent',
  'mini-agent',
  'llm-agent-interview',
  'llm-inference-acceleration',
  'cognitive-learning',
  'systems-thinking',
  'econ-finance',
  'stock-kline',
  'quant-trading',
  'digital-twin-city',
  'mapbox',
  'cesium',
  'openlayers',
  'gaussian-splatting',
  'nuclear-battery',
  'history-society',
  'philosophy',
  'christianity',
];

const moduleChinese = new Map([
  ['pi-agent', 'Pi Agent'],
  ['mini-agent', 'Mini Agent'],
  ['llm-agent-interview', 'LLM 与 Agent'],
  ['llm-inference-acceleration', 'LLM 推理加速'],
  ['cognitive-learning', '认知学习'],
  ['systems-thinking', '系统思维'],
  ['econ-finance', '经济金融'],
  ['stock-kline', '股票 K 线'],
  ['quant-trading', '量化交易'],
  ['digital-twin-city', '数字孪生城市'],
  ['mapbox', 'Mapbox'],
  ['cesium', 'Cesium'],
  ['openlayers', 'OpenLayers'],
  ['gaussian-splatting', '高斯泼溅'],
  ['nuclear-battery', '核燃料电池'],
  ['history-society', '历史与社会'],
  ['philosophy', '哲学与世界观'],
  ['christianity', '基督教基础'],
]);

const usedNames = new Map();
const htmlToNote = new Map();
const imageCopies = new Map();

function assertInside(parent, child) {
  const parentResolved = path.resolve(parent);
  const childResolved = path.resolve(child);
  if (!childResolved.startsWith(parentResolved)) {
    throw new Error(`Refusing to write outside ${parentResolved}: ${childResolved}`);
  }
}

function cleanGeneratedVault() {
  assertInside(root, vaultRoot);
  fs.mkdirSync(vaultRoot, { recursive: true });
  for (const entry of fs.readdirSync(vaultRoot, { withFileTypes: true })) {
    if (entry.name === '99 - 我的笔记') continue;
    const target = path.join(vaultRoot, entry.name);
    assertInside(vaultRoot, target);
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.mkdirSync(assetRoot, { recursive: true });
  fs.mkdirSync(path.join(vaultRoot, '.obsidian'), { recursive: true });
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function slugSafe(value) {
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
}

function uniqueFileName(dir, base) {
  const key = path.resolve(dir);
  const seen = usedNames.get(key) ?? new Set();
  let name = `${base}.md`;
  let index = 2;
  while (seen.has(name.toLowerCase())) {
    name = `${base} ${index}.md`;
    index += 1;
  }
  seen.add(name.toLowerCase());
  usedNames.set(key, seen);
  return name;
}

function getTitle(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return stripTags(title[1]).replace(/\s*\|\s*.*$/, '');
  return fallback;
}

function extractArticle(html) {
  const article = html.match(/<article[^>]*class=["'][^"']*\bdoc\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i);
  if (article) return article[1];
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return main ? main[1] : html;
}

function sourceToUrl(sourceRel) {
  return siteBase + sourceRel.replaceAll(path.sep, '/');
}

function resolveSourceLink(fromRel, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean.startsWith('#')) return null;
  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(clean)) return null;
  if (clean.startsWith('/learn-pi/')) return clean.slice('/learn-pi/'.length);
  if (clean.startsWith('/')) return null;
  const fromDir = path.posix.dirname(fromRel.replaceAll(path.sep, '/'));
  return path.posix.normalize(path.posix.join(fromDir, clean));
}

function wikiLink(fromNoteRel, sourceRel, text) {
  const targetNote = htmlToNote.get(sourceRel);
  const cleanText = stripTags(text) || sourceRel;
  if (!targetNote) return `[${cleanText}](${sourceRel})`;
  const noExt = targetNote.replace(/\.md$/i, '').replaceAll('\\', '/');
  return `[[${noExt}|${cleanText}]]`;
}

function copyImage(fromSourceRel, src) {
  if (/^(https?:|data:)/i.test(src)) return src;
  const imageSourceRel = resolveSourceLink(fromSourceRel, src);
  if (!imageSourceRel) return src;
  const sourceAbs = path.join(root, imageSourceRel);
  if (!fs.existsSync(sourceAbs)) return src;
  if (imageCopies.has(imageSourceRel)) return imageCopies.get(imageSourceRel);
  const targetRel = path.posix.join('_assets', imageSourceRel.replaceAll('\\', '/'));
  const targetAbs = path.join(vaultRoot, targetRel);
  assertInside(vaultRoot, targetAbs);
  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  fs.copyFileSync(sourceAbs, targetAbs);
  imageCopies.set(imageSourceRel, targetRel);
  return targetRel;
}

function tableToMarkdown(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => {
    return [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => stripTags(cell[1]).replace(/\|/g, '\\|'));
  }).filter((row) => row.length);
  if (!rows.length) return '';
  const max = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [...row, ...Array(max - row.length).fill('')]);
  const header = normalized[0];
  const body = normalized.slice(1);
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function htmlToMarkdown(articleHtml, sourceRel, fromNoteRel) {
  const blocks = [];
  let html = articleHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\r\n/g, '\n');

  html = html.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    const token = `@@BLOCK_${blocks.length}@@`;
    blocks.push(`\n\`\`\`text\n${decodeEntities(code).trim()}\n\`\`\`\n`);
    return token;
  });

  html = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, table) => {
    const token = `@@BLOCK_${blocks.length}@@`;
    blocks.push(`\n${tableToMarkdown(table)}\n`);
    return token;
  });

  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = getAttr(tag, 'src');
    const alt = getAttr(tag, 'alt') || 'image';
    const copied = copyImage(sourceRel, src);
    const markdownPath = /^(https?:|data:)/i.test(copied)
      ? copied
      : path.posix.relative(path.posix.dirname(fromNoteRel), copied).replaceAll('\\', '/');
    return `\n![${alt}](${markdownPath})\n`;
  });

  html = html.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const target = resolveSourceLink(sourceRel, decodeEntities(href));
    if (!target) return `[${stripTags(text)}](${decodeEntities(href)})`;
    return wikiLink(fromNoteRel, target, text);
  });

  html = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\n# ${stripTags(text)}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\n## ${stripTags(text)}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\n### ${stripTags(text)}\n`)
    .replace(/<p[^>]*class=["'][^"']*\bkicker\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\n> ${stripTags(text)}\n`)
    .replace(/<p[^>]*class=["'][^"']*\blead\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\n${stripTags(text)}\n`)
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\n${stripTags(text)}\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n- ${stripTags(text)}`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, text) => `\`${decodeEntities(text).trim()}\``)
    .replace(/<\/?(section|div|ul|ol|figure|figcaption|tbody|thead|tr|td|th|span|article)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  html = decodeEntities(html);
  blocks.forEach((block, index) => {
    html = html.replace(`@@BLOCK_${index}@@`, block);
  });

  return html
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

function frontmatter({ title, module, slug, sourceRel }) {
  const tags = ['learn-pi'];
  if (slug) tags.push(`module/${slug}`);
  return [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    module ? `module: "${module.replace(/"/g, '\\"')}"` : null,
    `source_html: "${sourceRel}"`,
    `site_url: "${sourceToUrl(sourceRel)}"`,
    'tags:',
    ...tags.map((tag) => `  - ${tag}`),
    '---',
  ].filter(Boolean).join('\n') + '\n\n';
}

function writeText(rel, content) {
  const abs = path.join(vaultRoot, rel);
  assertInside(vaultRoot, abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

function buildMappings(manifest) {
  for (const module of manifest.modules) {
    const orderIndex = moduleOrder.indexOf(module.slug);
    const prefix = String(orderIndex >= 0 ? orderIndex + 1 : 99).padStart(2, '0');
    const moduleDir = `${prefix} - ${moduleChinese.get(module.slug) ?? module.name}`;
    module._obsidianDir = moduleDir;
    module.pages.forEach((page, index) => {
      const sourceRel = path.posix.join(module.root.replaceAll('\\', '/'), page);
      const sourceAbs = path.join(root, sourceRel);
      const html = fs.existsSync(sourceAbs) ? fs.readFileSync(sourceAbs, 'utf8') : '';
      const title = getTitle(html, page.replace(/\.html$/i, ''));
      const base = page === 'index.html'
        ? `00 - ${moduleChinese.get(module.slug) ?? module.name}`
        : `${String(index).padStart(2, '0')} - ${slugSafe(title)}`;
      const noteRel = path.posix.join(moduleDir, uniqueFileName(path.join(vaultRoot, moduleDir), base));
      htmlToNote.set(sourceRel, noteRel);
      module._notes ??= [];
      module._notes.push({ page, sourceRel, noteRel, title });
    });
  }

  const commonPages = manifest.commonPages ?? [];
  const commonDir = '90 - 全站页面';
  commonPages.forEach((sourceRel, index) => {
    const sourceAbs = path.join(root, sourceRel);
    if (!fs.existsSync(sourceAbs)) return;
    const html = fs.readFileSync(sourceAbs, 'utf8');
    const title = getTitle(html, path.basename(sourceRel, '.html'));
    const base = `${String(index + 1).padStart(2, '0')} - ${slugSafe(title)}`;
    const noteRel = path.posix.join(commonDir, uniqueFileName(path.join(vaultRoot, commonDir), base));
    htmlToNote.set(sourceRel.replaceAll('\\', '/'), noteRel);
  });
}

function exportPages(manifest) {
  for (const module of manifest.modules) {
    for (const note of module._notes) {
      const sourceAbs = path.join(root, note.sourceRel);
      if (!fs.existsSync(sourceAbs)) continue;
      const html = fs.readFileSync(sourceAbs, 'utf8');
      const md = htmlToMarkdown(extractArticle(html), note.sourceRel, note.noteRel);
      writeText(note.noteRel, frontmatter({
        title: note.title,
        module: module.name,
        slug: module.slug,
        sourceRel: note.sourceRel,
      }) + md);
    }

    const lines = [
      '---',
      `title: "${moduleChinese.get(module.slug) ?? module.name} MOC"`,
      `module: "${module.name}"`,
      'tags:',
      '  - learn-pi',
      '  - moc',
      `  - module/${module.slug}`,
      '---',
      '',
      `# ${moduleChinese.get(module.slug) ?? module.name}`,
      '',
      module.purpose,
      '',
      '## 页面',
      '',
      ...module._notes.map((note) => `- [[${note.noteRel.replace(/\.md$/i, '')}|${note.title}]]`),
      '',
      '## 原始网页',
      '',
      `- ${sourceToUrl(module.entry)}`,
      '',
    ];
    writeText(path.posix.join(module._obsidianDir, 'MOC.md'), lines.join('\n'));
  }

  const commonDir = '90 - 全站页面';
  for (const [sourceRel, noteRel] of htmlToNote.entries()) {
    if (!sourceRel.startsWith('pages/') && sourceRel !== 'modules/index.html') continue;
    const sourceAbs = path.join(root, sourceRel);
    if (!fs.existsSync(sourceAbs)) continue;
    const html = fs.readFileSync(sourceAbs, 'utf8');
    const title = getTitle(html, path.basename(sourceRel, '.html'));
    const md = htmlToMarkdown(extractArticle(html), sourceRel, noteRel);
    writeText(noteRel, frontmatter({ title, sourceRel }) + md);
  }

  const indexLines = [
    '---',
    'title: "Learn Pi Obsidian Vault"',
    'tags:',
    '  - learn-pi',
    '  - vault-home',
    '---',
    '',
    '# Learn Pi 知识库',
    '',
    '这是从网页知识库自动导出的 Obsidian 版本。推荐把这个文件夹作为一个 vault 打开：',
    '',
    '```text',
    vaultRoot,
    '```',
    '',
    '## 模块地图',
    '',
    ...manifest.modules.map((module) => `- [[${module._obsidianDir}/MOC|${moduleChinese.get(module.slug) ?? module.name}]] - ${module.purpose}`),
    '',
    '## 全站页面',
    '',
    '- [[90 - 全站页面/02 - 学习路线|学习路线]]',
    '- [[90 - 全站页面/10 - 全站概念索引|概念索引]]',
    '- [[90 - 全站页面/08 - 模块深挖路线|模块深挖路线]]',
    '',
    '## 使用建议',
    '',
    '- 网站继续作为发布版，Obsidian 用来做本地阅读、双链整理和二次笔记。',
    '- 每次网站内容变更后运行 `node scripts/export-obsidian.mjs` 重新生成 vault。',
    '- 自动导出的笔记建议不要手改；个人笔记可以新建在 `99 - 我的笔记/`。',
    '',
  ];
  writeText('00 - 全站导览.md', indexLines.join('\n'));
  const personalReadme = path.join(vaultRoot, '99 - 我的笔记', 'README.md');
  if (!fs.existsSync(personalReadme)) {
    writeText('99 - 我的笔记/README.md', '# 我的笔记\n\n这里放你在 Obsidian 里新增的个人理解、问题、摘录和复盘。导出脚本会保留这个目录。\n');
  }
}

function writeObsidianConfig() {
  writeText('.obsidian/app.json', JSON.stringify({
    legacyEditor: false,
    livePreview: true,
    defaultViewMode: 'preview',
    showLineNumber: false,
  }, null, 2));
  writeText('.obsidian/appearance.json', JSON.stringify({
    accentColor: '#6366f1',
    theme: 'obsidian',
  }, null, 2));
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
cleanGeneratedVault();
buildMappings(manifest);
exportPages(manifest);
writeObsidianConfig();

const noteCount = [...htmlToNote.keys()].length + manifest.modules.length + 2;
console.log(`Exported ${noteCount} Markdown notes to ${vaultRoot}`);
console.log(`Copied ${imageCopies.size} local assets to ${assetRoot}`);
