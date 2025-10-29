# Claude Code Context

## Projekt-Übersicht

Dies ist eine Quiz-Anwendung, die mit Next.js 14+, TypeScript, SQLite (via Prisma) und Tailwind CSS erstellt wurde. Die gesamte Benutzeroberfläche ist auf **Deutsch** lokalisiert.

## Wichtige Architektur-Entscheidungen

### Datenbank
- **SQLite** mit absoluter Pfad-Konfiguration: `file:/Users/sebastian.plagemann/Development/personal/claude-quiz/prisma/dev.db`
- Prisma Client wird nach `/app/generated/prisma/client` generiert
- Import erfolgt als: `import { PrismaClient } from "@/app/generated/prisma/client"`
- **Wichtig**: Bei Datenbank-Problemen immer `.next` Cache löschen: `rm -rf .next`

### Komponenten-Architektur
- **Server Components**: Alle Seiten-Dateien (page.tsx) standardmäßig
- **Client Components**: Komponenten mit Interaktivität (Forms, onClick handlers)
  - `QuestionManager.tsx` - Fragen verwalten
  - `QuizPlayer.tsx` - Quiz spielen
  - `DeleteButton.tsx` - Separierte Komponente für Lösch-Bestätigung

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
/app
  /admin                           # Admin-Bereich
    page.tsx                       # Quiz-Übersicht
    /create/page.tsx              # Neues Quiz erstellen
    /[quizId]/edit/
      page.tsx                    # Quiz bearbeiten (Server Component)
      QuestionManager.tsx         # Fragen verwalten (Client Component)
      DeleteButton.tsx            # Lösch-Button (Client Component)
  /game                           # Spiel-Modus
    page.tsx                      # Quiz auswählen
    /[quizId]/
      page.tsx                    # Quiz laden (Server Component wrapper)
      QuizPlayer.tsx              # Quiz spielen (Client Component)
  /api/questions                  # REST API für Fragen
    route.ts                      # POST - Frage erstellen
    /[questionId]/route.ts        # PUT, DELETE - Frage bearbeiten/löschen
  page.tsx                        # Startseite
/lib
  prisma.ts                       # Prisma Client Singleton
/prisma
  schema.prisma                   # Datenbank-Schema
  dev.db                          # SQLite Datei
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
npm run dev
```

### Datenbank ansehen
```bash
npx prisma studio
```

## API-Routen

### POST /api/questions
Erstellt eine neue Frage mit Antworten
```typescript
{
  quizId: number,
  questionText: string,
  answers: Array<{ text: string, isCorrect: boolean }>,
  orderIndex: number
}
```

### PUT /api/questions/[questionId]
Aktualisiert eine Frage und ihre Antworten
```typescript
{
  questionText: string,
  answers: Array<{ id: number, text: string, isCorrect: boolean }>
}
```

### DELETE /api/questions/[questionId]
Löscht eine Frage (Antworten werden durch Cascade gelöscht)

## Wichtige Hinweise für zukünftige Änderungen

1. **Sprache**: Alle neuen UI-Texte müssen auf Deutsch sein
2. **Lesbarkeit**: Immer dunkle Textfarben verwenden (`text-gray-700` minimum)
3. **Server vs Client**: Interaktive Elemente erfordern `"use client"` Direktive
4. **Cache**: Bei Datenbank-Problemen immer `.next` löschen
5. **Absolute Pfade**: DATABASE_URL verwendet absoluten Pfad
6. **Formular-Validierung**: Alert-Nachrichten auf Deutsch
7. **Bestätigungen**: Alle confirm()-Dialoge auf Deutsch

## Cascading Deletes

Das Schema verwendet `onDelete: Cascade`:
- Wenn ein Quiz gelöscht wird → alle Fragen werden gelöscht
- Wenn eine Frage gelöscht wird → alle Antworten werden gelöscht

## Testing-Strategie

Manuelle Tests sollten folgendes abdecken:
1. Quiz erstellen mit deutschen Umlauten (ä, ö, ü)
2. Fragen hinzufügen/bearbeiten/löschen
3. Quiz spielen und Score-Anzeige prüfen
4. Alle Bestätigungs-Dialoge auf deutsche Texte prüfen
5. Lesbarkeit auf verschiedenen Bildschirmgrößen prüfen
