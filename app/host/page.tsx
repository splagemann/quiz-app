import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center px-4">
      <main className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold text-white mb-12">
          Quiz App
        </h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/game"
            className="bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition transform hover:scale-105"
          >
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Quiz spielen
            </h2>
          </Link>

          <Link
            href="/admin"
            className="bg-white rounded-lg shadow-xl p-8 hover:shadow-2xl transition transform hover:scale-105"
          >
            <div className="text-5xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Admin-Bereich
            </h2>
          </Link>
        </div>
      </main>
    </div>
  );
}
