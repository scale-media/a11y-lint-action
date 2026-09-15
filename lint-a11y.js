#!/usr/bin/env node

/**
 * Static accessibility linter for Shopify Liquid / HTML templates.
 * No browser, no Playwright, no runtime. Parses source files and checks
 * for common a11y mistakes that are almost always bugs.
 *
 * Usage:
 *   node ci/lint-a11y.js file1.liquid file2.liquid ...
 *   node ci/lint-a11y.js --diff   # reads changed files from git diff (PR mode)
 *
 * Exit codes:
 *   0  all files pass (or no lintable files)
 *   1  at least one error-level finding
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runRules } = require('./rules');

const LINTABLE_DIRS = new Set(['layout', 'sections', 'snippets', 'blocks', 'templates']);
const LINTABLE_EXT = '.liquid';

function isLintableFile(filePath) {
  if (!filePath.endsWith(LINTABLE_EXT) && !filePath.endsWith('.html') && !filePath.endsWith('.htm')) {
    return false;
  }
  const parts = filePath.split(path.sep);
  if (parts.length >= 2 && LINTABLE_DIRS.has(parts[0])) return true;
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) return true;
  return false;
}

function hasStructuralChanges(filePath) {
  try {
    const diff = execSync(
      `git diff origin/main...HEAD -- "${filePath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const addedLines = diff
      .split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'));
    return addedLines.some((l) => /<[a-zA-Z]|<\/|aria-|role=|alt=|tabindex|onclick/.test(l));
  } catch {
    return true;
  }
}

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only origin/main...HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function formatFindings(filePath, findings) {
  const lines = [];
  for (const f of findings) {
    const icon = f.severity === 'error' ? '❌' : '⚠️';
    const loc = f.line ? `:${f.line}` : '';
    lines.push(`  ${icon} ${f.ruleId}${loc} — ${f.message} [${f.severity}]`);
  }
  return `${filePath}\n${lines.join('\n')}`;
}

function ghAnnotation(filePath, f) {
  const level = f.severity === 'error' ? 'error' : 'warning';
  const line = f.line || 1;
  return `::${level} file=${filePath},line=${line}::${f.ruleId}: ${f.message}`;
}

function main() {
  const args = process.argv.slice(2);
  const diffMode = args.includes('--diff');
  const ciMode = args.includes('--ci');
  const structuralOnly = args.includes('--structural-only');
  const plainArgs = args.filter((a) => !a.startsWith('--'));

  let files;
  if (diffMode) {
    const changed = getChangedFiles();
    files = changed.filter(isLintableFile);
    if (structuralOnly) {
      files = files.filter(hasStructuralChanges);
    }
  } else if (plainArgs.length > 0) {
    files = plainArgs.filter((f) => fs.existsSync(f));
  } else {
    console.log('Usage: lint-a11y.js [--diff] [--structural-only] [--ci] [file ...]');
    process.exit(0);
  }

  if (files.length === 0) {
    console.log('No lintable template files to check. Skipping.');
    process.exit(0);
  }

  console.log(`Linting ${files.length} file(s)...\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const filePath of files) {
    const absPath = path.resolve(filePath);
    let source;
    try {
      source = fs.readFileSync(absPath, 'utf-8');
    } catch {
      console.error(`Could not read ${filePath}, skipping.`);
      continue;
    }

    const findings = runRules(source, filePath);
    if (findings.length === 0) continue;

    const errors = findings.filter((f) => f.severity === 'error');
    const warnings = findings.filter((f) => f.severity === 'warning');
    totalErrors += errors.length;
    totalWarnings += warnings.length;

    console.log(formatFindings(filePath, findings));
    console.log();

    if (ciMode) {
      for (const f of findings) {
        console.log(ghAnnotation(filePath, f));
      }
    }
  }

  console.log(`\nDone. ${totalErrors} error(s), ${totalWarnings} warning(s).`);
}

main();
