import { NextResponse } from 'next/server';
import { atom } from 'jotai';
import { getStrategies } from '@/store/strategies.atoms';
import { MY_STORE } from '@/store';
import { TrovesStrategyAPIResult } from '@/store/troves.atoms';
import MyNumber from '@/utils/MyNumber';
import { getLiveStatusNumber } from '@/utils/strategyStatus';
import { getProvider } from '@/lib/provider';
import { saveStrategySnapshots } from '@/db/strategies';
import { startCronJob, completeCronJob } from '@/db/cronJobs';
import { setDataToRedis } from '@/app/api/lib';
import { PoolInfo, PoolType } from '@/store/pools';
import VesuAtoms, { vesu } from '@/store/vesu.store';
import EndurAtoms, { endur } from '@/store/endur.store';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const DEFAULT_APY_METHODLOGY =
  'Variable APY based on underlying protocol yields';

const allPoolsAtom = atom<PoolInfo[]>((get) => {
  const pools: PoolInfo[] = [];
  const poolAtoms = [VesuAtoms, EndurAtoms];
  return poolAtoms.reduce((_pools, p) => _pools.concat(get(p.pools)), pools);
});

async function getPools(store: any, retry = 0) {
  const allPools: PoolInfo[] | undefined = store.get(allPoolsAtom);
  const minProtocolsRequired: string[] = [vesu.name, endur.name];
  const hasRequiredPools = minProtocolsRequired.every((p) => {
    if (minProtocolsRequired.length == 0) return true;
    if (!allPools) return false;
    return allPools.some((pool) => {
      console.log(new Date(), 'pool.protocol.name', pool.protocol.name);
      return (
        pool.protocol.name === p &&
        (pool.type == PoolType.Lending || pool.type == PoolType.Staking)
      );
    });
  });
  console.log(new Date(), 'hasRequiredPools', hasRequiredPools);
  const MAX_RETRIES = 120;
  if (retry >= MAX_RETRIES) {
    throw new Error('Failed to fetch pools');
  } else if (!allPools || !hasRequiredPools) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getPools(store, retry + 1);
  }
  return allPools;
}

const provider = getProvider();

async function getStrategyInfo(
  strategy: any,
): Promise<TrovesStrategyAPIResult> {
  const tvl = await strategy.getTVL();

  const defaultAPYMethodology = DEFAULT_APY_METHODLOGY;
  const data: TrovesStrategyAPIResult = {
    name: strategy.name,
    id: strategy.id,
    apy: strategy.netYield,
    apySplit: {
      baseApy: strategy.netYield,
      rewardsApy: 0,
    },
    apyMethodology: strategy.metadata.apyMethodology || defaultAPYMethodology,
    depositToken: (
      await strategy.depositMethods({
        amount: MyNumber.fromZero(),
        address: '',
        provider,
        isMax: false,
      })
    )[0].amounts.map((t: any) => ({
      symbol: t.tokenInfo.symbol,
      name: t.tokenInfo.name,
      address: t.tokenInfo.address.address,
      decimals: t.tokenInfo.decimals,
    })),
    leverage: strategy.leverage,
    contract: strategy.holdingTokens.map((t: any) => ({
      name: t.name,
      address: t.token ? t.token : t.address,
    })),
    tvlUsd: tvl.usdValue || 0,
    status: {
      number: getLiveStatusNumber(strategy.liveStatus),
      value: strategy.liveStatus,
    },
    riskFactor: strategy.riskFactor,
    logos: strategy.metadata.depositTokens.map((t: any) => t.logo),
    isAudited: strategy.settings.auditUrl ? true : false,
    auditUrl: strategy.settings.auditUrl,
    actions: (strategy.actions || []).map((action: any) => {
      return {
        name: action.name || '',
        protocol: {
          name: action.pool.protocol.name,
          logo: action.pool.protocol.logo,
        },
        token: {
          name: action.pool.pool.name,
          logo: action.pool.pool.logos?.[0] || '',
        },
        amount: action.amount,
        isDeposit: action.isDeposit,
        apy: action.isDeposit
          ? action.pool.apr
          : -(action.pool.borrow?.apr || 0),
      };
    }),
    investmentFlows: strategy.investmentFlows,
    curator: strategy.metadata.curator,
    tags: strategy.settings.tags || [],
  };

  return data;
}

export async function GET() {
  console.log('[CRON] Starting strategy update job');

  let jobExecution;

  try {
    jobExecution = await startCronJob('update-strategies');

    const allPools = await getPools(MY_STORE);
    const strategies = getStrategies();

    console.log(`[CRON] Found ${strategies.length} strategies`);

    // Solve strategies
    const proms = strategies.map((strategy) => {
      if (!strategy.isLive()) return;
      return strategy.solve(allPools, '1000');
    });

    await Promise.all(proms);

    // Get strategy data
    const stratsDataProms: Promise<TrovesStrategyAPIResult>[] = [];
    for (let i = 0; i < strategies.length; i++) {
      stratsDataProms.push(getStrategyInfo(strategies[i]));
    }
    const stratsData = await Promise.all(stratsDataProms);

    const _strats = stratsData.sort((a, b) => {
      return b.apy - a.apy;
    });

    await saveStrategySnapshots(_strats);

    const REDIS_KEY = `${process.env.VK_REDIS_PREFIX}::strategies`;
    const data = {
      status: true,
      strategies: _strats,
      lastUpdated: new Date().toISOString(),
    };
    await setDataToRedis(REDIS_KEY, data);

    await completeCronJob(jobExecution.id, 'success', undefined, {
      strategiesUpdated: _strats.length,
    });

    console.log(`[CRON] Successfully updated ${_strats.length} strategies`);

    return NextResponse.json({
      success: true,
      strategiesUpdated: _strats.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON] Error updating strategies:', error);

    if (jobExecution) {
      await completeCronJob(jobExecution.id, 'failed', error.message, {
        error: error.toString(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
