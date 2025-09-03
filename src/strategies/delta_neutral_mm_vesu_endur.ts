import CONSTANTS, { NFTS } from '@/constants';
import {
  AmountsInfo,
  DepositActionInputs,
  IStrategy,
  IStrategySettings,
  NFTInfo,
  StrategyLiveStatus,
  StrategyStatus,
  TokenInfo,
  WithdrawActionInputs,
} from './IStrategy';
import MyNumber from '@/utils/MyNumber';
import {
  buildStrategyActionHook,
  DummyStrategyActionHook,
  getPrice,
  getTokenInfoFromName,
  standariseAddress,
  ZeroAmountsInfo,
} from '@/utils';
import { PoolInfo } from '@/store/pools';
import { UINT_256_MAX } from 'starknet';
import {
  IStrategyMetadata,
  Web3Number,
  SenseiVaultSettings,
  SenseiVault,
  getMainnetConfig,
  Global,
  PricerFromApi,
  ContractAddr,
} from '@strkfarm/sdk';
import axios from 'axios';
import React from 'react';
import { getBalanceAtom } from '@/store/balance.atoms';
import { atom } from 'jotai';

export class DeltaNeutralMMVesuEndur extends IStrategy<SenseiVaultSettings> {
  senseiVault: SenseiVault;
  constructor(
    id: string,
    strategy: IStrategyMetadata<SenseiVaultSettings>,
    liveStatus: StrategyLiveStatus,
    settings: IStrategySettings,
  ) {
    const rewardTokens = [{ logo: CONSTANTS.LOGOS.STRK }];
    const holdingTokens: NFTInfo[] = [
      {
        name: strategy.depositTokens[0].symbol,
        address: strategy.address.address,
        logo: CONSTANTS.LOGOS.xSTRK,
        config: {
          mainTokenName: 'xSTRK',
        },
      },
    ];
    super(
      id,
      id, // tag
      strategy.name,
      strategy.description as any,
      rewardTokens,
      holdingTokens,
      liveStatus,
      settings,
      strategy,
    );

    this.riskFactor = strategy.risk.netRisk;
    this.setMetadataPoints(4); // default
    const risks = [
      this.getSafetyFactorLine(),
      this.risks[0],
      'If xSTRK price on DEXes deviates from expected price, you may lose money or may have to wait for the price to recover.',
      'APYs shown are just indicative and do not promise exact returns',
    ];
    this.risks = risks;

    const config = getMainnetConfig(process.env.NEXT_PUBLIC_RPC_URL!, 'latest');
    const tokens = Global.getDefaultTokens();
    const pricer = new PricerFromApi(config, tokens);
    this.senseiVault = new SenseiVault(config, pricer, strategy);
    this.fee_factor = this.metadata.additionalInfo.feeBps / 10000; // convert bps to decimal
  }

  setMetadataPoints(multiplier: number) {
    this.metadata.points = [
      {
        multiplier,
        toolTip: `Earn ~${multiplier.toFixed(0)}x Endur points on this leveraged strategy. Points can be found on endur.fi.`,
        logo: 'https://endur.fi/favicon.ico',
      },
    ];
  }

