import CONSTANTS from '@/constants';
import { PoolInfo } from '@/store/pools';
import {
  IStrategy,
  IStrategyActionHook,
  StrategyAction,
  StrategyLiveStatus,
  TokenInfo,
} from './IStrategy';
import ERC20Abi from '@/abi/erc20.abi.json';
import MyNumber from '@/utils/MyNumber';
import { Call, Contract, ProviderInterface, uint256 } from 'starknet';
import { nostraLending } from '@/store/nostralending.store';
import {
  DUMMY_BAL_ATOM,
  getBalance,
  getBalanceAtom,
} from '@/store/balance.atoms';
import { atom } from 'jotai';
import axios from 'axios';
import {
  assetCollateralTokenMap,
  assetDebtTokenMap,
  BaseTradeConfig,
  getTradeContract,
  getTradeFactoryContract,
} from '@/store/trades.atoms';
import { atomWithQuery } from 'jotai-tanstack-query';
import { addressAtom, getProvider } from '@/store/claims.atoms';

export interface TradeActionAdditionalData {
  tradeAmount: MyNumber;
}

export interface TradeDebtInfo {
  collateralToken: string;
  debtAmount: MyNumber;
}

export class TradeStrategy extends IStrategy<void> {
  riskFactor = 3; // actually not applicable
  mainToken: TokenInfo;
  baseConfig: BaseTradeConfig;
  minHf = 1.1;

  // display tab names
  actionTabs = ['Open', 'Close'];

  selectedCollateralAtom = atom({} as TokenInfo);
  tradeAmountAtom = atom(MyNumber.fromZero());
  leverageAtom = atom({ value: 1, edited: false });
  getUserDebtAtom = atomWithQuery((get) => {
    return {
      queryKey: ['getUserDebt', this.id, get(addressAtom)],
      queryFn: async ({ queryKey }: any) => {
        const address: string = queryKey[2];
        const amounts: TradeDebtInfo[] = [];
        for (let i = 0; i < this.baseConfig.collateral.length; ++i) {
          const collateral = this.baseConfig.collateral[i].token;
          const value = await this.getUserDebt(address, collateral);
          amounts.push({
            collateralToken: collateral.token,
            debtAmount: value,
          });
        }
        return amounts;
      },
    };
  });
  minTradeAmountAtom = atomWithQuery<MyNumber>((get) => {
    return {
      queryKey: [
        'minTradeAmount',
        this.id,
        get(addressAtom),
        get(this.selectedCollateralAtom),
      ],
      queryFn: async ({ queryKey }: any): Promise<MyNumber> => {
        const collateral: TokenInfo = queryKey[3];
        const address: string = queryKey[2];
        return this.getMinTradeAmount(address, collateral);
      },
    };
  });

  maxTradeAmountAtom = atomWithQuery<MyNumber>((get) => {
    return {
      queryKey: [
        'maxTradeAmount',
        this.id,
        get(this.selectedCollateralAtom),
        get(addressAtom),
        this.leverage,
        { value: this.leverage, edited: false },
      ],
      queryFn: this.maxTradeAmountQueryFn.bind(this),
    };
  });
  maxUserTradeAmountAtom = atomWithQuery<MyNumber>((get) => {
    return {
      queryKey: [
        'maxUserTradeAmount',
        this.id,
        get(this.selectedCollateralAtom),
        get(addressAtom),
        this.leverage,
        get(this.leverageAtom),
      ],
      queryFn: this.maxTradeAmountQueryFn.bind(this),
    };
  });

  getMinCollateralAtom = atomWithQuery<MyNumber>((get) => {
    return {
      queryKey: [
        'minCollateral',
        this.id,
        get(this.tradeAmountAtom),
        get(this.selectedCollateralAtom),
        get(this.leverageAtom),
      ],
      queryFn: async ({ queryKey }: any): Promise<MyNumber> => {
        const tradeAmount: MyNumber = queryKey[2];
        const collateral: TokenInfo = queryKey[3];
        const leverage = queryKey[4];
        return this.getMinCollateral(tradeAmount, collateral, leverage.value);
      },
    };
  });

