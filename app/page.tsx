import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center px-4">
      <main className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold text-white mb-4">
          Quiz App
        </h1>
        <p className="text-xl text-white/90 mb-12">
          Erstelle und spiele Quiz mit Leichtigkeit
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/game"
            className="bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition transform hover:scale-105"
          >
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Quiz spielen
            </h2>
            <p className="text-gray-700">
              Teste dein Wissen mit verfügbaren Quiz
            </p>
          </Link>

          <Link
            href="/admin"
            className="bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition transform hover:scale-105"
          >
            <div className="text-5xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Admin-Bereich
            </h2>
            <p className="text-gray-700">
              Erstelle und verwalte deine Quiz
            </p>
          </Link>
        </div>

        <div className="text-white/80 text-sm">
          <p>Erstellt mit Next.js, TypeScript und SQLite</p>
        </div>
      </main>
    </div>
  );
}