  async solve(pools: PoolInfo[], amount: string) {
    this.status = StrategyStatus.SOLVING;
    const re7PoolID =
      '2345856225134458665876812536882617294246962319062565703131100435311373119841';
    const xSTRKPool = pools.find((p) => p.pool.id == `Vesu_${re7PoolID}_xSTRK`);
    const STRKPool = pools.find((p) => p.pool.id == `Vesu_${re7PoolID}_STRK`);
    const endurXSTRK = pools.find((p) => p.pool.id == 'endur_strk');

    // get Rewards APR and offset my fee
    const STRKRewardsAPR =
      xSTRKPool?.aprSplits.find((a) => a.title == 'STRK rewards')?.apr || 0;
    if (STRKRewardsAPR == 'Err' || STRKRewardsAPR == 0) {
      throw new Error(
        'Failed to fetch STRK rewards APR. Please try again later.',
      );
    }
    const collateralAPY = (xSTRKPool?.apr || 0) + (endurXSTRK?.apr || 0);
    const feeAdjustedColAPY = collateralAPY - STRKRewardsAPR * this.fee_factor;
    const borrowAPY = STRKPool?.borrow.apr || 0;

    const { collateralUSDValue, debtUSDValue } =
      await this.senseiVault.getPositionInfo();

    const expectedLeverage = await this.expectedLeverage();
    if (expectedLeverage <= 0) {
      this.status = StrategyStatus.UNINTIALISED;
      throw new Error(
        'Strategy is not solvable at the moment: expectedLeverage <= 0',
      );
    }
    this.setMetadataPoints(Number(expectedLeverage.toFixed(1)));

    const PAYOFF =
      Number(collateralUSDValue.toFixed(6)) * feeAdjustedColAPY -
      Number(debtUSDValue.toFixed(6)) * borrowAPY;
    const investment =
      Number(collateralUSDValue.toFixed(6)) - Number(debtUSDValue.toFixed(6));
    this.netYield = investment == 0 ? 0 : PAYOFF / investment;
  }

  getUserTVL = async (user: string): Promise<AmountsInfo> => {
    if (!this.isLive()) {
      return ZeroAmountsInfo([this.metadata.depositTokens[0]]);
    }
    try {
      const res = await this.senseiVault.getUserTVL(ContractAddr.from(user));
      return {
        usdValue: res.usdValue,
        amounts: [res],
      };
    } catch (error) {
      console.error('Error fetching user TVL:', error);
      return ZeroAmountsInfo([this.metadata.depositTokens[0]]);
    }
  };

  getTVL = async (): Promise<AmountsInfo> => {
    if (!this.isLive())
      return ZeroAmountsInfo([this.metadata.depositTokens[0]]);
    const output = await this.senseiVault.getTVL();
    return {
      usdValue: output.usdValue,
      amounts: [output],
    };
  };

  async expectedLeverage() {
    // target_hf = (1 + (x / endur_rate)) * 0.87 / x
    // target_hf * x = 0.87 + 0.87 * (x / endur_rate)
    // x (target_hf * endur_rate - 0.87) = 0.87 * endur_rate
    // x = 0.87 * endur_rate / (target_hf * endur_rate - 0.87)
    const targetHf = this.metadata.additionalInfo.targetHfBps / 10000; // convert bps to decimal
    const xSTRKPrice =
      await this.senseiVault.getSecondaryTokenPriceRelativeToMain();
    const borrowedSTRK = (0.87 * xSTRKPrice) / (targetHf * xSTRKPrice - 0.87);
    return 1 + borrowedSTRK; // leverage
  }

  async onDeposotButtonClick(
    amount: MyNumber,
  ): Promise<React.ReactNode | string[]> {
    const STRKToken = getTokenInfoFromName('STRK');
    const xSTRKToken = getTokenInfoFromName('xSTRK');

    return this.onPositionButtonClick(
      STRKToken,
      xSTRKToken,
      amount,
      true, // isDeposit
    );
  }

  async onWithdrawButtonClick(
    amount: MyNumber,
  ): Promise<React.ReactNode | string[]> {
    const STRKToken = getTokenInfoFromName('STRK');
    const xSTRKToken = getTokenInfoFromName('xSTRK');

    const xSTRKPrice =
      await this.senseiVault.getSecondaryTokenPriceRelativeToMain();
    const amountInxSTRK = amount.operate('div', xSTRKPrice);
    return this.onPositionButtonClick(
      xSTRKToken,
      STRKToken,
      amountInxSTRK,
      false, // isDeposit
    );
  }

