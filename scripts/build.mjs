import { access, cp, lstat, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateSite } from './validate-site.mjs';
import { checkLocalLinks } from './check-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployFiles = [
  'index.html',
  'styles.css',
  'script.js',
  'contact-config.js',
  'contact-form.js',
  'robots.txt',
  'sitemap.xml',
  '_headers',
  '_redirects',
];
const deployAssets = [
  'assets/apple-touch-icon.png',
  'assets/favicon-32.png',
  'assets/fonts',
  'assets/img/webp',
];

async function requireSource(relativePath, expectedType = 'file') {
  const absolutePath = path.join(root, relativePath);
  try {
    await access(absolutePath, constants.R_OK);
    const stats = await lstat(absolutePath);
    const validType = expectedType === 'directory' ? stats.isDirectory() : stats.isFile();
    if (!validType) throw new Error(`${relativePath} must be a ${expectedType}`);
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Required build source is missing: ${relativePath}`);
    throw error;
  }
}

async function populateOutput(outputPath, includeBuildMetadata) {
  await mkdir(outputPath, { recursive: true });
  for (const relativePath of deployFiles) {
    await cp(path.join(root, relativePath), path.join(outputPath, relativePath));
  }
  for (const relativePath of deployAssets) {
    await mkdir(path.dirname(path.join(outputPath, relativePath)), { recursive: true });
    await cp(path.join(root, relativePath), path.join(outputPath, relativePath), { recursive: true });
  }
  if (includeBuildMetadata) {
    await cp(path.join(root, 'build.json'), path.join(outputPath, 'build.json'));
  }
}

export async function replaceOutputs(
  outputRoot,
  stagedOutputs,
  { move = rename, remove = rm, logger = console } = {},
) {
  const transactionId = `${process.pid}-${Date.now()}`;
  const operations = stagedOutputs.map(({ name, stagedPath }) => ({
    name,
    stagedPath,
    targetPath: path.join(outputRoot, name),
    backupPath: path.join(outputRoot, `.${name}.backup-${transactionId}`),
    hadPrevious: false,
    installed: false,
  }));

  try {
    for (const operation of operations) {
      try {
        await move(operation.targetPath, operation.backupPath);
        operation.hadPrevious = true;
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }

    for (const operation of operations) {
      await move(operation.stagedPath, operation.targetPath);
      operation.installed = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const operation of operations.reverse()) {
      if (operation.installed) {
        try {
          await move(operation.targetPath, operation.stagedPath);
          operation.installed = false;
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
          continue;
        }
      }
      if (operation.hadPrevious) {
        try {
          await move(operation.backupPath, operation.targetPath);
          operation.hadPrevious = false;
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], 'Output replacement and rollback failed; backups were preserved');
    }
    throw error;
  }

  const cleanupResults = await Promise.allSettled(
    operations
      .filter(({ hadPrevious }) => hadPrevious)
      .map(({ backupPath }) => Promise.resolve().then(() => remove(backupPath, { recursive: true, force: true }))),
  );
  const cleanupFailures = cleanupResults.filter(({ status }) => status === 'rejected');
  for (const failure of cleanupFailures) {
    try {
      logger.warn(`Committed outputs; a previous-output backup could not be removed: ${failure.reason?.message ?? failure.reason}`);
    } catch {
      // Logging is best-effort after commit; output replacement remains successful.
    }
  }

  return { committed: true, cleanupFailures: cleanupFailures.length };
}

export async function buildSite() {
  for (const relativePath of [...deployFiles, 'build.json']) {
    await requireSource(relativePath);
  }
  await requireSource('assets', 'directory');
  await validateSite(root);
  await checkLocalLinks(root);

  const stagingRoot = await mkdtemp(path.join(root, '.tmp-build-'));
  const stagedDist = path.join(stagingRoot, 'dist');
  const stagedPublic = path.join(stagingRoot, 'public');

  try {
    await populateOutput(stagedDist, true);
    await populateOutput(stagedPublic, false);
    await replaceOutputs(
      root,
      [
        { name: 'dist', stagedPath: stagedDist },
        { name: 'public', stagedPath: stagedPublic },
      ],
    );
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }

  console.log('Built dist/ and public/ from validated sources.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSite();
}
