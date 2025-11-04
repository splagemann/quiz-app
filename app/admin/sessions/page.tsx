"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AdminHeader } from "@/app/components/AdminHeader";

type Player = {
  id: string;
  playerName: string;
  score: number;
  isConnected: boolean;
  markedToWin: boolean;
  joinedAt: string;
};

type GameSession = {
  id: string;
  sessionCode: string;
  status: string;
  currentQuestion: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  quiz: {
    id: number;
    title: string;
    language: string;
  };
  players: Player[];
};

export default function AdminSessionsPage() {
  const router = useRouter();
  const t = useTranslations("sessions");
  const tAdmin = useTranslations("admin");
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingFinished, setClearingFinished] = useState(false);
  const [clearingStaleInProgress, setClearingStaleInProgress] = useState(false);
  const [clearingStaleWaiting, setClearingStaleWaiting] = useState(false);
  const [markingPlayerId, setMarkingPlayerId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/admin/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      } else {
        console.error("Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (sessionId: string, sessionCode: string) => {
    if (!confirm(t("confirmDelete", { code: sessionCode }))) {
      return;
    }

    setDeletingId(sessionId);
    try {
      const response = await fetch(
        `/api/admin/sessions?sessionId=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        alert(t("deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      alert(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearFinished = async () => {
    if (!confirm(t("confirmClearFinished"))) {
      return;
    }

    setClearingFinished(true);
    try {
      const response = await fetch(
        "/api/admin/sessions?clearFinished=true",
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setSessions(sessions.filter((s) => s.status !== "finished"));
      } else {
        alert(t("clearFinishedFailed"));
      }
    } catch (error) {
      console.error("Error clearing finished sessions:", error);
      alert(t("clearFinishedFailed"));
    } finally {
      setClearingFinished(false);
    }
  };

  const handleClearStaleInProgress = async () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const staleSessions = sessions.filter(
      (s) => s.status === "in_progress" && s.startedAt && new Date(s.startedAt) < fiveHoursAgo
    );

    if (staleSessions.length === 0) {
      return;
    }

    if (!confirm(t("confirmClearStaleInProgress", { count: staleSessions.length }))) {
      return;
    }

    setClearingStaleInProgress(true);
    try {
      const response = await fetch(
        "/api/admin/sessions?clearStaleInProgress=true",
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setSessions(sessions.filter((s) => !staleSessions.find((stale) => stale.id === s.id)));
      } else {
        alert(t("clearStaleInProgressFailed"));
      }
    } catch (error) {
      console.error("Error clearing stale in-progress sessions:", error);
      alert(t("clearStaleInProgressFailed"));
    } finally {
      setClearingStaleInProgress(false);
    }
  };

  const handleClearStaleWaiting = async () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const staleSessions = sessions.filter(
      (s) => s.status === "waiting" && new Date(s.createdAt) < fiveHoursAgo
    );

    if (staleSessions.length === 0) {
      return;
    }

    if (!confirm(t("confirmClearStaleWaiting", { count: staleSessions.length }))) {
      return;
    }

    setClearingStaleWaiting(true);
    try {
      const response = await fetch(
        "/api/admin/sessions?clearStaleWaiting=true",
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setSessions(sessions.filter((s) => !staleSessions.find((stale) => stale.id === s.id)));
      } else {
        alert(t("clearStaleWaitingFailed"));
      }
    } catch (error) {
      console.error("Error clearing stale waiting sessions:", error);
      alert(t("clearStaleWaitingFailed"));
    } finally {
      setClearingStaleWaiting(false);
    }
  };

  const handleToggleMarkedToWin = async (
    sessionId: string,
    playerId: string,
    playerName: string,
    currentlyMarked: boolean
  ) => {
    const confirmMessage = currentlyMarked
      ? t("confirmUnmark", { name: playerName })
      : t("confirmMark", { name: playerName });

    if (!confirm(confirmMessage)) {
      return;
    }

    setMarkingPlayerId(playerId);
    try {
      const response = await fetch(
        `/api/admin/sessions/${sessionId}/players/${playerId}/mark-winner`,
        {
          method: "PATCH",
        }
      );

      if (response.ok) {
        // Refresh sessions to get updated data
        await fetchSessions();
      } else {
        alert(t("markFailed"));
      }
    } catch (error) {
      console.error("Error toggling markedToWin:", error);
      alert(t("markFailed"));
    } finally {
      setMarkingPlayerId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "in_progress":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "finished":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const connectedPlayersCount = (players: Player[]) => {
    return players.filter((p) => p.isConnected).length;
  };

  // Group sessions by status
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

  const groupedSessions = {
    in_progress: sessions.filter((s) => s.status === "in_progress"),
    waiting: sessions.filter((s) => s.status === "waiting"),
    finished: sessions.filter((s) => s.status === "finished"),
  };

  const staleInProgressSessions = groupedSessions.in_progress.filter(
    (s) => s.startedAt && new Date(s.startedAt) < fiveHoursAgo
  );

  const staleWaitingSessions = groupedSessions.waiting.filter(
    (s) => new Date(s.createdAt) < fiveHoursAgo
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-700 dark:text-gray-300">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 md:py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        <AdminHeader title={t("title")} showBackButton={true} backButtonHref="/admin" />

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-700 dark:text-gray-300">{t("noSessions")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* In Progress Sessions */}
            {groupedSessions.in_progress.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("status.in_progress")} ({groupedSessions.in_progress.length})
                  </h2>
                  {staleInProgressSessions.length > 0 && (
                    <button
                      onClick={handleClearStaleInProgress}
                      disabled={clearingStaleInProgress}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-800 dark:bg-gray-800 text-white rounded-lg hover:bg-orange-600 dark:hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                    >
                      {clearingStaleInProgress ? t("clearingStaleInProgress") : t("clearStaleInProgress")}
                    </button>
                  )}
                </div>
                <div className="space-y-3 md:space-y-4">
                  {groupedSessions.in_progress.map((session) => (
                    <SessionCardContent key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {/* Waiting Sessions */}
            {groupedSessions.waiting.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("status.waiting")} ({groupedSessions.waiting.length})
                  </h2>
                  {staleWaitingSessions.length > 0 && (
                    <button
                      onClick={handleClearStaleWaiting}
                      disabled={clearingStaleWaiting}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-800 dark:bg-gray-800 text-white rounded-lg hover:bg-orange-600 dark:hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                    >
                      {clearingStaleWaiting ? t("clearingStaleWaiting") : t("clearStaleWaiting")}
                    </button>
                  )}
                </div>
                <div className="space-y-3 md:space-y-4">
                  {groupedSessions.waiting.map((session) => (
                    <SessionCardContent key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {/* Finished Sessions */}
            {groupedSessions.finished.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("status.finished")} ({groupedSessions.finished.length})
                  </h2>
                  <button
                    onClick={handleClearFinished}
                    disabled={clearingFinished}
                    className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-800 dark:bg-gray-800 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                  >
                    {clearingFinished ? t("clearingFinished") : t("clearFinished")}
                  </button>
                </div>
                <div className="space-y-3 md:space-y-4">
                  {groupedSessions.finished.map((session) => (
                    <SessionCardContent key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function SessionCardContent({ session }: { session: GameSession }) {
    return (
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Session Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {session.quiz.title}
                      </h2>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                          session.status
                        )}`}
                      >
                        {t(`status.${session.status}`)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t("sessionCode")}:
                        </span>{" "}
                        <span className="font-mono text-gray-900 dark:text-white">
                          {session.sessionCode}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t("players")}:
                        </span>{" "}
                        <span className="text-gray-900 dark:text-white">
                          {connectedPlayersCount(session.players)}/
                          {session.players.length}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t("created")}:
                        </span>{" "}
                        <span className="text-gray-900 dark:text-white">
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                      {session.startedAt && (
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {t("started")}:
                          </span>{" "}
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(session.startedAt)}
                          </span>
                        </div>
                      )}
                      {session.finishedAt && (
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {t("finished")}:
                          </span>{" "}
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(session.finishedAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Players List */}
                    {session.players.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2">
                          {t("playersList")}:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {session.players.map((player) => (
                            <button
                              key={player.id}
                              onClick={() =>
                                handleToggleMarkedToWin(
                                  session.id,
                                  player.id,
                                  player.playerName,
                                  player.markedToWin
                                )
                              }
                              disabled={markingPlayerId === player.id}
                              className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                player.markedToWin
                                  ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100"
                                  : player.isConnected
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                              }`}
                            >
                              {player.markedToWin && "👑 "}
                              {player.playerName} ({player.score}
                              {player.isConnected ? " ✓" : " ✗"})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() =>
                        handleDelete(session.id, session.sessionCode)
                      }
                      disabled={deletingId === session.id}
                      className="px-4 py-2 bg-gray-800 dark:bg-gray-800 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm whitespace-nowrap"
                    >
                      {deletingId === session.id
                        ? t("deleting")
                        : t("delete")}
                    </button>
                  </div>
                </div>
      </div>
    );
  }
}
