"use client";

import { useTranslations } from "next-intl";

type GameHeaderProps = {
  quizTitle: string;
  currentQuestionNumber: number;
  totalQuestions: number;
  // For single player mode
  score?: number;
  // For multiplayer host mode
  answeredPlayersCount?: number;
  totalPlayersCount?: number;
  // For multiplayer player mode
  playerName?: string;
  playerScore?: number;
};

export default function GameHeader({
  quizTitle,
  currentQuestionNumber,
  totalQuestions,
  score,
  answeredPlayersCount,
  totalPlayersCount,
  playerName,
  playerScore,
}: GameHeaderProps) {
  const tSolo = useTranslations("solo");
  const tMultiplayer = useTranslations("multiplayer");

  const isSoloMode = score !== undefined;
  const isHostMode = answeredPlayersCount !== undefined && totalPlayersCount !== undefined;
  const isPlayerMode = playerName !== undefined;

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 mb-3 flex-shrink-0">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-gray-900 leading-snug">{quizTitle}</h1>
          <p className="text-xs text-gray-700 leading-snug">
            {tMultiplayer('questionOf', { current: currentQuestionNumber, total: totalQuestions })}
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          {isSoloMode && (
            <>
              <div className="text-xl font-bold text-blue-600 leading-snug">{score}</div>
              <div className="text-xs text-gray-700 leading-snug">{tSolo('points')}</div>
            </>
          )}
          {isHostMode && (
            <>
              <div className="text-xl font-bold text-blue-600 leading-snug">
                {answeredPlayersCount}/{totalPlayersCount}
              </div>
              <div className="text-xs text-gray-700 leading-snug">
                {tMultiplayer('playersAnswered', { answered: answeredPlayersCount, total: totalPlayersCount })}
              </div>
            </>
          )}
          {isPlayerMode && (
            <>
              <div className="text-base font-bold text-gray-900 leading-snug">{playerName}</div>
              <div className="text-xl font-bold text-blue-600 leading-snug">
                {playerScore} <span className="text-xs text-gray-700">{tSolo('points')}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(currentQuestionNumber / totalQuestions) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
