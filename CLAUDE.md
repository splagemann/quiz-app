# Claude Code Context

## Projekt-Übersicht

Dies ist eine Quiz-Anwendung, die mit Next.js 14+, TypeScript, SQLite (via Prisma) und Tailwind CSS erstellt wurde. Die gesamte Benutzeroberfläche ist auf **Deutsch** lokalisiert.

Die Anwendung unterstützt zwei Spielmodi:
- **Einzelspieler**: Spieler spielen alleine durch ein Quiz
- **Mehrspieler**: Ein Spielleiter hostet ein Spiel, mehrere Spieler können über QR-Code oder Spiel-Code beitreten und gemeinsam spielen

## Wichtige Architektur-Entscheidungen

### Datenbank
- **SQLite** mit relativer Pfad-Konfiguration: `file:./prisma/dev.db` (siehe `.env.example`)
- Prisma Client wird nach `/app/generated/prisma/client` generiert
- Import erfolgt als: `import { PrismaClient } from "@/app/generated/prisma/client"`
- **Wichtig**: Bei Datenbank-Problemen immer `.next` Cache löschen: `rm -rf .next`

### Multiplayer-Architektur
- **Server-Sent Events (SSE)**: Einseitige Echtzeit-Kommunikation vom Server zu Clients
- **In-Memory State Management**: Aktive Spielsitzungen und Spieler-Status werden im Memory gehalten (`lib/gameState.ts`)
- **Persistenz**: Spielsitzungen, Spieler und Antworten werden in SQLite gespeichert
- **Session Codes**: 6-stellige alphanumerische Codes für einfaches Beitreten
- **QR-Code Generation**: Automatische QR-Code-Erzeugung mit der `qrcode` Library

### Komponenten-Architektur
- **Server Components**: Alle Seiten-Dateien (page.tsx) standardmäßig
- **Client Components**: Komponenten mit Interaktivität (Forms, onClick handlers)
  - `QuestionManager.tsx` - Fragen verwalten
  - `QuizPlayer.tsx` - Einzelspieler-Modus
  - `DeleteButton.tsx` - Separierte Komponente für Lösch-Bestätigung
  - Multiplayer-Seiten:
    - `/game/[quizId]/host/page.tsx` - Spielleiter-Interface
    - `/game/join/page.tsx` - Code-Eingabe
    - `/game/join/[sessionCode]/page.tsx` - Namen-Eingabe
    - `/game/play/[sessionId]/page.tsx` - Spieler-Interface

### Code-Stil & UI
- **Textfarben**: Alle Texte verwenden dunkle Farben für gute Lesbarkeit
  - Überschriften: `text-gray-900`
  - Labels: `text-gray-800`
  - Normaler Text: `text-gray-700`
  - **NIEMALS** `text-gray-500` oder heller auf weißem Hintergrund
- **Sprache**: Alle UI-Texte, Buttons, Labels, Alerts und Bestätigungen sind auf Deutsch
- **Datums-Format**: Deutsch mit `toLocaleDateString('de-DE')`

## Dateistruktur

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
  layout.tsx                     # Root layout mit default metadata
  /admin                           # Admin-Bereich
    page.tsx                       # Quiz-Übersicht
    /create/page.tsx              # Neues Quiz erstellen
    /[quizId]/edit/
      page.tsx                    # Quiz bearbeiten (Server Component)
      QuestionManager.tsx         # Fragen verwalten (Client Component)
      DeleteButton.tsx            # Lösch-Button (Client Component)
  /game                           # Spiel-Modus
    page.tsx                      # Quiz auswählen
    /join                         # Spieler-Beitritt
      page.tsx                    # Code-Eingabe
      /[sessionCode]/page.tsx     # Namen-Eingabe
    /play/[sessionId]/page.tsx    # Spieler-Interface
    /[quizId]/
      page.tsx                    # Spielmodus-Auswahl (Einzel/Mehrspieler)
      /solo/
        page.tsx                  # Einzelspieler (Server Component wrapper)
        QuizPlayer.tsx            # Quiz spielen (Client Component)
      /host/
        page.tsx                  # Spielleiter-Interface (Client Component)
        layout.tsx                # Layout für dynamic metadata
  /host                           # Host/Management Startseite
    page.tsx                      # Startseite mit Auswahl
  /api/questions                  # REST API für Fragen
    route.ts                      # POST - Frage erstellen
    /[questionId]/route.ts        # PUT, DELETE - Frage bearbeiten/löschen
  /api/game                       # Multiplayer API
    /session/
      route.ts                    # POST - Session erstellen
      /[sessionId]/
        route.ts                  # GET, DELETE - Session abrufen/löschen
        /events/route.ts          # GET - SSE Stream
        /start/route.ts           # POST - Spiel starten
        /next/route.ts            # POST - Nächste Frage
        /reveal/route.ts          # POST - Antwort manuell aufdecken
    /players/
      route.ts                    # POST - Spieler beitreten
      /[playerId]/answer/route.ts # POST - Antwort absenden
  /api/upload/route.ts            # POST - Bild hochladen
  page.tsx                        # Startseite
