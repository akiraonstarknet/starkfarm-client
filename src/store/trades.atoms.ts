import {
  IStrategyActionHook,
  StrategyLiveStatus,
  TokenInfo,
} from '@/strategies/IStrategy';
import { PoolInfo } from './pools';
import CONSTANTS from '@/constants';
import { getTokenInfoFromName } from '@/utils';
import { atom } from 'jotai';
import {
  TradeActionAdditionalData,
  TradeStrategy,
} from '@/strategies/trade.strat';
import { allPoolsAtomUnSorted } from './protocols';
import MyNumber from '@/utils/MyNumber';
import { atomWithQuery, AtomWithQueryResult } from 'jotai-tanstack-query';
import { Call, Contract, num, ProviderInterface, uint256 } from 'starknet';
import TradeAbi from '@/abi/trade.abi.json';
import TradeFactoryAbi from '@/abi/tradeFactory.abi.json';
import { addressAtom, getProvider } from './claims.atoms';
import { BalanceResult, DUMMY_BAL_ATOM, getBalanceAtom } from './balance.atoms';
import ERC20Abi from '@/abi/erc20.abi.json';

export interface TradeInfo
  extends Omit<PoolInfo, 'borrow' | 'lending' | 'category' | 'type'> {
  collaterals: TokenInfo[];
  isLong: boolean;
}

export interface BaseTradeConfig {
  collateral: {
    token: TokenInfo;
  }[];
  debt: {
    token: TokenInfo;
    minAmount: MyNumber;
  };
  trade: TokenInfo;
}

// nostra map
export const assetDebtTokenMap: { [key: string]: string } = {};
assetDebtTokenMap['USDC'] =
  '0x063d69ae657bd2f40337c39bf35a870ac27ddf91e6623c2f52529db4c1619a51';
assetDebtTokenMap['ETH'] =
  '0x00ba3037d968790ac486f70acaa9a1cab10cf5843bb85c986624b4d0e5a82e74';
assetDebtTokenMap['STRK'] =
  '0x001258eae3eae5002125bebf062d611a772e8aea3a1879b64a19f363ebd00947';

export const assetCollateralTokenMap: { [key: string]: string } = {
  USDC: '0x05dcd26c25d9d8fd9fc860038dcb6e4d835e524eb8a85213a8cda5b7fff845f6',
  ETH: '0x057146f6409deb4c9fa12866915dd952aa07c1eb2752e451d7f3b042086bdeb8',
  STRK: '0x07c2e1e733f28daa23e78be3a4f6c724c0ab06af65f6a95b5e0545215f1abc1b',
};

const allowedTrades: BaseTradeConfig[] = [
  {
    collateral: [
      {
        token: getTokenInfoFromName('ETH'),
      },
    ],
    debt: {
      token: getTokenInfoFromName('USDC'),
      minAmount: MyNumber.fromEther('50', 6),
    },
    trade: getTokenInfoFromName('ETH'),
  },
  {
    collateral: [
      {
        token: getTokenInfoFromName('ETH'),
      },
    ],
    debt: {
      token: getTokenInfoFromName('ETH'),
      minAmount: MyNumber.fromEther('0.02', 18),
    },
    trade: getTokenInfoFromName('USDC'),
  },
  {
    collateral: [
      {
        token: getTokenInfoFromName('STRK'),
      },
    ],
    debt: {
      token: getTokenInfoFromName('USDC'),
      minAmount: MyNumber.fromEther('50', 6),
    },
    trade: getTokenInfoFromName('STRK'),
  },
  {
    collateral: [
      {
        token: getTokenInfoFromName('STRK'),
      },
    ],
    debt: {
      token: getTokenInfoFromName('STRK'),
      minAmount: MyNumber.fromEther('60', 18),
    },
    trade: getTokenInfoFromName('USDC'),
  },
];

export const tradeStratAtoms = atom<TradeStrategy[]>((get) => {
  const pools = get(allPoolsAtomUnSorted);
  return allowedTrades.map((config) => {
    const strat = new TradeStrategy(
      'Trade desc',
      config,
      StrategyLiveStatus.ACTIVE,
    );
    strat.solve(pools, '1000');
    strat.maxLeverage(pools);
    return strat;
  });
});

