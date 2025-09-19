import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        votes: true,
      },
    });

    if (!poll) {
      return NextResponse.json(
        { error: "Poll not found" },
        { status: 404 }
      );
    }

    // Parse options and aggregate results
    const options = JSON.parse(poll.options);
    const results = options.map((option: string) => ({
      option,
      count: poll.votes.filter(vote => vote.choice === option).length,
    }));

    const totalVotes = poll.votes.length;

    return NextResponse.json({
      ...poll,
      options,
      results,
      totalVotes,
    });
  } catch (error) {
    console.error("Failed to fetch poll:", error);
    return NextResponse.json(
      { error: "Failed to fetch poll" },
      { status: 500 }
    );
  }
}
