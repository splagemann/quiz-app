"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { GameEvent } from "@/lib/gameEvents";

type Question = {
  id: number;
  title?: string | null;
  questionText: string;
  description?: string | null;
  imageUrl?: string | null;
  answers: Array<{
    id: number;
    answerText: string;
    isCorrect: boolean;
  }>;
};

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

export default function PlayerGamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = params.sessionId as string;
  const playerId = searchParams.get("playerId");

  const [gameStatus, setGameStatus] = useState<"loading" | "waiting" | "playing" | "answered" | "finished">("loading");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
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
      setError("Keine Spieler-ID gefunden");
      return;
    }

    async function loadSession() {
      try {
        const response = await fetch(`/api/game/session/${sessionId}`);
        if (!response.ok) {
          setError("Session nicht gefunden");
          return;
        }

        const session = await response.json();
        const player = session.players.find((p: any) => p.id === playerId);

        if (!player) {
          setError("Spieler nicht in dieser Session gefunden");
          return;
        }

        setMyName(player.playerName);
        setMyScore(player.score);

        if (session.status === "waiting") {
          setGameStatus("waiting");
        } else if (session.status === "in_progress") {
          const questionIndex = session.currentQuestion ?? 0;
          setCurrentQuestion(session.quiz.questions[questionIndex]);
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
        setError("Fehler beim Laden der Session");
      }
    }

    loadSession();
  }, [sessionId, playerId]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/game/session/${sessionId}/events`);

    eventSource.onmessage = (event) => {
      const data: GameEvent = JSON.parse(event.data);

      switch (data.type) {
        case "game_started":
        case "next_question":
          // Load the new question
          fetch(`/api/game/session/${sessionId}`)
            .then(r => r.json())
            .then(session => {
              const questionIndex = session.currentQuestion ?? 0;
              setCurrentQuestion(session.quiz.questions[questionIndex]);
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
          router.push("/game");
          break;
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, playerId, myScore, router]);

  const submitAnswer = async (answerId: number) => {
    if (!playerId || !currentQuestion || selectedAnswer !== null) return;

    setSelectedAnswer(answerId);

    try {
      const response = await fetch(`/api/game/players/${playerId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Fehler beim Absenden der Antwort");
        setSelectedAnswer(null);
        return;
      }

      const data = await response.json();
      setIsCorrect(data.isCorrect);
      setGameStatus("answered");
    } catch (err) {
      console.error("Error submitting answer:", err);
      alert("Netzwerkfehler");
      setSelectedAnswer(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push("/game")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Zur Quiz-Auswahl
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl">Lädt...</div>
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
            Willkommen, {myName}!
          </h1>
          <p className="text-gray-700 text-lg">
            Warte darauf, dass der Spielleiter das Spiel startet...
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
              Spiel beendet!
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
                Platz {myRank}
              </div>
              <div className="text-xl text-gray-700">
                {myScore} {myScore === 1 ? "Punkt" : "Punkte"}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
                Bestenliste
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
                      {player.playerId === playerId && " (Du)"}
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
                Neues Spiel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing or answered
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl">Lädt Frage...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`}
                alt={myName}
                className="w-12 h-12 rounded-full mr-3"
              />
              <div className="font-bold text-gray-900">{myName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{myScore}</div>
              <div className="text-xs text-gray-700">Punkte</div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {currentQuestion.title && (
            <div className="text-base font-medium text-gray-600 mb-2 text-center">
              {currentQuestion.title}
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            {currentQuestion.questionText}
          </h2>
          {currentQuestion.description && (
            <p className="text-sm text-gray-700 text-center mb-4">
              {currentQuestion.description}
            </p>
          )}
          {currentQuestion.imageUrl && (
            <div className="flex justify-center mb-6">
              <img
                src={currentQuestion.imageUrl}
                alt="Fragenbild"
                className="max-w-full max-h-64 rounded-lg border-2 border-gray-300"
              />
            </div>
          )}

          <div className="space-y-3">
            {currentQuestion.answers.map((answer, index) => {
              const isSelected = selectedAnswer === answer.id;
              const isRevealed = revealedAnswerId !== null;
              const isCorrectAnswer = answer.isCorrect;

              let buttonClass = "w-full text-left px-6 py-4 rounded-lg border-4 transition font-bold text-lg ";

              if (isRevealed) {
                if (isCorrectAnswer) {
                  buttonClass += "bg-green-100 border-green-500 text-green-900";
                } else if (isSelected) {
                  buttonClass += "bg-red-100 border-red-500 text-red-900";
                } else {
                  buttonClass += "bg-gray-100 border-gray-300 text-gray-700";
                }
              } else if (isSelected) {
                buttonClass += "bg-blue-100 border-blue-500 text-blue-900";
              } else {
                buttonClass += "bg-white border-gray-300 text-gray-900 hover:border-green-500 hover:bg-green-50";
              }

              return (
                <button
                  key={answer.id}
                  onClick={() => submitAnswer(answer.id)}
                  disabled={selectedAnswer !== null}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {String.fromCharCode(65 + index)}. {answer.answerText}
                    </span>
                    {isRevealed && isCorrectAnswer && (
                      <span className="text-green-600 text-2xl">✓</span>
                    )}
                    {isRevealed && isSelected && !isCorrectAnswer && (
                      <span className="text-red-600 text-2xl">✗</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        {gameStatus === "answered" && revealedAnswerId === null && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-gray-700 font-medium">
              Warte auf die anderen Spieler...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
