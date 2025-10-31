# Claude Code Context

## Project Overview

This is a quiz application built with Next.js 14+, TypeScript, SQLite (via Prisma), and Tailwind CSS. The user interface supports **internationalization (i18n)** with English (default) and German languages.

The application supports two game modes:
- **Single Player**: Players play through a quiz alone
- **Multiplayer**: A host runs a game, multiple players can join via QR code or game code and play together

### Internationalization (i18n)
- **Library**: next-intl for Next.js App Router
- **Default Language**: English (en)
- **Supported Languages**: English (en), German (de)
- **Global Language Setting**: Users can change the interface language in the admin section
- **Per-Quiz Language**: Each quiz can specify its own language, independent of the global setting
- **Translation Files**: `locales/en.json` and `locales/de.json`
- **Language Persistence**: User's language preference is stored in cookies
- **Language Selector**: Available in the admin section header

#### Quiz Language Feature
Each quiz has its own language setting that determines the language used during gameplay, independent of the global application language. This allows quizzes in different languages to coexist in the same application.

**How it works:**
1. **Setting Quiz Language**: When creating or editing a quiz, the language can be set in the quiz form (defaults to English)
2. **Language Storage**: Quiz language is stored in the `Quiz.language` field in the database
3. **Language Application**: During gameplay (single player, multiplayer host, and multiplayer player), the quiz's language is used for all UI elements
4. **Implementation Pattern**:
   - Server components fetch the quiz and its language from the database
   - Translation messages are loaded based on the quiz language
   - `NextIntlClientProvider` wraps the game component with quiz-specific locale and messages
   - Multiple `useTranslations()` hooks are used for different translation namespaces

**Example Implementation:**
```typescript
// Server component (page.tsx)
const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
const quizLanguage = (quiz.language || 'en') as 'en' | 'de';

return (
  <GameComponent
    quiz={quiz}
    locale={quizLanguage}
    messages={messages[quizLanguage]}
  />
);

// Client component (GameComponent.tsx)
function GameContent() {
  const tSolo = useTranslations('solo');
  const tMultiplayer = useTranslations('multiplayer');
  return <div>{tSolo('points')}</div>;
}

export default function GameComponent({ quiz, locale, messages }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <GameContent quiz={quiz} />
    </NextIntlClientProvider>
  );
}
```

**Files involved:**
- `app/game/[quizId]/solo/page.tsx` - Single player server wrapper
- `app/game/[quizId]/solo/QuizPlayer.tsx` - Single player client component
- `app/game/[quizId]/host/page.tsx` - Multiplayer host (uses callback pattern)
- `app/game/play/[sessionId]/page.tsx` - Multiplayer player (fetches from session API)

## Important Architecture Decisions

### Database
- **SQLite** with relative path configuration: `file:./prisma/dev.db` (see `.env.example`)
- Prisma Client is generated to `/app/generated/prisma/client`
- Import path: `import { PrismaClient } from "@/app/generated/prisma/client"`
- **Important**: For database issues, always clear `.next` cache: `rm -rf .next`

### Multiplayer Architecture
- **Server-Sent Events (SSE)**: Unidirectional real-time communication from server to clients
- **In-Memory State Management**: Active game sessions and player status are held in memory (`lib/gameState.ts`)
- **Persistence**: Game sessions, players, and answers are stored in SQLite
- **Session Codes**: 6-character alphanumeric codes for easy joining
- **QR Code Generation**: Automatic QR code generation using the `qrcode` library

### Component Architecture
- **Server Components**: All page files (page.tsx) by default
- **Client Components**: Components with interactivity (Forms, onClick handlers)
  - `QuestionManager.tsx` - Manage questions
  - `QuizPlayer.tsx` - Single player mode
  - `DeleteButton.tsx` - Separate component for delete confirmation
  - Multiplayer pages:
    - `/game/[quizId]/host/page.tsx` - Host interface
    - `/game/join/page.tsx` - Code entry
    - `/game/join/[sessionCode]/page.tsx` - Name entry
    - `/game/play/[sessionId]/page.tsx` - Player interface

### Code Style & UI
- **Text Colors**: All text uses dark colors for good readability
  - Headings: `text-gray-900`
  - Labels: `text-gray-800`
  - Normal text: `text-gray-700`
  - **NEVER** use `text-gray-500` or lighter on white background
- **Internationalization**: UI text uses next-intl translations (default: English)
  - Use `useTranslations()` hook in client components
  - Use `getTranslations()` in server components
  - All strings should be defined in `locales/en.json` and `locales/de.json`
- **Date Format**: Locale-aware using `toLocaleDateString(locale)`

## File Structure

