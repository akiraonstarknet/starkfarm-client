import CONSTANTS from '@/constants';
import trovesLogo from '@public/logo.png';
import { atom } from 'jotai';
import { atomWithQuery, AtomWithQueryResult } from 'jotai-tanstack-query';
import { IDapp } from './IDapp.store';
import {
  APRSplit,
  Category,
  getCategoriesFromName,
  PoolInfo,
  PoolMetadata,
  PoolType,
  ProtocolAtoms,
} from './pools';
import { getLiveStatusEnum } from '@/utils/strategyStatus';
import { IInvestmentFlow } from '@strkfarm/sdk';

export interface TrovesStrategyAPIResult {
  name: string;
  id: string;
  apy: number;
  apySplit: {
    baseApy: number;
    rewardsApy: number;
  };
  depositToken: {
    name: string;
    address: string;
    symbol: string;
    decimals: number;
  }[];
  apyMethodology: string;
  leverage: number;
  contract: { name: string; address: string }[];
  tvlUsd: number;
  status: {
    number: number;
    value: string;
  };
  riskFactor: number;
  logos: string[];
  isAudited: boolean;
  auditUrl?: string;
  actions: {
    name: string;
    protocol: {
      name: string;
      logo: string;
    };
    token: {
      name: string;
      logo: string;
    };
    amount: string;
    isDeposit: boolean;
    apy: number;
  }[];
  investmentFlows: IInvestmentFlow[];
}

export class Troves extends IDapp<TrovesStrategyAPIResult> {
  name = 'Troves';
  logo = trovesLogo.src;
  incentiveDataKey = '';

  _computePoolsInfo(data: any) {
    const rawPools: TrovesStrategyAPIResult[] = data.strategies;
    const pools: PoolInfo[] = [];
    return rawPools.map((rawPool) => {
      const poolName = rawPool.name;
      const riskFactor = rawPool.riskFactor;

      const isStable = poolName.includes('USDC') || poolName.includes('USDT');
      const categories: Category[] = getCategoriesFromName(poolName, isStable);

      const rewardsApy: APRSplit[] = [];
      if (rawPool.apySplit.rewardsApy > 0) {
        rewardsApy.push({
          apr: rawPool.apySplit.rewardsApy,
          title: 'Rewards APY',
          description: CONSTANTS.BOOSTED_YIELD_TOOLTIP_TEXT,
        });
      }

      const poolInfo: PoolInfo = {
        pool: {
          id: rawPool.id,
          name: poolName,
          logos: [...rawPool.logos],
        },
        protocol: {
          name: this.name,
          link: `/strategy/${rawPool.id}`,
          logo: this.logo,
        },
        apr:
          rewardsApy.length && rewardsApy[0].apr != 'Err'
            ? rewardsApy[0].apr
            : 0,
        tvl: rawPool.tvlUsd,
        aprSplits: [...rewardsApy],
        apyMethodology: rawPool.apyMethodology,
        category: categories,
        type: PoolType.Derivatives,
        lending: {
          collateralFactor: 0,
        },
        borrow: {
          borrowFactor: 0,
          apr: 0,
        },
        additional: {
          riskFactor,
          tags: [getLiveStatusEnum(rawPool.status.number)],
          isAudited: rawPool.isAudited,
          auditUrl: rawPool.auditUrl,
          is_promoted: poolName.includes('Stake'),
        },
      };
      console.log('rawPool', poolName, poolInfo);
      return poolInfo;
    });
  }

  getBaseAPY(p: PoolInfo, data: AtomWithQueryResult<any, Error>) {
    const aprData: TrovesStrategyAPIResult[] = data.data.strategies;
    let baseAPY: number | 'Err' = 'Err';
    let splitApr: APRSplit | null = null;
    const metadata: PoolMetadata | null = null;
    if (data.isSuccess) {
      const item = aprData.find((doc) => doc.id === p.pool.id);
      if (item) {
        baseAPY = item.apySplit.baseApy;
        splitApr = {
          apr: item.apySplit.baseApy,
          title: 'Strategy APY',
          description: 'Includes fees & Defi spring rewards',
        };
      }
    }
    return {
      baseAPY,
      splitApr,
      metadata,
    };
  }
}

export const TrovesBaseAPYsAtom = atomWithQuery((get) => ({
  queryKey: ['troves_base_aprs'],
  queryFn: async ({
    queryKey,
  }): Promise<{
    strategies: TrovesStrategyAPIResult[];
  }> => {
    const response = await fetch(`${CONSTANTS.Troves.BASE_APR_API}`);
    const data = await response.json();
    return data;
  },
}));

export const troves = new Troves();
const TrovesAtoms: ProtocolAtoms = {
  baseAPRs: TrovesBaseAPYsAtom,
  pools: atom((get) => {
    const empty: PoolInfo[] = [];
    if (!TrovesAtoms.baseAPRs) return empty;
    const baseInfo = get(TrovesAtoms.baseAPRs);
    if (baseInfo.data) {
      const pools = troves._computePoolsInfo(baseInfo.data);
      return troves.addBaseAPYs(pools, baseInfo);
    }
    return empty;
  }),
};
export default TrovesAtoms;
