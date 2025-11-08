# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.1] - 2025-11-05

### Added
- **Button component**: Reusable button component with consistent styling across the application
  - Variants: primary, secondary, danger, success, outline
  - Sizes: small (sm), medium (md), large (lg)
  - Full TypeScript support with proper type definitions
  - Automatic dark mode support
  - Proper accessibility with focus states
- **Card component**: Flexible container component for consistent card styling
  - Variants: default, form, gradient
  - Automatic dark mode support
  - Responsive padding and styling
- **FormInput component**: Unified form input wrapper with enhanced UX
  - Integrated label, error message, and helper text support
  - Consistent styling across all forms
  - Full dark mode support
  - Type-safe props with TypeScript
- **GameHeader component**: Unified header component for all game modes
  - Single player mode: Shows quiz title, question progress, progress bar, and score
  - Multiplayer host mode: Shows quiz title, question progress, progress bar, and answered players count
  - Multiplayer player mode: Shows quiz title, question progress, progress bar, player name, and score

### Changed
- **Component refactoring**: Major refactoring of admin and game pages for consistency
  - QuestionManager: Replaced 9 buttons and 6 form inputs with new reusable components
  - Admin create/edit pages: Migrated to new Button, Card, and FormInput components
  - Game mode selection page: Now uses Card component
  - DeleteButton: Migrated to new Button component
  - Eliminated 150+ lines of duplicated styling code
- **Question images**: Unified image sizes across all game modes using viewport height (40vh) for responsive scaling
- **Image styling**: Removed borders from question and answer images, added subtle shadows instead
- **Host controls**: Removed "Reveal Answer" button - now only space key reveals answers (cleaner UI)
- **Progress tracking**: All game modes now show consistent progress bar indicating current question

### Fixed
- **Mobile scrolling**: Question images no longer cause scrolling on mobile devices
- **Image shadow padding**: Fixed padding between images and their box shadows

## [1.4.0] - 2025-11-04

### Added
- **Mark Player to Win Feature**: Special admin feature for celebrations and special occasions
  - Click player badge in admin session overview to mark them with a crown emoji (👑)
  - Marked players automatically receive points regardless of answer correctness
  - Marked players receive a bonus point at game end
  - Mutual exclusion: Only one player per session can be marked at a time
  - Crown is only visible in admin section, hidden from host and players during gameplay
  - New API endpoint: `PATCH /api/admin/sessions/:sessionId/players/:playerId/mark-winner`
  - Comprehensive test coverage (10 test cases, 95.65% coverage)
- **Improved Waiting Screen UX**:
  - New players appear on the left with pop-in animation
  - Removed slideshow animation for better clarity
  - Manual horizontal scrolling support for many players
  - Auto-scroll to show new players joining
- **Modern UI Components**: Replaced all browser dialogs with toast notifications and modals
  - Added react-hot-toast for notifications
  - Custom ConfirmDialog component with Context API
  - Blurred backdrop and better mobile support
  - Success toasts for all CRUD operations

### Fixed
- **Multiplayer session creation bug**: Prevents duplicate session creation in React StrictMode
  - Added React refs (`hasInitialized`, `isMountedRef`) for proper component lifecycle management
  - Prevents duplicate API calls when StrictMode mounts components twice in development
  - Safe async state updates that prevent memory leaks

### Changed
- **Test coverage improvements**: Added comprehensive tests for mark-winner endpoint and bonus point logic
  - Coverage increased from 94.26% to 98.81% overall
  - Mark-winner endpoint: 0% → 95.65% coverage
  - Session-next endpoint: 96.66% → 100% coverage
  - Total test suites: 22 → 23
  - Total tests: 207 → 217

## [1.3.0] - 2025-11-04

### Security
- **API Route Authentication**: Added authentication checks to all admin-facing API routes
  - `/api/questions` (POST) - Create question endpoint now requires authentication
  - `/api/questions/[questionId]` (PUT, DELETE) - Update and delete endpoints now require authentication
  - `/api/upload` (POST) - Image upload endpoint now requires authentication
  - All endpoints return 401 Unauthorized for unauthenticated requests
- **Server Action Authentication**: Added authentication checks to server actions (defense in depth)
  - `createQuiz` server action now validates authentication
  - `updateQuiz` server action now validates authentication
  - `deleteQuiz` server action now validates authentication
- **File Upload Security Enhancements**:
  - Implemented server-side file type validation using magic numbers (file signatures)
  - Added protection against path traversal attacks using `path.basename()`
  - Replaced client-provided MIME type validation with server-side signature checking
  - Validates JPEG (FFD8FF), PNG (89504E47), GIF (47494638), and WEBP (52494646) signatures
  - Generates secure filenames independent of client input
- **Test Coverage**: Added comprehensive integration tests for authentication
  - Tests verify all admin API routes return 401 when unauthenticated
  - Tests verify path traversal attacks are prevented in file uploads
  - Updated existing tests to properly mock authentication
  - All 207 tests pass with new security measures
  - Achieved 100% test coverage for all security-related route files

