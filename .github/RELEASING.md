# Releasing

fyron publishes three packages from this monorepo:

| Package          | npm                                                   |
|------------------|-------------------------------------------------------|
| `fyron`            | https://www.npmjs.com/package/fyron                     |
| `@fyron/cli`       | https://www.npmjs.com/package/@fyron/cli                |
| `create-fyron-app` | https://www.npmjs.com/package/create-fyron-app          |

## One-time setup

1. Generate an **npm automation token** with publish access (https://www.npmjs.com/settings/<user>/tokens).
2. Add as repo secret: GitHub → Settings → Secrets and variables → Actions → **New repository secret** named `NPM_TOKEN`.
3. Confirm the three package names are owned by your npm account.

## Cutting a release

The publish workflow is **tag-driven**.

```bash
# 1. bump versions in lockstep (all 3 packages must match for compatibility)
NEW=0.0.2
node -e "for (const f of ['packages/core', 'packages/cli', 'packages/create-fyron-app']) {
  const pkg = require('path').join(process.cwd(), f, 'package.json');
  const j = require(pkg);
  j.version = '$NEW';
  require('fs').writeFileSync(pkg, JSON.stringify(j, null, 2) + '\n');
}"

# 2. update create-fyron-app default fyronVersion / cliVersion if you want
#    new scaffolds to default to the new version (optional)

# 3. commit + tag + push
git add packages/*/package.json
git commit -m "release: v$NEW"
git tag v$NEW
git push && git push --tags
```

The `publish.yml` workflow fires on the tag, runs typecheck + build + test, then `pnpm publish` for each package with `--access public --provenance`.

## Manual / dry-run

GitHub → Actions → **publish** → **Run workflow**. Tick **dry run** to see which versions would be published without actually doing it.

## Workspace deps & versioning

`@fyron/cli` depends on `fyron` via `workspace:*`. pnpm rewrites this to a real version range at publish time, so the published tarball depends on the matching `fyron` version. **Bump all three packages together** so the workspace ranges resolve cleanly on the registry.

## Re-publishing the same version

npm doesn't allow it. If a publish failed mid-flight, bump the patch and retag.

## Provenance

The workflow uses `--provenance` (requires `id-token: write` permission, already set). This signs published tarballs with GitHub-issued OIDC, so users can verify the package came from this repo.
