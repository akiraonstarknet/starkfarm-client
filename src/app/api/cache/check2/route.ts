import { NextResponse } from 'next/server';

export const revalidate = 1800;

export async function GET(_req: Request) {
  const response = NextResponse.json({
    time: new Date(),
  });
  return response;
}
