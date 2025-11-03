"use client";

import { useTranslations } from "next-intl";

type Answer = {
  id: number;
  answerText: string | null;
  imageUrl: string | null;
  isCorrect: boolean;
};

type Question = {
  id: number;
  title?: string | null;
  questionText: string;
  description?: string | null;
  imageUrl?: string | null;
  answers: Answer[];
};

type QuestionDisplayMode = "host" | "solo" | "multiplayer-player";

type QuestionDisplayProps = {
  question: Question;
  mode: QuestionDisplayMode;
  revealedAnswerId?: number | null;
  selectedAnswerId?: number | null;
  hasAnswered?: boolean;
  onAnswerSelect?: (answerId: number) => void;
};

export default function QuestionDisplay({
  question,
  mode,
  revealedAnswerId = null,
  selectedAnswerId = null,
  hasAnswered = false,
  onAnswerSelect,
}: QuestionDisplayProps) {
  const tSolo = useTranslations("solo");
  const tMultiplayer = useTranslations("multiplayer");

  // Mode-specific configurations
  const isHost = mode === "host";
  const isSolo = mode === "solo";
  const isMultiplayerPlayer = mode === "multiplayer-player";
  const isInteractive = isSolo || isMultiplayerPlayer;
  const isRevealed = revealedAnswerId !== null;

  // Text sizes based on mode
  const titleClass = isHost
    ? "text-2xl font-medium text-gray-600 mb-3 text-center"
    : "text-base font-medium text-gray-600 mb-2 text-center";

  const questionClass = isHost
    ? "text-5xl font-bold text-gray-900 mb-4 text-center"
    : "text-2xl font-bold text-gray-900 mb-3 text-center";

  const descriptionClass = isHost
    ? "text-xl text-gray-700 text-center mb-4"
    : "text-base text-gray-700 text-center mb-3";

  const imageMaxHeight = isHost ? "max-h-96" : "max-h-64";

  const answerTextClass = isHost ? "text-2xl" : "text-base";
  const iconSize = isHost ? "text-4xl" : "text-xl";

  // Answer grid layout based on answer count
  const hasImages = question.answers.some((a) => a.imageUrl);
  const answerCount = question.answers.length;

  let gridClass = "";
  if (answerCount === 2) {
    gridClass = isHost
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
      : "grid grid-cols-1 sm:grid-cols-2 gap-2";
  } else if (answerCount === 4) {
    gridClass = isHost ? "grid grid-cols-2 gap-4" : "grid grid-cols-2 gap-2";
  } else {
    gridClass = isHost ? "grid grid-cols-2 gap-4" : "flex flex-col gap-2";
  }

  if (hasImages) {
    gridClass = "flex-1 " + gridClass;
  }

  const getAnswerClass = (answer: Answer) => {
    const isSelected = selectedAnswerId === answer.id;
    const isCorrectAnswer = answer.isCorrect;
    const padding = isHost ? "p-4" : "p-3";
    const gap = isHost ? "gap-4" : "";

    let baseClass = `w-full text-left ${padding} rounded-lg border-4 transition font-bold relative flex flex-col ${
      hasImages ? "h-full" : ""
    } ${answerTextClass}`;

    // State-based styling
    if (isRevealed || (hasAnswered && isSolo)) {
      // Answer has been revealed
      if (isCorrectAnswer) {
        return `${baseClass} bg-green-100 border-green-500 text-green-900`;
      } else if (isSelected) {
        // User selected this wrong answer
        return `${baseClass} bg-red-100 border-red-500 text-red-900`;
      } else {
        // Not selected, not correct
        return `${baseClass} ${
          isHost ? "bg-gray-100 border-gray-300 text-gray-700" : "bg-gray-50 border-gray-300 text-gray-700"
        }`;
      }
    } else if (isSelected && isMultiplayerPlayer) {
      // Multiplayer player has selected but not revealed yet (waiting state)
      return `${baseClass} bg-blue-50 border-blue-500 text-blue-900`;
    } else if (isHost) {
      // Host view - not revealed yet
      return `${baseClass} bg-gray-50 border-gray-300 text-gray-900`;
    } else {
      // Interactive - not yet answered (solo and multiplayer-player)
      return `${baseClass} bg-white border-gray-300 text-gray-900 hover:border-blue-500 hover:bg-blue-50 cursor-pointer`;
    }
  };

  const handleAnswerClick = (answerId: number) => {
    if (!isInteractive || !onAnswerSelect) return;
    if (hasAnswered && isSolo) return;
    if (selectedAnswerId !== null && isMultiplayerPlayer) return;

    onAnswerSelect(answerId);
  };

  const showFeedbackIcon = (answer: Answer) => {
    const isSelected = selectedAnswerId === answer.id;
    const isCorrectAnswer = answer.isCorrect;

    if (!isRevealed && !(hasAnswered && isSolo)) return null;

    return (
      <div className="absolute top-2 right-2">
        {isCorrectAnswer && (
          <span
            className={`text-green-600 font-bold ${iconSize} bg-white rounded-full px-2`}
          >
            ✓
          </span>
        )}
        {isSelected && !isCorrectAnswer && (
          <span
            className={`text-red-600 font-bold ${iconSize} bg-white rounded-full px-2`}
          >
            ✗
          </span>
        )}
      </div>
    );
  };

  const translationKey = isSolo ? "solo" : "multiplayer";
  const tCurrent = isSolo ? tSolo : tMultiplayer;

  return (
    <>
      {/* Question Section */}
      {question.title && <div className={titleClass}>{question.title}</div>}
      <h2 className={questionClass}>{question.questionText}</h2>
      {question.description && <p className={descriptionClass}>{question.description}</p>}
      {question.imageUrl && (
        <div className="flex justify-center mb-3 flex-1">
          <img
            src={question.imageUrl}
            alt={tCurrent("questionImage")}
            className={`${imageMaxHeight} object-contain rounded-lg border-2 border-gray-300`}
          />
        </div>
      )}

      {/* Answers Section */}
      <div className={gridClass}>
        {question.answers.map((answer) => {
          const AnswerElement = isInteractive ? "button" : "div";
          const answerProps = isInteractive
            ? {
                onClick: () => handleAnswerClick(answer.id),
                disabled: (hasAnswered && isSolo) || (selectedAnswerId !== null && isMultiplayerPlayer),
              }
            : {};

          return (
            <AnswerElement
              key={answer.id}
              className={getAnswerClass(answer)}
              {...answerProps}
            >
              {answer.answerText && (
                <span className={isHost ? "mb-2" : "mb-1"}>{answer.answerText}</span>
              )}
              {answer.imageUrl && (
                <div className={`flex-1 relative ${isHost ? "min-h-[200px]" : "min-h-[120px]"}`}>
                  <img
                    src={answer.imageUrl}
                    alt={tCurrent("answerImage")}
                    className="absolute inset-0 w-full h-full object-contain rounded"
                  />
                </div>
              )}
              {showFeedbackIcon(answer)}
            </AnswerElement>
          );
        })}
      </div>
    </>
  );
}
