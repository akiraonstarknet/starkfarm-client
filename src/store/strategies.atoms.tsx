import { atom } from 'jotai';
import {
  IStrategy,
  IStrategyProps,
  StrategyLiveStatus,
  StrategyTag,
} from '@/strategies/IStrategy';
import CONSTANTS from '@/constants';
import { convertToV2TokenInfo, getTokenInfoFromName } from '@/utils';
import { allPoolsAtomUnSorted, privatePoolsAtom } from './protocols';
import { endur } from './endur.store';
import { PoolInfo } from './pools';
import { AutoTokenStrategy } from '@/strategies/auto_strk.strat';
import { DeltaNeutralMM } from '@/strategies/delta_neutral_mm';
import { DeltaNeutralMM2 } from '@/strategies/delta_neutral_mm_2';
import { DeltaNeutralMMVesuEndur } from '@/strategies/delta_neutral_mm_vesu_endur';
import { Box, Link, Text } from '@chakra-ui/react';
import {
  EkuboCLVaultStrategies,
  HyperLSTStrategies,
  SenseiStrategies,
  UniversalStrategies,
  UniversalStrategy,
  VesuRebalanceStrategies,
} from '@strkfarm/sdk';
import { VesuRebalanceStrategy } from '@/strategies/vesu_rebalance';
import { atomWithQuery } from 'jotai-tanstack-query';
import { EkuboClStrategy } from '@/strategies/ekubo_cl_vault';
import { ReactNode } from 'react';
import { UniversalStrategyClass } from '@/strategies/universal.strat';
import { HyperLSTStrategy } from '@/strategies/hyper-lst.strat';

export interface StrategyInfo<T> extends IStrategyProps<T> {
  name: string;
}