export const tradePoolsAtom = atom<TradeInfo[]>((get) => {
  const strats = get(tradeStratAtoms);
  return strats.map((strat) => {
    console.log(`tradeMaxLeve`, strat.leverage);
    const poolInfo: TradeInfo = {
      pool: {
        // id: getPoolId(trade),
        // name: getPoolName(trade),
        id: strat.id,
        name: strat.name,
        logos: [
          strat.isLong()
            ? strat.baseConfig.trade.logo
            : strat.baseConfig.debt.token.logo,
        ],
      },
      protocol: {
        name: 'STRKFarm',
        link: `/trade/${strat.id}`,
        logo: '',
      },
      tvl: 0,
      apr: strat.netYield,
      aprSplits: [{
        apr: strat.netYield,
        title: 'Net Yield:',
        description: ''
      }],
      collaterals: strat.baseConfig.collateral.map(
        (collateral) => collateral.token,
      ),
      additional: {
        leverage: strat.leverage,
        riskFactor: 0,
        tags: [],
        isAudited: false,
      },
      isLong: strat.baseConfig.debt.token.name == 'USDC',
    };
    return poolInfo;
  });
});

export function getTradeContract(addr: string | BigInt) {
  return new Contract(TradeAbi, addr.toString(), getProvider());
}

export function getTradeFactoryContract() {
  return new Contract(
    TradeFactoryAbi,
    CONSTANTS.CONTRACTS.TradeFactory,
    getProvider(),
  );
}

export interface TradePosition {
  collateral: MyNumber;
  borrowed: MyNumber;
  tradeToken: MyNumber;
}

export const currentTradeIdAtom = atom<string | null>(null);

export const currentTradeStrategy = atom((get) => {
  const id = get(currentTradeIdAtom);
  console.log('currentTradeStrategy', id);
  if (!id) return null;
  const strats = get(tradeStratAtoms);
  const strat = strats.find((strat) => strat.id == id);
  if (!strat) return null;
  return strat;
});

export const tradePositionAtom = atomWithQuery<TradePosition | null>((get) => {
  return {
    queryKey: [
      'tradePosition',
      get(currentTradeStrategy),
      get(userTradeAddressAtom),
    ],
    queryFn: async ({ queryKey }) => {
      const strat = get(currentTradeStrategy);
      const userTradeAddress = get(userTradeAddressAtom);
      console.log('tradePosition0', strat, userTradeAddress.data);
      if (!strat || !userTradeAddress.data) return null;
      const baseConfig = strat.baseConfig;
      console.log('tradePosition1', baseConfig);
      try {
        const tradeContract = getTradeContract(userTradeAddress.data);
        const result: any = await tradeContract.call('position');
        console.log('tradePosition2', result);
        return {
          collateral: new MyNumber(
            result.collateral.toString(),
            baseConfig.collateral[0].token.decimals,
          ),
          borrowed: new MyNumber(
            result.borrowed.toString(),
            baseConfig.debt.token.decimals,
          ),
          tradeToken: new MyNumber(
            result.tradeToken.toString(),
            baseConfig.trade.decimals,
          ),
        };
      } catch (e) {
        console.error('tradePosition error', e);
        return null;
      }
    },
    refreshInterval: 5000,
    refetchIntervalInBackground: true,
  };
});

export const userTradeAddressAtom = atomWithQuery<string>((get) => {
  return {
    queryKey: ['userTradeAddress', get(addressAtom), get(currentTradeStrategy)],
    queryFn: async ({ queryKey }) => {
      console.log('userTradeAddress1', queryKey);
      const address: string = queryKey[1] as string;
      const strat: TradeStrategy = queryKey[2] as TradeStrategy;
      console.log('tradeCloseActionsAtom1', address, strat.id);
      if (!strat) return '';
      const baseConfig = strat.baseConfig;
      const tradeFactory = getTradeFactoryContract();
      console.log('tradeCloseActionsAtom2', baseConfig);
      const result: any = await tradeFactory.call('get_user_trade_contract', [
        address,
        baseConfig.collateral[0].token.token,
        baseConfig.debt.token.token,
        baseConfig.trade.token,
      ]);
      console.log('tradeCloseActionsAtom3', result);
      return num.getHexString((result as BigInt).toString());
    },
  };
});

