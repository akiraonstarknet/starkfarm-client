import {
  ContractAddr,
  IStrategyMetadata,
  UniversalLstMultiplierStrategy,
  UniversalStrategySettings,
  Web3Number,
} from '@strkfarm/sdk';
import { UniversalStrategyClass } from './universal.strat';
import { ReactNode } from 'react';
import {
  DepositActionInputs,
  IStrategySettings,
  StrategyLiveStatus,
  StrategyStatus,
  TokenInfo,
} from './IStrategy';
import { buildStrategyActionHook, DummyStrategyActionHook } from '@/utils';
import { PoolInfo } from '@/store/pools';

export class HyperLSTStrategy extends UniversalStrategyClass<
  typeof UniversalLstMultiplierStrategy
> {
  constructor(
    id: string,
    token: TokenInfo,
    name: string,
    description: string | ReactNode,
    strategy: IStrategyMetadata<UniversalStrategySettings>,
    liveStatus: StrategyLiveStatus,
    settings: IStrategySettings,
  ) {
    super(
      id,
      token,
      name,
      description,
      strategy,
      liveStatus,
      settings,
      UniversalLstMultiplierStrategy,
    );

    this.risks = [
      this.getSafetyFactorLine(),
      'Your original investment is safe. If you deposit 100 tokens, you will always get at least 100 tokens back, unless due to below reasons.',
      'The deposits are supplied on Vesu, a lending protocol that, while unlikely, has a risk of accumulating bad debt.',
      'Fully automated risk monitoring systems actively monitor and rebalance the pool to maintain a health factor of 1.05-1.1.',
      'The strategy involves exposure to smart contracts, which inherently carry risks like hacks, albeit relatively low',
      'APYs shown are just indicative and do not promise exact returns',
    ];
  }

  depositMethods = async (inputs: DepositActionInputs) => {
    const { amount, address } = inputs;
    // const lstUnderlying = this.universalStrategy.getLSTUnderlyingTokenInfo();
    if (!address || address == '0x0') {
      return [
        DummyStrategyActionHook([this.asset]),
        // DummyStrategyActionHook([lstUnderlying]),
      ];
    }

    if (amount.isZero()) {
      return [
        buildStrategyActionHook([], [this.asset]),
        // buildStrategyActionHook([], [lstUnderlying]),
      ];
    }

    // compute calls of direct LST deposit
    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = await this.universalStrategy.depositCall(
      {
        tokenInfo: this.universalStrategy.asset(),
        amount: amt,
      },
      ContractAddr.from(address),
    );

    // let swapCalls: BuildSwapTransaction | null = null;
    // try {
    //   const avnuWrapper = new AvnuWrapper();
    //   const quotes = await fetchQuotes({
    //     sellTokenAddress: lstUnderlying.address.address,
    //     buyTokenAddress: this.universalStrategy.asset().address.address,
    //     sellAmount: BigInt(amt.toWei()),
    //     takerAddress: address,
    //   });

    //   if (quotes.length == 0) {
    //     return [buildStrategyActionHook(calls, [this.asset])];
    //   }
    //   swapCalls = await fetchBuildExecuteTransaction(
    //     quotes[0].quoteId,
    //     address,
    //     0.01,
    //     true,
    //   );
    // } catch (error) {
    //   console.error('Error fetching quotes', error);
    //   return [buildStrategyActionHook(calls, [this.asset])];
    // }

    return [
      buildStrategyActionHook(calls, [this.asset]),
      // buildStrategyActionHook([...swapCalls.calls, ...calls], [lstUnderlying]),
    ];
  };

  async solve(pools: PoolInfo[], amount: string) {
    try {
      const yieldInfo = await this.universalStrategy.netAPY();

      this.netYield = yieldInfo.net * (1 - this.fee_factor);

      console.log('netYield2', this.netYield, Number(amount));
      this.leverage = 1;

      this.investmentFlows = [];

      this.postSolve();

      this.status = StrategyStatus.SOLVED;
    } catch (error) {
      console.error(`${this.metadata.name}::Error in solve():`, error);
      // Set defaults to prevent total failure
      this.netYield = 0;
      this.leverage = 1;
      this.investmentFlows = [];
      this.postSolve();
      this.status = StrategyStatus.SOLVED;
    }
  }
}
