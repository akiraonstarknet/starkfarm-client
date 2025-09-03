import CONSTANTS from '@/constants';
import {
  AmountsInfo,
  DepositActionInputs,
  IStrategy,
  IStrategyActionHook,
  IStrategySettings,
  StrategyLiveStatus,
  StrategyStatus,
  TokenInfo,
  WithdrawActionInputs,
} from './IStrategy';
import {
  ContractAddr,
  getMainnetConfig,
  Global,
  IStrategyMetadata,
  PricerFromApi,
  Web3Number,
  UniversalStrategySettings,
  UniversalStrategy,
} from '@strkfarm/sdk';
import { PoolInfo } from '@/store/pools';
import {
  buildStrategyActionHook,
  DummyStrategyActionHook,
  ZeroAmountsInfo,
} from '@/utils';
import { getBalanceAtom } from '@/store/balance.atoms';
import { atom } from 'jotai';
import { ReactNode } from 'react';

export class UniversalStrategyClass extends IStrategy<UniversalStrategySettings> {
  universalStrategy: UniversalStrategy<UniversalStrategySettings>;
  asset: TokenInfo;
  fee_factor = 0.1; // 10%
  constructor(
    id: string,
    token: TokenInfo,
    name: string,
    description: string | ReactNode,
    strategy: IStrategyMetadata<UniversalStrategySettings>,
    liveStatus: StrategyLiveStatus,
    settings: IStrategySettings,
  ) {
    const rewardTokens = [{ logo: CONSTANTS.LOGOS.STRK }];
    const holdingTokens: TokenInfo[] = [
      {
        ...token,
        name: strategy.depositTokens[0].symbol,
        token: strategy.address.address,
        address: strategy.address.address,
        isERC4626: true,
      },
    ];

    const config = getMainnetConfig(process.env.NEXT_PUBLIC_RPC_URL!, 'latest');
    const tokens = Global.getDefaultTokens();
    const pricer = new PricerFromApi(config, tokens);
    const universalStrategy = new UniversalStrategy(config, pricer, strategy);

    super(
      id,
      name,
      name,
      description,
      rewardTokens,
      holdingTokens,
      liveStatus,
      settings,
      universalStrategy.metadata,
    );

    this.asset = token;
    this.universalStrategy = universalStrategy;
    this.riskFactor = strategy.risk.netRisk;

    const risks = [...this.risks];
    this.risks = [
      this.getSafetyFactorLine(),
      'Your original investment is safe. If you deposit 100 tokens, you will always get at least 100 tokens back, unless due to below reasons.',
      'The deposits are supplied on Vesu, a lending protocol that, while unlikely, has a risk of accumulating bad debt.',
      ...risks,
    ];
  }

  getTVL = async (): Promise<AmountsInfo> => {
    const res = await this.universalStrategy.getTVL();
    return {
      usdValue: res.usdValue,
      amounts: [res],
    };
  };

  getUserTVL = async (user: string): Promise<AmountsInfo> => {
    try {
      const res = await this.universalStrategy.getUserTVL(
        ContractAddr.from(user),
      );
      return {
        usdValue: res.usdValue,
        amounts: [res],
      };
    } catch (e) {
      console.error('Error getting user TVL:', e);
      return ZeroAmountsInfo([this.asset]);
    }
  };

  depositMethods = async (inputs: DepositActionInputs) => {
    const { amount, address, provider } = inputs;
    if (!address || address == '0x0') {
      return [DummyStrategyActionHook([this.asset])];
    }

    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = await this.universalStrategy.depositCall(
      {
        tokenInfo: this.universalStrategy.asset(),
        amount: amt,
      },
      ContractAddr.from(address),
    );

    return [buildStrategyActionHook(calls, [this.asset])];
  };

  withdrawMethods = async (
    inputs: WithdrawActionInputs,
  ): Promise<IStrategyActionHook[]> => {
    const { amount, address, provider } = inputs;
    if (!address || address == '0x0') {
      return [DummyStrategyActionHook([this.holdingTokens[0] as TokenInfo])];
    }

    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = await this.universalStrategy.withdrawCall(
      {
        tokenInfo: this.universalStrategy.asset(),
        amount: amt,
      },
      ContractAddr.from(address),
      ContractAddr.from(address),
    );

    return [
      {
        calls,
        amounts: [
          {
            balanceAtom: getBalanceAtom(this.holdingTokens[0], atom(true)),
            tokenInfo: this.universalStrategy.asset(),
          },
        ],
      },
    ];
  };

  async solve(pools: PoolInfo[], amount: string) {
    const yieldInfo = await this.universalStrategy.netAPY();
    // todo to deduct fee
    this.netYield = yieldInfo.net * (1 - this.fee_factor);
    console.log('netYield2', this.netYield, Number(amount));
    this.leverage = 1;

    this.investmentFlows = [];

    this.postSolve();

    this.status = StrategyStatus.SOLVED;
  }
}