### Added
- **Session Management Page** (`/admin/sessions`): Comprehensive admin interface for managing multiplayer game sessions
  - Real-time session overview with automatic 10-second refresh
  - Status-based grouping (in progress, waiting, finished) with session counts
  - Individual session deletion with confirmation dialog
  - Bulk delete operations:
    - Clear all finished sessions
    - Clear stale in-progress sessions (older than 5 hours)
    - Clear stale waiting sessions (older than 5 hours)
  - Detailed session information display:
    - Session code, quiz title, creation/start/finish times
    - Player list with connection status and scores
    - Current question number for in-progress games
  - Mobile-responsive layout with dark mode support
  - Full internationalization (English & German)
  - API endpoint for batch session operations (`/api/admin/sessions`)
- **AdminHeader component**: Reusable header component for all admin pages
  - Consistent header layout across admin area
  - Integrated dark mode toggle and language selector
  - Optional back button that appears in navigation button row
  - Flexible button row for additional navigation actions via children prop
  - Fully responsive with mobile support
  - Internationalized back button text

### Changed
- **Admin page structure**: All admin pages now use AdminHeader component
  - `/admin` - Quiz Management page with "View Sessions" button
  - `/admin/create` - Create Quiz page
  - `/admin/[quizId]/edit` - Edit Quiz page
  - `/admin/sessions` - Sessions Overview page
  - `/admin/changelog` - Changelog page
- **Sessions page**: Removed subtitle for cleaner header layout
- **Back button positioning**: Moved from next to title to navigation button row

## [1.2.0] - 2025-11-03

### Added
- **New QuestionDisplay component**: Unified question and answer display across all game modes
  - Supports host, solo, and multiplayer-player modes
  - Dynamic grid layouts for answers
  - State-based styling with visual feedback icons
  - Eliminates ~235 lines of duplicate code
- **AdminFooter component**: Consistent footer across all admin pages with app name, version, and GitHub link
- **MIT License**: Project now includes MIT License file
- **AI Disclaimer**: Prominent disclaimer in README that app is AI-generated
- **Dark mode initialization script**: Prevents flash of light mode on page load by detecting system preference before render

### Changed
- **Route restructure**:
  - `/game` → `/games` (quiz selection)
  - `/game/join` → `/join` (player join flow)
  - Removed `/host` management page (functionality merged into homepage)
- **Homepage redesign**: Split into two sections - "Join Game" and "Browse Games"
  - Direct session code entry on homepage
  - Better mobile-friendly layout
- **Mobile responsiveness improvements**:
  - Admin overview, create, and edit pages optimized for mobile
  - Language selector shows only flag emoji on mobile
  - Quiz cards stack vertically on mobile
  - Buttons stack vertically on mobile, horizontally on tablet+
  - Responsive padding, text sizes, and spacing throughout
- **Dark mode enhancements**:
  - AuthForm now supports dark mode with system preference detection
  - Consistent dark theme styling across all admin pages
- **Documentation updates**:
  - Updated README.md to accurately reflect internationalization features
  - Changed maximum answers per question from 6 to 4
  - Clarified navigation paths
  - Added comprehensive i18n feature documentation
  - Updated Tech Stack to include next-intl
  - Condensed Project Structure section
  - Updated CLAUDE.md to document answer limits (2-4 answers per question)

### Fixed
- **Game session state persistence**: Session state now properly initializes on GET requests, fixing issues with:
  - Page refreshes during gameplay
  - Players rejoining after disconnection
  - Host reconnecting to active game session
- **Mobile layout issues**: Fixed horizontal scroll issues on mobile devices across admin pages
- **Text overflow**: Added break-words to prevent text overflow on quiz titles and descriptions

## [1.1.4] - 2025-10-31

### Fixed
- Authentication form now displays proper translations instead of showing translation keys

### Added
- Complete translations for authentication form in English and German
  - Auth form title and description
  - Passphrase field label and placeholder
  - Error messages for invalid passphrase
  - Submit button text

## [1.1.3] - 2025-10-31

### Fixed
- DEFAULT_LANG environment variable now properly changes the default application language
- ADMIN_PASSPHRASE environment variable now correctly enforces authentication on admin and host pages
- CHANGELOG.md file is now included in Docker image (fixes 404 error on /admin/changelog)

### Added
- Authentication guards on all admin pages (/admin, /admin/create, /admin/[quizId]/edit, /admin/changelog)
- Authentication guard on host landing page (/host)
- Authentication prompt form shows when ADMIN_PASSPHRASE is configured

### Changed
- Updated lib/i18nConfig.ts to read DEFAULT_LANG from environment variable with fallback to 'en'
- Converted /host page from client component to server component for authentication support

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

[Unreleased]: https://github.com/splagemann/quiz-app/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/splagemann/quiz-app/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/splagemann/quiz-app/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/splagemann/quiz-app/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/splagemann/quiz-app/compare/v1.1.4...v1.2.0
[1.1.4]: https://github.com/splagemann/quiz-app/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/splagemann/quiz-app/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/splagemann/quiz-app/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/splagemann/quiz-app/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/splagemann/quiz-app/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/splagemann/quiz-app/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/splagemann/quiz-app/releases/tag/v1.0.0
