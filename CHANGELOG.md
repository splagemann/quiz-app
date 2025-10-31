# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.2] - 2025-10-31

### Fixed
- Docker build error in changelog page (TypeScript JSX.Element type issue)
- PR validation workflow now properly sets DATABASE_URL for Prisma generation

### Added
- PR validation workflow for automated build and Docker testing
  - Validates Docker builds on all pull requests
  - Runs Next.js build to catch TypeScript errors
  - Prevents build failures from being merged to main
- Environment variable support in Docker setup
  - DEFAULT_LANG: Default language setting (defaults to 'en')
  - ADMIN_PASSPHRASE: Optional passphrase for admin/host sections

### Changed
- Updated documentation for Docker environment variables
- Improved CI/CD workflow descriptions in CLAUDE.md

## [1.1.1] - 2025-10-31

### Added
- Changelog page in admin section (`/admin/changelog`)
  - Displays CHANGELOG.md with markdown parsing
  - Dark mode support
  - Browser back navigation
- Version display in admin header
  - Clickable version number linking to changelog
  - Positioned next to "Quiz Management" heading
- BackButton component for consistent browser back navigation
- Navigation links on join game pages
  - "Back to quiz selection" links on code entry and name entry pages

### Changed
- Updated admin create/edit pages to use BackButton for better navigation
- Improved navigation consistency across admin pages
- Removed redundant "View Changelog" link in favor of version number link

## [1.1.0] - 2025-10-30

### Added
- Admin authentication with bcrypt password hashing
  - Secure password validation for admin access
  - Environment-based admin credentials (ADMIN_PASSWORD)
  - Login form with comprehensive test coverage
- Dark mode toggle for admin interface
  - System preference detection
  - Persistent user preference in localStorage
  - Smooth theme transitions
- Per-quiz language support
  - Individual language setting for each quiz
  - Quiz-specific localization during gameplay
  - Language selector in quiz creation/edit forms
  - Independent from global application language

### Changed
- Replaced Next.js middleware with next.config.js rewrites for i18n routing
- Simplified multiplayer answer button color scheme
- Enhanced LanguageSelector component with improved UX
- Improved test coverage for authentication and i18n features

### Fixed
- Removed unused i18nQuiz.ts causing CI parsing errors
- Suppressed console errors in test environment

### Security
- Implemented bcrypt password hashing for admin authentication
- Secure password comparison with timing-attack resistance

## [1.0.1] - 2025-10-30

### Added
- Automated GitHub release creation in CI/CD pipeline
  - Release notes automatically extracted from CHANGELOG
  - Docker image information included in releases
  - Pre-release detection for beta versions

### Changed
- Updated package name from `claude-quiz` to `quiz-app`
- Translated all technical documentation to English
  - CLAUDE.md fully translated
  - README.md translated with German UI labels for navigation
- Improved release automation script with GitHub release information

### Fixed
- Docker build issues by adding DATABASE_URL build argument
- Removed absolute paths from repository
- Updated database path documentation to use relative paths
- Fixed SHA tag prefix in Docker image tagging

### Documentation
- Added comprehensive release information to README
- Enhanced CI/CD pipeline documentation
- Added semantic versioning guidelines
- Improved Docker deployment instructions

## [1.0.0] - 2025-10-30

### Added
- Complete quiz application with German UI localization
- Single-player mode with score tracking and immediate feedback
- Multiplayer mode with real-time gameplay
  - QR code generation for easy joining
  - 6-digit session codes
  - Host controls for game flow
  - Live player list with avatars
  - Real-time answer tracking
  - Automatic and manual answer reveal
  - Leaderboard with rankings
- Question management system
  - Create, edit, and delete quizzes
  - Add questions with multiple choice answers
  - Optional question titles and descriptions
  - Optional question images
  - Flexible answer configuration (2-6 answers)
  - Image support in answers
- Image upload functionality
  - Support for JPEG, PNG, GIF, WebP
  - Maximum file size: 5MB
  - Automatic unique filename generation
- Real-time features using Server-Sent Events (SSE)
  - Player join/leave notifications
  - Live answer tracking
  - Synchronized question transitions
  - Game state synchronization
- Avatar system using DiceBear Avataaars API
- Mobile-optimized UI
  - Color-coded answers (green/red for correct/incorrect)
  - Full-screen game views
  - Responsive design for all screen sizes
- Dynamic page titles based on quiz and context
- Custom purple-blue gradient favicon

### Infrastructure
- SQLite database with Prisma ORM
- Next.js 14+ with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Docker multi-stage builds
  - Multi-platform support (linux/amd64, linux/arm64)
  - Persistent volumes for database and uploads
  - Automatic database migrations on startup
  - Health checks for container monitoring
- GitHub Actions CI/CD pipeline
  - Automated Docker image builds
  - Publishing to GitHub Container Registry (ghcr.io)
  - Semantic version tagging
  - Build caching for faster builds
- Comprehensive test coverage
  - Jest testing framework
  - React Testing Library
  - API route tests
  - Component tests
  - commitlint for conventional commits
  - Husky for git hooks

### Technical Details
- Dynamic rendering for database-dependent pages
- Cascading deletes for data integrity
- In-memory game state management
- Session code collision prevention
- Environment-based configuration
- German date formatting

[Unreleased]: https://github.com/splagemann/quiz-app/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/splagemann/quiz-app/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/splagemann/quiz-app/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/splagemann/quiz-app/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/splagemann/quiz-app/releases/tag/v1.0.0