export const tradeOpenMethodsAtom = atom((get) => {
  const strat = get(currentTradeStrategy);
  const address = get(addressAtom);
  const userTradeAddressRes = get(userTradeAddressAtom);
  return async function tradeOpenMethods(
    collateralAmount: MyNumber,
    address: string,
    provider: ProviderInterface,
    additionalData: TradeActionAdditionalData,
  ) {
    const actions: IStrategyActionHook[] = [];
    if (!strat || userTradeAddressRes.isLoading) return actions;

    for (let i = 0; i < strat.baseConfig.collateral.length; ++i) {
      const baseTokenInfo = strat.baseConfig.collateral[i].token;
      if (!address || address == '0x0') {
        actions.push({
          tokenInfo: baseTokenInfo,
          calls: [],
          balanceAtom: DUMMY_BAL_ATOM,
        });
        continue;
      }

      const baseTokenContract = new Contract(
        ERC20Abi,
        baseTokenInfo.token,
        provider,
      );

      const factoryContract = getTradeFactoryContract();
      const userTradeAddress = userTradeAddressRes.data;

      const calls: Call[] = [
        // approve base token
        baseTokenContract.populate('approve', [
          userTradeAddress || factoryContract.address,
          uint256.bnToUint256(collateralAmount.toString()),
        ]),
      ];

      if (!userTradeAddress) {
        const initCalldata = {
          user: address,
          collateral: baseTokenInfo.token,
          borrowed: strat.baseConfig.debt.token.token,
          trade_token: strat.baseConfig.trade.token,
          collateral_amount: uint256.bnToUint256(collateralAmount.toString()),
          trade_amount: uint256.bnToUint256(
            additionalData.tradeAmount.toString(),
          ),
          min_hf: (strat.minHf * 10000).toFixed(0),
          max_slippage_bps: 100,
          // todo make this dynamic later
          path_borrow_to_trade: [
            strat.baseConfig.debt.token.token,
            strat.baseConfig.trade.token,
          ],
          path_trade_to_borrow: [
            strat.baseConfig.trade.token,
            strat.baseConfig.debt.token.token,
          ],
        };
        console.log('initCaldata', initCalldata);
        calls.push(
          factoryContract.populate('init_and_add_position', initCalldata),
        );
      } else {
        // add collateral
        const tradeContract = getTradeContract(userTradeAddress);
        const addCollateralCall = tradeContract.populate('add_collateral', {
          amount: uint256.bnToUint256(collateralAmount.toString()),
        });

        const addTradeCall = tradeContract.populate('add_position', {
          trade_amount: uint256.bnToUint256(
            additionalData.tradeAmount.toString(),
          ),
          min_hf: strat.minHf * 10000,
          max_slippage_bps: 100,
          path_borrow_to_trade: [
            strat.baseConfig.debt.token.token,
            strat.baseConfig.trade.token,
          ],
          path_trade_to_borrow: [
            strat.baseConfig.trade.token,
            strat.baseConfig.debt.token.token,
          ],
        });

        calls.push(addCollateralCall, addTradeCall);
      }

      actions.push({
        tokenInfo: baseTokenInfo,
        calls,
        balanceAtom: getBalanceAtom(baseTokenInfo, atom(true)),
      });
    }
    return actions;
  };
});

export const currentTradeAmountAtom = atomWithQuery((get) => {
  return {
    queryKey: [
      'tradePositionTradeAmount',
      get(tradePositionAtom),
      get(currentTradeStrategy),
    ],
    queryFn: async ({ queryKey }: any): Promise<BalanceResult> => {
      const position: AtomWithQueryResult<TradePosition | null, Error> =
        queryKey[1];
      const strat: TradeStrategy | null = queryKey[2];
      if (!position || !strat) {
        return {
          amount: MyNumber.fromZero(),
          tokenInfo: undefined,
        };
      }
      return {
        amount:
          (strat.isLong()
            ? position.data?.tradeToken
            : position.data?.borrowed) ||
          MyNumber.fromEther('0', strat.baseConfig.trade.decimals),
        tokenInfo: strat.isLong()
          ? strat.baseConfig.trade
          : strat.baseConfig.debt.token,
      };
    },
  };
});

