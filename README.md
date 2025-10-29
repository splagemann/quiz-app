# Quiz App

Eine voll ausgestattete Online-Quiz-Anwendung mit Multiplayer-Unterstützung, erstellt mit Next.js, TypeScript und SQLite.

*A full-featured online quiz application with multiplayer support built with Next.js, TypeScript, and SQLite.*

## Features

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
- **Deployment**: Vercel-ready

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
/app
  /admin                       # Admin mode pages
    page.tsx                   # Quiz listing
    /create/page.tsx           # Create new quiz
    /[quizId]/edit/            # Edit quiz & questions
      page.tsx                 # Server component wrapper
      QuestionManager.tsx      # Client component for managing questions
      DeleteButton.tsx         # Client component for delete confirmation
  /game                        # Game mode pages
    page.tsx                   # Quiz selection
    /join                      # Player join flow
      page.tsx                 # Enter session code
      /[sessionCode]/page.tsx  # Enter player name
    /play/[sessionId]/page.tsx # Player game interface
    /[quizId]
      page.tsx                 # Mode selection (solo/multiplayer)
      /solo                    # Solo mode
        page.tsx               # Server component wrapper
        QuizPlayer.tsx         # Client component for playing
      /host/page.tsx           # Host multiplayer game
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

## Deploy on Vercel

This application is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Vercel will automatically detect Next.js and configure the build
4. Deploy!

Note: For production, consider using a more robust database like PostgreSQL instead of SQLite.
