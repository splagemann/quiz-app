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

  // Responsive image size - same for all modes, optimized for no scrolling
  const imageMaxHeight = "max-h-[40vh]";

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

  // On mobile, limit answer section height when images are present
  const answerContainerClass = hasImages && !isHost ? "max-h-[50vh]" : "";

  const getAnswerClass = (answer: Answer) => {
    const isSelected = selectedAnswerId === answer.id;
    const isCorrectAnswer = answer.isCorrect;
    const padding = isHost ? "p-4" : "p-3";
    const gap = isHost ? "gap-4" : "";

    let baseClass = `w-full text-left ${padding} rounded-lg transition font-bold relative flex flex-col shadow-md ${
      hasImages ? "h-full" : ""
    } ${answerTextClass}`;

    // State-based styling
    if (isRevealed || (hasAnswered && isSolo)) {
      // Answer has been revealed
      if (isCorrectAnswer) {
        return `${baseClass} bg-green-300 text-green-900`;
      } else if (isSelected) {
        // User selected this wrong answer
        return `${baseClass} bg-red-300 text-red-900`;
      } else {
        // Not selected, not correct
        return `${baseClass} ${
          isHost ? "bg-gray-300 text-gray-700" : "bg-gray-200 text-gray-700"
        }`;
      }
    } else if (isSelected && isMultiplayerPlayer) {
      // Multiplayer player has selected but not revealed yet (waiting state)
      return `${baseClass} bg-blue-200 text-blue-900`;
    } else if (isHost) {
      // Host view - not revealed yet
      return `${baseClass} bg-gray-200 text-gray-900`;
    } else {
      // Interactive - not yet answered (solo and multiplayer-player)
      return `${baseClass} bg-gray-100 text-gray-900 hover:shadow-lg hover:bg-blue-100 cursor-pointer`;
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
    <div className="flex flex-col h-full">
      {/* Question Section - Scrollable on mobile */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className="pb-2">
          {question.title && <div className={titleClass}>{question.title}</div>}
          <h2 className={questionClass}>{question.questionText}</h2>
          {question.description && <p className={descriptionClass}>{question.description}</p>}
          {question.imageUrl && (
            <div className="flex justify-center mb-3">
              <div className="rounded-lg shadow-md inline-block">
                <img
                  src={question.imageUrl}
                  alt={tCurrent("questionImage")}
                  className={`${imageMaxHeight} w-auto object-contain rounded-lg block`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Answers Section - Fixed at bottom on mobile */}
      <div className={`flex-shrink-0 mt-2 ${answerContainerClass} ${gridClass}`}>
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
                <div className={`flex-1 relative ${hasImages ? 'min-h-0' : 'min-h-[150px]'}`}>
                  <img
                    src={answer.imageUrl}
                    alt={tCurrent("answerImage")}
                    className="absolute inset-0 w-full h-full object-contain rounded shadow-sm"
                  />
                </div>
              )}
              {showFeedbackIcon(answer)}
            </AnswerElement>
          );
        })}
      </div>
    </div>
  );
}