  constructor(
    description: string,
    baseConfig: BaseTradeConfig,
    liveStatus: StrategyLiveStatus,
  ) {
    const rewardTokens = [{ logo: CONSTANTS.LOGOS.STRK }];
    const poolName = TradeStrategy.getPoolName(baseConfig);
    const id = TradeStrategy.getPoolId(baseConfig);
    super(
      id,
      id,
      poolName,
      description,
      rewardTokens,
      [TradeStrategy.getCollateralToken(baseConfig.trade)],
      liveStatus,
      { maxTVL: 10000000000 }, // not applicable
    );
    this.baseConfig = baseConfig;
    this.selectedCollateralAtom = atom(baseConfig.collateral[0].token);
    this.mainToken = this.isLong() ? baseConfig.trade : baseConfig.debt.token;

    this.steps = [
      {
        name: `Deposit your collateral`,
        optimizer: this.optimizer,
        filter: [this.filterCollateralToken],
      },
      {
        name: `Borrow ${baseConfig.debt.token.name} from Nostra and swap to ${baseConfig.trade.name}`,
        optimizer: this.optimizer,
        filter: [this.filterSecondaryToken],
      },
      {
        name: `Deposit ${baseConfig.trade.name} to Nostra`,
        optimizer: this.optimizer,
        filter: [this.filterMainToken],
      },
    ];

    const _risks = [...this.risks];
    this.risks = [
      this.getSafetyFactorLine(),
      `For upto 2 weeks, your position value may reduce due to high borrow APR. This will be compensated by STRK rewards.`,
      `Your original investment is safe. If you deposit 100 tokens, you will always get at least 100 tokens back, unless due to below reasons.`,
      `Technical failures in rebalancing positions to maintain healthy health factor may result in liquidations.`,
      ..._risks.slice(1),
    ];
  }

  filterMainToken(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    const dapp = nostraLending;
    return pools.filter(
      (p) =>
        p.pool.name == this.baseConfig.trade.name &&
        p.protocol.name == dapp.name,
    );
  }

  filterCollateralToken(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    this.maxLeverage(pools);

    const dapp = nostraLending;
    return pools.filter(
      (p) =>
        p.pool.name == this.baseConfig.collateral[0].token.name &&
        p.protocol.name == dapp.name,
    );
  }

  filterSecondaryToken(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    const dapp = nostraLending;
    return pools.filter(
      (p) =>
        p.pool.name == this.baseConfig.debt.token.name &&
        p.protocol.name == dapp.name,
    );
  }

  optimizer(
    eligiblePools: PoolInfo[],
    amount: string,
    actions: StrategyAction[],
  ): StrategyAction[] {
    console.log('optimizer', actions.length);

    const _amount =
      actions.length == 1 ? Math.round(Number(amount) * this.leverage) : amount;
    return [
      ...actions,
      {
        pool: eligiblePools[0],
        amount: _amount.toString(),
        isDeposit: actions.length == 0 || actions.length == 2,
      },
    ];
  }

  maxLeverage(
    allPools: PoolInfo[],
    collateral: TokenInfo = this.baseConfig.collateral[0].token,
  ) {
    console.log('maxLeverage0', allPools.length);

    const { collateralPool, borrowPool, tradePool } = this.getLendingInfo(
      collateral,
      allPools,
    );
    if (!collateralPool || !borrowPool || !tradePool) {
      return 1;
    }

    const collateralValue = 1000; // just a initial value in usd
    // (1000 * cf *bf)  / (min_hf  - cf1 * bf)
    const borrowValue =
      (collateralValue *
        collateralPool.lending.collateralFactor *
        borrowPool.borrow.borrowFactor) /
      (this.minHf -
        tradePool.lending.collateralFactor * borrowPool.borrow.borrowFactor);
    const maxLeverage = borrowValue / collateralValue;
    this.leverage = maxLeverage;
    console.log('maxLeverage4', maxLeverage);
    return maxLeverage;
  }

