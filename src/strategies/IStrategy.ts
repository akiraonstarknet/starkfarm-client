import { IDapp } from '@/store/IDapp.store';
import {
  BalanceResult,
  getBalanceAtom,
  returnEmptyBal,
} from '@/store/balance.atoms';
import { IndexedPoolData } from '@/store/endur.store';
import { LendingSpace } from '@/store/lending.base';
import { Category, PoolInfo } from '@/store/pools';
import {
  convertToV2TokenInfo,
  convertToV2Web3Number,
  getPriceFromMyAPI,
  MyTokenInfo,
  MyWeb3Number,
} from '@/utils';
import MyNumber from '@/utils/MyNumber';
import {
  IInvestmentFlow,
  IStrategyMetadata,
  SingleActionAmount,
  TokenInfo as TokenInfoV2,
  VaultPosition,
  Web3Number,
} from '@strkfarm/sdk';
import { Atom, atom } from 'jotai';
import { AtomWithQueryResult, atomWithQuery } from 'jotai-tanstack-query';
import { ReactNode } from 'react';
import { Call, ProviderInterface } from 'starknet';

export interface Step {
  name: string;
  optimizer: (
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) => StrategyAction[];
  filter: ((
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) => PoolInfo[])[];
}

export interface TokenInfo {
  token: string;
  decimals: number;
  displayDecimals: number;
  address?: string;
  name: string;
  logo: any;
  ekuboPriceKey?: string;
  isERC4626: boolean;
}

export interface NFTInfo {
  name: string;
  address: string;
  logo: any;
  config: {
    mainTokenName: string;
  };
}

export interface StrategyAction {
  pool: PoolInfo;
  amount: string;
  isDeposit: boolean;
  name?: string;
}

export enum StrategyStatus {
  UNINTIALISED = 0,
  SOLVING = 1,
  SOLVED = 2,
}

export enum StrategyLiveStatus {
  ACTIVE = 'Active',
  NEW = 'New',
  COMING_SOON = 'Coming Soon',
  RETIRED = 'Retired',
  HOT = 'Hot & New 🔥',
}

export type onStratAmountsChangeFn = (
  change: {
    amountInfo: SingleActionAmount;
    index: number;
  },
  allAmounts: SingleActionAmount[],
) => Promise<SingleActionAmount[]>;

export interface IStrategyActionHook {
  calls: Call[];
  amounts: {
    tokenInfo: TokenInfoV2;
    balanceAtom: Atom<AtomWithQueryResult<BalanceResult, Error>>;
  }[];

  // if strategy wants to relate different input amounts,
  // config this fn
  onAmountsChange?: onStratAmountsChangeFn;
  onClickButton?: (amount: MyNumber) => Promise<ReactNode | string[]>;
}

export enum StrategyTag {
  EKUBO = 'Ekubo',
  EVERGREEN = 'Evergreen',
  Vesu = 'Vesu',
  Endur = 'Endur',
  BTC = 'BTC',
}

export interface IStrategySettings {
  maxTVL: number;
  alerts?: {
    type: 'warning' | 'info';
    text: string | ReactNode;
    tab: 'all' | 'deposit' | 'withdraw';
  }[];
  hideHarvestInfo?: boolean;
  is_promoted?: boolean;
  isAudited?: boolean;
  auditUrl?: string;
  isPaused?: boolean;
  isInMaintenance?: boolean;
  isInstantWithdrawal?: boolean;
  quoteToken: TokenInfoV2; // used to show the holdings in this token,
  isTransactionHistDisabled?: boolean;
  hideNetEarnings?: boolean;
  showWithdrawalWarningModal?: boolean; // Show withdrawal warning modal for this strategy
  tags?: StrategyTag[];
}

export interface AmountInfo {
  amount: Web3Number;
  usdValue: number;
  tokenInfo: TokenInfoV2;
}

export interface AmountsInfo {
  usdValue: number;
  amounts: AmountInfo[];
}

export interface DepositActionInputs {
  amount: MyNumber;
  amount2?: MyNumber; // used in dual token deposits
  address: string;
  provider: ProviderInterface;
  isMax: boolean;
}

