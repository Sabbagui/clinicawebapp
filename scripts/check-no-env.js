#!/usr/bin/env node
const { execSync } = require('node:child_process');

function getTrackedFiles() {
  const raw = execSync('git ls-files -z', { encoding: 'utf8' });
  return raw.split('\0').filter(Boolean);
}

function isForbidden(path) {
  const normalized = path.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();
  const name = normalized.split('/').pop() || normalized;

  if (lower.includes('/node_modules/')) return true;

  const isEnvLike =
    name === '.env' ||
    name.startsWith('.env.') ||
    lower.endsWith('.env') ||
    lower.endsWith('.pem') ||
    lower.endsWith('.key');

  if (isEnvLike && !lower.endsWith('.env.example') && !lower.endsWith('.env.local.example')) {
    return true;
  }

  return false;
}

function main() {
  const tracked = getTrackedFiles();
  const violations = tracked.filter(isForbidden);

  if (violations.length > 0) {
    console.error('Guard failed. Forbidden tracked files detected:');
    for (const file of violations) console.error(` - ${file}`);
    process.exit(1);
  }

  console.log('Guard passed. No forbidden tracked env/secret/artifact files found.');
}

main();