  getLendingInfo(collateral: TokenInfo, allPools: PoolInfo[]) {
    const collateralPool = allPools.filter((p) => {
      return (
        p.pool.name == collateral.name && p.protocol.name == nostraLending.name
      );
    })[0];
    const borrowPool = allPools.filter((p) => {
      return (
        p.pool.name == this.baseConfig.debt.token.name &&
        p.protocol.name == nostraLending.name
      );
    })[0];
    const tradePool = allPools.filter((p) => {
      return (
        p.pool.name == this.baseConfig.trade.name &&
        p.protocol.name == nostraLending.name
      );
    })[0];

    return {
      collateralPool,
      borrowPool,
      tradePool,
    };
  }

  depositMethods = async (
    amount: MyNumber,
    address: string,
    provider: ProviderInterface,
  ) => {
    const actions: IStrategyActionHook[] = [];
    for (let i = 0; i < this.baseConfig.collateral.length; ++i) {
      const baseTokenInfo = this.baseConfig.collateral[i].token;
      const userTradeAddress = await this.getUserTradeAddress(
        address,
        baseTokenInfo,
      );

      if (!address || address == '0x0' || !userTradeAddress) {
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

      const calls: Call[] = [
        // approve base token
        baseTokenContract.populate('approve', [
          userTradeAddress || factoryContract.address,
          uint256.bnToUint256(amount.toString()),
        ]),
      ];

      // add collateral
      const tradeContract = getTradeContract(userTradeAddress);
      const addCollateralCall = tradeContract.populate('add_collateral', {
        amount: uint256.bnToUint256(amount.toString()),
      });

      calls.push(addCollateralCall);

      actions.push({
        tokenInfo: baseTokenInfo,
        calls,
        balanceAtom: getBalanceAtom(baseTokenInfo, atom(true)),
      });
    }
    return actions;
  };

  getUserTVL = async (user: string) => {
    // if (this.liveStatus == StrategyLiveStatus.COMING_SOON)
    return {
      amount: MyNumber.fromEther('0', this.baseConfig.trade.decimals),
      usdValue: 0,
      tokenInfo: this.baseConfig.trade,
    };
    // const balanceInfo = await getBalance(this.holdingTokens[0], user);
    // if (!balanceInfo.tokenInfo) {
    //   return {
    //     amount: MyNumber.fromEther('0', this.token.decimals),
    //     usdValue: 0,
    //     tokenInfo: this.token,
    //   };
    // }
    // const priceInfo = await axios.get(
    //   `https://api.coinbase.com/v2/prices/${balanceInfo.tokenInfo.name}-USDT/spot`,
    // );
    // const price = Number(priceInfo.data.data.amount);
    // console.log('getUserTVL dnmm', price, balanceInfo.amount.toEtherStr());
    // return {
    //   amount: balanceInfo.amount,
    //   usdValue: Number(balanceInfo.amount.toEtherStr()) * price,
    //   tokenInfo: balanceInfo.tokenInfo,
    // };
  };

  getTVL = async () => {
    // if (!this.isLive())
    return {
      amount: MyNumber.fromEther('0', this.baseConfig.trade.decimals),
      usdValue: 0,
      tokenInfo: this.baseConfig.trade,
    };

    // try {
    //   const mainTokenName = this.token.name;
    //   const zToken = getTokenInfoFromName(`z${mainTokenName}`);

    //   const bal = await getERC20Balance(zToken, this.strategyAddress);
    //   console.log('getTVL', bal.amount.toString());
    //   // This reduces the zToken TVL to near actual deposits made by users wihout looping
    //   const discountFactor = this.stepAmountFactors[4];
    //   const amount = bal.amount.operate('div', 1 + discountFactor);
    //   console.log('getTVL1', amount.toString());
    //   const priceInfo = await axios.get(
    //     `https://api.coinbase.com/v2/prices/${mainTokenName}-USDT/spot`,
    //   );
    //   console.log('getTVL2', priceInfo);
    //   const price = Number(priceInfo.data.data.amount);
    //   return {
    //     amount,
    //     usdValue: Number(amount.toEtherStr()) * price,
    //     tokenInfo: this.token,
    //   };
    // } catch (e) {
    //   console.log('getTVL err', e);
    //   throw e;
    // }
  };

  async getMinTradeAmount(
    address: string,
    collateral: TokenInfo = this.baseConfig.collateral[0].token,
  ) {
    const debtPrice = await this.getTokenPrice(this.baseConfig.debt.token);

    const userDebt = Number(
      (await this.getUserDebt(address, collateral)).toEtherStr(),
    );

    const minDebtAmount = Number(this.baseConfig.debt.minAmount.toEtherStr());

    const effectiveMinDebt =
      userDebt >= minDebtAmount ? 0 : minDebtAmount - userDebt;

    const tradePrice = await this.getTokenPrice(this.mainToken);
    let tradeAmount = (effectiveMinDebt * debtPrice) / tradePrice;
    console.log(
      'minTradeAmount',
      debtPrice,
      tradePrice,
      tradeAmount,
      effectiveMinDebt,
    );

    // increase trade amount a little to offset for oracle price diff
    tradeAmount *= 1.01; // 1% increase
    return MyNumber.fromEther(
      tradeAmount.toString(),
      this.mainToken.decimals,
    );
  }

  async getUserDebt(
    address: string,
    collateral = this.baseConfig.collateral[0].token,
  ) {
    console.log('getUserDebt1', address);
    if (!address || address == '0x0') {
      return MyNumber.fromZero();
    }
    const factoryContract = getTradeFactoryContract();

    const userTradeAddress: BigInt = (await factoryContract.call(
      'get_user_trade_contract',
      [
        address,
        collateral.token,
        this.baseConfig.debt.token.token,
        this.baseConfig.trade.token,
      ],
    )) as BigInt;

    console.log('getUserDebt2', userTradeAddress, collateral.name);
    if (!userTradeAddress) {
      return MyNumber.fromZero();
    }

    const debtToken = assetDebtTokenMap[this.baseConfig.debt.token.name];
    const debtTokenContract = new Contract(ERC20Abi, debtToken, getProvider());

    console.log('getUserDebt3', debtToken);
    const debtAmount = await debtTokenContract.call('balanceOf', [
      userTradeAddress,
    ]);
    console.log('getUserDebt4', debtAmount);
    return new MyNumber(
      debtAmount.toString(),
      this.baseConfig.debt.token.decimals,
    );
  }

  async getMinCollateral(
    tradeAmount: MyNumber,
    collateral: TokenInfo,
    leverage: number,
  ) {
    if (tradeAmount.isZero()) return MyNumber.fromZero();
    const tradePriceInfo = await axios.get(
      `https://api.coinbase.com/v2/prices/${this.baseConfig.trade.name}-USDT/spot`,
    );
    const tradePrice = Number(tradePriceInfo.data.data.amount);
    const tradeAmountValue = Number(tradeAmount.toEtherStr()) * tradePrice;

    // collateral price
    const collateralPriceInfo = await axios.get(
      `https://api.coinbase.com/v2/prices/${collateral.name}-USDT/spot`,
    );
    const collateralPrice = Number(collateralPriceInfo.data.data.amount);

    // collateral required
    const collateralAmount = tradeAmountValue / leverage / collateralPrice;
    console.log(
      'getMinCollateral',
      tradeAmountValue,
      leverage,
      collateralPrice,
    );
    const amount = MyNumber.fromEther(
      collateralAmount.toString(),
      collateral.decimals,
    );
    console.log('getMinCollateral2', amount.toEtherStr());
    return amount;
  }

  async getMaxTradeAmount(
    collateralAmount: MyNumber,
    collateral: TokenInfo,
    leverage = this.leverage,
  ) {
    console.log(
      'getMaxTradeAmount',
      collateralAmount.toEtherStr(),
      collateral.name,
      leverage,
    );
    const collateralPriceInfo = await axios.get(
      `https://api.coinbase.com/v2/prices/${collateral.name}-USDT/spot`,
    );
    const collateralPrice = Number(collateralPriceInfo.data.data.amount);
    const collateralValue =
      Number(collateralAmount.toEtherStr()) * collateralPrice;

    // trade price
    const tradePriceInfo = await axios.get(
      `https://api.coinbase.com/v2/prices/${this.mainToken.name}-USDT/spot`,
    );
    const tradePrice = Number(tradePriceInfo.data.data.amount);

    // trade amount
    const tradeAmount = (collateralValue * leverage) / tradePrice;
    return MyNumber.fromEther(
      tradeAmount.toString(),
      this.mainToken.decimals,
    );
  }

  withdrawMethods = async (
    amount: MyNumber,
    address: string,
    provider: ProviderInterface,
  ) => {
    const actions: IStrategyActionHook[] = [];

    for (let i = 0; i < this.baseConfig.collateral.length; ++i) {
      const baseToken = this.baseConfig.collateral[i].token;
      // removing max amount restrictions on withdrawal
      baseToken.maxAmount = MyNumber.fromEther(
        '100000000000',
        baseToken.maxAmount.decimals,
      );

      const userTradeAddress = await this.getUserTradeAddress(
        address,
        baseToken,
      );

      if (!address || address == '0x0' || !userTradeAddress) {
        return [
          {
            tokenInfo: baseToken,
            calls: [],
            balanceAtom: DUMMY_BAL_ATOM,
          },
        ];
      }

      const tradeContract = getTradeContract(userTradeAddress);

      const call = tradeContract.populate('withdraw_collateral', {
        amount: uint256.bnToUint256(amount.toString()),
        minHf: (this.minHf * 10000).toFixed(),
        receiver: address,
      });

      const calls: Call[] = [call];

      return [
        {
          tokenInfo: baseToken,
          calls,
          balanceAtom: getBalanceAtom(baseToken, atom(true)),
        },
      ];
    }
    return actions;
  };

  isLong() {
    return this.name.includes('Long');
  }

  static getCollateralToken(baseTradeToken: TokenInfo) {
    const tradeToken = { ...baseTradeToken };
    const collateralAddress = assetCollateralTokenMap[baseTradeToken.name];
    tradeToken.token = collateralAddress;
    return tradeToken;
  }

  static getPoolName(config: BaseTradeConfig) {
    if (config.debt.token.name == 'USDC') {
      return `Long ${config.trade.name}`;
    }
    return `Short ${config.debt.token.name}`;
  }

  static getPoolId(config: BaseTradeConfig) {
    if (config.debt.token.name == 'USDC') {
      return `long_${config.trade.name.toLowerCase()}`;
    }
    return `short_${config.debt.token.name.toLowerCase()}`;
  }

  private async maxTradeAmountQueryFn({ queryKey }: any) {
    console.log('queryKey', queryKey);
    const collateral: TokenInfo = queryKey[2];
    const address: string = queryKey[3];
    const userLeverage = queryKey[5];
    if (!address) {
      return MyNumber.fromEther('0', collateral.decimals);
    }
    const balInfo = await getBalance(collateral, address);
    const leverageToUse = userLeverage.edited
      ? userLeverage.value
      : this.leverage;
    return this.getMaxTradeAmount(balInfo.amount, collateral, leverageToUse);
  }

  async getTokenPriceForLiq(token: TokenInfo) {
    // intentionally written to return 1 for USDC
    // meant for only liquidation math
    if (token.name == 'USDC') {
      return 1;
    }

    return this.getTokenPrice(token);
  }

  async getTokenPrice(token: TokenInfo) {
    const priceInfo = await axios.get(
      `https://api.coinbase.com/v2/prices/${token.name}-USDT/spot`,
    );
    return Number(priceInfo.data.data.amount);
  }

  async getUserTradeAddress(address: string, collateral: TokenInfo) {
    const factoryContract = getTradeFactoryContract();
    const userTradeAddress = (await factoryContract.call(
      'get_user_trade_contract',
      [
        address,
        collateral.token,
        this.baseConfig.debt.token.token,
        this.baseConfig.trade.token,
      ],
    )) as BigInt;

    console.log('userTradeAddress', userTradeAddress);
    return userTradeAddress;
  }
}
