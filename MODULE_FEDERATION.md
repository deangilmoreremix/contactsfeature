# SmartCRM Remote — Module Federation Expose Documentation

This repository exports a Module Federation remote named `smartcrm`.

Available exposes:
- `./SmartCRMApp` — The full application React component (recommended for host integration).
- `./App` — Alias to the full application (legacy compatibility).
- `./mount` — A mount API function for host-controlled mounting/unmounting.

Host usage examples

1) Dynamic import of full React component

```js
// In host application (async code)
const RemoteApp = await import('smartcrm/SmartCRMApp');
const SmartCRMApp = RemoteApp.default; // React component

// Render using your host's React tree
<SmartCRMApp sharedData={sharedData} initialRoute="/contacts" onEvent={handleEvent} />
```

2) Using the mount API (recommended for manual control)

```js
// Host code
(async function(){
  const mountModule = await import('smartcrm/mount');
  const mount = mountModule.mount || mountModule.default; // support default and named
  const container = document.getElementById('remote-root');
  const unmount = mount(container, { sharedData: { user, isAuthenticated: true }, initialRoute: '/contacts' });

  // When you need to unmount
  // unmount();
})();
```

3) Lazy load inside host router

```js
// Host route lazy loading
const SmartCRM = React.lazy(() => import('smartcrm/App'));

<Route path="/contacts/*" element={<React.Suspense fallback={<div>Loading...</div>}><SmartCRM /></React.Suspense>} />
```

Debugging

- Console logs:
  - The remote logs `BUILD_ID:` and `[SmartCRM Remote] FULL APPLICATION BOOTSTRAP COMPLETE` when initialized.
  - The mount API logs when called.
- If host sees duplicate React warnings, ensure the host has `react` and `react-dom` as shared singletons in its federation config and that versions match (React 18).

Compatibility

- Vite plugin: @originjs/vite-plugin-federation (works with Vite 8 using the provided workaround)
- Exposes are ESM-compatible and should be importable by hosts using Webpack or Vite Module Federation runtimes.

Notes

- The remote preserves Tailwind styling, Zustand state, Supabase integrations, and all existing routes/pages.
- If you use a Service Worker on the host, ensure it doesn't cache remote assets unexpectedly.