```
/
  Dockerfile                      # Multi-stage Docker build
  docker-compose.yml             # Docker Compose configuration (uses pre-built images)
  .dockerignore                  # Docker build exclusions
/.github
  /workflows
    docker-publish.yml           # GitHub Actions CI/CD workflow
/app
  icon.svg                       # Custom favicon (purple-blue gradient)
  layout.tsx                     # Root layout with default metadata
  /admin                           # Admin area
    page.tsx                       # Quiz overview (with LanguageSelector)
    /create/page.tsx              # Create new quiz (with language field)
    /[quizId]/edit/
      page.tsx                    # Edit quiz (Server Component, with language field)
      QuestionManager.tsx         # Manage questions (Client Component)
      DeleteButton.tsx            # Delete button (Client Component)
  /components
    LanguageSelector.tsx          # Language selector component (Client)
  /game                           # Game mode
    page.tsx                      # Select quiz
    /join                         # Player join flow
      page.tsx                    # Enter code
      /[sessionCode]/page.tsx     # Enter name
    /play/[sessionId]/page.tsx    # Player interface
    /[quizId]/
      page.tsx                    # Game mode selection (Single/Multiplayer)
      /solo/
        page.tsx                  # Single player (Server Component wrapper)
        QuizPlayer.tsx            # Play quiz (Client Component)
      /host/
        page.tsx                  # Host interface (Client Component)
        layout.tsx                # Layout for dynamic metadata
  /host                           # Host/Management homepage
    page.tsx                      # Homepage with selection
  /api/questions                  # REST API for questions
    route.ts                      # POST - Create question
    /[questionId]/route.ts        # PUT, DELETE - Edit/delete question
  /api/game                       # Multiplayer API
    /session/
      route.ts                    # POST - Create session
      /[sessionId]/
        route.ts                  # GET, DELETE - Get/delete session
        /events/route.ts          # GET - SSE Stream
        /start/route.ts           # POST - Start game
        /next/route.ts            # POST - Next question
        /reveal/route.ts          # POST - Manually reveal answer
    /players/
      route.ts                    # POST - Player join
      /[playerId]/answer/route.ts # POST - Submit answer
  /api/upload/route.ts            # POST - Upload image
  /api/locale/route.ts            # POST, GET - Set/get user locale
  page.tsx                        # Homepage
/lib
  prisma.ts                       # Prisma Client Singleton
  sessionCode.ts                  # Session code generator
  gameEvents.ts                   # Event types for SSE
  gameState.ts                    # In-memory game state manager
  i18n.ts                         # next-intl configuration (server)
  i18nClient.ts                   # Client-side i18n utilities
/locales
  en.json                         # English translations
  de.json                         # German translations
/prisma
  schema.prisma                   # Database schema
  dev.db                          # SQLite file
  /migrations                     # Database migrations
/public
  /uploads                        # Uploaded images
    .gitkeep                      # Git folder marker
```

## Common Issues & Solutions

### 1. Prisma Import Error
**Problem**: `Module not found: Can't resolve '@/app/generated/prisma'`
**Solution**: Correct import path to `@/app/generated/prisma/client`

### 2. Database Connection Error
**Problem**: `Error code 14: Unable to open the database file`
**Solution**:
1. Use absolute path in `.env`
2. Clear cache: `rm -rf .next`
3. Regenerate Prisma: `npx prisma generate`

### 3. Event Handlers in Server Components
**Problem**: `Event handlers cannot be passed to Client Component props`
**Solution**: Create separate Client Component (see DeleteButton.tsx)

### 4. Readability Issues
**Problem**: Gray text on white background hard to read
**Solution**: Always use `text-gray-700` or darker, never `-gray-500` or lighter

## Development Workflow

### Modify Database Schema
```bash
npx prisma migrate dev --name description_of_changes
npx prisma generate
rm -rf .next
```

### Start Development Server
```bash
# Development
npm run dev

# Docker (Production)
docker compose up -d --build
docker compose logs -f quiz-app

# Stop Docker
docker compose down
```

### View Database
```bash
npx prisma studio
```

## Production Deployment

### CI/CD Pipeline (GitHub Actions)
Automated Docker image creation, publishing, and release management:

#### PR Checks (`.github/workflows/pr-checks.yml`)
- **Triggers**: Pull requests to `main` branch
- **Jobs**:
  - **Docker Build Test**: Validates Dockerfile builds successfully (linux/amd64 only, no push)
  - **TypeScript Check**: Runs type checking and Next.js build
- **Purpose**: Catch build errors before merging to main