  async onPositionButtonClick(
    fromToken: TokenInfo,
    toToken: TokenInfo,
    amount: MyNumber,
    isDeposit: boolean,
  ): Promise<React.ReactNode | string[]> {
    try {
      const expectedLeverage = await this.expectedLeverage();
      if (expectedLeverage <= 0) {
        alert(
          'Strategy is not solvable at the moment. Please try again later.',
        );
        return ['Strategy execution failed. Please refresh and try again.'];
      }
      const STRKToBorrow = amount.operate('mul', expectedLeverage - 1);
      const message1 = `Strategy will ${isDeposit ? 'borrow' : 'repay'} ${STRKToBorrow.toEtherToFixedDecimals(2)} STRK (Approx)`;
      const totalSwapAmount = amount.operate('mul', expectedLeverage);
      if (totalSwapAmount.isZero()) {
        return ['Swap estimation Error: Received invalid amount'];
      }
      // todo ensure proper pool
      const quote = await this.getEkuboQuote(
        fromToken.token,
        toToken.token,
        totalSwapAmount,
      );

      const fromPrice = await getPrice(fromToken, 'vesuxstrk');
      const toPrice = await getPrice(toToken, 'vesuxstrk');
      const sellUSD = Number(totalSwapAmount.toEtherStr()) * fromPrice;
      const buyUSD = Number(quote.buyAmount.toEtherStr()) * toPrice;
      const buyAmount = new MyNumber(quote.buyAmount.toString(), 18);
      const message2 = `A total of ${totalSwapAmount.toEtherToFixedDecimals(2)} ${fromToken.name} (${sellUSD.toFixed(2)} USD) will be swapped to ${buyAmount.toEtherToFixedDecimals(2)} ${toToken.name} (${buyUSD.toFixed(2)} USD).`;
      const message3 = `You may see high slippage when closing position due to market and token liquidity, not due to strategy design itself. Try closing smaller amounts in such a case. Contact us on Telegram for any questions.`;
      const messages = [message1, message2];
      if (isDeposit) {
        messages.push(message3);
      }
      return messages;
    } catch (error) {
      console.error('Error fetching quotes:', error);
      return ['Error fetching quotes. Please try again later.'];
    }
  }

  async getEkuboQuote(fromToken: string, toToken: string, amount: MyNumber) {
    const URL = `https://starknet-mainnet-quoter-api.ekubo.org/${amount.toString()}/${fromToken}/${toToken}`;
    const data = await axios.get(URL);
    if (data.status !== 200) {
      throw new Error(`Error fetching quote from Ekubo: ${data.statusText}`);
    }

    const quote = data.data;
    const outputAmount = new MyNumber(quote.total_calculated, 18);
    return {
      buyAmount: outputAmount,
    };
  }

  depositMethods = async (inputs: DepositActionInputs) => {
    const { amount, address, provider } = inputs;
    if (!address || address == '0x0') {
      return [DummyStrategyActionHook([this.metadata.depositTokens[0]])];
    }

    const amt = Web3Number.fromWei(amount.toString(), amount.decimals);
    const calls = await this.senseiVault.depositCall(
      {
        tokenInfo: this.metadata.depositTokens[0],
        amount: amt,
      },
      ContractAddr.from(address),
    );

    const output = buildStrategyActionHook(calls, [
      this.metadata.depositTokens[0],
    ]);
    output.onClickButton = this.onDeposotButtonClick.bind(this);
    return [output];
  };

  withdrawMethods = async (inputs: WithdrawActionInputs) => {
    const { amount, address, provider, isMax } = inputs;
    if (!address || address == '0x0') {
      const output = DummyStrategyActionHook([this.metadata.depositTokens[0]]);
      return [output];
    }

    const finalAmount = isMax
      ? new MyNumber(UINT_256_MAX.toString(), amount.decimals)
      : amount;
    const calls = await this.senseiVault.withdrawCall(
      {
        tokenInfo: this.metadata.depositTokens[0],
        amount: Web3Number.fromWei(
          finalAmount.toString(),
          finalAmount.decimals,
        ),
      },
      ContractAddr.from(address),
      ContractAddr.from(address),
    );

    const nftInfo = NFTS.find(
      (nft) =>
        standariseAddress(nft.address) ==
        standariseAddress(this.metadata.address.address),
    );
    const output = buildStrategyActionHook(
      calls,
      [this.metadata.depositTokens[0]],
      [getBalanceAtom(nftInfo, atom(true))],
    );
    output.onClickButton = this.onWithdrawButtonClick.bind(this);
    return [output];
  };
}