export function isLive(status: StrategyLiveStatus) {
  return (
    status == StrategyLiveStatus.ACTIVE ||
    status == StrategyLiveStatus.HOT ||
    status == StrategyLiveStatus.NEW
  );
}

export interface WithdrawActionInputs extends DepositActionInputs {}

export class IStrategyProps<T> {
  readonly liveStatus: StrategyLiveStatus;
  readonly id: string;
  readonly name: string;
  readonly description: string | ReactNode;
  readonly settings: IStrategySettings;
  readonly metadata: IStrategyMetadata<T>;
  exchanges: IDapp<any>[] = [];

  // @deprecated Not used in new strats. instead use investmentFlows
  steps: Step[] = [];
  investmentFlows: IInvestmentFlow[] = [];

  actions: StrategyAction[] = [];
  netYield: number = 0;
  leverage: number = 0;
  fee_factor = 0; // in absolute terms, not %
  status = StrategyStatus.UNINTIALISED;
  isSingleTokenDepositView = true;

  readonly rewardTokens: { logo: string }[];
  readonly holdingTokens: (TokenInfo | NFTInfo)[];

  balEnabled = atom(false);
  // summary of balance in some quote token
  // as required by the strategy
  balanceSummaryAtom: Atom<AtomWithQueryResult<BalanceResult, Error>>;
  // a strategy can have multiple balance tokens, this is for that
  balanceAtoms: Atom<AtomWithQueryResult<BalanceResult, Error>>[] = [];
  balancesAtom: Atom<BalanceResult[]>;
  readonly tvlAtom: Atom<AtomWithQueryResult<AmountsInfo, Error>>;

  riskFactor: number = 5;
  risks: string[] = [
    'The strategy involves exposure to smart contracts, which inherently carry risks like hacks, albeit relatively low',
    'APYs shown are just indicative and do not promise exact returns',
  ];

  getSafetyFactorLine() {
    return `Risk factor: ${this.riskFactor.toFixed(2)}/5`;
  }

  depositMethods = async (
    inputs: DepositActionInputs,
  ): Promise<IStrategyActionHook[]> => {
    return [];
  };

  withdrawMethods = async (
    inputs: WithdrawActionInputs,
  ): Promise<IStrategyActionHook[]> => {
    return [];
  };

  getTVL = async (): Promise<AmountsInfo> => {
    throw new Error('getTVL: Not implemented');
  };

  getUserTVL = async (user: string): Promise<AmountsInfo> => {
    throw new Error('getTVL: Not implemented');
  };

  isLive() {
    return isLive(this.liveStatus);
  }

  isRetired() {
    return this.liveStatus == StrategyLiveStatus.RETIRED;
  }

  constructor(
    id: string,
    name: string,
    description: string | ReactNode,
    rewardTokens: { logo: string }[],
    holdingTokens: (TokenInfo | NFTInfo)[],
    liveStatus: StrategyLiveStatus,
    settings: IStrategySettings,
    metadata: IStrategyMetadata<T>,
    balanceAtom?: Atom<AtomWithQueryResult<BalanceResult, Error>>,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.rewardTokens = rewardTokens;
    this.holdingTokens = holdingTokens;
    this.balanceSummaryAtom =
      balanceAtom || getBalanceAtom(holdingTokens[0], this.balEnabled);
    this.liveStatus = liveStatus;
    this.settings = settings;
    this.metadata = metadata;
    this.tvlAtom = atomWithQuery((get) => {
      return {
        queryKey: ['tvl', this.id],
        queryFn: async ({ queryKey }: any): Promise<AmountsInfo> => {
          return this.getTVL();
        },
        refetchInterval: 15000,
      };
    });
    this.balancesAtom = this.getBalancesAtom();
  }

  getBalancesAtom() {
    return atom((get) => {
      return this.balanceAtoms.map((atom) => {
        const res = get(atom);
        if (!res.data) {
          return returnEmptyBal();
        }
        return res.data;
      });
    });
  }

  async computeSummaryValue(
    amounts: SingleActionAmount[],
    quoteToken: MyTokenInfo,
    source: string,
  ): Promise<MyWeb3Number> {
    const valuesProm = amounts.map((amount) => {
      return this.getValueInQuoteToken(
        convertToV2Web3Number(amount.amount),
        convertToV2TokenInfo(amount.tokenInfo),
        quoteToken,
        source,
      );
    });
    const values = await Promise.all(valuesProm);
    const total = values.reduce(
      (acc, amount) => {
        return acc.plus(amount);
      },
      Web3Number.fromWei('0', quoteToken.decimals),
    );
    return total;
  }