// export const currentCollateralAmountAtom = atomWithQuery((get) => {
//     return {
//         queryKey: ['tradePositionColAmount', get(tradePositionAtom), get(currentTradeStrategy)],
//         queryFn: async ({ queryKey }: any): Promise<BalanceResult> => {
//             const position: AtomWithQueryResult<TradePosition | null, Error> = queryKey[1];
//             const strat: TradeStrategy | null = queryKey[2];
//             if (!position || !strat) {
//                 return {
//                     amount: MyNumber.fromZero(),
//                     tokenInfo: undefined,
//                 };
//             }
//             return {
//                 amount: position.data?.collateral || MyNumber.fromEther('0', strat.baseConfig.collateral[0].token.decimals),
//                 tokenInfo: strat.baseConfig.collateral[0].token,
//             };
//         }
//     }
// })

export const tradeCloseActions = async (
  amount: MyNumber,
  address: string,
  strat: TradeStrategy | null,
  userTradeAddressRes: AtomWithQueryResult<string, Error>,
): Promise<IStrategyActionHook[]> => {
  console.log('tradeCloseActionsAtom4', userTradeAddressRes, strat?.id);

  if (!strat) return [];

  // todo fix this. doest work for short tokens
  const tradeColToken = TradeStrategy.getCollateralToken(
    strat.baseConfig.trade,
  );

  // removing max amount restrictions on withdrawal
  tradeColToken.maxAmount = MyNumber.fromEther(
    '100000000000',
    tradeColToken.maxAmount.decimals,
  );

  if (!userTradeAddressRes.data || !address || address == '0x0') {
    return [
      {
        tokenInfo: tradeColToken,
        calls: [],
        balanceAtom: currentTradeAmountAtom,
      },
    ];
  }

  const userTradeAddress = userTradeAddressRes.data;
  const tradeContract = getTradeContract(userTradeAddress);

  const call = tradeContract.populate('close_position', {
    trade_amount: amount.toUint256(),
    max_slippage_bps: 1000,
    path_trade_to_borrow: [
      strat.baseConfig.trade.token,
      strat.baseConfig.debt.token.token,
    ],
    collateral_to_borrow_path: [
      strat.baseConfig.collateral[0].token.token,
      strat.baseConfig.debt.token.token,
    ],
    receiver: address,
  });

  const calls: Call[] = [call];

  return [
    {
      tokenInfo: tradeColToken,
      calls,
      balanceAtom: currentTradeAmountAtom,
    },
  ];
};

