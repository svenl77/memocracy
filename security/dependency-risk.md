# Dependency Risk Report

| Package | Version | Risk Level | Notes |
|---------|---------|------------|-------|
| next | 14.0.4 | Medium | Framework updates frequently include security patches. Upgrade to the latest 14.x release to pick up fixes for SSR and middleware vulnerabilities disclosed in 2024. |
| jsonwebtoken | ^9.0.2 | Medium | Requires a strong `JWT_SECRET`; compromised secrets enable session forgery. Rotate the secret periodically and store it securely. |
| @solana/web3.js | ^1.87.6 | Medium | Large attack surface due to transitive dependencies (node-fetch 2.x). Monitor for advisories and update promptly. |
| prisma | ^5.7.1 | Low | Keep aligned with current patch releases to receive fixes for query engine vulnerabilities. |
| tailwindcss | ^3.3.0 | Low | Minimal direct risk but dependent on PostCSS. Update with PostCSS advisories. |

> _Generated automatically as part of the security audit. Consult `npm audit` in CI for authoritative vulnerability data._
