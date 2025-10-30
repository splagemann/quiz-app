# Quiz App

Eine voll ausgestattete Online-Quiz-Anwendung mit Multiplayer-Unterstützung, erstellt mit Next.js, TypeScript und SQLite.

*A full-featured online quiz application with multiplayer support built with Next.js, TypeScript, and SQLite.*

## Features

### UI/UX
- **Dynamische Browser-Titel**: Zeigt Quiz-Namen im Browser-Tab
- **Custom Favicon**: Purple-blue Gradient-Icon passend zum App-Design
- **Responsives Design**: Optimiert für Desktop und Mobile

### Admin-Modus
- **Quiz-Verwaltung**: Quiz erstellen, bearbeiten und löschen
- **Fragen-Verwaltung**: Fragen mit optionalem Titel, Beschreibung und Bild hinzufügen, bearbeiten und löschen
- **Bild-Upload**: Bilder direkt hochladen (werden lokal gespeichert)
- **Antwort-Verwaltung**: Jede Frage hat genau 4 mögliche Antworten, eine davon ist als richtig markiert
- **Quiz-Übersicht**: Alle erstellten Quiz mit Fragenanzahl und Metadaten anzeigen

### Einzelspieler-Modus
- **Quiz-Auswahl**: Verfügbare Quiz durchsuchen und auswählen
- **Interaktives Gameplay**: Fragen einzeln mit visueller Rückmeldung beantworten
- **Punktesystem**: 1 Punkt für jede richtige Antwort
- **Fortschrittsanzeige**: Live-Fortschrittsbalken während des Spiels
- **Ergebnis-Bildschirm**: Endpunktzahl und Prozentsatz mit Optionen zum erneuten Versuchen oder Wählen eines anderen Quiz

### Multiplayer-Modus
- **Spielleiter-Interface**: Spiel hosten, QR-Code generieren, Spieler-Liste in Echtzeit anzeigen
- **Spieler-Beitritt**: Via QR-Code oder 6-stelligem Session-Code beitreten
- **Echtzeit-Updates**: Server-Sent Events (SSE) für Live-Synchronisation zwischen Host und Spielern
- **Flexible Steuerung**: Host kann Antworten jederzeit manuell aufdecken, auch wenn nicht alle geantwortet haben
- **Live-Scoreboard**: Echtzeit-Rangliste während des Spiels
- **Endstand**: Finale Rangliste mit Avataren und Punkten

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

## Nutzung / Usage

### Ein Quiz erstellen / Creating a Quiz

1. Navigiere zum Admin-Bereich von der Startseite
2. Klicke auf "Neues Quiz erstellen"
3. Gib Titel und optionale Beschreibung ein
4. Klicke auf "Quiz erstellen"
5. Füge Fragen mit optionalem Titel, Beschreibung und Bild hinzu
6. Lade optional ein Bild für jede Frage hoch
7. Gib 4 Antworten ein und markiere die richtige Antwort

### Einzelspieler-Modus / Solo Mode

1. Navigiere zu "Quiz spielen" von der Startseite
2. Wähle ein Quiz aus den verfügbaren Optionen
3. Wähle "Solo spielen"
4. Lies jede Frage und klicke auf deine Antwort
5. Erhalte sofortiges Feedback (grün = richtig, rot = falsch)
6. Fahre durch alle Fragen fort
7. Sieh dir deine Endpunktzahl an

### Multiplayer-Modus / Multiplayer Mode

**Als Spielleiter / As Host:**
1. Navigiere zu "Quiz spielen" und wähle ein Quiz
2. Wähle "Multiplayer hosten"
3. Teile den QR-Code oder 6-stelligen Session-Code mit Spielern
4. Warte bis alle Spieler beigetreten sind
5. Starte das Spiel
6. Decke Antworten manuell auf oder warte bis alle geantwortet haben
7. Gehe zur nächsten Frage
8. Sieh dir die finale Rangliste am Ende an

**Als Spieler / As Player:**
1. Scanne den QR-Code oder gehe zu "Quiz spielen" → "Spiel beitreten"
2. Gib den 6-stelligen Session-Code ein (falls nicht via QR-Code beigetreten)
3. Gib deinen Namen ein (2-20 Zeichen)
4. Warte bis der Spielleiter das Spiel startet
5. Beantworte die Fragen so schnell wie möglich
6. Sieh dir deine Position in der Rangliste am Ende an

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

- **Current Version**: v1.0.0
- **Release Notes**: See [CHANGELOG.md](./CHANGELOG.md) for detailed release notes
- **GitHub Releases**: [View all releases](https://github.com/splagemann/quiz-app/releases)

### Version Format

Versions follow the `MAJOR.MINOR.PATCH` format:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes or major new features
- **MINOR** (1.0.0 → 1.1.0): New features, backwards-compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards-compatible

### Creating a Release

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
1. Update `package.json` version
2. Verify `CHANGELOG.md` has been updated
3. Run tests
4. Create commit and annotated git tag
5. Push to GitHub (triggers CI/CD)

**Important**: Before creating a release, update `CHANGELOG.md` with your changes following the [Keep a Changelog](https://keepachangelog.com/) format.

### CI/CD Pipeline

Every release automatically triggers a GitHub Actions workflow that:
- Builds multi-platform Docker images (linux/amd64, linux/arm64)
- Publishes to GitHub Container Registry (ghcr.io)
- Creates version-specific tags (e.g., `v1.0.0`, `1.0.0`, `1.0`, `1`)
- Updates the `latest` tag

**Monitor builds**: [GitHub Actions](https://github.com/splagemann/quiz-app/actions)

## Deployment with Docker

This application is ready to deploy using Docker. You can either use pre-built images from GitHub Container Registry or build locally.

### Option 1: Using Pre-built Images (Fastest)

Pre-built Docker images are automatically published to GitHub Container Registry on every commit to main.

1. Pull the latest image:
```bash
docker pull ghcr.io/splagemann/quiz-app:latest
```

2. Run with Docker Compose:
```bash
# The docker-compose.yml is already configured to use pre-built images
docker compose up -d
```

3. The application will be available at `http://localhost:3210`

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
