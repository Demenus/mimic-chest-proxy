# Mimic Chest Proxy — Documentation

Mimic Chest Proxy is an HTTP/HTTPS reverse proxy that can substitute responses with custom content. You define URL patterns (glob or regex), assign replacement content (HTML, JavaScript, etc.), and traffic matching those patterns is served your content instead of the origin.

This folder documents the server-side architecture and flows.

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | High-level overview: the two servers (mimic API and MITM proxy), components, and how they relate. |
| [Proxy flow](proxy-flow.md) | How the proxy handles requests and responses, when interception is decided, and how content is substituted. |
| [Mimic API](mimic-api.md) | REST API for managing mappings (create, read, update, delete) and assigning content. |
| [Data flow](data-flow.md) | How mappings are created, stored, and used by the proxy to replace responses. |

All diagrams use [Mermaid](https://mermaid.js.org/) and render on GitHub and most Markdown viewers.
