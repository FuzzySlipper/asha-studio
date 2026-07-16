#!/usr/bin/env tsx
import { spawn, type ChildProcess } from 'node:child_process';

const children: ChildProcess[] = [];
let shuttingDown = false;

function start(command: string, args: readonly string[]): ChildProcess {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  children.push(child);
  return child;
}

function stopChildren(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

const fileService = start('pnpm', ['run', 'dev:files']);
const studioHost = start('pnpm', ['run', 'studio:dev:native']);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => stopChildren(signal));
}

for (const child of [fileService, studioHost]) {
  child.once('exit', (code, signal) => {
    if (!shuttingDown) {
      stopChildren('SIGTERM');
      process.exitCode = code ?? (signal === null ? 1 : 128);
    }
  });
}

await Promise.all(children.map(child => new Promise<void>(resolve => child.once('exit', () => resolve()))));
