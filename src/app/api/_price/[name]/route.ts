import { NextResponse } from 'next/server';
import { getMainnetConfig, PricerRedis } from '@strkfarm/sdk';
import { getDataFromRedis, setDataToRedis } from '../../lib';

export const revalidate = 60; // 5 mins
export const dynamic = 'force-dynamic';

// only meant for backend calls
async function initRedis() {
  try {
    console.log('initRedis server');
    // eslint-disable-next-line
    const config = getMainnetConfig(process.env.RPC_URL!, 'latest');
    const pricer = new PricerRedis(config, []);
    if (!process.env.REDIS_URL) {
      console.warn('REDIS_URL not set');
      return;
    }
    await pricer.initRedis(process.env.REDIS_URL);
    return pricer;
  } catch (e) {
    console.warn('initRedis error', e);
  }
}

const REDIS_KEY = `${process.env.VK_REDIS_PREFIX}::prices`;

export async function GET(req: Request, context: any) {
  console.log('GET /api/strategies', req.url);
  const cacheData = await getDataFromRedis(REDIS_KEY, req.url, revalidate);
  if (cacheData) {
    const resp = NextResponse.json(cacheData);
    resp.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=60`,
    );
    return resp;
  }

  try {
    const { params } = context;
    const tokenName = params.name;

    if (!tokenName) {
      throw new Error('Invalid token');
    }

    const redisClient = await initRedis();
    if (!redisClient) {
      throw new Error('Invalid redis');
    }

    const priceInfo = await redisClient.getPrice(tokenName);
    console.log('getPrice redis', priceInfo, tokenName);
    await redisClient.close();
    const data = {
      ...priceInfo,
      name: tokenName,
    };
    await setDataToRedis(REDIS_KEY, data);

    const resp = NextResponse.json(data);
    resp.headers.set(
      'Cache-Control',
      `s-maxage=${revalidate}, stale-while-revalidate=120`,
    );
    return resp;
  } catch (err) {
    console.error('Error /api/price/:name', err);
    const errorResponse = NextResponse.json(
      {},
      {
        status: 500,
      },
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
