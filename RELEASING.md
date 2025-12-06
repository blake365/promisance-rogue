# Releasing

This project uses GitHub Actions with npm Trusted Publishing (OIDC) for automated releases.

## CLI Release Process

### 1. Update the version

Edit `cli/package.json` and bump the version:

```json
{
  "version": "0.2.0"
}
```

Follow [semver](https://semver.org/):
- **patch** (0.1.0 → 0.1.1): bug fixes
- **minor** (0.1.0 → 0.2.0): new features, backwards compatible
- **major** (0.1.0 → 1.0.0): breaking changes

### 2. Commit and push

```bash
git add cli/package.json
git commit -m "Bump CLI version to 0.2.0"
git push
```

### 3. Create a GitHub Release

1. Go to https://github.com/blake365/promisance-rogue/releases
2. Click **Draft a new release**
3. **Choose a tag:** Create a new tag matching the version (e.g., `v0.2.0`)
4. **Release title:** `v0.2.0`
5. **Description:** Add changelog notes (optional)
6. Click **Publish release**

### 4. Verify

- Check the [Actions tab](https://github.com/blake365/promisance-rogue/actions) for the workflow run
- Verify on npm: https://www.npmjs.com/package/promisance-rogue

## How it works

- The workflow (`.github/workflows/publish-cli.yml`) triggers on GitHub Release
- Uses npm Trusted Publishing with OIDC - no tokens/secrets needed
- Publishes with provenance (cryptographic proof of build origin)
- Requires the `release` environment (configured in repo settings)

## Manual trigger

You can also trigger a publish manually:
1. Go to Actions → "Publish CLI to npm"
2. Click "Run workflow"
3. Select branch and run

Note: Version in `package.json` must not already exist on npm.
