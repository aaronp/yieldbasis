# GitHub Actions Workflows

## Deploy Pool Visualization

The `deploy-pool.yml` workflow automatically builds and deploys the YieldBasis Pool visualization to GitHub Pages.

### Setup Instructions

1. **Enable GitHub Pages in your repository**:
   - Go to Repository Settings → Pages
   - Under "Build and deployment", select "Source: GitHub Actions"

2. **Update the base path** (if needed):
   - Open `pool/vite.config.ts`
   - Change the `base` path from `/graphs/` to `/your-repo-name/`
   - This ensures assets load correctly on GitHub Pages

3. **Trigger the workflow**:
   - The workflow runs automatically on push to `main` or `master` branches when files in `pool/` change
   - You can also manually trigger it from the Actions tab

### What it does

1. **Checks out** the repository code
2. **Sets up Bun** (latest version) for fast builds
3. **Installs dependencies** using `bun install`
4. **Builds the app** using `bun run build` (creates production-optimized static files)
5. **Deploys** the `pool/dist` directory to GitHub Pages

### Accessing the deployed site

After successful deployment, your site will be available at:
```
https://[username].github.io/[repository-name]/
```

For example: `https://aaronp.github.io/graphs/`

### Manual deployment

You can also build and deploy manually:

```bash
cd pool
bun install
bun run build
# Upload the contents of pool/dist to your hosting provider
```

### Troubleshooting

**Assets not loading (404 errors)**:
- Verify the `base` path in `vite.config.ts` matches your repository name
- Check that GitHub Pages is enabled and set to use "GitHub Actions" as the source

**Build fails**:
- Check the Actions tab for detailed error logs
- Ensure all dependencies are listed in `package.json`
- Verify the build works locally with `bun run build`

**Workflow doesn't trigger**:
- Ensure changes are pushed to `main` or `master` branch
- Check that the workflow file is in `.github/workflows/` directory
- Verify the `paths` filter includes the files you changed
