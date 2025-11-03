"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const tJoin = useTranslations('join');
  const tHome = useTranslations('home');
  const [sessionCode, setSessionCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.trim().length === 6) {
      router.push(`/join/${sessionCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center px-3 py-4">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          {tHome('welcome')}
        </h1>

        <div className="space-y-4">
          {/* Join Game Box */}
          <div className="bg-white rounded-lg shadow-2xl p-4">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              {tJoin('title')}
            </h2>
            <p className="text-gray-700 text-center text-sm mb-3">
              {tHome('joinGameDescription')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  id="sessionCode"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  placeholder="ABC123"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 text-xl text-center font-bold tracking-wider uppercase"
                />
                <p className="text-gray-700 text-xs mt-1 text-center">
                  {tJoin('sixDigitCode')}
                </p>
              </div>

              <button
                type="submit"
                disabled={sessionCode.trim().length !== 6}
                className={`w-full py-3 rounded-lg font-bold text-lg transition ${
                  sessionCode.trim().length !== 6
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 shadow-lg"
                }`}
              >
                {tJoin('continue')}
              </button>
            </form>
          </div>

          {/* Or Separator */}
          <div className="flex items-center justify-center">
            <span className="text-white text-sm font-medium opacity-70">
              {tHome('or')}
            </span>
          </div>

          {/* Browse Games Box */}
          <div className="bg-white rounded-lg shadow-2xl p-4">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              {tHome('browseGames')}
            </h2>
            <p className="text-gray-700 text-center text-sm mb-3">
              {tHome('browseGamesDescription')}
            </p>

            <Link
              href="/games"
              className="w-full py-3 rounded-lg font-bold text-lg transition bg-blue-600 text-white hover:bg-blue-700 shadow-lg text-center block"
            >
              {tHome('browseGames')} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
