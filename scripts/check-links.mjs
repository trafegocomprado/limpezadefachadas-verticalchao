import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function collectReferences(html, styles) {
  const references = [];
  const attributePattern = /\b(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi;
  const srcsetPattern = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  const cssPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let match;
  while ((match = attributePattern.exec(html)) !== null) references.push(match[1].trim());
  while ((match = srcsetPattern.exec(html)) !== null) {
    for (const candidate of match[1].split(',')) {
      const reference = candidate.trim().split(/\s+/, 1)[0];
      if (reference) references.push(reference);
    }
  }
  while ((match = cssPattern.exec(styles)) !== null) references.push(match[1].trim());
  return references;
}

export function localTarget(root, reference) {
  if (!reference || reference.startsWith('#')) return null;
  if (reference.startsWith('//')) throw new Error(`Protocol-relative URL is forbidden: ${reference}`);
  if (/^[a-z][a-z\d+.-]*:/i.test(reference)) {
    if (/^(?:https?|tel|mailto):/i.test(reference) || reference.startsWith('data:')) return null;
    throw new Error(`Unsupported URL scheme: ${reference}`);
  }
  if (/^[a-z]:[\\/]/i.test(reference) || reference.includes('\\')) {
    throw new Error(`Windows path is forbidden: ${reference}`);
  }

  const withoutFragment = reference.split('#', 1)[0].split('?', 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    throw new Error(`Malformed URL encoding: ${reference}`);
  }
  if (/^[a-z]:[\\/]/i.test(decoded) || decoded.includes('\\')) {
    throw new Error(`Windows path is forbidden: ${reference}`);
  }
  if (decoded.split('/').includes('..')) throw new Error(`Path traversal is forbidden: ${reference}`);
  if (decoded.replace(/^\//, '').includes('//')) throw new Error(`Double slash is forbidden: ${reference}`);

  const relativePath = decoded.replace(/^\/+/, '') || 'index.html';
  const target = path.resolve(root, relativePath.endsWith('/') ? path.join(relativePath, 'index.html') : relativePath);
  const rootPrefix = `${path.resolve(root)}${path.sep}`;
  if (target !== path.resolve(root) && !target.startsWith(rootPrefix)) {
    throw new Error(`Reference escapes the site root: ${reference}`);
  }
  return target;
}

export async function checkLocalLinks(root = defaultRoot) {
  let html;
  let styles;
  try {
    [html, styles] = await Promise.all([
      readFile(path.join(root, 'index.html'), 'utf8'),
      readFile(path.join(root, 'styles.css'), 'utf8'),
    ]);
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Cannot check links before site files exist: ${error.path}`);
    throw error;
  }

  const checked = new Set();
  for (const reference of collectReferences(html, styles)) {
    const target = localTarget(root, reference);
    if (!target || checked.has(target)) continue;
    try {
      await access(target, constants.R_OK);
    } catch (error) {
      if (error?.code === 'ENOENT') throw new Error(`Missing local asset referenced by the site: ${reference}`);
      throw error;
    }
    checked.add(target);
  }

  return { checked: checked.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkLocalLinks();
  console.log(`Checked ${result.checked} local links.`);
}