export function getStrategies() {
  const alerts2: any[] = [
    {
      type: 'warning',
      text: (
        <Box>
          Deposits are expected to fail for this strategy due to an ongoing
          zkLend security incident until further notice.{' '}
          <Link
            href="https://x.com/troves/status/1889526043733794979"
            color="white"
            fontWeight={'bold'}
          >
            Learn more
          </Link>
        </Box>
      ),
      tab: 'deposit',
    },
    {
      type: 'warning',
      text: (
        <Box>
          You will receive withdrawals as zTokens, redeemable on zkLend.
          However, since zkLend is exploited, redemptions may not be in full
          value.{' '}
          <Link
            href="https://x.com/troves/status/1889526043733794979"
            color="white"
            fontWeight={'bold'}
          >
            Learn more
          </Link>
        </Box>
      ),
      tab: 'withdraw',
    },
  ];

  const DNMMDescription = (token1: string, token2: string) => (
    <Box>
      <Text>
        <b style={{ color: 'red' }}>Note: </b>Vault is retired due to zkLend
        exploit. Claim any recovered funds{' '}
        <Link href="/recovery" textDecoration={'underline'}>
          here.
        </Link>
      </Text>
    </Box>
  );

  const autoStrkStrategy = new AutoTokenStrategy(
    'STRK',
    'Auto Compounding STRK',
    DNMMDescription('', ''),
    'zSTRK',
    CONSTANTS.CONTRACTS.AutoStrkFarm,
    {
      maxTVL: 2000000,
      isAudited: true,
      isPaused: false,
      alerts: alerts2,
      quoteToken: convertToV2TokenInfo(getTokenInfoFromName('STRK')),
    },
  );
  const autoUSDCStrategy = new AutoTokenStrategy(
    'USDC',
    'Auto Compounding USDC',
    DNMMDescription('', ''),
    'zUSDC',
    CONSTANTS.CONTRACTS.AutoUsdcFarm,
    {
      maxTVL: 2000000,
      isAudited: true,
      isPaused: false,
      alerts: alerts2,
      quoteToken: convertToV2TokenInfo(getTokenInfoFromName('USDC')),
    },
  );

  const alerts: any[] = [
    {
      type: 'warning',
      text: (
        <Box>
          Deposits and Withdraws are paused for this strategy due to zkLend
          security incident. This vault is retired.{' '}
          <Link
            href="https://x.com/troves/status/1889526043733794979"
            color="white"
            fontWeight={'bold'}
          >
            Learn more
          </Link>
        </Box>
      ),
      tab: 'all',
    },
  ];

  const usdcTokenInfo = getTokenInfoFromName('USDC');
  const deltaNeutralMMUSDCETH = new DeltaNeutralMM(
    usdcTokenInfo,
    'USDC Sensei',
    DNMMDescription('USDC', 'ETH'),
    'ETH',
    CONSTANTS.CONTRACTS.DeltaNeutralMMUSDCETH,
    [1, 0.615384615, 1, 0.584615385, 0.552509024], // precomputed factors based on strategy math
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 1500000,
      isAudited: true,
      alerts,
      isPaused: true,
      quoteToken: convertToV2TokenInfo(getTokenInfoFromName('USDC')),
    },
  );

  const deltaNeutralMMETHUSDC = new DeltaNeutralMM(
    getTokenInfoFromName('ETH'),
    'ETH Sensei',
    DNMMDescription('ETH', 'USDC'),
    'USDC',
    CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDC,
    [1, 0.609886, 1, 0.920975, 0.510078], // precomputed factors based on strategy math
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 1000,
      alerts,
      isAudited: true,
      isPaused: true,
      quoteToken: convertToV2TokenInfo(getTokenInfoFromName('ETH')),
    },
  );
  const deltaNeutralMMSTRKETH = new DeltaNeutralMM(
    getTokenInfoFromName('STRK'),
    'STRK Sensei',
    DNMMDescription('STRK', 'ETH'),
    'ETH',
    CONSTANTS.CONTRACTS.DeltaNeutralMMSTRKETH,
    [1, 0.384615, 1, 0.492308, 0.233276], // precomputed factors based on strategy math, last is the excess deposit1 that is happening
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 1500000,
      isAudited: true,
      alerts,
      isPaused: true,
      quoteToken: convertToV2TokenInfo(getTokenInfoFromName('STRK')),
    },
  );

  const deltaNeutralMMETHUSDCReverse = new DeltaNeutralMM2(
    getTokenInfoFromName('ETH'),
    'ETH Sensei XL',
    DNMMDescription('ETH', 'USDC'),
    'USDC',
    CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDCXL,
    [1, 0.5846153846, 1, 0.920975, 0.552509], // precomputed factors based on strategy math
    StrategyLiveStatus.RETIRED,
    {
      maxTVL: 2000,
      alerts,
      isAudited: false,
      isPaused: true,
      quoteToken: convertToV2TokenInfo(getTokenInfoFromName('ETH')),
    },
  );

  const xSTRKStrategyInfo = SenseiStrategies.find(
    (s) => s.name === 'xSTRK Sensei',
  )!;
  const deltaNeutralxSTRKSTRK = new DeltaNeutralMMVesuEndur(
    'xstrk_sensei',
    xSTRKStrategyInfo,
    StrategyLiveStatus.ACTIVE,
    {
      maxTVL: xSTRKStrategyInfo.maxTVL.toNumber(),
      alerts: [
        {
          type: 'info',
          text: 'Depeg-risk: If xSTRK price on DEXes deviates from expected price, you may lose money or may have to wait for the price to recover.',
          tab: 'all',
        },
      ],
      isPaused: false,
      isInMaintenance: false,
      isAudited: false,
      isInstantWithdrawal: true,
      isTransactionHistDisabled: true,
      quoteToken: convertToV2TokenInfo(getTokenInfoFromName('STRK')),
    },
  );

  const vesuRebalanceStrats = VesuRebalanceStrategies.map((v) => {
    return new VesuRebalanceStrategy(
      getTokenInfoFromName(v.depositTokens[0]?.symbol || ''),
      v.name,
      v.description as string,
      v,
      StrategyLiveStatus.ACTIVE,
      {
        maxTVL: 0,
        isAudited: v.auditUrl ? true : false,
        auditUrl: v.auditUrl,
        isPaused: false,
        isInMaintenance: false,
        alerts: [
          // {
          //   type: 'warning',
          //   text: (
          //     <p>
          //       <strong>Note:</strong> Vesu has recently migrated. Deposits and
          //       withdrawals for this strategy are temporarily paused until we
          //       migrate this strategy.{' '}
          //       <a
          //         href="https://x.com/vesuxyz/status/1927827405030244838"
          //         target="_blank"
          //         rel="noopener noreferrer"
          //       >
          //         Learn more
          //       </a>
          //       .
          //     </p>
          //   ),
          //   tab: 'all',
          // },
        ],
        isInstantWithdrawal: true,
        quoteToken: convertToV2TokenInfo(
          getTokenInfoFromName(v.depositTokens[0]?.symbol || ''),
        ),
      },
    );
  });

  const ekuboAlert1: any = {
    type: 'info',
    text: (
      <p>
        Depending on the current position range and price, your input amounts
        are automatically adjusted to nearest required amounts. If you have
        insufficient tokens, you can acquire the required tokens on{' '}
        <Link
          href="https://avnu.fi"
          target="_blank"
          rel="noopener noreferrer"
          marginLeft={'2px'}
          textDecoration={'underline'}
        >
          Avnu
        </Link>
      </p>
    ),
    tab: 'deposit',
  };

  const lstAlert: any = {
    tab: 'deposit',
    text: (
      <>
        To acquire the LST, please visit{' '}
        <Link
          href="https://app.endur.fi"
          target="_blank"
          marginLeft={'3px'}
          rel="noopener noreferrer"
          textDecoration={'underline'}
        >
          endur.fi
        </Link>
      </>
    ),
    type: 'info',
  };

  const ekuboCLStrats = EkuboCLVaultStrategies.map((v) => {
    return new EkuboClStrategy(
      v.name,
      v.description as ReactNode,
      v,
      v.curator?.name.toLowerCase().includes('re7')
        ? StrategyLiveStatus.NEW
        : StrategyLiveStatus.ACTIVE,
      {
        maxTVL: 0,
        isAudited: v.auditUrl ? true : false,
        auditUrl: v.auditUrl,
        isPaused: false,
        alerts: [
          ...(v.additionalInfo.lstContract
            ? [lstAlert, ekuboAlert1]
            : [ekuboAlert1]),
          {
            type: 'info',
            text: (
              <>
                Depending on the current position range and price, you may
                receive both of the tokens or one of the tokens depending on the
                price
              </>
            ),
            tab: 'withdraw',
          },
        ],
        isInstantWithdrawal: true,
        quoteToken: convertToV2TokenInfo(
          getTokenInfoFromName(v.additionalInfo.quoteAsset.symbol),
        ),
        tags: v.additionalInfo.lstContract
          ? [StrategyTag.EKUBO, StrategyTag.Endur]
          : [StrategyTag.EKUBO],
        hideNetEarnings: true,
        isTransactionHistDisabled: v.additionalInfo.lstContract ? true : false,
      },
    );
  }).filter((s) => {
    return s.name != 'Ekubo tBTC/USDC'; // disable for now
  });

  const evergreenStrategies = UniversalStrategies.map((uni) => {
    return new UniversalStrategyClass(
      `evergreen_${uni.depositTokens[0]?.symbol.toLowerCase()}`,
      getTokenInfoFromName(uni.depositTokens[0]?.symbol || ''),
      uni.name,
      uni.description as ReactNode,
      uni,
      StrategyLiveStatus.ACTIVE,
      {
        maxTVL: 0,
        isPaused: false,
        alerts: [
          {
            tab: 'withdraw',
            text: 'On withdrawal, you will receive an NFT representing your withdrawal request. The funds will be automatically sent to your wallet (NFT owner) in 1-2 hours. You can monitor the status in transactions tab.',
            type: 'info',
          },
        ],
        isAudited: uni.auditUrl ? true : false,
        auditUrl: uni.auditUrl,
        tags: [StrategyTag.EVERGREEN],
        hideHarvestInfo: true,
        isInstantWithdrawal: false,
        quoteToken: convertToV2TokenInfo(uni.depositTokens[0]),
        showWithdrawalWarningModal: true, // Enable withdrawal warning modal for evergreen strategies
      },
      UniversalStrategy,
    );
  });

  const hyperLSTStrategies = HyperLSTStrategies.map((hyper) => {
    const lstToken = hyper.depositTokens[0].symbol;
    const baseToken = lstToken.replace('x', '');
    return new HyperLSTStrategy(
      `hyper_${hyper.depositTokens[0]?.symbol.toLowerCase()}`,
      getTokenInfoFromName(hyper.depositTokens[0]?.symbol || ''),
      hyper.name,
      hyper.description as ReactNode,
      hyper,
      StrategyLiveStatus.HOT,
      {
        maxTVL: 0,
        isPaused: false,
        alerts: [
          {
            tab: 'withdraw',
            text: 'Liquid staking just launched, while we ensure executions happen at minimal slippages, there may be delays in withdrawals upto 24hrs during the launch to ensure minimal slippage.',
            type: 'warning',
          },
          {
            tab: 'withdraw',
            text: 'On withdrawal, you will receive an NFT representing your withdrawal request. The funds will be automatically sent to your wallet (NFT owner) in 1-2 hours. You can monitor the status in transactions tab.',
            type: 'info',
          },
          {
            tab: 'deposit',
            text: (
              <>
                To acquire the LST, please visit{' '}
                <Link
                  href="https://app.endur.fi"
                  target="_blank"
                  marginLeft={'3px'}
                  rel="noopener noreferrer"
                  textDecoration={'underline'}
                >
                  endur.fi
                </Link>
              </>
            ),
            type: 'info',
          },
        ],
        tags: [StrategyTag.Endur],
        isAudited: hyper.auditUrl ? true : false,
        auditUrl: hyper.auditUrl,
        hideHarvestInfo: true,
        isInstantWithdrawal: false,
        quoteToken: convertToV2TokenInfo(hyper.depositTokens[0]),
        showWithdrawalWarningModal: false, // Enable withdrawal warning modal for evergreen strategies
      },
    );
  });

  // undo
  const strategies: IStrategy<any>[] = [
    autoStrkStrategy,
    autoUSDCStrategy,
    deltaNeutralMMUSDCETH,
    deltaNeutralMMETHUSDC,
    deltaNeutralMMSTRKETH,
    deltaNeutralMMETHUSDCReverse,
    deltaNeutralxSTRKSTRK,
    ...vesuRebalanceStrats,
    ...ekuboCLStrats,
    ...evergreenStrategies,
    ...hyperLSTStrategies,
    // xSTRKStrategy,
  ];

  // Add BTC tags if applicable
  strategies
    .filter((s) => s.name.toLowerCase().includes('btc'))
    .map((s) => {
      s.settings.tags?.push(StrategyTag.BTC);
      return s;
    });

  return strategies;
}

