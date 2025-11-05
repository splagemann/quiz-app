# Automated Release Workflow

This document describes the automated release workflow for the quiz-app project.

## Overview

The automated release workflow (`.github/workflows/release.yml`) streamlines the entire release process from version bumping to GitHub release creation.

## Features

- **Automated Version Bumping**: Automatically bumps version in `package.json` and `package-lock.json`
- **CHANGELOG Validation**: Ensures CHANGELOG.md has an entry for the new version
- **Pull Request Creation**: Creates a release PR with extracted release notes
- **Automatic Tagging**: Creates and pushes git tags after PR merge
- **Docker Build Trigger**: Automatically triggers Docker image builds and GitHub release creation
- **Dry Run Mode**: Test the workflow without making any changes

## Prerequisites

Before creating a release:

1. **Update CHANGELOG.md**: Add release notes under the `[Unreleased]` section or create a new version section
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - New features

   ### Fixed
   - Bug fixes

   ### Changed
   - Changes to existing features
   ```

2. **Commit all changes**: Ensure all code changes are committed and pushed to main

3. **Tests passing**: Ensure all tests are passing on main branch

## How to Use

### Option 1: GitHub UI

1. Go to **Actions** tab in GitHub
2. Select **"Automated Release"** workflow
3. Click **"Run workflow"** button
4. Select the branch: `main`
5. Choose version bump type:
   - **patch** (1.0.0 → 1.0.1): Bug fixes, minor changes
   - **minor** (1.0.0 → 1.1.0): New features, backwards-compatible
   - **major** (1.0.0 → 2.0.0): Breaking changes
6. Optionally enable **"Dry run"** to test without making changes
7. Click **"Run workflow"**

### Option 2: GitHub CLI

```bash
# Patch release (bug fixes)
gh workflow run release.yml -f version_type=patch

# Minor release (new features)
gh workflow run release.yml -f version_type=minor

# Major release (breaking changes)
gh workflow run release.yml -f version_type=major

# Dry run
gh workflow run release.yml -f version_type=minor -f dry_run=true
```

## Workflow Steps

The workflow performs the following steps automatically:

1. **Checkout & Setup**
   - Checks out the repository
   - Sets up Node.js environment
   - Installs dependencies

2. **Run Tests**
   - Executes all tests to ensure quality

3. **Version Bump**
   - Bumps version in `package.json` and `package-lock.json`
   - Uses semantic versioning (semver)

4. **CHANGELOG Validation**
   - Validates that CHANGELOG.md contains an entry for the new version
   - Fails if entry is missing (provides helpful error message)

5. **Create Release Branch**
   - Creates a new branch: `release/vX.Y.Z`
   - Commits version changes

6. **Create Pull Request**
   - Creates a PR from release branch to main
   - Includes release notes extracted from CHANGELOG
   - Adds helpful context and automation notes

7. **Merge PR**
   - Attempts to auto-merge the PR (requires appropriate permissions)
   - If branch protection rules prevent auto-merge, waits for manual approval
   - Polls for up to 5 minutes for PR merge

8. **Create & Push Tag**
   - After PR merge, creates annotated git tag: `vX.Y.Z`
   - Pushes tag to trigger Docker build workflow

9. **Trigger CI/CD**
   - Docker build workflow automatically starts
   - Builds multi-platform images (linux/amd64, linux/arm64)
   - Publishes to GitHub Container Registry
   - Creates GitHub release with CHANGELOG notes

## What Happens After

Once the workflow completes:

1. **Docker Images**: Available at `ghcr.io/splagemann/quiz-app:vX.Y.Z`
2. **GitHub Release**: Created automatically with CHANGELOG notes
3. **Version Tags**: Multiple semantic version tags created (X.Y.Z, X.Y, X, latest)
4. **Notification**: GitHub Actions will send completion notification

## Troubleshooting

### Workflow fails with "CHANGELOG entry not found"

**Problem**: CHANGELOG.md doesn't contain an entry for the new version

**Solution**:
1. Update CHANGELOG.md with release notes for the new version
2. Commit and push changes
3. Re-run the workflow

### PR not auto-merging

**Problem**: Branch protection rules require manual approval

**Solution**:
1. The workflow will wait up to 5 minutes for manual merge
2. Review and approve the release PR manually
3. Merge the PR
4. Workflow will continue automatically

### Tag already exists

**Problem**: Version tag already exists in repository

**Solution**:
1. Delete the existing tag if it was created in error:
   ```bash
   git tag -d vX.Y.Z
   git push origin :refs/tags/vX.Y.Z
   ```
2. Re-run the workflow

## Manual Release (Fallback)

If the automated workflow fails, you can still release manually:

```bash
# 1. Bump version
npm version minor --no-git-tag-version

# 2. Update CHANGELOG.md
# (manually edit the file)

# 3. Create release branch
git checkout -b release/vX.Y.Z
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: prepare release vX.Y.Z"

# 4. Push and create PR
git push -u origin release/vX.Y.Z
gh pr create --title "chore: prepare release vX.Y.Z" --body "Release notes..."

# 5. Merge PR
gh pr merge --squash

# 6. Create and push tag
git checkout main
git pull
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Comparison with Manual Script

| Feature | Manual Script | Automated Workflow |
|---------|--------------|-------------------|
| Triggers | Command line | GitHub UI / API |
| CHANGELOG validation | Pre-flight check | Automated validation |
| Version bumping | Automated | Automated |
| PR creation | Automated | Automated |
| PR merging | Requires admin | Auto-merge or wait |
| Tagging | Automated | Automated |
| Dry run | Supported | Supported |
| Error recovery | Manual | Automatic retry |
| Notification | Terminal only | GitHub Actions |

## Best Practices

1. **Always update CHANGELOG first**: Before running the workflow, ensure CHANGELOG.md is up to date

2. **Use dry run for testing**: Test the workflow with dry run mode before actual release

3. **Review the PR**: Even though it auto-merges, review the changes in the PR

4. **Monitor the workflow**: Check GitHub Actions to ensure all steps complete successfully

5. **Semantic versioning**: Follow semver guidelines for version bumps:
   - **patch**: Bug fixes only
   - **minor**: New features, backwards-compatible
   - **major**: Breaking changes

## Related Documentation

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Workflow](.github/workflows/docker-publish.yml)