  async getValueInQuoteToken(
    amount: MyWeb3Number,
    tokenInfo: MyTokenInfo,
    quoteToken: MyTokenInfo,
    source: string,
  ): Promise<MyWeb3Number> {
    if (tokenInfo.address.eq(quoteToken.address)) {
      return amount;
    }

    const price = await getPriceFromMyAPI(tokenInfo);
    const priceQuote = await getPriceFromMyAPI(quoteToken);

    const amt = amount.multipliedBy(price).dividedBy(priceQuote);

    // adjust decimals
    const decimals = tokenInfo.decimals;
    const quoteDecimals = quoteToken.decimals;
    return new Web3Number(amt.toString(), quoteToken.decimals);
  }

  /**
   * Get vault positions for this strategy
   * @returns Promise<VaultPosition[]> - Array of vault positions
   */
  async getVaultPositions(): Promise<VaultPosition[]> {
    // Default implementation returns empty array for legacy strategies
    return [];
  }
}

export class IStrategy<T> extends IStrategyProps<T> {
  readonly tag: string;

  cache: { [key: string]: { value: any; time: number; ttl: number } } = {}; // to avoid multiple calls to the same function

  constructor(
    id: string,
    tag: string,
    name: string,
    description: string | ReactNode,
    rewardTokens: { logo: string }[],
    holdingTokens: (TokenInfo | NFTInfo)[],
    liveStatus = StrategyLiveStatus.ACTIVE,
    settings: IStrategySettings,
    metadata: IStrategyMetadata<T>,
    balanceAtom?: Atom<AtomWithQueryResult<BalanceResult, Error>>,
  ) {
    super(
      id,
      name,
      description,
      rewardTokens,
      holdingTokens,
      liveStatus,
      settings,
      metadata,
      balanceAtom,
    );
    this.tag = tag;
  }

  filterStablesOnly(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    const eligiblePools = pools.filter((p) =>
      p.category.includes(Category.Stable),
    );
    if (!eligiblePools) throw new Error(`${this.tag}: [F1] no eligible pools`);
    return eligiblePools;
  }

  filterSameProtocolNotSameDepositPool(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    if (prevActions.length == 0)
      throw new Error(
        `${this.tag}: filterSameProtocolNotSameDepositPool - Prev actions zero`,
      );
    const lastAction = prevActions[prevActions.length - 1];
    const eligiblePools = pools
      .filter((p) => p.protocol.name == lastAction.pool.protocol.name)
      .filter((p) => {
        return p.pool.name != lastAction.pool.pool.name;
      });

    if (!eligiblePools) throw new Error(`${this.tag}: [F2] no eligible pools`);
    return eligiblePools;
  }

  filterNotSameProtocolSameDepositPool(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    if (prevActions.length == 0)
      throw new Error(
        `${this.tag}: filterNotSameProtocolSameDepositPool - Prev actions zero`,
      );
    const lastAction = prevActions[prevActions.length - 1];
    const eligiblePools = pools
      .filter((p) => p.protocol.name != lastAction.pool.protocol.name)
      .filter((p) => {
        return p.pool.name == lastAction.pool.pool.name;
      });

    if (!eligiblePools) throw new Error(`${this.tag}: [F3] no eligible pools`);
    return eligiblePools;
  }

  filterTokenByProtocol(
    tokenName: string,
    protocol: IDapp<LendingSpace.MyBaseAprDoc[]> | IDapp<IndexedPoolData>,
  ) {
    return (
      pools: PoolInfo[],
      amount: string,
      prevActions: StrategyAction[],
    ) => {
      return pools.filter(
        (p) => p.pool.name == tokenName && p.protocol.name == protocol.name,
      );
    };
  }

  optimizerDeposit(
    eligiblePools: PoolInfo[],
    amount: string,
    actions: StrategyAction[],
  ) {
    let bestPool: PoolInfo = eligiblePools[0];
    eligiblePools.forEach((p) => {
      if (p.apr > bestPool.apr) {
        bestPool = p;
      }
    });
    return [...actions, { pool: bestPool, amount, isDeposit: true }];
  }

