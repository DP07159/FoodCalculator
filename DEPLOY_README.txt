Food Moment Platform – R10 Shopping Share Hotfix – 2026-09-11

This hotfix addresses a deployment/cache compatibility problem in R9:
- shopping.js now creates the sharing button and dialog at runtime if an older cached shopping.html is still present
- all share bindings are null-safe so an older HTML shell cannot abort shopping.js setup
- recipe shopping-cart control uses deterministic 52px desktop / 48px mobile dimensions
- shopping share control uses the same deterministic action size
- service worker cache bumped to v51

Server requirement:
The R9 server shopping-sharing package must already be deployed because it provides the workspace-share endpoints and migration 0019.
