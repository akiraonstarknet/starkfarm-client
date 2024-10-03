import { NextResponse } from 'next/server';

export const revalidate = 1800;

export async function GET(_req: Request, res: Response) {
  const data = await fetch('https://app.strkfarm.xyz/api/stats');
  const json = await data.json();
  const response = NextResponse.json({
    time: new Date(),
    data: json,
    region: process.env.VERCEL_REGION,
  });

  response.headers.set(
    'Cache-Control',
    'public, s-maxage=1800, stale-while-revalidate=120',
  );
  return response;
}