  async solve(pools: PoolInfo[], amount: string) {
    this.actions = [];
    let _amount: string = amount;
    let netYield = 0;
    this.status = StrategyStatus.SOLVING;
    try {
      for (let i = 0; i < this.steps.length; ++i) {
        const step = this.steps[i];
        let _pools = [...pools];
        for (let j = 0; j < step.filter.length; ++j) {
          const filter = step.filter[j];
          _pools = filter.bind(this)(_pools, amount, this.actions);
        }

        console.log(
          'solve',
          {
            i,
            poolsLen: pools.length,
            _amount,
          },
          this.actions,
          _pools,
        );

        if (_pools.length > 0) {
          console.log('solving', step.name);
          this.actions = step.optimizer.bind(this)(
            _pools,
            _amount,
            this.actions,
          );
          if (this.actions.length != i + 1) {
            console.warn(`actions`, this.actions.length, 'i', i);
            throw new Error('one new action per step required');
          }
          this.actions[i].name = step.name;
          _amount = this.actions[this.actions.length - 1].amount;
        } else {
          throw new Error('no pools to continue computing strategy');
        }
      }
    } catch (err) {
      console.warn(`${this.tag} - unsolved`, this.name, err);
      return;
    }

    console.log('Completed solving actions', this.actions.length);
    this.actions.forEach((action) => {
      const sign = action.isDeposit ? 1 : -1;
      const apr = action.isDeposit ? action.pool.apr : action.pool.borrow.apr;
      netYield += sign * apr * Number(action.amount);
      console.log('netYield1', {
        sign,
        apr,
        amount: action.amount,
        netYield,
      });
    });
    this.netYield = netYield / Number(amount);
    console.log('netYield2', netYield, this.netYield, Number(amount));
    this.leverage = this.netYield / this.actions[0].pool.apr;

    this.postSolve();

    this.status = StrategyStatus.SOLVED;
  }

  async calculateNetEarnings(
    transactions: Array<{
      amount: string;
      type: string;
      asset: string;
      // Additional fields for dual token strategies
      amount0?: string;
      amount1?: string;
      token0?: string;
      token1?: string;
    }>,
  ): Promise<number> {
    if (!transactions.length) return 0;

    let totalNetEarnings = 0;

    for (const tx of transactions) {
      const isDeposit = tx.type === 'deposit';
      const isWithdraw = tx.type === 'withdraw';

      if (!isDeposit && !isWithdraw) continue;

      // For dual token strategies (like Ekubo), we need to convert both amounts to quote token
      if (tx.amount0 && tx.amount1 && tx.token0 && tx.token1) {
        try {
          // Convert amount0 to quote token
          const amount0InQuoteToken = await this.convertToQuoteToken(
            tx.amount0,
            tx.token0,
          );

          // Convert amount1 to quote token
          const amount1InQuoteToken = await this.convertToQuoteToken(
            tx.amount1,
            tx.token1,
          );

          const totalAmountInQuoteToken =
            amount0InQuoteToken + amount1InQuoteToken;

          if (isDeposit) {
            totalNetEarnings -= totalAmountInQuoteToken;
          } else if (isWithdraw) {
            totalNetEarnings += totalAmountInQuoteToken;
          }
        } catch (error) {
          console.warn(
            'Error converting dual token amounts to quote token:',
            error,
          );
          // Fallback to primary amount only
          const primaryAmount = Number(
            new MyNumber(tx.amount, 18).toEtherToFixedDecimals(6),
          );
          if (isDeposit) {
            totalNetEarnings -= primaryAmount;
          } else if (isWithdraw) {
            totalNetEarnings += primaryAmount;
          }
        }
      } else {
        const amount = Number(
          new MyNumber(tx.amount, 18).toEtherToFixedDecimals(6),
        );

        if (isDeposit) {
          totalNetEarnings -= amount;
        } else if (isWithdraw) {
          totalNetEarnings += amount;
        }
      }
    }

    return totalNetEarnings;
  }

