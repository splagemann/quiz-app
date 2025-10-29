# Quiz App

Eine voll ausgestattete Online-Quiz-Anwendung, erstellt mit Next.js, TypeScript und SQLite.

*A full-featured online quiz application built with Next.js, TypeScript, and SQLite.*

## Features

### Admin-Modus
- **Quiz-Verwaltung**: Quiz erstellen, bearbeiten und löschen
- **Fragen-Verwaltung**: Fragen für jedes Quiz hinzufügen, bearbeiten und löschen
- **Antwort-Verwaltung**: Jede Frage hat genau 4 mögliche Antworten, eine davon ist als richtig markiert
- **Quiz-Übersicht**: Alle erstellten Quiz mit Fragenanzahl und Metadaten anzeigen

### Spiel-Modus
- **Quiz-Auswahl**: Verfügbare Quiz durchsuchen und auswählen
- **Interaktives Gameplay**: Fragen einzeln mit visueller Rückmeldung beantworten
- **Punktesystem**: 1 Punkt für jede richtige Antwort
- **Ergebnis-Bildschirm**: Endpunktzahl und Prozentsatz mit Optionen zum erneuten Versuchen oder Wählen eines anderen Quiz

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Sprache**: TypeScript
- **Datenbank**: SQLite mit Prisma ORM
- **Styling**: Tailwind CSS
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

3. Set up the database:
```bash
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /admin                 # Admin mode pages
    /page.tsx           # Quiz listing
    /create/page.tsx    # Create new quiz
    /[quizId]/edit/     # Edit quiz & questions
  /game                 # Game mode pages
    /page.tsx           # Quiz selection
    /[quizId]/page.tsx  # Play quiz
  /api
    /questions/         # Question CRUD API routes
/lib
  /prisma.ts           # Prisma client singleton
/prisma
  /schema.prisma       # Database schema
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
- questionText
- orderIndex
- createdAt

### Answer
- id (primary key)
- questionId (foreign key)
- answerText
- isCorrect
- orderIndex

## Nutzung / Usage

### Ein Quiz erstellen / Creating a Quiz

1. Navigiere zum Admin-Bereich von der Startseite
2. Klicke auf "Neues Quiz erstellen"
3. Gib Titel und optionale Beschreibung ein
4. Klicke auf "Quiz erstellen"
5. Füge Fragen mit jeweils 4 Antworten hinzu
6. Markiere die richtige Antwort für jede Frage

### Ein Quiz spielen / Playing a Quiz

1. Navigiere zu "Quiz spielen" von der Startseite
2. Wähle ein Quiz aus den verfügbaren Optionen
3. Lies jede Frage und klicke auf deine Antwort
4. Erhalte sofortiges Feedback (grün = richtig, rot = falsch)
5. Fahre durch alle Fragen fort
6. Sieh dir deine Endpunktzahl an

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
