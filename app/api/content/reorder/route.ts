import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { quizId, items } = body as {
      quizId: number;
      items: Array<{ type: "question" | "page"; id: number; orderIndex: number }>;
    };

    // Update questions and pages with new order indices
    for (const item of items) {
      if (item.type === "question") {
        await prisma.question.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        });
      } else if (item.type === "page") {
        await prisma.page.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering content:", error);
    return NextResponse.json(
      { error: "Failed to reorder content" },
      { status: 500 }
    );
  }
}