  private async convertToQuoteToken(
    amount: string,
    tokenAddress: string,
  ): Promise<number> {
    try {
      // Get the token info for the source token
      const sourceTokenInfo = this.getTokenInfoFromAddress(tokenAddress);
      if (!sourceTokenInfo) {
        throw new Error(`Token info not found for address: ${tokenAddress}`);
      }

      const amountInEther = Number(
        new MyNumber(amount, sourceTokenInfo.decimals).toEtherToFixedDecimals(
          6,
        ),
      );

      if (
        sourceTokenInfo.address === this.settings.quoteToken.address.address
      ) {
        return amountInEther;
      }

      // Get price conversion rate
      const sourceTokenInfoV2 = convertToV2TokenInfo(sourceTokenInfo);
      const quoteTokenInfoV2 = convertToV2TokenInfo(this.settings.quoteToken);

      // If both tokens are the same, return as-is
      if (sourceTokenInfoV2.address === quoteTokenInfoV2.address) {
        return amountInEther;
      }

      // Get prices for both tokens in USD
      const sourcePrice = await getPriceFromMyAPI(sourceTokenInfoV2);
      const quotePrice = await getPriceFromMyAPI(quoteTokenInfoV2);

      console.log('Price conversion debug:', {
        sourceToken: sourceTokenInfoV2.name,
        sourcePrice,
        quoteToken: quoteTokenInfoV2.name,
        quotePrice,
        amountInEther,
      });

      // Validate prices
      if (
        !sourcePrice ||
        !quotePrice ||
        isNaN(sourcePrice) ||
        isNaN(quotePrice)
      ) {
        console.warn(
          'Invalid prices received, falling back to original amount',
        );
        return amountInEther;
      }

      // Convert source token amount to USD, then to quote token
      const amountInUSD = amountInEther * sourcePrice;
      const amountInQuoteToken = amountInUSD / quotePrice;

      console.log('Conversion result:', {
        amountInUSD,
        amountInQuoteToken,
      });

      return amountInQuoteToken;
    } catch (error) {
      console.error('Error converting to quote token:', error);
      throw error;
    }
  }

  private getTokenInfoFromAddress(address: string): TokenInfo | null {
    const holdingToken = this.holdingTokens.find(
      (token) =>
        'address' in token &&
        (token.address === address ||
          ('token' in token && token.token === address)),
    ) as TokenInfo | undefined;
    if (holdingToken) return holdingToken;

    const depositToken = this.metadata.depositTokens?.find(
      (token) => token.address.address === address,
    );
    if (depositToken) {
      return {
        token: depositToken.address.address,
        address: depositToken.address.address,
        decimals: depositToken.decimals,
        displayDecimals: depositToken.decimals,
        name: depositToken.name,
        logo: depositToken.logo,
        isERC4626: false,
      };
    }

    return null;
  }

  postSolve() {}

  isSolved() {
    return this.status === StrategyStatus.SOLVED;
  }

  isSolving() {
    return this.status === StrategyStatus.SOLVING;
  }

  setCache(
    key: string,
    value: any,
    ttl: number = 60000, // default 1 minute
  ) {
    this.cache[key] = {
      value,
      time: Date.now(),
      ttl,
    };
  }

  getCache(key: string): any | null {
    const cached = this.cache[key];
    if (!cached) return null;
    if (Date.now() - cached.time > cached.ttl) {
      delete this.cache[key];
      return null;
    }
    return cached.value;
  }

  isCacheValid(key: string): boolean {
    const cached = this.cache[key];
    if (!cached) return false;
    return Date.now() - cached.time <= cached.ttl;
  }
}

export function getLiveStatusEnum(status: number) {
  if (status == 1) {
    return StrategyLiveStatus.HOT;
  }
  if (status == 2) {
    return StrategyLiveStatus.NEW;
  } else if (status == 3) {
    return StrategyLiveStatus.ACTIVE;
  } else if (status == 4) {
    return StrategyLiveStatus.COMING_SOON;
  }
  return StrategyLiveStatus.RETIRED;
}

export const getRiskString = (riskValue: number): string => {
  if (riskValue === 0) {
    return 'No risk';
  } else if (riskValue <= 1) {
    return 'Very Low';
  } else if (riskValue <= 2) {
    return 'Low';
  } else if (riskValue < 3) {
    return 'Medium';
  }
  return 'High';
};