/lib
  prisma.ts                       # Prisma Client Singleton
  sessionCode.ts                  # Session-Code Generator
  gameEvents.ts                   # Event-Typen für SSE
  gameState.ts                    # In-Memory Spielzustand-Manager
/prisma
  schema.prisma                   # Datenbank-Schema
  dev.db                          # SQLite Datei
  /migrations                     # Datenbank-Migrationen
/public
  /uploads                        # Hochgeladene Bilder
    .gitkeep                      # Git-Ordner-Marker
```

## Häufige Probleme & Lösungen

### 1. Prisma Import-Fehler
**Problem**: `Module not found: Can't resolve '@/app/generated/prisma'`
**Lösung**: Import-Pfad korrigieren zu `@/app/generated/prisma/client`

### 2. Datenbank-Verbindungsfehler
**Problem**: `Error code 14: Unable to open the database file`
**Lösung**:
1. Absoluten Pfad in `.env` verwenden
2. Cache löschen: `rm -rf .next`
3. Prisma neu generieren: `npx prisma generate`

### 3. Event Handlers in Server Components
**Problem**: `Event handlers cannot be passed to Client Component props`
**Lösung**: Separates Client Component erstellen (siehe DeleteButton.tsx)

### 4. Lesbarkeit-Probleme
**Problem**: Grauer Text auf weißem Hintergrund schwer lesbar
**Lösung**: Immer `text-gray-700` oder dunkler verwenden, niemals `-gray-500` oder heller

## Entwicklungs-Workflow

### Datenbank-Schema ändern
```bash
npx prisma migrate dev --name beschreibung_der_aenderung
npx prisma generate
rm -rf .next
```

### Entwicklungsserver starten
```bash
# Development
npm run dev

# Docker (Production)
docker compose up -d --build
docker compose logs -f quiz-app

# Docker stoppen
docker compose down
```

### Datenbank ansehen
```bash
npx prisma studio
```

## Production Deployment

### CI/CD Pipeline (GitHub Actions)
Automatisierte Docker-Image-Erstellung und -Veröffentlichung:
- **Workflow-Datei**: `.github/workflows/docker-publish.yml`
- **Trigger**:
  - Push zu `main` Branch
  - Tags matching `v*` (z.B. v1.0.0)
  - Manueller Workflow-Trigger
- **Image Registry**: GitHub Container Registry (`ghcr.io`)
- **Multi-Platform Builds**: linux/amd64, linux/arm64
- **Build Caching**: GitHub Actions Cache für schnellere Builds
- **Automatische Tags**:
  - `latest` - Neuester Build vom main Branch
  - `main` - Letzter Commit auf main
  - `v1.0.0`, `1.0.0`, `1.0`, `1` - Semantic Versioning
  - `sha-abc1234` - Commit-spezifische Builds

### Docker
Die Anwendung kann mit Docker deployed werden:
- **Multi-stage Dockerfile** für optimierte Production-Builds
- **Docker Compose** für einfaches Deployment mit persistenten Volumes
- **Pre-built Images** von GitHub Container Registry verfügbar
- **Automatische Migrationen** beim Container-Start
- **Health Checks** für Container-Überwachung
- SQLite-Datenbank wird in Docker-Volume persistiert
- Uploaded Images werden in separatem Volume gespeichert

