# Quiz App

A full-featured online quiz application with multiplayer support built with Next.js, TypeScript, and SQLite.

**Note**: The user interface is localized in German.

## Features

### UI/UX
- **Dynamic Browser Titles**: Shows quiz names in the browser tab
- **Custom Favicon**: Purple-blue gradient icon matching the app design
- **Responsive Design**: Optimized for desktop and mobile
- **Mobile-Optimized**: Color-coded answers and full-screen views

### Admin Mode
- **Quiz Management**: Create, edit, and delete quizzes
- **Question Management**: Add, edit, and delete questions with optional title, description, and image
- **Image Upload**: Upload images directly (stored locally)
- **Answer Management**: Each question has 2-6 possible answers, with flexible configuration and image support
- **Quiz Overview**: Display all created quizzes with question count and metadata

### Single Player Mode
- **Quiz Selection**: Browse and select available quizzes
- **Interactive Gameplay**: Answer questions one by one with visual feedback
- **Scoring System**: 1 point for each correct answer
- **Progress Indicator**: Live progress bar during gameplay
- **Results Screen**: Final score and percentage with options to retry or choose another quiz

### Multiplayer Mode
- **Host Interface**: Host games, generate QR codes, view real-time player list
- **Player Join**: Join via QR code or 6-digit session code
- **Real-time Updates**: Server-Sent Events (SSE) for live synchronization between host and players
- **Flexible Control**: Host can manually reveal answers at any time, even if not all players have answered
- **Live Scoreboard**: Real-time leaderboard during gameplay
- **Final Rankings**: Final leaderboard with avatars and scores
- **Avatar System**: Consistent avatars for each player using DiceBear API

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Sprache**: TypeScript
- **Datenbank**: SQLite mit Prisma ORM
- **Echtzeit**: Server-Sent Events (SSE)
- **Styling**: Tailwind CSS
- **QR-Codes**: qrcode library
- **Avatare**: DiceBear Avataaars API
- **UI-Sprache**: Deutsch (German)
- **Deployment**: Docker & Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3210"
```

5. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3210](http://localhost:3210) in your browser

## Project Structure

```
/
  Dockerfile                   # Multi-stage production build
  docker-compose.yml          # Container orchestration
  .dockerignore               # Docker build exclusions
/app
  icon.svg                     # Custom purple-blue gradient favicon
  layout.tsx                   # Root layout with default metadata
  /admin                       # Admin mode pages
    page.tsx                   # Quiz listing (dynamic rendering)
    /create/page.tsx           # Create new quiz
    /[quizId]/edit/            # Edit quiz & questions
      page.tsx                 # Server component with dynamic metadata
      QuestionManager.tsx      # Client component for managing questions
      DeleteButton.tsx         # Client component for delete confirmation
  /game                        # Game mode pages
    page.tsx                   # Quiz selection (dynamic rendering)
    /join                      # Player join flow
      page.tsx                 # Enter session code
      /[sessionCode]/page.tsx  # Enter player name
    /play/[sessionId]/page.tsx # Player game interface
    /[quizId]
      page.tsx                 # Mode selection (solo/multiplayer)
      /solo                    # Solo mode
        page.tsx               # Server component with dynamic metadata
        QuizPlayer.tsx         # Client component for playing
      /host                    # Host multiplayer game
        page.tsx               # Client component
        layout.tsx             # Layout for dynamic metadata
  /host                        # Host/management landing page
    page.tsx                   # Main landing page
  /api
    /questions/                # Question CRUD API routes
    /game                      # Multiplayer game API
      /session/                # Session management
      /players/                # Player management
    /upload/route.ts           # Image upload endpoint
/lib
  prisma.ts                    # Prisma client singleton
  sessionCode.ts               # Session code generator
  gameEvents.ts                # SSE event types
  gameState.ts                 # In-memory game state manager
/prisma
  schema.prisma                # Database schema
  /migrations                  # Database migrations
/public
  /uploads                     # Uploaded images
```

## Database Schema

### Quiz
- id (primary key)
- title
- description (optional)
- createdAt
- updatedAt

### Question
- id (primary key)
- quizId (foreign key)
- title (optional)
- questionText
- description (optional)
- imageUrl (optional)
- orderIndex
- createdAt

### Answer
- id (primary key)
- questionId (foreign key)
- answerText
- isCorrect
- orderIndex

### GameSession
- id (primary key)
- quizId (foreign key)
- sessionCode (6-digit unique code)
- status (waiting, in_progress, finished)
- currentQuestion (index)
- createdAt, startedAt, finishedAt

### Player
- id (primary key)
- sessionId (foreign key)
- playerName
- score
- joinedAt
- isConnected

### PlayerAnswer
- id (primary key)
- sessionId (foreign key)
- playerId (foreign key)
- questionId (foreign key)
- answerId (foreign key)
- answeredAt
- isCorrect
- timeToAnswer

## Usage

### Creating a Quiz

1. Navigate to the Admin area from the homepage
2. Click "Create New Quiz" (Neues Quiz erstellen)
3. Enter title and optional description
4. Click "Create Quiz" (Quiz erstellen)
5. Add questions with optional title, description, and image
6. Optionally upload an image for each question
7. Enter 2-6 answers and mark the correct answer

### Single Player Mode

1. Navigate to "Play Quiz" (Quiz spielen) from the homepage
2. Select a quiz from available options
3. Choose "Play Solo" (Solo spielen)
4. Read each question and click your answer
5. Get immediate feedback (green = correct, red = incorrect)
6. Progress through all questions
7. View your final score

### Multiplayer Mode

**As Host:**
1. Navigate to "Play Quiz" and select a quiz
2. Choose "Host Multiplayer" (Multiplayer hosten)
3. Share the QR code or 6-digit session code with players
4. Wait for all players to join
5. Start the game
6. Manually reveal answers or wait until all have answered
7. Proceed to next question
8. View final leaderboard at the end

**As Player:**
1. Scan the QR code or go to "Play Quiz" → "Join Game" (Spiel beitreten)
2. Enter the 6-digit session code (if not joined via QR code)
3. Enter your name (2-20 characters)
4. Wait for the host to start the game
5. Answer questions as quickly as possible
6. View your position in the leaderboard at the end

## Development

### Database Migrations

When you make changes to the Prisma schema:

```bash
npx prisma migrate dev --name description_of_changes
```

### Generate Prisma Client

```bash
npx prisma generate
```

### View Database

```bash
npx prisma studio
```

## Releases

This project uses [Semantic Versioning](https://semver.org/) (SemVer) for version management.

### Release Information

- **Current Version**: v1.1.0
- **Release Notes**: See [CHANGELOG.md](./CHANGELOG.md) for detailed release notes
- **GitHub Releases**: [View all releases](https://github.com/splagemann/quiz-app/releases)

### Version Format

Versions follow the `MAJOR.MINOR.PATCH` format:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes or major new features
- **MINOR** (1.0.0 → 1.1.0): New features, backwards-compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards-compatible

### Creating a Release

**Note**: The main branch is protected and requires pull requests. The release script handles this automatically.

Use the automated release script for creating new releases:

```bash
# Patch release (bug fixes): 1.0.0 → 1.0.1
./scripts/release.sh patch