#### Docker Publish (`.github/workflows/docker-publish.yml`)
- **Triggers**:
  - Push to `main` branch
  - Tags matching `v*` (e.g., v1.0.0)
  - Manual workflow trigger
- **Image Registry**: GitHub Container Registry (`ghcr.io`)
- **Multi-Platform Builds**: linux/amd64, linux/arm64
- **Build Caching**: GitHub Actions Cache for faster builds
- **Automatic Tags**:
  - `latest` - Latest build from main branch
  - `main` - Last commit on main
  - `v1.0.0`, `1.0.0`, `1.0`, `1` - Semantic Versioning
  - `sha-abc1234` - Commit-specific builds
- **GitHub Releases**:
  - Automatically created when a version tag is pushed
  - Release notes extracted from CHANGELOG.md
  - Includes Docker image information and pull commands
  - Pre-release detection for versions with hyphens (e.g., v1.0.0-beta)

### Docker
The application can be deployed with Docker:
- **Multi-stage Dockerfile** for optimized production builds
- **Docker Compose** for easy deployment with persistent volumes
- **Pre-built Images** available from GitHub Container Registry
- **Automatic Migrations** on container start
- **Health Checks** for container monitoring
- SQLite database is persisted in Docker volume
- Uploaded images are stored in separate volume

**Image Pull**:
```bash
docker pull ghcr.io/splagemann/quiz-app:latest
```

**Environment Variables**:
The `docker-compose.yml` supports the following environment variables:
- `DEFAULT_LANG`: Default language for the application (defaults to 'en')
- `ADMIN_PASSPHRASE`: Optional passphrase for /host and /admin sections
- These can be set in a `.env` file or passed as environment variables