**Image Pull**:
```bash
docker pull ghcr.io/splagemann/quiz-app:latest
```

### Dynamic Rendering
- Admin- und Game-Seiten verwenden `export const dynamic = 'force-dynamic'`
- Verhindert Pre-Rendering zur Build-Zeit (benötigt keine Datenbank beim Build)
- Notwendig für Docker-Builds und Vercel-ähnliche Deployments

### Browser Title Management
- Root Layout: "Quiz App" als Default-Titel
- Dynamische Titel für Quiz-Seiten via `generateMetadata`:
  - `/game/[quizId]`: "[Quiz-Titel] - Quiz App"
  - `/game/[quizId]/solo`: "[Quiz-Titel] - Einzelspieler - Quiz App"
  - `/game/[quizId]/host`: "[Quiz-Titel] - Mehrspieler Host - Quiz App" (via layout.tsx)
  - `/admin/[quizId]/edit`: "[Quiz-Titel] bearbeiten - Quiz App"

### Custom Favicon
- SVG-Icon mit purple-blue Gradient (`app/icon.svg`)
- Passt zum Farbschema der Anwendung
- Weißes Fragezeichen auf Gradient-Hintergrund

## Neue Features

### Fragen mit erweiterten Metadaten
- **Titel**: Optionaler Titel für jede Frage (z.B. "Frage 1")
- **Beschreibung**: Optionale längere Beschreibung/Kontext für die Frage
- **Bild**: Optionales Bild für jede Frage

### Bild-Upload
- Bilder werden über `/api/upload` hochgeladen
- Gespeichert im `/public/uploads` Verzeichnis
- Validierung: Nur Bilder (JPEG, PNG, GIF, WebP), max 5MB
- Unique filename generation mit Timestamp
- **Wichtig**: URL-Eingabefelder wurden entfernt - nur Upload-Funktionalität

### Manuelle Antwort-Aufdeckung
- Host kann Antworten jederzeit manuell aufdecken via `/api/game/session/[sessionId]/reveal`
- Spieler die noch nicht geantwortet haben, erhalten keine Punkte
- Button erscheint beim Host wenn noch nicht alle geantwortet haben

### Avatar-System
- DiceBear Avataaars API für Spieler-Avatare
- Avatare werden basierend auf Spieler-ID generiert
- Konsistente Avatare für jeden Spieler während des Spiels

### Environment Variables
- `NEXT_PUBLIC_APP_URL`: Öffentliche URL für QR-Code und Join-Links
- Wird in `.env` konfiguriert (siehe `.env.example`)

## API-Routen

### Fragen-API

#### POST /api/questions
Erstellt eine neue Frage mit Antworten
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
Aktualisiert eine Frage und ihre Antworten
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
Löscht eine Frage
- **Wichtig**: Löscht zuerst alle PlayerAnswer-Einträge, dann die Frage
- Antworten werden durch Cascade gelöscht

### Bild-Upload-API

#### POST /api/upload
Lädt ein Bild hoch
```typescript
Request: FormData mit 'file' field
Response: { url: string }  // z.B. "/uploads/1234567890-abc123.jpg"
```
Validierung:
- Dateityp: image/jpeg, image/jpg, image/png, image/gif, image/webp
- Maximale Größe: 5MB

### Multiplayer-API

#### POST /api/game/session
Erstellt eine neue Spielsitzung
```typescript
Request: { quizId: number }
Response: { sessionId: string, sessionCode: string, quiz: Quiz }
```

#### GET /api/game/session/[sessionId]
Ruft Session-Daten ab (inkl. Quiz, Spieler, aktueller Status)

#### GET /api/game/session/[sessionId]/events
Server-Sent Events (SSE) Stream für Echtzeit-Updates
- Events: player_joined, player_left, game_started, player_answered, reveal_answer, next_question, game_finished, session_ended

#### POST /api/game/session/[sessionId]/start
Startet das Spiel (Status: waiting → in_progress)

#### POST /api/game/session/[sessionId]/next
Wechselt zur nächsten Frage oder beendet das Spiel

#### POST /api/game/players
Spieler tritt Spielsitzung bei
```typescript
Request: { sessionCode: string, playerName: string }
Response: { playerId: string, sessionId: string, playerName: string }
```

