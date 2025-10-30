"use client";

import { useState } from "react";
import Link from "next/link";

type Answer = {
  id: number;
  answerText: string | null;
  imageUrl: string | null;
  isCorrect: boolean;
  orderIndex: number;
};

type Question = {
  id: number;
  title?: string | null;
  questionText: string;
  description?: string | null;
  imageUrl?: string | null;
  orderIndex: number;
  answers: Answer[];
};

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  questions: Question[];
};

export default function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const hasAnswered = answeredQuestions.includes(currentQuestion.id);

  const handleAnswerSelect = (answerId: number) => {
    if (hasAnswered) return;

    setSelectedAnswerId(answerId);
    const selectedAnswer = currentQuestion.answers.find((a) => a.id === answerId);

    if (selectedAnswer?.isCorrect) {
      setScore(score + 1);
    }

    setAnsweredQuestions([...answeredQuestions, currentQuestion.id]);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setIsFinished(true);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswerId(null);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerId(null);
    setScore(0);
    setAnsweredQuestions([]);
    setIsFinished(false);
  };

  if (isFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz abgeschlossen!</h1>
          <div className="my-8">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {score}/{quiz.questions.length}
            </div>
            <div className="text-xl text-gray-800 font-medium">
              {percentage}% Richtig
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleRestart}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Nochmal versuchen
            </button>
            <Link
              href="/game"
              className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Anderes Quiz wählen
            </Link>
            <Link
              href="/host"
              className="block text-blue-600 hover:text-blue-800 underline mt-4"
            >
              Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex flex-col p-3">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-3 mb-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-xs text-gray-700">
              Frage {currentQuestionIndex + 1} von {quiz.questions.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-600">{score}</div>
            <div className="text-xs text-gray-700">Punkte</div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-3 flex-1 flex flex-col overflow-hidden">
        {currentQuestion.title && (
          <div className="text-base font-medium text-gray-600 mb-2">
            {currentQuestion.title}
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {currentQuestion.questionText}
        </h2>
        {currentQuestion.description && (
          <p className="text-base text-gray-700 mb-3">
            {currentQuestion.description}
          </p>
        )}
        {currentQuestion.imageUrl && (
          <div className="flex justify-center mb-3 flex-1">
            <img
              src={currentQuestion.imageUrl}
              alt="Fragenbild"
              className="max-h-64 object-contain rounded-lg border-2 border-gray-300"
            />
          </div>
        )}

        <div className={`${currentQuestion.answers.some(a => a.imageUrl) ? 'flex-1' : ''} ${
          currentQuestion.answers.length === 2 ? "grid grid-cols-2 gap-2" :
          currentQuestion.answers.length === 4 ? "grid grid-cols-2 gap-2" :
          "flex flex-col gap-2"
        }`}>
            {currentQuestion.answers.map((answer) => {
              const isSelected = selectedAnswerId === answer.id;
              const showResult = hasAnswered;
              const hasImages = currentQuestion.answers.some(a => a.imageUrl);

              let buttonClass =
                `w-full text-left p-3 rounded-lg border-4 transition font-bold text-base relative flex flex-col ${hasImages ? 'h-full' : ''} `;

              if (showResult) {
                if (answer.isCorrect) {
                  buttonClass += "border-green-500 bg-green-50 text-green-900";
                } else if (isSelected) {
                  buttonClass += "border-red-500 bg-red-50 text-red-900";
                } else {
                  buttonClass += "border-gray-300 bg-gray-50 text-gray-700";
                }
              } else {
                buttonClass +=
                  "border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer text-gray-900";
              }

              return (
                <button
                  key={answer.id}
                  onClick={() => handleAnswerSelect(answer.id)}
                  disabled={hasAnswered}
                  className={buttonClass}
                >
                  {answer.answerText && <span className="mb-1">{answer.answerText}</span>}
                  {answer.imageUrl && (
                    <div className="flex-1 relative min-h-[120px]">
                      <img
                        src={answer.imageUrl}
                        alt="Antwortbild"
                        className="absolute inset-0 w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  {showResult && (
                    <div className="absolute top-2 right-2">
                      {answer.isCorrect && (
                        <span className="text-green-600 font-bold text-xl bg-white rounded-full px-2">✓</span>
                      )}
                      {isSelected && !answer.isCorrect && (
                        <span className="text-red-600 font-bold text-xl bg-white rounded-full px-2">✗</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      {/* Next Button */}
      {hasAnswered && (
        <div className="text-center flex-shrink-0">
          <button
            onClick={handleNext}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition font-bold text-base shadow-lg"
          >
            {isLastQuestion ? "Ergebnis anzeigen" : "Nächste Frage →"}
          </button>
        </div>
      )}
    </div>
  );
}
