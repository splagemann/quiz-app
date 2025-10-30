"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

export default function Home() {
  const router = useRouter();
  const t = useTranslations('join');
  const [sessionCode, setSessionCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.trim().length === 6) {
      router.push(`/game/join/${sessionCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          {t('title')}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="sessionCode"
              className="block text-sm font-medium text-gray-800 mb-2"
            >
              {t('enterCode')}
            </label>
            <input
              type="text"
              id="sessionCode"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
              placeholder="ABC123"
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 text-2xl text-center font-bold tracking-wider uppercase"
            />
            <p className="text-gray-700 text-sm mt-2 text-center">
              {t('sixDigitCode')}
            </p>
          </div>

          <button
            type="submit"
            disabled={sessionCode.trim().length !== 6}
            className={`w-full py-4 rounded-lg font-bold text-xl transition ${
              sessionCode.trim().length !== 6
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700 shadow-lg"
            }`}
          >
            {t('continue')}
          </button>
        </form>
      </div>
    </div>
  );
}
