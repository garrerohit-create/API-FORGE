import { spawn } from 'node:child_process';
import path from 'node:path';

console.log('===========================================================');
console.log('       API FORGE — Concurrent Development Environment      ');
console.log('===========================================================');

const server = spawn('node', ['--watch', 'src/server.js'], {
  cwd: path.resolve(process.cwd(), 'server'),
  stdio: 'inherit',
  shell: true
});

const client = spawn('npm', ['run', 'dev', '--workspace=client'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\n[Dev Orchestrator] Stopping development processes...');
  try { server.kill(); } catch {}
  try { client.kill(); } catch {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
