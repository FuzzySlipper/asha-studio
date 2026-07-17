import assert from 'node:assert/strict';
import test from 'node:test';
import { readStudioStartupProject } from '../apps/studio-app/src/app/studio-startup';

test('startup project deep links decode one host path', () => {
  assert.deepEqual(
    readStudioStartupProject('http://192.168.1.22:4200/?project=%2Fhome%2Fdev%2Fasha-demo'),
    { status: 'open', path: '/home/dev/asha-demo' },
  );
  assert.deepEqual(
    readStudioStartupProject('http://127.0.0.1:4200/?project=%2Fhome%2Fdev%2Fasha-demo%2Fasha.game.toml'),
    { status: 'open', path: '/home/dev/asha-demo/asha.game.toml' },
  );
});

test('startup project deep links distinguish absence from malformed input', () => {
  assert.deepEqual(readStudioStartupProject('http://127.0.0.1:4200/'), { status: 'none' });
  assert.equal(
    readStudioStartupProject('http://127.0.0.1:4200/?project=').status,
    'invalid',
  );
  assert.equal(
    readStudioStartupProject('http://127.0.0.1:4200/?project=/a&project=/b').status,
    'invalid',
  );
  assert.equal(
    readStudioStartupProject('http://127.0.0.1:4200/?project=%00bad').status,
    'invalid',
  );
});