export const getLiquidationPriceAtom = atomWithQuery<{
  price: number;
  percentChange: number;
  currentPrice: number;
}>((get) => {
  return {
    queryKey: [
      'liquidationPrice',
      get(tradePositionAtom),
      get(currentTradeStrategy),
    ],
    queryFn: async ({
      queryKey,
    }: any): Promise<{
      price: number;
      percentChange: number;
      currentPrice: number;
    }> => {
      const strat: TradeStrategy | null = queryKey[2];
      const position: AtomWithQueryResult<TradePosition | null, Error> =
        queryKey[1];
      if (!strat || !position.data) {
        return {
          price: 0,
          percentChange: 0,
          currentPrice: 0,
        };
      }
      const baseConfig = strat.baseConfig;
      const allPools = get(allPoolsAtomUnSorted);
      // currently we can only solve with one
      // volatile token involed. all others have
      // to be ETH
      const collateral = baseConfig.collateral[0].token;
      const uniqueTokens = new Set(
        [
          collateral,
          strat.baseConfig.trade,
          strat.baseConfig.debt.token,
        ].filter((t) => t.name != 'USDC'),
      );
      const condition1 = uniqueTokens.size == 1;

      // get lending info (cf, bf) of pools
      const { collateralPool, borrowPool, tradePool } = strat.getLendingInfo(
        collateral,
        allPools,
      );
      if (!collateralPool || !borrowPool || !tradePool || !condition1) {
        console.warn(
          'getLiquidationPriceAtom: collateral, borrow or trade pool not found',
          {
            collateralPool,
            borrowPool,
            tradePool,
            condition1,
          },
          uniqueTokens,
        );
        return {
          price: 0,
          percentChange: 0,
          currentPrice: 0,
        };
      }

      // get prices
      const collateralPrice = await strat.getTokenPriceForLiq(
        baseConfig.collateral[0].token,
      );
      const debtPrice = await strat.getTokenPriceForLiq(baseConfig.debt.token);
      const tradePrice = await strat.getTokenPriceForLiq(baseConfig.trade);

      // What is the price of token when hf 1
      if (
        collateral.name == 'USDC' &&
        strat.baseConfig.debt.token.name == 'USDC'
      ) {
        // long using USDC
        // hf = [(colAmount * colPrice * cf) + (tradeAmount * tradePrice * cf2)] * bf / (debtAmount * debtPrice)
        // tradePrice = ((hf * debtAmount * debtPrice / bf) - (colAmount * colPrice * cf)) / (tradeAmount * cf2)
        const price =
          ((Number(position.data.borrowed.toEtherStr()) * debtPrice) /
            borrowPool.borrow.borrowFactor -
            Number(position.data.collateral.toEtherStr()) *
              collateralPrice *
              collateralPool.lending.collateralFactor) /
          (Number(position.data.tradeToken.toEtherStr()) *
            tradePool.lending.collateralFactor);
        return {
          price,
          percentChange: (-100 * (tradePrice - price)) / tradePrice,
          currentPrice: tradePrice,
        };
      } else if (strat.baseConfig.debt.token.name == 'USDC') {
        // long using trade token as collateral
        if (baseConfig.trade.token != baseConfig.collateral[0].token.token) {
          throw new Error(
            'getLiquidationPriceAtom: trade and collateral token must be the same',
          );
        }

        // hf = [(colAmount * tradePrice * cf) + (tradeAmount * tradePrice * cf2)] * bf / (debtAmount * debtPrice)
        // hf = [(colAmount + tradeAmount) * tradePrice * cf] * bf / (debtAmount * debtPrice)
        // tradePrice = (hf * debtAmount * debtPrice) / [(colAmount + tradeAmount) * bf * cf]
        const price =
          (Number(position.data.borrowed.toEtherStr()) * debtPrice) /
          ((Number(position.data.collateral.toEtherStr()) +
            Number(position.data.tradeToken.toEtherStr())) *
            borrowPool.borrow.borrowFactor *
            collateralPool.lending.collateralFactor);
        return {
          price,
          percentChange: (-100 * (tradePrice - price)) / tradePrice,
          currentPrice: tradePrice,
        };
      }

      // todo other conditions

      return {
        price: 0,
        percentChange: 0,
        currentPrice: 0,
      };
    },
  };
});

export const tradeProfitAtom = atomWithQuery((get) => {
  return {
    queryKey: [
      'tradeProfit',
      get(tradePositionAtom),
      get(currentTradeStrategy),
    ],
    queryFn: async ({ queryKey }: any) => {
      const strat: TradeStrategy | null = queryKey[2];
      const position: AtomWithQueryResult<TradePosition | null, Error> =
        queryKey[1];
      if (!strat || !position.data) {
        return {
          profitInTradeToken: 0,
          profitInUSD: 0,
          tokenInfo: undefined,
        };
      }
      const baseConfig = strat.baseConfig;

      // get prices
      const collateralPrice = await strat.getTokenPriceForLiq(
        baseConfig.collateral[0].token,
      );
      const debtPrice = await strat.getTokenPriceForLiq(baseConfig.debt.token);
      const tradePrice = await strat.getTokenPriceForLiq(baseConfig.trade);

      const collateralUSD =
        Number(position.data.collateral.toEtherStr()) * collateralPrice;
      const debtUSD = Number(position.data.borrowed.toEtherStr()) * debtPrice;
      const tradeUSD =
        Number(position.data.tradeToken.toEtherStr()) * tradePrice;

      // compute profit in usd
      const profitUSD = tradeUSD - debtUSD;

      // compute profit in trade token
      const profit = profitUSD / tradePrice;
      return {
        profitInTradeToken: profit,
        profitInUSD: profitUSD,
        tokenInfo: baseConfig.trade,
      };
    },
  };
});

