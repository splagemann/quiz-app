"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import QRCode from "qrcode";
import  type { GameEvent } from "@/lib/gameEvents";

// Import translation files
import enMessages from "@/locales/en.json";
import deMessages from "@/locales/de.json";

const messages = {
  en: enMessages,
  de: deMessages,
};

type Player = {
  id: string;
  playerName: string;
  score: number;
  isConnected: boolean;
};

type Quiz = {
  id: number;
  title: string;
  language?: string | null;
  questions: Array<{
    id: number;
    title?: string | null;
    questionText: string;
    description?: string | null;
    imageUrl?: string | null;
    answers: Array<{
      id: number;
      answerText: string | null;
      imageUrl: string | null;
      isCorrect: boolean;
    }>;
  }>;
};

function HostGameContent({ onQuizLoaded }: { onQuizLoaded?: (language: string) => void }) {
  const tMultiplayer = useTranslations('multiplayer');
  const tCommon = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = parseInt(params.quizId as string);
  const existingSessionId = searchParams.get("sessionId");

  const [sessionCode, setSessionCode] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<"initializing" | "waiting" | "in_progress" | "finished">("initializing");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answeredPlayers, setAnsweredPlayers] = useState<Set<string>>(new Set());
  const [revealedAnswer, setRevealedAnswer] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [publicUrl, setPublicUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [finalScores, setFinalScores] = useState<Array<{ playerId: string; playerName: string; score: number }>>([]);

  // Initialize game session
  useEffect(() => {
    async function loadExistingSession(sid: string) {
      try {
        const response = await fetch(`/api/game/session/${sid}`);
        if (!response.ok) {
          setError(tCommon('error'));
          return;
        }

        const session = await response.json();
        setSessionCode(session.sessionCode);
        setSessionId(session.id);
        setQuiz(session.quiz);
        setPlayers(session.players);

        // Notify parent about quiz language
        if (onQuizLoaded && session.quiz?.language) {
          onQuizLoaded(session.quiz.language);
        }

        if (session.status === "waiting") {
          setGameStatus("waiting");
        } else if (session.status === "in_progress") {
          setGameStatus("in_progress");
          setCurrentQuestionIndex(session.currentQuestion ?? 0);
        } else if (session.status === "finished") {
          setGameStatus("finished");
          const sorted = [...session.players].sort((a: any, b: any) => b.score - a.score);
          setFinalScores(sorted.map((p: any) => ({
            playerId: p.id,
            playerName: p.playerName,
            score: p.score
          })));
        }

        // Generate QR code
        const appPublicUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setPublicUrl(appPublicUrl);
        const joinUrl = `${appPublicUrl}/game/join/${session.sessionCode}`;
        const qrUrl = await QRCode.toDataURL(joinUrl, {
          width: 300,
          margin: 2,
        });
        setQrCodeUrl(qrUrl);
      } catch (err) {
        console.error("Error loading session:", err);
        setError(tCommon('error'));
      }
    }

    async function initSession() {
      try {
        const response = await fetch("/api/game/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || tCommon('error'));
          return;
        }

        const data = await response.json();
        setSessionCode(data.sessionCode);
        setSessionId(data.sessionId);
        setQuiz(data.quiz);
        setGameStatus("waiting");

        // Notify parent about quiz language
        if (onQuizLoaded && data.quiz?.language) {
          onQuizLoaded(data.quiz.language);
        }

        // Add session ID to URL
        router.replace(`/game/${quizId}/host?sessionId=${data.sessionId}`);

        // Generate QR code
        const appPublicUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setPublicUrl(appPublicUrl);
        const joinUrl = `${appPublicUrl}/game/join/${data.sessionCode}`;
        const qrUrl = await QRCode.toDataURL(joinUrl, {
          width: 300,
          margin: 2,
        });
        setQrCodeUrl(qrUrl);
      } catch (err) {
        console.error("Error initializing session:", err);
        setError(tCommon('error'));
      }
    }

    if (existingSessionId) {
      loadExistingSession(existingSessionId);
    } else {
      initSession();
    }
  }, [quizId, existingSessionId, router, tCommon]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/game/session/${sessionId}/events`);

    eventSource.onmessage = (event) => {
      const data: GameEvent = JSON.parse(event.data);

      switch (data.type) {
        case "player_joined":
          setPlayers(prev => [...prev, data.player]);
          break;
        case "player_left":
          setPlayers(prev => prev.filter(p => p.id !== data.playerId));
          break;
        case "player_answered":
          setAnsweredPlayers(prev => new Set(prev).add(data.playerId));
          break;
        case "all_players_answered":
          // Will be followed by reveal_answer
          break;
        case "reveal_answer":
          setRevealedAnswer(data.correctAnswerId);
          // Update scores
          setPlayers(prev => prev.map(p => ({
            ...p,
            score: data.scores[p.id] ?? p.score
          })));
          break;
        case "game_finished":
          setGameStatus("finished");
          setFinalScores(data.finalScores);
          break;
        case "session_ended":
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  const startGame = async () => {
    try {
      const response = await fetch(`/api/game/session/${sessionId}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || tCommon('error'));
        return;
      }

      setGameStatus("in_progress");
      setCurrentQuestionIndex(0);
      setAnsweredPlayers(new Set());
      setRevealedAnswer(null);
    } catch (err) {
      console.error("Error starting game:", err);
      alert(tCommon('error'));
    }
  };

  const nextQuestion = async () => {
    try {
      const response = await fetch(`/api/game/session/${sessionId}/next`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || tCommon('error'));
        return;
      }

      const data = await response.json();

      if (data.gameFinished) {
        setGameStatus("finished");
        setFinalScores(data.finalScores);
      } else {
        setCurrentQuestionIndex(data.currentQuestion);
        setAnsweredPlayers(new Set());
        setRevealedAnswer(null);
      }
    } catch (err) {
      console.error("Error moving to next question:", err);
      alert(tCommon('error'));
    }
  };

  const revealAnswer = async () => {
    try {
      const response = await fetch(`/api/game/session/${sessionId}/reveal`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || tCommon('error'));
        return;
      }
    } catch (err) {
      console.error("Error revealing answer:", err);
      alert(tCommon('error'));
    }
  };

  // Keyboard shortcuts for game master
  useEffect(() => {
    if (gameStatus !== "in_progress") return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Space bar or right arrow to reveal answer or go to next question
      if (event.code === "Space" || event.code === "ArrowRight") {
        event.preventDefault();

        if (revealedAnswer !== null) {
          // Answer is revealed, go to next question
          nextQuestion();
        } else {
          // Reveal answer at any time
          revealAnswer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [gameStatus, revealedAnswer, answeredPlayers.size, sessionId, currentQuestionIndex]);

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{tCommon('error')}</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {tCommon('back')}
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === "initializing" || !quiz) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl">{tCommon('loading')}</div>
      </div>
    );
  }

  if (gameStatus === "finished") {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-500 to-blue-600 p-4 flex flex-col">
        <div className="w-full h-full overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl p-8 h-full flex flex-col">
            <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">
              🏆 {tMultiplayer('gameFinished')}
            </h1>

            <div className="flex-1 overflow-y-auto mb-8">
              <div className="space-y-4">
                {finalScores.map((player, index) => (
                  <div
                    key={player.playerId}
                    className={`p-6 rounded-lg flex items-center justify-between ${
                      index === 0
                        ? "bg-yellow-100 border-4 border-yellow-400"
                        : index === 1
                        ? "bg-gray-100 border-4 border-gray-400"
                        : index === 2
                        ? "bg-orange-100 border-4 border-orange-400"
                        : "bg-gray-50 border-2 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="text-4xl font-bold mr-4 w-12">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                      </div>
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.playerId}`}
                        alt={player.playerName}
                        className="w-16 h-16 rounded-full mr-4"
                      />
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {player.playerName}
                        </div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {player.score} {player.score === 1 ? tMultiplayer('point') : tMultiplayer('points')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 justify-center flex-shrink-0">
              <button
                onClick={() => router.push("/game")}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-bold"
              >
                {tMultiplayer('newGame')}
              </button>
              <button
                onClick={() => router.push("/host")}
                className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition font-bold"
              >
                {tCommon('back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameStatus === "waiting") {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-500 to-blue-600 p-4 flex flex-col">
        <div className="w-full h-full overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              {quiz.title}
            </h1>
            <p className="text-gray-700 text-center mb-8">
              {tMultiplayer('waitingForPlayers')}
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {tMultiplayer('scanQRCode')}
                </h2>
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="mx-auto mb-4 border-4 border-gray-300 rounded-lg"
                  />
                )}
                <p className="text-gray-700">
                  {tMultiplayer('playersCanScanQR')}
                </p>
              </div>

              <div className="text-center flex flex-col justify-center">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {tMultiplayer('orEnterGameCode')}
                </h2>
                <div className="bg-gray-100 rounded-lg p-8 mb-4">
                  <div className="text-6xl font-bold text-gray-900 tracking-wider">
                    {sessionCode}
                  </div>
                </div>
                <p className="text-gray-700">
                  {tMultiplayer('goToUrl')} <span className="font-bold">{publicUrl}</span>
                </p>
              </div>
            </div>

            <div className="flex-1 mb-8 flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {tMultiplayer('players')} ({players.length})
              </h2>
              {players.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-700 text-center text-2xl">
                    {tMultiplayer('noPlayersYet')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 text-center"
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`}
                          alt={player.playerName}
                          className="w-16 h-16 mx-auto mb-2 rounded-full"
                        />
                        <div className="font-bold text-gray-900 text-sm">
                          {player.playerName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={startGame}
                disabled={players.length === 0}
                className={`px-12 py-4 rounded-lg font-bold text-xl transition ${
                  players.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 shadow-lg"
                }`}
              >
                {tMultiplayer('startGame')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In progress - showing question
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const allAnswered = answeredPlayers.size === players.length && players.length > 0;

  return (
    <div className="h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex flex-col p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-3 mb-3 flex-shrink-0">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-sm text-gray-700">
              {tMultiplayer('questionOf', { current: currentQuestionIndex + 1, total: quiz.questions.length })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-700">
                {tMultiplayer('playersAnswered', { answered: answeredPlayers.size, total: players.length })}
              </div>
            </div>
            {revealedAnswer !== null ? (
              <button
                onClick={nextQuestion}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-bold shadow-lg whitespace-nowrap"
              >
                {currentQuestionIndex < quiz.questions.length - 1
                  ? tMultiplayer('nextQuestionArrow')
                  : tMultiplayer('results')}
              </button>
            ) : (
              <button
                onClick={revealAnswer}
                className={`px-6 py-2 rounded-lg transition font-bold shadow-lg whitespace-nowrap ${
                  allAnswered
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : answeredPlayers.size > 0
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "bg-gray-500 text-white hover:bg-gray-600"
                }`}
              >
                {tMultiplayer('revealAnswer')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-3 flex-1 flex flex-col overflow-hidden">
        {currentQuestion.title && (
          <div className="text-2xl font-medium text-gray-600 mb-3 text-center">
            {currentQuestion.title}
          </div>
        )}
        <h2 className="text-5xl font-bold text-gray-900 mb-4 text-center">
          {currentQuestion.questionText}
        </h2>
        {currentQuestion.description && (
          <p className="text-xl text-gray-700 text-center mb-4">
            {currentQuestion.description}
          </p>
        )}
        {currentQuestion.imageUrl && (
          <div className="flex justify-center mb-4 flex-1">
            <img
              src={currentQuestion.imageUrl}
              alt={tMultiplayer('questionImage')}
              className="max-h-96 object-contain rounded-lg border-2 border-gray-300"
            />
          </div>
        )}

        <div className={`${currentQuestion.answers.some(a => a.imageUrl) ? 'flex-1' : ''} ${
          currentQuestion.answers.length === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" :
          currentQuestion.answers.length === 4 ? "grid grid-cols-2 gap-4" :
          "grid grid-cols-2 gap-4"
        }`}>
          {currentQuestion.answers.map((answer, index) => {
            const isCorrect = answer.isCorrect;
            const isRevealed = revealedAnswer !== null;
            const hasImages = currentQuestion.answers.some(a => a.imageUrl);

            let containerClass = `p-4 rounded-lg border-4 font-bold text-2xl relative flex flex-col ${hasImages ? 'h-full' : ''} `;
            if (isRevealed && isCorrect) {
              containerClass += "bg-green-100 border-green-500 text-green-900";
            } else if (isRevealed) {
              containerClass += "bg-gray-100 border-gray-300 text-gray-700";
            } else {
              containerClass += "bg-gray-50 border-gray-300 text-gray-900";
            }

            return (
              <div
                key={answer.id}
                className={containerClass}
              >
                {answer.answerText && (
                  <div className="mb-2">
                    {answer.answerText}
                  </div>
                )}
                {answer.imageUrl && (
                  <div className="flex-1 relative min-h-[200px]">
                    <img
                      src={answer.imageUrl}
                      alt={tMultiplayer('answerImage')}
                      className="absolute inset-0 w-full h-full object-contain rounded"
                    />
                  </div>
                )}
                {isRevealed && isCorrect && (
                  <div className="absolute top-2 right-2">
                    <span className="text-green-600 text-4xl bg-white rounded-full px-2">✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HostGamePage() {
  const [locale, setLocale] = useState<string>('en');

  const handleQuizLoaded = (language: string) => {
    setLocale(language || 'en');
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale as keyof typeof messages]}>
      <HostGameContent onQuizLoaded={handleQuizLoaded} />
    </NextIntlClientProvider>
  );
}
