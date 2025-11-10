/**
 * @jest-environment node
 */

import { PUT } from "@/app/api/game/players/[playerId]/avatar/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/gameState", () => ({
  gameStateManager: {
    broadcast: jest.fn(),
  },
}));

describe("PUT /api/game/players/[playerId]/avatar", () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update player avatar seed successfully", async () => {
    const mockPlayer = {
      id: "player-123",
      sessionId: "session-456",
      playerName: "Test Player",
      score: 0,
      isConnected: true,
      avatarSeed: null,
      session: { id: "session-456" },
    };

    const updatedPlayer = {
      ...mockPlayer,
      avatarSeed: "new-avatar-seed-123",
    };

    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
    mockPrisma.player.update.mockResolvedValue(updatedPlayer as any);
    mockGameStateManager.broadcast.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/game/players/player-123/avatar", {
      method: "PUT",
      body: JSON.stringify({ avatarSeed: "new-avatar-seed-123" }),
    });

    const params = Promise.resolve({ playerId: "player-123" });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.avatarSeed).toBe("new-avatar-seed-123");

    // Verify update was called
    expect(mockPrisma.player.update).toHaveBeenCalledWith({
      where: { id: "player-123" },
      data: { avatarSeed: "new-avatar-seed-123" },
    });

    // Verify broadcast was called
    expect(mockGameStateManager.broadcast).toHaveBeenCalledWith(
      "session-456",
      {
        type: "avatar_changed",
        playerId: "player-123",
        playerName: "Test Player",
        avatarSeed: "new-avatar-seed-123",
      }
    );
  });

  it("should return 400 if avatarSeed is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/game/players/player-123/avatar", {
      method: "PUT",
      body: JSON.stringify({}),
    });

    const params = Promise.resolve({ playerId: "player-123" });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Avatar seed is required");
    expect(mockGameStateManager.broadcast).not.toHaveBeenCalled();
  });

  it("should return 404 if player not found", async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/game/players/non-existent/avatar", {
      method: "PUT",
      body: JSON.stringify({ avatarSeed: "new-avatar-seed" }),
    });

    const params = Promise.resolve({ playerId: "non-existent-player" });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Player not found");
    expect(mockGameStateManager.broadcast).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    // Suppress expected console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockPrisma.player.findUnique.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost:3000/api/game/players/player-123/avatar", {
      method: "PUT",
      body: JSON.stringify({ avatarSeed: "new-avatar-seed" }),
    });

    const params = Promise.resolve({ playerId: "player-123" });
    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update avatar");

    // Restore console.error
    consoleSpy.mockRestore();
  });

  it("should update avatar seed to different values multiple times", async () => {
    const mockPlayer = {
      id: "player-123",
      sessionId: "session-456",
      playerName: "Test Player",
      score: 0,
      isConnected: true,
      avatarSeed: null,
      session: { id: "session-456" },
    };

    // First update
    mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
    mockPrisma.player.update.mockResolvedValue({ ...mockPlayer, avatarSeed: "avatar-1" } as any);
    mockGameStateManager.broadcast.mockResolvedValue(undefined);

    let request = new NextRequest("http://localhost:3000/api/game/players/player-123/avatar", {
      method: "PUT",
      body: JSON.stringify({ avatarSeed: "avatar-1" }),
    });

    let params = Promise.resolve({ playerId: "player-123" });
    let response = await PUT(request, { params });
    let data = await response.json();

    expect(response.status).toBe(200);
    expect(data.avatarSeed).toBe("avatar-1");

    // Second update
    mockPrisma.player.findUnique.mockResolvedValue({ ...mockPlayer, avatarSeed: "avatar-1" } as any);
    mockPrisma.player.update.mockResolvedValue({ ...mockPlayer, avatarSeed: "avatar-2" } as any);

    request = new NextRequest("http://localhost:3000/api/game/players/player-123/avatar", {
      method: "PUT",
      body: JSON.stringify({ avatarSeed: "avatar-2" }),
    });

    params = Promise.resolve({ playerId: "player-123" });
    response = await PUT(request, { params });
    data = await response.json();

    expect(response.status).toBe(200);
    expect(data.avatarSeed).toBe("avatar-2");

    // Verify broadcast was called twice
    expect(mockGameStateManager.broadcast).toHaveBeenCalledTimes(2);
  });
});
