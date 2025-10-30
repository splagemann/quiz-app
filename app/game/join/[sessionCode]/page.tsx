"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function JoinGamePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('join');
  const tQuiz = useTranslations('quiz');
  const sessionCode = (params.sessionCode as string)?.toUpperCase() || "";

  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsJoining(true);

    try {
      const response = await fetch("/api/game/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode,
          playerName: playerName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || t('errorJoining'));
        setIsJoining(false);
        return;
      }

      const data = await response.json();
      // Navigate to player view
      router.push(`/game/play/${data.sessionId}?playerId=${data.playerId}`);
    } catch (err) {
      console.error("Error joining game:", err);
      setError(t('networkError'));
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          {t('title')}
        </h1>
        <p className="text-gray-700 text-center mb-8">
          {t('gameCode')}: <span className="font-bold text-2xl">{sessionCode}</span>
        </p>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label
              htmlFor="playerName"
              className="block text-sm font-medium text-gray-800 mb-2"
            >
              {t('yourName')}
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              minLength={2}
              maxLength={20}
              placeholder={t('playerNamePlaceholder')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 text-lg"
              disabled={isJoining}
            />
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining || playerName.trim().length < 2}
            className={`w-full py-4 rounded-lg font-bold text-xl transition ${
              isJoining || playerName.trim().length < 2
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700 shadow-lg"
            }`}
          >
            {isJoining ? t('joining') : t('joinGame')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/game"
            className="text-gray-700 hover:text-gray-900 underline"
          >
            {tQuiz('backToQuizSelection')}
          </Link>
        </div>
      </div>
    </div>
  );
}