export const STRATEGIES_INFO = getStrategies();

export const getPrivatePools = (get: any) => {
  // A placeholder to fetch any external pools/rewards info
  // that is not necessarily available in the allPools (i.e. not public)

  return [];
};

const strategiesAtomAsync = atomWithQuery((get) => {
  return {
    queryKey: ['strategies'],
    queryFn: async () => {
      const strategies = getStrategies();
      const allPools = get(allPoolsAtomUnSorted);
      const requiredPools = allPools.filter(
        (p) =>
          p.protocol.name === 'Nostra' ||
          p.protocol.name === 'Vesu' ||
          p.protocol.name === endur.name,
      );

      const privatePools: PoolInfo[] = get(privatePoolsAtom);
      const proms = strategies.map((s) =>
        s.solve([...requiredPools, ...privatePools], '1000'),
      );
      await Promise.all(proms);

      strategies.sort((a, b) => {
        const status1 = getLiveStatusNumber(a.liveStatus);
        const status2 = getLiveStatusNumber(b.liveStatus);
        return status1 - status2 || b.netYield - a.netYield;
      });
      return strategies;
    },
  };
});

export const strategiesAtom = atom<StrategyInfo<any>[]>((get) => {
  const { data } = get(strategiesAtomAsync);
  if (!data) {
    const strategies = getStrategies();
    return strategies;
  }
  return data;
});

export function getLiveStatusNumber(status: StrategyLiveStatus) {
  if (status == StrategyLiveStatus.HOT) {
    return 1;
  }
  if (status == StrategyLiveStatus.NEW) {
    return 2;
  } else if (status == StrategyLiveStatus.ACTIVE) {
    return 3;
  } else if (status == StrategyLiveStatus.COMING_SOON) {
    return 4;
  }
  return 5;
}
