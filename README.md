# Mimic Chest (mimic-chest-proxy)

An easy reverse proxy to be used graphically

## Safari and HTTPS

When you open Safari with the proxy (via "Open Safari" in the app), Safari may show a **"Connection not private"** or certificate warning for HTTPS sites. For now you need to **accept it in Safari** (e.g. "Show details" → "visit this website") so the proxy can intercept HTTPS. Chrome is launched with flags that skip this; Safari uses the system proxy and requires this one-time acceptance (or manually trusting the `NodeMITMProxyCA` certificate in Keychain Access).

## System proxy and other browsers (macOS)

"Open Safari" sets the **system** HTTP/HTTPS proxy (for all network interfaces). So **all** browsers and apps that use the system proxy will send traffic through Mimic Chest while that proxy is active. The proxy is restored when you **quit the app** (or when you click **"Restore proxy"** in the navbar).

If you closed the app without quitting (e.g. force quit, crash) and **other browsers can't access the internet**, either:

- Open Mimic Chest again and click **"Restore proxy"** in the top bar, or  
- On macOS: **System Settings → Network → [your connection] → Details → Proxies** and turn off **Web Proxy (HTTP)** and **Secure Web Proxy (HTTPS)**.

## License

Copyright (c) 2025 Aarón Negrín

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See [LICENSE.md](LICENSE.md) for the full license text.

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
