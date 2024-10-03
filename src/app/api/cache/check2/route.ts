import { NextResponse } from 'next/server';

export const revalidate = 1800;

export async function GET(_req: Request) {
  const data = await fetch('https://app.strkfarm.xyz/api/stats');
  const json = await data.json();

  const response = NextResponse.json({
    time: new Date(),
    data: json,
  });
  return response;
}