export const tradeEffectiveAPYAtom = atomWithQuery((get) => {
  return {
    queryKey: [
      'tradeEffectiveAPY',
      get(tradePositionAtom),
      get(currentTradeStrategy),
    ],
    queryFn: async ({ queryKey }: any) => {
      const strat: TradeStrategy | null = queryKey[2];
      const position: AtomWithQueryResult<TradePosition | null, Error> =
        queryKey[1];
      if (!strat || !position.data) {
        return {
          apy: 0,
          tokenInfo: undefined,
        };
      }
      const baseConfig = strat.baseConfig;

      // get prices
      const collateralPrice = await strat.getTokenPriceForLiq(
        baseConfig.collateral[0].token,
      );
      const debtPrice = await strat.getTokenPriceForLiq(baseConfig.debt.token);
      const tradePrice = await strat.getTokenPriceForLiq(baseConfig.trade);

      // lending pools info
      const { collateralPool, borrowPool, tradePool } = strat.getLendingInfo(
        baseConfig.collateral[0].token,
        get(allPoolsAtomUnSorted),
      );

      if (!collateralPool || !borrowPool || !tradePool) {
        return {
          apy: 0,
          tokenInfo: undefined,
        };
      }

      // yield equations
      const collateralUSD =
        Number(position.data.collateral.toEtherStr()) * collateralPrice;
      const collateralYield = collateralUSD * collateralPool.apr;
      const tradeYield =
        Number(position.data.tradeToken.toEtherStr()) *
        tradePrice *
        tradePool.apr;
      const debtYield =
        Number(position.data.borrowed.toEtherStr()) *
        debtPrice *
        borrowPool.borrow.apr;

      const netInterest = tradeYield - debtYield + collateralYield;

      const apy = netInterest / collateralUSD;
      return {
        apy: apy * 100,
        tokenInfo: baseConfig.trade,
      };
    },
  };
});

export const tradeEffectiveLeverageAtom = atomWithQuery((get) => {
  return {
    queryKey: [
      'tradeEffectiveLeverage',
      get(tradePositionAtom),
      get(currentTradeStrategy),
    ],
    queryFn: async ({ queryKey }: any) => {
      const strat: TradeStrategy | null = queryKey[2];
      const position: AtomWithQueryResult<TradePosition | null, Error> =
        queryKey[1];
      if (!strat || !position.data) {
        return {
          leverage: 0,
          tokenInfo: undefined,
        };
      }
      const baseConfig = strat.baseConfig;

      // get prices
      const collateralPrice = await strat.getTokenPriceForLiq(
        baseConfig.collateral[0].token,
      );
      const debtPrice = await strat.getTokenPriceForLiq(baseConfig.debt.token);

      // yield equations
      const collateralUSD =
        Number(position.data.collateral.toEtherStr()) * collateralPrice;
      const debtUSD = Number(position.data.borrowed.toEtherStr()) * debtPrice;
      const leverage = debtUSD / collateralUSD;
      return {
        leverage,
      };
    },
  };
});

export const tradePositionInUSDAtom = atomWithQuery((get) => {
  return {
    queryKey: [
      'tradePositionInUSD',
      get(tradePositionAtom),
      get(currentTradeStrategy),
    ],
    queryFn: async ({ queryKey }: any) => {
      const strat: TradeStrategy | null = queryKey[2];
      const position: AtomWithQueryResult<TradePosition | null, Error> =
        queryKey[1];
      if (!strat || !position.data) {
        return {
          collateralUSD: 0,
          debtUSD: 0,
          tradeUSD: 0,
        };
      }
      const baseConfig = strat.baseConfig;

      // get prices
      const collateralPrice = await strat.getTokenPriceForLiq(
        baseConfig.collateral[0].token,
      );
      const debtPrice = await strat.getTokenPriceForLiq(baseConfig.debt.token);
      const tradePrice = await strat.getTokenPriceForLiq(baseConfig.trade);

      const collateralUSD =
        Number(position.data.collateral.toEtherStr()) * collateralPrice;
      const debtUSD = Number(position.data.borrowed.toEtherStr()) * debtPrice;
      const tradeUSD =
        Number(position.data.tradeToken.toEtherStr()) * tradePrice;

      return {
        collateralUSD,
        debtUSD,
        tradeUSD,
      };
    },
  };
});
