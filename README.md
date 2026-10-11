# Chappal House

Next.js storefront for chappals and khussa, running on Cloudflare Workers.

```bash
npm install
npm run dev    # http://localhost:3000, no env file needed
```

## Docs

- [Running locally](docs/running-locally.md): catalog, images, tests, what is provisional
- [Environment variables](docs/environment.md): every variable, local and on the Worker
- [Deploying](docs/deploy-cloudflare.md): CI, domain move, go-live and SEO checks
- [Database rollout plan](docs/implementation-plan.md): Supabase migrations and stock import
- [Codex prompt](docs/cli-codex-execution-prompt.md): runs the rollout plan
- [Design system](docs/design-system.md): type, space and motion tokens
- [Returns policy](docs/policies/returns-and-exchanges.md): draft, not published

`index.html` and `CNAME` in the repo root are the GitHub Pages placeholder that
holds `chappalhouse.live`. Remove them only after the domain serves the Worker.
