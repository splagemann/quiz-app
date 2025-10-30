# Release Skill

Automates the release process for quiz-app with protected main branch workflow.

## Context

This repository has:
- Protected main branch requiring pull requests
- GitHub Actions CI/CD pipeline that builds and publishes Docker images
- Automated GitHub release creation with CHANGELOG extraction
- Semantic versioning (MAJOR.MINOR.PATCH)

## Release Types

- **patch**: Bug fixes (1.0.0 → 1.0.1)
- **minor**: New features, backward compatible (1.0.0 → 1.1.0)
- **major**: Breaking changes (1.0.0 → 2.0.0)

## Workflow

When the user requests a release, follow these steps:

### 1. Determine Current Version
```bash
git fetch origin
git checkout main
git pull origin main
git tag --sort=-version:refname | head -1
```

### 2. Calculate New Version
Based on the release type (patch/minor/major), calculate the next version.

### 3. Update CHANGELOG.md
- Add new version section: `## [X.Y.Z] - YYYY-MM-DD`
- Review commits since last release: `git log <last-version>..HEAD --oneline`
- Categorize changes into: Added, Changed, Fixed, Security, Deprecated, Removed
- Update version comparison links at bottom of CHANGELOG

### 4. Update package.json
- Change version field from old version to new version

### 5. Create Release Branch and PR
```bash
git checkout -b release/vX.Y.Z
git add CHANGELOG.md package.json
git commit -m "chore: prepare release vX.Y.Z"
git push -u origin release/vX.Y.Z
gh pr create --title "Release vX.Y.Z" --body "<detailed release notes>" --base main
```

### 6. Wait for CI and Merge
- Wait for CI checks to pass (if quick) or use `--admin` flag
- Merge the PR: `gh pr merge <pr-number> --squash --delete-branch --admin`

### 7. Create and Push Git Tag
```bash
git checkout main
git fetch origin
git reset --hard origin/main
git tag -d vX.Y.Z 2>/dev/null  # Clean up any existing tag
git tag -a vX.Y.Z -m "Release vX.Y.Z

<summary of major changes>"
git push origin vX.Y.Z
```

### 8. Verify CI/CD Pipeline
```bash
gh run list --workflow=docker-publish.yml --limit 1
```

## Success Criteria

✅ CHANGELOG.md updated with new version
✅ package.json version updated
✅ PR merged to main
✅ Git tag created and pushed
✅ CI/CD pipeline triggered
✅ Docker images will be published to ghcr.io
✅ GitHub release will be created automatically

## Important Notes

- **Never push directly to main** - Always use PRs
- **Run tests locally** before creating PR: `npm test`
- **Update package.json version** - Don't forget this step!
- **Tag after PR merge** - Create tag from the merged commit, not the branch
- **Use admin merge if needed** - For urgent releases, use `--admin` flag to bypass checks
- **Verify the tag push** - This triggers the Docker build and release creation

## CI/CD Pipeline

The tag push triggers `.github/workflows/docker-publish.yml` which:
1. Builds multi-platform Docker images (linux/amd64, linux/arm64)
2. Publishes to `ghcr.io/splagemann/quiz-app` with tags:
   - `latest`
   - `vX.Y.Z`, `X.Y.Z`, `X.Y`, `X`
   - `sha-<commit>`
3. Creates GitHub Release with CHANGELOG notes

## Troubleshooting

**Problem**: Branch protection prevents push
**Solution**: Use PR workflow (steps 5-6)

**Problem**: PR can't be merged due to checks
**Solution**: Use `gh pr merge --admin` flag

**Problem**: Tag already exists
**Solution**: Delete local tag first: `git tag -d vX.Y.Z`

**Problem**: Local branch diverged from origin
**Solution**: `git reset --hard origin/main` after fetching

## Examples

### Patch Release (Bug fix)
```
User: "Release a new patch version"
Assistant: Reviews commits, updates CHANGELOG with fixes, creates v1.0.1
```

### Minor Release (New features)
```
User: "Release a new minor version"
Assistant: Reviews commits, updates CHANGELOG with new features, creates v1.1.0
```

### Major Release (Breaking changes)
```
User: "Release version 2.0.0"
Assistant: Reviews commits, updates CHANGELOG with breaking changes, creates v2.0.0
```
