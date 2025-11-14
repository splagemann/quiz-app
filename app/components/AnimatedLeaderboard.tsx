"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import multiavatar from "@multiavatar/multiavatar";
import { useTranslations } from "next-intl";

interface FinalScore {
  playerId: string;
  playerName: string;
  score: number;
  avatarSeed?: string | null;
}

interface AnimatedLeaderboardProps {
  finalScores: FinalScore[];
  currentPlayerId?: string;
  mode: "host" | "player";
  locale: "en" | "de";
  onComplete?: () => void;
}

export default function AnimatedLeaderboard({
  finalScores,
  currentPlayerId,
  mode,
  onComplete,
}: AnimatedLeaderboardProps) {
  const tMultiplayer = useTranslations("multiplayer");
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(
    new Set()
  );
  const [isAnimating, setIsAnimating] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  const isHost = mode === "host";

  // Trigger confetti effect
  const triggerConfetti = useCallback(() => {
    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Shoot confetti from two sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  // Skip animation
  const skipAnimation = useCallback(() => {
    const allPositions = new Set(
      finalScores.map((_, index) => index + 1)
    );
    setRevealedPositions(allPositions);
    setIsAnimating(false);
    onComplete?.();
  }, [finalScores, onComplete]);

  // Animation timing sequence
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Reveal positions 4+ immediately
    const initialRevealed = new Set<number>();
    finalScores.forEach((_, index) => {
      if (index >= 3) {
        initialRevealed.add(index + 1);
      }
    });
    setRevealedPositions(initialRevealed);

    // Dynamic timing based on player count
    const playerCount = finalScores.length;

    if (playerCount === 1) {
      // Single player: Reveal immediately after 3 seconds
      const timer = setTimeout(() => {
        setRevealedPositions((prev) => new Set([...prev, 1]));
        setShowConfetti(true);
        setIsAnimating(false);
        onComplete?.();
      }, 3000);
      timers.push(timer);
    } else if (playerCount === 2) {
      // Two players: 2nd at 3s, 1st at 6s
      const timer1 = setTimeout(() => {
        setRevealedPositions((prev) => new Set([...prev, 2]));
      }, 3000);

      const timer2 = setTimeout(() => {
        setRevealedPositions((prev) => new Set([...prev, 1]));
        setShowConfetti(true);
        setIsAnimating(false);
        onComplete?.();
      }, 6000);

      timers.push(timer1, timer2);
    } else if (playerCount >= 3) {
      // Three or more players: 3rd at 5s, 2nd at 10s, 1st at 15s
      const timer1 = setTimeout(() => {
        setRevealedPositions((prev) => new Set([...prev, 3]));
      }, 5000);

      const timer2 = setTimeout(() => {
        setRevealedPositions((prev) => new Set([...prev, 2]));
      }, 10000);

      const timer3 = setTimeout(() => {
        setRevealedPositions((prev) => new Set([...prev, 1]));
        setShowConfetti(true);
        setIsAnimating(false);
        onComplete?.();
      }, 15000);

      timers.push(timer1, timer2, timer3);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [finalScores, onComplete]);

  // Trigger confetti when showConfetti changes
  useEffect(() => {
    if (showConfetti) {
      triggerConfetti();
    }
  }, [showConfetti, triggerConfetti]);

  // Keyboard shortcut to skip
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && isAnimating) {
        e.preventDefault();
        skipAnimation();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isAnimating, skipAnimation]);

  // Animation variants
  const podiumVariants = {
    hidden: {
      opacity: 0,
      scale: 0.3,
      y: 100,
    },
    visible: (position: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as any,
        stiffness: 260,
        damping: 20,
        delay: 0,
      },
    }),
  };

  const placeholderVariants = {
    pulse: {
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as any,
      },
    },
  };

  const celebrationVariants = {
    celebration: {
      scale: [1, 1.15, 1],
      rotate: [0, -5, 5, -5, 0],
      transition: {
        duration: 0.8,
        times: [0, 0.2, 0.4, 0.6, 1],
      },
    },
  };

  const getMedalForPosition = (position: number): string => {
    switch (position) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return String(position);
    }
  };

  const getCardStyleForPosition = (position: number, isCurrentPlayer: boolean) => {
    if (isCurrentPlayer && !isHost) {
      return "bg-blue-100 border-2 border-blue-500";
    }

    if (position === 1 && isHost) {
      return "bg-yellow-100 border-4 border-yellow-400";
    } else if (position === 2 && isHost) {
      return "bg-gray-200 border-4 border-gray-400";
    } else if (position === 3 && isHost) {
      return "bg-orange-100 border-4 border-orange-400";
    } else if (position <= 3 && isHost) {
      return "bg-white border-4 border-gray-300";
    } else {
      return "bg-gray-100 border border-gray-300";
    }
  };

  const renderPlayerCard = (score: FinalScore, position: number) => {
    const isCurrentPlayer = currentPlayerId === score.playerId;
    const isRevealed = revealedPositions.has(position);
    const avatarSvg = multiavatar(score.avatarSeed || score.playerId);

    // For unrevealed top 3 positions, show placeholder
    if (!isRevealed && position <= 3) {
      return (
        <motion.div
          key={`placeholder-${position}`}
          variants={placeholderVariants}
          animate="pulse"
          className={`
            flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg
            bg-gray-200 border-2 border-gray-300
          `}
        >
          {/* Position Medal */}
          <div className="flex-shrink-0 w-10 sm:w-12 text-center">
            <span className="text-xl sm:text-3xl">
              {getMedalForPosition(position)}
            </span>
          </div>

          {/* Placeholder Avatar */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-gray-300" />

          {/* Placeholder Text */}
          <div className="flex-1 min-w-0">
            <div className="text-base sm:text-lg font-bold text-gray-500">
              ?
            </div>
          </div>

          {/* Placeholder Score */}
          <div className="flex-shrink-0 text-base sm:text-lg font-semibold text-gray-500">
            ?
          </div>
        </motion.div>
      );
    }

    // For unrevealed positions > 3, don't show anything
    if (!isRevealed) {
      return null;
    }

    return (
      <motion.div
        key={`player-${score.playerId}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`
          flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg
          ${getCardStyleForPosition(position, isCurrentPlayer)}
          ${position <= 3 && !isHost ? "shadow-md" : ""}
        `}
      >
        {/* Position Number/Medal */}
        <div className="flex-shrink-0 w-10 sm:w-12 text-center">
          <span className="text-xl sm:text-3xl font-bold text-gray-900">
            {getMedalForPosition(position)}
          </span>
        </div>

        {/* Avatar */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-full overflow-hidden"
          dangerouslySetInnerHTML={{ __html: avatarSvg }}
        />

        {/* Player Name */}
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
            {score.playerName}
            {isCurrentPlayer && !isHost && (
              <span className="ml-2 text-blue-600">({tMultiplayer("you")})</span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-base sm:text-lg font-semibold text-gray-700">
          {score.score} {score.score === 1 ? tMultiplayer("point") : tMultiplayer("points")}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-3 sm:mb-6">
        <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
          🏆 {tMultiplayer("gameFinished")} 🏆
        </h2>
      </div>

      {/* Leaderboard Content */}
      <div className="flex-1 overflow-y-auto">
        {isHost ? (
          // Host Mode: List Layout
          <div className="space-y-2 sm:space-y-3">
            <AnimatePresence>
              {finalScores.map((score, index) => (
                <div key={score.playerId}>
                  {renderPlayerCard(score, index + 1)}
                </div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          // Player Mode: Stacked List
          <div className="space-y-3">
            <AnimatePresence>
              {finalScores.map((score, index) => (
                <div key={score.playerId}>
                  {renderPlayerCard(score, index + 1)}
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
