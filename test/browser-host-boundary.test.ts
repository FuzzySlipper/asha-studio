import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ASHA_BROWSER_HOST_COMPATIBILITY_VERSION,
  ASHA_BROWSER_HOST_PROVIDER_KIND,
  type NativeBrowserHostProviderScope,
  type NativeBrowserHostRuntimeBridge,
} from '@asha/browser-host';
import { MANIFEST_OPERATIONS, type RuntimeBridge } from '@asha/runtime-bridge';
import {
  disconnectStudioBrowserHostRuntimeBridge,
  resolveStudioBrowserHostRuntimeBridge,
} from '@asha-studio/store';

function browserHostBridge(sessionId: string, onDisconnect: () => void): NativeBrowserHostRuntimeBridge {
  let disconnected = false;
  const operations = Object.fromEntries(
    MANIFEST_OPERATIONS.map(({ facadeMethod }) => [facadeMethod, () => ({})]),
  ) as unknown as RuntimeBridge;
  Object.defineProperty(operations, 'browserHostLifecycle', {
    enumerable: false,
    value: {
      compatibilityVersion: ASHA_BROWSER_HOST_COMPATIBILITY_VERSION,
      sessionId,
      status: () => disconnected ? 'disconnected' : 'active',
      disconnect: () => {
        if (!disconnected) {
          disconnected = true;
          onDisconnect();
        }
      },
    },
  });
  return operations as NativeBrowserHostRuntimeBridge;
}

function browserHostScope(bridge: RuntimeBridge, sessionId = '7'): NativeBrowserHostProviderScope {
  return {
    ashaRuntimeBridge: {
      kind: ASHA_BROWSER_HOST_PROVIDER_KIND,
      backend: 'native_rust',
      productAuthority: true,
      referenceFallback: false,
      createRuntimeBridge: () => bridge,
      browserHostCompatibilityVersion: ASHA_BROWSER_HOST_COMPATIBILITY_VERSION,
      browserHostSessionId: sessionId,
    },
  } as unknown as NativeBrowserHostProviderScope;
}

void test('Studio resolves only the standard one-cell browser-host provider and disconnects its lifecycle once', async () => {
  let disconnects = 0;
  const bridge = browserHostBridge('7', () => { disconnects += 1; });
  const resolved = await resolveStudioBrowserHostRuntimeBridge(browserHostScope(bridge));

  assert.equal(resolved.bridge, bridge);
  assert.deepEqual(resolved.browserHost, {
    compatibilityVersion: 'browser-host.v0',
    lifecycleStatus: 'active',
    providerGlobal: 'globalThis.ashaRuntimeBridge',
    providerKind: 'asha.runtime_bridge.native_rust_provider.v1',
    sessionId: '7',
  });

  disconnectStudioBrowserHostRuntimeBridge(resolved.bridge);
  disconnectStudioBrowserHostRuntimeBridge(resolved.bridge);
  assert.equal(disconnects, 1);
  assert.equal(resolved.bridge.browserHostLifecycle.status(), 'disconnected');
});

void test('Studio fails closed for missing legacy spoofed partial and non-browser-host providers', async () => {
  const legacyProviderGlobal = ['ashaStudio', 'RuntimeBridge'].join('');
  const legacyProviderKind = ['asha_studio', 'native_runtime_bridge_provider', 'v1'].join('.');
  await assert.rejects(
    resolveStudioBrowserHostRuntimeBridge({}),
    /requires globalThis\.ashaRuntimeBridge from @asha\/browser-host/u,
  );
  await assert.rejects(
    resolveStudioBrowserHostRuntimeBridge({
      [legacyProviderGlobal]: {
        kind: legacyProviderKind,
      },
    } as unknown as NativeBrowserHostProviderScope),
    /requires globalThis\.ashaRuntimeBridge from @asha\/browser-host/u,
  );
  await assert.rejects(
    resolveStudioBrowserHostRuntimeBridge({
      ashaRuntimeBridge: {
        kind: ASHA_BROWSER_HOST_PROVIDER_KIND,
        backend: 'reference_bridge',
        productAuthority: false,
        referenceFallback: true,
        createRuntimeBridge: () => browserHostBridge('8', () => undefined),
      },
    }),
    /public native Rust contract/u,
  );
  await assert.rejects(
    resolveStudioBrowserHostRuntimeBridge(browserHostScope({} as RuntimeBridge, '9')),
    /missing required operation/u,
  );

  const noLifecycle = Object.fromEntries(
    MANIFEST_OPERATIONS.map(({ facadeMethod }) => [facadeMethod, () => ({})]),
  ) as unknown as RuntimeBridge;
  await assert.rejects(
    resolveStudioBrowserHostRuntimeBridge(browserHostScope(noLifecycle, '10')),
    /did not create an active browser-host\.v0 client lifecycle/u,
  );
});