# Minor release (new features): 1.0.0 → 1.1.0
./scripts/release.sh minor

# Major release (breaking changes): 1.0.0 → 2.0.0
./scripts/release.sh major

# Preview changes without committing
./scripts/release.sh patch --dry-run
```

The release script will:
1. Ensure you're on the latest main branch
2. Update `package.json` version
3. Verify `CHANGELOG.md` has been updated
4. Run tests
5. Create a release branch and commit
6. Create and merge a Pull Request to main (using admin privileges)
7. Create and push an annotated git tag
8. Trigger the CI/CD pipeline

**Important**: Before creating a release, update `CHANGELOG.md` with your changes following the [Keep a Changelog](https://keepachangelog.com/) format.

**Requirements**:
- GitHub CLI (`gh`) must be installed and authenticated
- Repository admin access (for merging protected branch)
- All tests must pass

### CI/CD Pipeline

Every release automatically triggers a GitHub Actions workflow that:
- Builds multi-platform Docker images (linux/amd64, linux/arm64)
- Publishes to GitHub Container Registry (ghcr.io)
- Creates version-specific tags (e.g., `v1.0.0`, `1.0.0`, `1.0`, `1`)
- Updates the `latest` tag
- **Automatically creates a GitHub Release** with:
  - Release notes extracted from CHANGELOG.md
  - Docker image pull commands
  - Supported architectures information

**Monitor builds**: [GitHub Actions](https://github.com/splagemann/quiz-app/actions)

## Deployment with Docker

This application is ready to deploy using Docker. You can either use pre-built images from GitHub Container Registry or build locally.

### Option 1: Using Pre-built Images (Fastest)

Pre-built Docker images are automatically published to GitHub Container Registry on every commit to main.

1. Pull the latest image:
```bash
docker pull ghcr.io/splagemann/quiz-app:latest
```

2. (Optional) Configure environment variables by creating a `.env` file:
```bash
cp .env.example .env
# Edit .env to set DEFAULT_LANG and ADMIN_PASSPHRASE if needed
```

3. Run with Docker Compose:
```bash
# The docker-compose.yml is already configured to use pre-built images
docker compose up -d
```

4. The application will be available at `http://localhost:3210`

**Available Image Tags:**
- `latest` - Latest stable build from main branch
- `main` - Latest commit on main branch
- `v1.0.0` - Specific version tags
- `sha-abc1234` - Specific commit builds

### Option 2: Using Docker Compose with Local Build

1. Clone the repository:
```bash
git clone git@github.com:splagemann/quiz-app.git
cd quiz-app
```

2. Edit `docker-compose.yml` to use local build:
```yaml
# Comment out the 'image' line
# image: ghcr.io/splagemann/quiz-app:latest

# Uncomment the 'build' section
build:
  context: .
  dockerfile: Dockerfile
```

3. Build and start the application:
```bash
docker compose up -d --build
```

4. The application will be available at `http://localhost:3210`

### Option 3: Using Docker CLI directly

1. Build the Docker image:
```bash
docker build -t quiz-app .
```

2. Create a volume for persistent data:
```bash
docker volume create quiz-data
docker volume create quiz-uploads
```

3. Run the container:
```bash
docker run -d \
  --name quiz-app \
  -p 3210:3000 \
  -e DATABASE_URL=file:/app/data/quiz.db \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3210 \
  -e DEFAULT_LANG=en \
  -e ADMIN_PASSPHRASE="" \
  -v quiz-data:/app/data \
  -v quiz-uploads:/app/public/uploads \
  --restart unless-stopped \
  quiz-app
```

### Managing the Application

**View logs:**
```bash
docker-compose logs -f
# or
docker logs -f quiz-app
```

**Stop the application:**
```bash
docker-compose down
# or
docker stop quiz-app
```

**Update the application:**
```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Production Considerations

- Update `NEXT_PUBLIC_APP_URL` to your actual domain
- Use a reverse proxy (nginx/traefik) with SSL/TLS for HTTPS
- Set up regular backups of the Docker volumes (database and uploads)
- Mount the volumes to specific host directories for easier backup:
  ```yaml
  volumes:
    - ./data:/app/data
    - ./uploads:/app/public/uploads
  ```
