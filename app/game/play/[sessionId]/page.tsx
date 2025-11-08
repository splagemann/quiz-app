"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import toast from 'react-hot-toast';
import type { GameEvent } from "@/lib/gameEvents";
import QuestionDisplay from "@/app/components/QuestionDisplay";
import GameHeader from "@/app/components/GameHeader";
import MarkdownPreview from "@/app/components/MarkdownPreview";

// Import translation files
import enMessages from "@/locales/en.json";
import deMessages from "@/locales/de.json";

const messages = {
  en: enMessages,
  de: deMessages,
};

type Page = {
  id: number;
  title: string;
  body: string;
  orderIndex: number;
};

type Question = {
  id: number;
  title?: string | null;
  questionText: string;
  description?: string | null;
  imageUrl?: string | null;
  orderIndex: number;
  answers: Array<{
    id: number;
    answerText: string | null;
    imageUrl: string | null;
    isCorrect: boolean;
  }>;
};

type ContentItem =
  | { type: 'question'; data: Question }
  | { type: 'page'; data: Page };

type Player = {
  id: string;
  playerName: string;
  score: number;
};

type FinalScore = {
  playerId: string;
  playerName: string;
  score: number;
};

function PlayerGameContent() {
  const tMultiplayer = useTranslations('multiplayer');
  const tCommon = useTranslations('common');
  const tQuiz = useTranslations('quiz');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = params.sessionId as string;
  const playerId = searchParams.get("playerId");

  const [gameStatus, setGameStatus] = useState<"loading" | "waiting" | "playing" | "answered" | "finished">("loading");
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentContentType, setCurrentContentType] = useState<'question' | 'page'>('question');
  const [totalContent, setTotalContent] = useState(0);
  const [quizTitle, setQuizTitle] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [revealedAnswerId, setRevealedAnswerId] = useState<number | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myName, setMyName] = useState("");
  const [finalScores, setFinalScores] = useState<FinalScore[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [error, setError] = useState("");

  // Load initial session data
  useEffect(() => {
    if (!playerId) {
      setError(tCommon('error'));
      return;
    }

    async function loadSession() {
      try {
        const response = await fetch(`/api/game/session/${sessionId}`);
        if (!response.ok) {
          setError(tCommon('error'));
          return;
        }

        const session = await response.json();
        const player = session.players.find((p: any) => p.id === playerId);

        if (!player) {
          setError(tCommon('error'));
          return;
        }

        setMyName(player.playerName);
        setMyScore(player.score);
        setQuizTitle(session.quiz.title);

        // Create unified content array
        const items: ContentItem[] = [
          ...session.quiz.questions.map((q: Question) => ({ type: 'question' as const, data: q })),
          ...(session.quiz.pages || []).map((p: Page) => ({ type: 'page' as const, data: p })),
        ].sort((a, b) => a.data.orderIndex - b.data.orderIndex);
        setContentItems(items);
        setTotalContent(items.length);

        if (session.status === "waiting") {
          setGameStatus("waiting");
        } else if (session.status === "in_progress") {
          const contentIndex = session.currentQuestion ?? 0;
          setCurrentContentIndex(contentIndex);
          if (items[contentIndex]) {
            setCurrentContent(items[contentIndex]);
            setCurrentContentType(items[contentIndex].type);
          }
          setGameStatus("playing");
        } else if (session.status === "finished") {
          setGameStatus("finished");
          const sorted = [...session.players].sort((a: any, b: any) => b.score - a.score);
          const transformedScores = sorted.map((p: any) => ({
            playerId: p.id,
            playerName: p.playerName,
            score: p.score
          }));
          setFinalScores(transformedScores);
          setMyRank(transformedScores.findIndex((p) => p.playerId === playerId) + 1);
        }
      } catch (err) {
        console.error("Error loading session:", err);
        setError(tCommon('error'));
      }
    }

    loadSession();
  }, [sessionId, playerId, tCommon]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/game/session/${sessionId}/events`);

    eventSource.onmessage = (event) => {
      const data: GameEvent = JSON.parse(event.data);

      switch (data.type) {
        case "game_started":
        case "next_content":
          // Load the new content
          fetch(`/api/game/session/${sessionId}`)
            .then(r => r.json())
            .then(session => {
              const items: ContentItem[] = [
                ...session.quiz.questions.map((q: Question) => ({ type: 'question' as const, data: q })),
                ...(session.quiz.pages || []).map((p: Page) => ({ type: 'page' as const, data: p })),
              ].sort((a, b) => a.data.orderIndex - b.data.orderIndex);

              const contentIndex = session.currentQuestion ?? 0;
              setCurrentContentIndex(contentIndex);
              if (items[contentIndex]) {
                setCurrentContent(items[contentIndex]);
                setCurrentContentType(items[contentIndex].type);
              }
              setGameStatus("playing");
              setSelectedAnswer(null);
              setIsCorrect(null);
              setRevealedAnswerId(null);
            });
          break;

        case "reveal_answer":
          setRevealedAnswerId(data.correctAnswerId);
          if (playerId) {
            setMyScore(data.scores[playerId] ?? myScore);
          }
          break;

        case "game_finished":
          setGameStatus("finished");
          setFinalScores(data.finalScores);
          if (playerId) {
            const rank = data.finalScores.findIndex(p => p.playerId === playerId) + 1;
            setMyRank(rank);
          }
          break;

        case "session_ended":
          eventSource.close();
          router.push("/games");
          break;
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, playerId, myScore, router, tMultiplayer, tCommon, tQuiz]);

  const submitAnswer = async (answerId: number) => {
    if (!playerId || !currentContent || currentContent.type !== 'question' || selectedAnswer !== null) return;

    setSelectedAnswer(answerId);

    try {
      const response = await fetch(`/api/game/players/${playerId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentContent.data.id,
          answerId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || tCommon('error'));
        setSelectedAnswer(null);
        return;
      }

      const data = await response.json();
      setIsCorrect(data.isCorrect);
      setGameStatus("answered");
    } catch (err) {
      console.error("Error submitting answer:", err);
      toast.error(tCommon('error'));
      setSelectedAnswer(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{tCommon('error')}</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push("/games")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {tQuiz('backToQuizSelection')}
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl">{tCommon('loading')}</div>
      </div>
    );
  }

  if (gameStatus === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`}
            alt={myName}
            className="w-24 h-24 rounded-full mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {tMultiplayer('welcome', { name: myName })}
          </h1>
          <p className="text-gray-700 text-lg">
            {tMultiplayer('waitingForHost')}
          </p>
        </div>
      </div>
    );
  }

  if (gameStatus === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              {tMultiplayer('gameFinished')}
            </h1>
            <div className="text-center mb-8">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`}
                alt={myName}
                className="w-24 h-24 rounded-full mx-auto mb-4"
              />
              <div className="text-6xl mb-4">
                {myRank === 1 ? "🏆" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "👏"}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {tMultiplayer('place')} {myRank}
              </div>
              <div className="text-xl text-gray-700">
                {myScore} {myScore === 1 ? tMultiplayer('point') : tMultiplayer('points')}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
                {tMultiplayer('leaderboard')}
              </h2>
              {finalScores.map((player, index) => (
                <div
                  key={player.playerId}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    player.playerId === playerId
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "bg-gray-50 border border-gray-300"
                  }`}
                >
                  <div className="flex items-center">
                    <div className="text-2xl font-bold mr-3 w-8 text-gray-900">
                      {index + 1}.
                    </div>
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.playerId}`}
                      alt={player.playerName}
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <div className="font-bold text-gray-900">
                      {player.playerName}
                      {player.playerId === playerId && ` (${tMultiplayer('you')})`}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {player.score}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push("/")}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-bold"
              >
                {tMultiplayer('newGame')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing or answered
  if (!currentContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl">{tCommon('loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-green-500 to-blue-600 flex flex-col p-3">
      {/* Header */}
      <GameHeader
        quizTitle={quizTitle}
        currentQuestionNumber={currentContentIndex + 1}
        totalQuestions={totalContent}
        playerName={myName}
        playerScore={myScore}
      />

      {/* Content - Question or Page */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-3 flex-1 flex flex-col overflow-y-auto min-h-0">
        {currentContent.type === 'question' ? (
          <QuestionDisplay
            question={currentContent.data}
            mode="multiplayer-player"
            revealedAnswerId={revealedAnswerId}
            selectedAnswerId={selectedAnswer}
            onAnswerSelect={submitAnswer}
          />
        ) : (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              {currentContent.data.title}
            </h2>
            <MarkdownPreview content={currentContent.data.body} />
          </div>
        )}
      </div>

      {/* Status */}
      {currentContent.type === 'page' && (
        <div className="bg-white rounded-lg shadow-lg p-3 text-center flex-shrink-0">
          <div className="text-xl mb-1">📄</div>
          <p className="text-gray-700 font-medium text-sm">
            {tMultiplayer('waitingForHost')}
          </p>
        </div>
      )}
      {currentContent.type === 'question' && gameStatus === "answered" && revealedAnswerId === null && (
        <div className="bg-white rounded-lg shadow-lg p-3 text-center flex-shrink-0">
          <div className="text-xl mb-1">⏳</div>
          <p className="text-gray-700 font-medium text-sm">
            {tMultiplayer('waitingForOthers')}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PlayerGamePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [locale, setLocale] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchQuizLanguage() {
      try {
        const response = await fetch(`/api/game/session/${sessionId}`);
        if (response.ok) {
          const session = await response.json();
          const quizLanguage = session.quiz?.language || 'en';
          setLocale(quizLanguage);
        }
      } catch (err) {
        console.error("Error fetching quiz language:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuizLanguage();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale as keyof typeof messages]}>
      <PlayerGameContent />
    </NextIntlClientProvider>
  );
}
