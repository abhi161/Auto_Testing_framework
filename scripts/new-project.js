#!/usr/bin/env node
// Scaffolds projects/<name>/ from projects/_template/. Mirrors what the Context Analyst
// agent does automatically (see .github/agents/playwright-context-analyst.md, Phase 0).
const fs = require('fs');
const path = require('path');

const name = process.argv[2];
if (!name) {
  console.error('Usage: npm run test:new-project -- <project-name>');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const src = path.join(root, 'projects', '_template');
const dest = path.join(root, 'projects', name);

if (fs.existsSync(dest)) {
  console.error(`projects/${name} already exists.`);
  process.exit(1);
}

fs.cpSync(src, dest, { recursive: true });
fs.copyFileSync(path.join(dest, '.env.example'), path.join(dest, '.env'));

console.log(`Created projects/${name}/ from the template.`);
console.log(`Fill in projects/${name}/.env, then set TEST_PROJECT=${name} in the root .env.`);