#### POST /api/game/players/[playerId]/answer
Sendet Antwort eines Spielers
```typescript
Request: { questionId: number, answerId: number }
Response: { isCorrect: boolean, score: number }
```

## Wichtige Hinweise für zukünftige Änderungen

1. **Sprache**: Alle neuen UI-Texte müssen auf Deutsch sein
2. **Lesbarkeit**: Immer dunkle Textfarben verwenden (`text-gray-700` minimum)
3. **Server vs Client**: Interaktive Elemente erfordern `"use client"` Direktive
4. **Cache**: Bei Datenbank-Problemen immer `.next` löschen
5. **Absolute Pfade**: DATABASE_URL verwendet absoluten Pfad (Dev) / relativen Pfad (Docker)
6. **Formular-Validierung**: Alert-Nachrichten auf Deutsch
7. **Bestätigungen**: Alle confirm()-Dialoge auf Deutsch
8. **Multiplayer State**: In-Memory State (gameState.ts) wird beim Server-Neustart zurückgesetzt
9. **SSE Connections**: Keep-Alive Pings alle 30 Sekunden, automatische Bereinigung bei Disconnect
10. **Session Codes**: Immer Großbuchstaben, 6-stellig, Kollisionsprüfung bei Generierung
11. **Dynamic Rendering**: Seiten mit DB-Queries benötigen `export const dynamic = 'force-dynamic'`
12. **Docker Builds**: Benötigen dummy DATABASE_URL für Prisma Generation während Build
13. **TypeScript Types**: Quiz-Types in Client Components müssen alle optionalen Felder enthalten (title, description, imageUrl)
14. **Page Metadata**: Server Components können `generateMetadata` für dynamische Titles verwenden

## Cascading Deletes

Das Schema verwendet `onDelete: Cascade`:
- Wenn ein Quiz gelöscht wird → alle Fragen und Spielsitzungen werden gelöscht
- Wenn eine Frage gelöscht wird → alle Antworten werden gelöscht
- Wenn eine Spielsitzung gelöscht wird → alle Spieler und Antworten werden gelöscht
- Wenn ein Spieler gelöscht wird → alle seine Antworten werden gelöscht

## Testing-Strategie

### Einzelspieler-Tests
1. Quiz erstellen mit deutschen Umlauten (ä, ö, ü)
2. Fragen hinzufügen/bearbeiten/löschen
3. Quiz spielen und Score-Anzeige prüfen
4. Alle Bestätigungs-Dialoge auf deutsche Texte prüfen
5. Lesbarkeit auf verschiedenen Bildschirmgrößen prüfen

### Multiplayer-Tests
1. **Spielleiter-Flow**:
   - Session erstellen und QR-Code-Anzeige prüfen
   - Session-Code-Anzeige prüfen
   - Spieler-Beitritte beobachten
   - Spiel starten mit mindestens 2 Spielern
   - Fragen durchgehen und Antwort-Reveal prüfen
   - Endstand mit Rangliste prüfen

2. **Spieler-Flow**:
   - QR-Code scannen oder manuellen Code eingeben
   - Namen eingeben (Validierung: 2-20 Zeichen)
   - Auf Spielstart warten
   - Fragen beantworten
   - Visual Feedback (richtig/falsch) prüfen
   - Live-Score-Updates prüfen
   - Endstand mit eigenem Rang prüfen

3. **Echtzeit-Kommunikation**:
   - Spieler-Beitritt erscheint sofort beim Spielleiter
   - Beantwortete Fragen werden sofort beim Spielleiter angezeigt
   - Antwort-Reveal erscheint bei allen gleichzeitig
   - Nächste Frage erscheint bei allen gleichzeitig
   - Spiel-Ende erscheint bei allen gleichzeitig

4. **Edge Cases**:
   - Spiel beitreten mit bereits vergebenem Namen
   - Spiel beitreten während Spiel läuft (sollte abgelehnt werden)
   - Ungültiger Session-Code (sollte Fehler zeigen)
   - Alle Spieler antworten → automatisches Reveal
   - Letzter Spieler disconnected während des Spiels
