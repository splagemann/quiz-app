"use client";

import { useState } from "react";
import Link from "next/link";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import QuestionDisplay from "@/app/components/QuestionDisplay";
import GameHeader from "@/app/components/GameHeader";

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

type QuizPlayerProps = {
  quiz: Quiz;
  locale: string;
  messages: any;
};

function QuizPlayerContent({ quiz }: { quiz: Quiz }) {
  const tSolo = useTranslations('solo');
  const tMultiplayer = useTranslations('multiplayer');
  const tQuiz = useTranslations('quiz');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{tSolo('quizCompleted')}</h1>
          <div className="my-8">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {score}/{quiz.questions.length}
            </div>
            <div className="text-xl text-gray-800 font-medium">
              {percentage}% {tSolo('correctPercentage')}
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleRestart}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {tSolo('tryAgain')}
            </button>
            <Link
              href="/games"
              className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              {tSolo('selectAnotherQuiz')}
            </Link>
            <Link
              href="/"
              className="block text-blue-600 hover:text-blue-800 underline mt-4"
            >
              {tQuiz('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex flex-col p-3">
      {/* Header */}
      <GameHeader
        quizTitle={quiz.title}
        currentQuestionNumber={currentQuestionIndex + 1}
        totalQuestions={quiz.questions.length}
        score={score}
      />

      {/* Question Card */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-3 flex-1 flex flex-col overflow-hidden">
        <QuestionDisplay
          question={currentQuestion}
          mode="solo"
          selectedAnswerId={selectedAnswerId}
          hasAnswered={hasAnswered}
          onAnswerSelect={handleAnswerSelect}
        />
      </div>

      {/* Next Button */}
      {hasAnswered && (
        <div className="text-center flex-shrink-0">
          <button
            onClick={handleNext}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition font-bold text-base shadow-lg"
          >
            {isLastQuestion ? tMultiplayer('results') : `${tMultiplayer('nextQuestionArrow')} →`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuizPlayer({ quiz, locale, messages }: QuizPlayerProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <QuizPlayerContent quiz={quiz} />
    </NextIntlClientProvider>
  );
}
