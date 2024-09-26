import { NextResponse } from 'next/server';

export const revalidate = 1800;

export async function GET(_req: Request) {
  const response = NextResponse.json({
    time: new Date(),
  });

  response.headers.set(
    'Cache-Control',
    'public, s-maxage=1800, stale-while-revalidate=120',
  );
  return response;
}

