import { getStrategies } from '@/store/strategies.atoms';
import { NextResponse } from 'next/server';
import { getDataFromRedis, setDataToRedis } from '../lib';

export const revalidate = 1800;
export const dynamic = 'force-dynamic';

const REDIS_KEY = `${process.env.VK_REDIS_PREFIX}::stats`;

export async function GET(_req: Request) {
  const cacheData = await getDataFromRedis(REDIS_KEY, _req.url, revalidate);
  if (cacheData) {
    const resp = NextResponse.json(cacheData);
    resp.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=300`,
    );
    return resp;
  }

  const strategies = getStrategies();

  const values = strategies.map(async (strategy, index) => {
    if (strategy.isLive()) {
      let retry = 0;
      while (retry < 3) {
        try {
          const tvlInfo = await strategy.getTVL();
          console.log('tvlInfo', index, tvlInfo);
          return tvlInfo.usdValue;
        } catch (e) {
          console.log(e);
          if (retry < 3) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            retry++;
          }
        }
      }
    } else {
      return 0;
    }

    throw new Error('Failed to fetch data');
  });

  const result = await Promise.all(values);

  const data = {
    tvl: result.reduce((a, b) => a + b, 0),
    lastUpdated: new Date().toISOString(),
  };

  try {
    await setDataToRedis(REDIS_KEY, data);
    const response = NextResponse.json(data);
    response.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=300`,
    );
    return response;
  } catch (err) {
    console.error('Error /api/stats', err);
    const errorResponse = NextResponse.json(
      {
        status: false,
        tvl: 0,
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 },
    );
    errorResponse.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    );
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    return errorResponse;
  }
}
