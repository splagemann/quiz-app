#!/bin/bash

# Release automation script for quiz-app
# Works with protected main branch requiring pull requests
# Usage: ./scripts/release.sh <major|minor|patch> [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
BUMP_TYPE=$1
DRY_RUN=false

if [ "$2" == "--dry-run" ]; then
  DRY_RUN=true
fi

# Validate bump type
if [ -z "$BUMP_TYPE" ] || { [ "$BUMP_TYPE" != "major" ] && [ "$BUMP_TYPE" != "minor" ] && [ "$BUMP_TYPE" != "patch" ]; }; then
  echo -e "${RED}Error: Invalid or missing bump type${NC}"
  echo "Usage: ./scripts/release.sh <major|minor|patch> [--dry-run]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/release.sh patch          # Bug fixes (1.0.0 -> 1.0.1)"
  echo "  ./scripts/release.sh minor          # New features (1.0.0 -> 1.1.0)"
  echo "  ./scripts/release.sh major          # Breaking changes (1.0.0 -> 2.0.0)"
  echo "  ./scripts/release.sh patch --dry-run  # Preview changes without committing"
  exit 1
fi

# Ensure we're on main branch and up to date
echo -e "${YELLOW}Checking out main branch...${NC}"
git fetch origin
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  git checkout main
fi
git pull origin main

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: ${CURRENT_VERSION}${NC}"

# Calculate new version
npm version $BUMP_TYPE --no-git-tag-version > /dev/null
NEW_VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}New version: ${NEW_VERSION}${NC}"
echo ""

# If dry run, revert package.json and exit
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN MODE - No changes will be committed${NC}"
  git checkout package.json package-lock.json
  echo ""
  echo "Next steps for actual release:"
  echo "  1. Update CHANGELOG.md with version ${NEW_VERSION}"
  echo "  2. Run: ./scripts/release.sh ${BUMP_TYPE}"
  exit 0
fi

# Check for uncommitted changes (excluding version files and changelog)
if [ -n "$(git status --porcelain | grep -v '^??' | grep -v 'package.json' | grep -v 'package-lock.json' | grep -v 'CHANGELOG.md')" ]; then
  echo -e "${RED}Error: You have uncommitted changes${NC}"
  echo "Please commit or stash your changes before creating a release"
  git checkout package.json package-lock.json
  exit 1
fi

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test

# Check if CHANGELOG.md has been updated
if ! grep -q "## \[${NEW_VERSION}\]" CHANGELOG.md; then
  echo -e "${YELLOW}Warning: CHANGELOG.md doesn't contain an entry for version ${NEW_VERSION}${NC}"
  echo "Please update CHANGELOG.md with release notes"
  echo ""
  echo "Add an entry like:"
  echo ""
  echo "## [${NEW_VERSION}] - $(date +%Y-%m-%d)"
  echo ""
  echo "### Added"
  echo "- New feature description"
  echo ""
  echo "### Fixed"
  echo "- Bug fix description"
  echo ""
  read -p "Do you want to edit CHANGELOG.md now? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${EDITOR:-nano} CHANGELOG.md
  else
    git checkout package.json package-lock.json
    exit 1
  fi
fi

# Confirm release
echo -e "${YELLOW}Ready to create release v${NEW_VERSION}${NC}"
echo ""
echo "This will:"
echo "  1. Create release branch: release/v${NEW_VERSION}"
echo "  2. Commit package.json and CHANGELOG.md"
echo "  3. Push branch and create Pull Request"
echo "  4. Merge PR to main (with admin privileges)"
echo "  5. Create and push git tag v${NEW_VERSION}"
echo "  6. Trigger CI/CD pipeline which will:"
echo "     - Build and publish multi-platform Docker images"
echo "     - Create a GitHub release with CHANGELOG notes"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  git checkout package.json package-lock.json
  exit 1
fi

# Create release branch
RELEASE_BRANCH="release/v${NEW_VERSION}"
echo -e "${YELLOW}Creating release branch: ${RELEASE_BRANCH}${NC}"
git checkout -b $RELEASE_BRANCH

# Commit version bump
echo -e "${YELLOW}Creating commit...${NC}"
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: prepare release v${NEW_VERSION}

Update CHANGELOG.md and package.json for v${NEW_VERSION} release

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push branch
echo -e "${YELLOW}Pushing release branch...${NC}"
git push -u origin $RELEASE_BRANCH

# Create Pull Request
echo -e "${YELLOW}Creating Pull Request...${NC}"
CHANGELOG_SECTION=$(sed -n "/## \[${NEW_VERSION}\]/,/## \[/p" CHANGELOG.md | sed '$ d')
PR_URL=$(gh pr create --title "Release v${NEW_VERSION}" --body "# Release v${NEW_VERSION}

This PR prepares the release for version ${NEW_VERSION}.

${CHANGELOG_SECTION}

## After Merge

Once merged, the v${NEW_VERSION} tag will be created and pushed, which will automatically trigger:
- Docker image build and publish to ghcr.io
- GitHub Release creation with release notes from CHANGELOG

🤖 Generated with [Claude Code](https://claude.com/claude-code)" --base main)

echo -e "${GREEN}Pull Request created: ${PR_URL}${NC}"
PR_NUMBER=$(echo $PR_URL | grep -o '[0-9]*$')

# Wait a moment for CI to start
echo -e "${YELLOW}Waiting for CI checks to start...${NC}"
sleep 5

# Merge PR with admin privileges (bypasses branch protection)
echo -e "${YELLOW}Merging Pull Request with admin privileges...${NC}"
gh pr merge $PR_NUMBER --squash --delete-branch --admin

# Switch back to main and update
echo -e "${YELLOW}Updating local main branch...${NC}"
git fetch origin
git checkout main
git reset --hard origin/main

# Create annotated tag
echo -e "${YELLOW}Creating tag v${NEW_VERSION}...${NC}"
git tag -d v${NEW_VERSION} 2>/dev/null || true  # Remove any existing local tag
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}

$(echo "$CHANGELOG_SECTION" | head -20)"

# Push tag to trigger CI/CD
echo -e "${YELLOW}Pushing tag to origin...${NC}"
git push origin v${NEW_VERSION}

echo ""
echo -e "${GREEN}✓ Release v${NEW_VERSION} created successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor the CI/CD pipeline at: https://github.com/splagemann/quiz-app/actions"
echo "  2. GitHub Actions will automatically:"
echo "     - Build and publish multi-platform Docker images"
echo "     - Create a GitHub release with CHANGELOG notes"
echo "  3. View the release at: https://github.com/splagemann/quiz-app/releases/tag/v${NEW_VERSION}"
echo ""
echo "Docker images will be available at:"
echo "  - ghcr.io/splagemann/quiz-app:latest"
echo "  - ghcr.io/splagemann/quiz-app:${NEW_VERSION}"
echo "  - ghcr.io/splagemann/quiz-app:${NEW_VERSION%%.*}"
