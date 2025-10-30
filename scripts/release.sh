#!/bin/bash

# Release automation script for quiz-app
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
  exit 0
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${YELLOW}Warning: You are not on the main branch (current: ${CURRENT_BRANCH})${NC}"
  read -p "Do you want to continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    git checkout package.json package-lock.json
    exit 1
  fi
fi

# Check for uncommitted changes
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
echo "  1. Commit package.json and CHANGELOG.md"
echo "  2. Create an annotated git tag: v${NEW_VERSION}"
echo "  3. Push to origin with tags (triggers CI/CD)"
echo "  4. GitHub Actions will:"
echo "     - Build and publish multi-platform Docker images"
echo "     - Create a GitHub release with CHANGELOG notes"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  git checkout package.json package-lock.json
  exit 1
fi

# Commit version bump
echo -e "${YELLOW}Creating commit...${NC}"
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to v${NEW_VERSION}"

# Create annotated tag
echo -e "${YELLOW}Creating tag v${NEW_VERSION}...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

# Push to origin
echo -e "${YELLOW}Pushing to origin...${NC}"
git push origin $CURRENT_BRANCH --tags

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
