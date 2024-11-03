import { db } from '@/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const { searchParams } = new URL(request.url);
  const noOfWinners = parseInt(searchParams.get('winnersCount') || '0', 10);

  if (noOfWinners <= 0) {
    return NextResponse.json({
      success: false,
      message: 'Invalid number of winners requested',
    });
  }

  try {
    const raffleParticipants = await db.raffle.findMany({
      where: {
        OR: [
          { isRaffleParticipant: true },
          { sharedOnX: true },
          { activeDeposits: true },
        ],
      },
    });

    if (raffleParticipants.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No raffle participants found',
      });
    }

    // Group participants by ticket count
    const threeTicketParticipants: any[] = [];
    const twoTicketParticipants: any[] = [];
    const oneTicketParticipants: any[] = [];

    raffleParticipants.forEach((participant) => {
      let ticketCount = 0;

      if (participant.isRaffleParticipant) ticketCount += 1;
      if (participant.sharedOnX) ticketCount += 1;
      if (participant.activeDeposits) ticketCount += 1;

      // Add the participant to the corresponding group based on their ticket count
      if (ticketCount === 3) {
        threeTicketParticipants.push(participant);
      } else if (ticketCount === 2) {
        twoTicketParticipants.push(participant);
      } else if (ticketCount === 1) {
        oneTicketParticipants.push(participant);
      }
    });

    const groups = [
      threeTicketParticipants,
      twoTicketParticipants,
      oneTicketParticipants,
    ];
    const luckyWinners = [];

    // Continue selecting winners until we reach the desired count
    while (luckyWinners.length < noOfWinners) {
      let selectedParticipant = null;
      let foundValidParticipant = false;

      // Try to find a participant from each group in order
      for (const group of groups) {
        if (group.length === 0) continue;

        // Keep searching within the current group until a valid participant is found
        while (group.length > 0) {
          const randomIndex = Math.floor(Math.random() * group.length);
          selectedParticipant = group[randomIndex];

          const existingWinner = await db.luckyWinner.findFirst({
            where: { raffleId: selectedParticipant.raffleId },
          });

          if (!existingWinner) {
            foundValidParticipant = true;
            luckyWinners.push(selectedParticipant);
            group.splice(randomIndex, 1); // Remove selected participant from the group
            break;
          } else {
            group.splice(randomIndex, 1); // Remove duplicate winner
          }
        }

        if (foundValidParticipant) break;
      }

      // If no eligible participants found in any group, break the loop
      if (!foundValidParticipant) break;
    }

    // Check if we were able to select enough winners
    if (luckyWinners.length < noOfWinners) {
      return NextResponse.json({
        success: false,
        message: 'Not enough eligible raffle participants found',
      });
    }

    // Add selected users to the LuckyWinner table
    const newLuckyWinners = await Promise.all(
      luckyWinners.map((winner) =>
        db.luckyWinner.create({
          data: {
            userId: winner.userId,
            raffleId: winner.raffleId,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      message: 'Lucky winners selected successfully',
      luckyWinners: newLuckyWinners,
    });
  } catch (error) {
    console.error('Error selecting lucky winners:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while selecting lucky winners',
    });
  }
}
