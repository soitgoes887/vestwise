# Vestwise — RSU, ESPP & Pension Calculator

A financial calculator for UK tax residents with US company stock compensation.
Everything runs client-side; there is no backend.

- **Total Comp** (`/rsu`) — RSU vesting and ESPP projections, with income tax, NI,
  CGT and ISA allowances, plus base salary, bonus and car allowance
- **Pension** (`/pension`) — multi-pot projections with platform and fund fee modelling

Live data comes from third-party APIs called directly from the browser: FX rates
from the ECB via Frankfurter, share prices from Alpha Vantage.

## Local development

```bash
yarn install
yarn start          # http://localhost:3000
```

```bash
yarn test           # jest via react-scripts
npx tsc --noEmit    # type check
yarn build          # production build into build/
```

Node is pinned to 22 via `.nvmrc`, and yarn to 1.22.22 via `packageManager`.
`yarn.lock` is committed and CI installs with `--frozen-lockfile`, so add
dependencies with `yarn add` and commit the updated lockfile.

## Deployment

Hosted on **Cloudflare Workers** static assets at <https://vestwise.co.uk>.

Pushing to `main` triggers a Cloudflare build directly from GitHub — there is no
deploy workflow in this repo. Cloudflare runs `yarn build` and serves `build/`
per `wrangler.jsonc`.

SPA routing is handled by `assets.not_found_handling: "single-page-application"`,
which serves `index.html` with a 200 for unmatched paths so `/rsu` and `/pension`
work on direct navigation and reload.

To deploy by hand:

```bash
yarn deploy         # build + npx wrangler deploy
```

`.github/workflows/pr-validation.yml` runs tests, build and lint on pull requests.
Cloudflare does not run the test suite, so that workflow is the only gate.

### Environment variables

One variable, set in the Cloudflare Worker's settings:

| Variable | Purpose |
|---|---|
| `REACT_APP_ALPHA_VANTAGE_API_KEY` | Live share prices. Free tier; the client self-limits to 25 calls/day. |

It is inlined into the bundle at build time, so it is publicly readable — treat it
as public, not secret. Without it, `stockPriceService.ts` falls back to Alpha
Vantage's `demo` key and prices **silently stop resolving**.

## Known issues

- Share price lookup on `/rsu` is not currently working — most likely the Alpha
  Vantage key on the Worker. Tracked in `todo`.

## History

Previously hosted on GitHub Pages, then on a self-managed Kubernetes cluster with a
FastAPI backend, PostgreSQL and Supabase auth for saved configurations. All of that
was removed in August 2026 and the app is static again. See git history for the
Pulumi, Docker and Kubernetes configuration if it is ever needed.