### Dynamic Rendering
- Admin and game pages use `export const dynamic = 'force-dynamic'`
- Prevents pre-rendering at build time (doesn't require database during build)
- Necessary for Docker builds and Vercel-like deployments

### Browser Title Management
- Root Layout: "Quiz App" as default title
- Dynamic titles for quiz pages via `generateMetadata`:
  - `/game/[quizId]`: "[Quiz Title] - Quiz App"
  - `/game/[quizId]/solo`: "[Quiz Title] - Single Player - Quiz App"
  - `/game/[quizId]/host`: "[Quiz Title] - Multiplayer Host - Quiz App" (via layout.tsx)
  - `/admin/[quizId]/edit`: "[Quiz Title] Edit - Quiz App"

### Custom Favicon
- SVG icon with purple-blue gradient (`app/icon.svg`)
- Matches application color scheme
- White question mark on gradient background

## Feature Highlights

### Questions with Extended Metadata
- **Title**: Optional title for each question (e.g., "Question 1")
- **Description**: Optional longer description/context for the question
- **Image**: Optional image for each question

### Image Upload
- Images are uploaded via `/api/upload`
- Stored in `/public/uploads` directory
- Validation: Images only (JPEG, PNG, GIF, WebP), max 5MB
- Unique filename generation with timestamp
- **Important**: URL input fields were removed - upload functionality only

### Manual Answer Reveal
- Host can manually reveal answers at any time via `/api/game/session/[sessionId]/reveal`
- Players who haven't answered yet receive no points
- Button appears for host when not all players have answered

### Avatar System
- DiceBear Avataaars API for player avatars
- Avatars are generated based on player ID
- Consistent avatars for each player during the game

### Environment Variables
- `NEXT_PUBLIC_APP_URL`: Public URL for QR code and join links
- `DEFAULT_LANG`: Default language for the application (defaults to 'en')
- `ADMIN_PASSPHRASE`: Optional passphrase for /host and /admin sections
- Configured in `.env` (see `.env.example`)

## API Routes

### Questions API

#### POST /api/questions
Creates a new question with answers
```typescript
{
  quizId: number,
  title?: string | null,
  questionText: string,
  description?: string | null,
  imageUrl?: string | null,
  answers: Array<{ text: string, isCorrect: boolean }>,
  orderIndex: number
}
```

#### PUT /api/questions/[questionId]
Updates a question and its answers
```typescript
{
  title?: string | null,
  questionText: string,
  description?: string | null,
  imageUrl?: string | null,
  answers: Array<{ id: number, text: string, isCorrect: boolean }>
}
```

#### DELETE /api/questions/[questionId]
Deletes a question
- **Important**: Deletes all PlayerAnswer entries first, then the question
- Answers are deleted via cascade

### Image Upload API

#### POST /api/upload
Uploads an image
```typescript
Request: FormData with 'file' field
Response: { url: string }  // e.g., "/uploads/1234567890-abc123.jpg"
```
Validation:
- File type: image/jpeg, image/jpg, image/png, image/gif, image/webp
- Maximum size: 5MB

### Multiplayer API

#### POST /api/game/session
Creates a new game session
```typescript
Request: { quizId: number }
Response: { sessionId: string, sessionCode: string, quiz: Quiz }
```

#### GET /api/game/session/[sessionId]
Retrieves session data (incl. quiz, players, current status)

#### GET /api/game/session/[sessionId]/events
Server-Sent Events (SSE) stream for real-time updates
- Events: player_joined, player_left, game_started, player_answered, reveal_answer, next_question, game_finished, session_ended

#### POST /api/game/session/[sessionId]/start
Starts the game (Status: waiting → in_progress)

#### POST /api/game/session/[sessionId]/next
Advances to next question or ends the game

#### POST /api/game/players
Player joins game session
```typescript
Request: { sessionCode: string, playerName: string }
Response: { playerId: string, sessionId: string, playerName: string }
```

#### POST /api/game/players/[playerId]/answer
Submits a player's answer
```typescript
Request: { questionId: number, answerId: number }
Response: { isCorrect: boolean, score: number }
```

## Important Notes for Future Changes

1. **Internationalization**: All new UI text must be added to both `locales/en.json` and `locales/de.json`
2. **Readability**: Always use dark text colors (`text-gray-700` minimum)
3. **Server vs Client**: Interactive elements require `"use client"` directive
4. **Cache**: For database issues, always delete `.next`
5. **Paths**: DATABASE_URL uses absolute path (Dev) / relative path (Docker)
6. **Form Validation**: Alert messages should use translation keys
7. **Confirmations**: All confirm() dialogs should use translation keys
8. **Multiplayer State**: In-memory state (gameState.ts) is reset on server restart
9. **SSE Connections**: Keep-alive pings every 30 seconds, automatic cleanup on disconnect
10. **Session Codes**: Always uppercase, 6 characters, collision check on generation
11. **Dynamic Rendering**: Pages with DB queries need `export const dynamic = 'force-dynamic'`
12. **Docker Builds**: Require dummy DATABASE_URL for Prisma generation during build
13. **TypeScript Types**: Quiz types in Client Components must include all optional fields (title, description, imageUrl, language)
14. **Page Metadata**: Server Components can use `generateMetadata` for dynamic titles

## Cascading Deletes

The schema uses `onDelete: Cascade`:
- When a quiz is deleted → all questions and game sessions are deleted
- When a question is deleted → all answers are deleted
- When a game session is deleted → all players and answers are deleted
- When a player is deleted → all their answers are deleted

## Testing Strategy

### Quiz Language Tests
1. **Create quizzes in different languages**:
   - Create a quiz with English language setting
   - Create a quiz with German language setting
   - Verify language selection is saved correctly in edit form

2. **Single Player Language Tests**:
   - Play English quiz → verify all UI text is in English
   - Play German quiz → verify all UI text is in German
   - Verify language switches correctly between quizzes
   - Check completion screen, buttons, and progress indicators

3. **Multiplayer Host Language Tests**:
   - Host English quiz → verify all UI text is in English
   - Host German quiz → verify all UI text is in German
   - Check QR code instructions, player list, and game controls

4. **Multiplayer Player Language Tests**:
   - Join English quiz session → verify all UI text is in English
   - Join German quiz session → verify all UI text is in German
   - Check waiting screen, question display, and results screen

5. **Global vs Quiz Language**:
   - Change global app language to German
   - Play English quiz → verify quiz uses English (not German)
   - Verify admin interface uses global language
   - Verify quiz gameplay uses quiz-specific language

### Single Player Tests
1. Create quiz with German umlauts (ä, ö, ü)
2. Add/edit/delete questions
3. Play quiz and check score display
4. Check all confirmation dialogs for German text
5. Test readability on different screen sizes

### Multiplayer Tests
1. **Host Flow**:
   - Create session and check QR code display
   - Check session code display
   - Observe player joins
   - Start game with at least 2 players
   - Go through questions and check answer reveal
   - Check final leaderboard

2. **Player Flow**:
   - Scan QR code or enter manual code
   - Enter name (validation: 2-20 characters)
   - Wait for game start
   - Answer questions
   - Check visual feedback (correct/incorrect)
   - Check live score updates
   - Check final ranking

3. **Real-time Communication**:
   - Player join appears immediately at host
   - Answered questions shown immediately at host
   - Answer reveal appears simultaneously for all
   - Next question appears simultaneously for all
   - Game end appears simultaneously for all

4. **Edge Cases**:
   - Join game with already taken name
   - Join game while game is running (should be rejected)
   - Invalid session code (should show error)
   - All players answer → automatic reveal
   - Last player disconnects during game
