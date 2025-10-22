import { NextRequest, NextResponse } from 'next/server';
import { getStrategies } from '@/store/strategies.atoms';
import MyNumber from '@/utils/MyNumber';
import {
  fetchQuotes,
  fetchBuildExecuteTransaction,
  Quote,
} from '@avnu/avnu-sdk';
import { TOKENS } from '@/constants';
import { getProvider } from '@/lib/provider';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const provider = getProvider();

interface GetCallsRequest {
  strategyId: string;
  amountRaw: string;
  isDeposit: boolean;
  address: string;
}

interface CallResult {
  tokenInfo: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  };
  calls: any[];
  alerts?: string[];
}

// Get BTC tokens from TOKENS array
const BTC_TOKENS = TOKENS.filter((t) =>
  ['WBTC', 'tBTC', 'solvBTC', 'LBTC'].includes(t.name),
);

// Get STRK token from TOKENS array
const STRK_TOKEN = TOKENS.find((t) => t.name === 'STRK');

function isHyperLSTStrategy(strategyId: string): boolean {
  return strategyId.startsWith('hyper_');
}

function isBTCHyperLSTStrategy(strategyId: string): boolean {
  const btcVaults = [
    'hyper_xwbtc',
    'hyper_xlbtc',
    'hyper_xtbtc',
    'hyper_xsolvbtc',
  ];
  return btcVaults.includes(strategyId);
}

function isSTRKHyperLSTStrategy(strategyId: string): boolean {
  return strategyId === 'hyper_xstrk';
}

export async function POST(req: NextRequest) {
  try {
    const body: GetCallsRequest = await req.json();
    const { strategyId, amountRaw, isDeposit, address } = body;

    // Validate inputs
    if (
      !strategyId ||
      !amountRaw ||
      address === undefined ||
      isDeposit === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: strategyId, amountRaw, isDeposit, address',
        },
        { status: 400 },
      );
    }

    // Load all strategies
    const strategies = getStrategies();
    const strategy = strategies.find((s) => s.id === strategyId);

    if (!strategy) {
      return NextResponse.json(
        { error: `Strategy with id "${strategyId}" not found` },
        { status: 404 },
      );
    }

    // Get deposit token info
    const depositMethods = await strategy.depositMethods({
      amount: MyNumber.fromZero(),
      address: '',
      provider,
      isMax: false,
    });

    if (!depositMethods || depositMethods.length === 0) {
      return NextResponse.json(
        { error: 'No deposit methods available for this strategy' },
        { status: 400 },
      );
    }

    const primaryTokenInfo = depositMethods[0].amounts[0]?.tokenInfo;
    if (!primaryTokenInfo) {
      return NextResponse.json(
        { error: 'Unable to determine deposit token for strategy' },
        { status: 400 },
      );
    }

    const results: CallResult[] = [];

    // For Hyper LST vaults on deposit, return both LST and BTC deposit options (if applicable)
    if (isDeposit && isHyperLSTStrategy(strategyId)) {
      // 1. Direct LST deposit option
      const lstDecimals = primaryTokenInfo.decimals;
      const lstAmount = new MyNumber(amountRaw, lstDecimals);

      const lstActionHooks = await strategy.depositMethods({
        amount: lstAmount,
        address,
        provider,
        isMax: false,
      });

      // Get alerts for LST deposit
      let lstAlerts: string[] | undefined;
      if (lstActionHooks[0]?.onClickButton) {
        try {
          const alertsResult = await lstActionHooks[0].onClickButton(lstAmount);
          if (Array.isArray(alertsResult)) {
            lstAlerts = alertsResult;
          }
        } catch (error) {
          console.error('Error getting LST deposit alerts:', error);
        }
      }

      // Add LST deposit option
      for (const hook of lstActionHooks) {
        if (hook.amounts.length > 0) {
          const tokenInfo = hook.amounts[0].tokenInfo;
          results.push({
            tokenInfo: {
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              address: tokenInfo.address.address,
              decimals: tokenInfo.decimals,
            },
            calls: hook.calls,
            alerts: lstAlerts,
          });
        }
      }

      // 2. BTC deposit options (only for BTC-based Hyper LST vaults)
      if (isBTCHyperLSTStrategy(strategyId)) {
        const lstTokenAddress = primaryTokenInfo.address.address;

        // Add deposit option for each BTC token
        for (const btcToken of BTC_TOKENS) {
          if (btcToken.token.toLowerCase() !== lstTokenAddress.toLowerCase()) {
            try {
              const btcResult = await handleTokenSwapDeposit(
                strategy,
                btcToken,
                lstTokenAddress,
                amountRaw,
                address,
                primaryTokenInfo,
              );
              results.push(btcResult);
            } catch (error) {
              console.error(
                `Error creating BTC deposit option for ${btcToken.name}:`,
                error,
              );
              // Continue with other BTC tokens even if one fails
            }
          }
        }
      }

      // 3. STRK deposit option (only for STRK-based Hyper LST vaults)
      if (isSTRKHyperLSTStrategy(strategyId)) {
        const lstTokenAddress = primaryTokenInfo.address.address;

        if (
          STRK_TOKEN &&
          STRK_TOKEN.token.toLowerCase() !== lstTokenAddress.toLowerCase()
        ) {
          try {
            const strkResult = await handleTokenSwapDeposit(
              strategy,
              STRK_TOKEN,
              lstTokenAddress,
              amountRaw,
              address,
              primaryTokenInfo,
            );
            results.push(strkResult);
          } catch (error) {
            console.error('Error creating STRK deposit option:', error);
          }
        }
      }
    } else {
      // Regular deposit or withdraw (non-Hyper LST or withdrawal)
      const decimals = primaryTokenInfo.decimals;
      const amount = new MyNumber(amountRaw, decimals);

      let actionHooks;
      let alerts: string[] | undefined;

      if (isDeposit) {
        actionHooks = await strategy.depositMethods({
          amount,
          address,
          provider,
          isMax: false,
        });

        // Try to get alerts from onClickButton if available
        if (actionHooks[0]?.onClickButton) {
          try {
            const alertsResult = await actionHooks[0].onClickButton(amount);
            if (Array.isArray(alertsResult)) {
              alerts = alertsResult;
            }
          } catch (error) {
            console.error('Error getting deposit alerts:', error);
          }
        }
      } else {
        actionHooks = await strategy.withdrawMethods({
          amount,
          address,
          provider,
          isMax: false,
        });

        // Try to get alerts from onClickButton if available
        if (actionHooks[0]?.onClickButton) {
          try {
            const alertsResult = await actionHooks[0].onClickButton(amount);
            if (Array.isArray(alertsResult)) {
              alerts = alertsResult;
            }
          } catch (error) {
            console.error('Error getting withdrawal alerts:', error);
          }
        }
      }

      // Process all action hooks (some strategies may return multiple)
      for (const hook of actionHooks) {
        if (hook.amounts.length > 0) {
          const tokenInfo = hook.amounts[0].tokenInfo;
          results.push({
            tokenInfo: {
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              address: tokenInfo.address.address,
              decimals: tokenInfo.decimals,
            },
            calls: hook.calls,
            alerts,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      strategyId,
      isDeposit,
    });
  } catch (error: any) {
    console.error('Error in /api/get-calls:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.toString(),
      },
      { status: 500 },
    );
  }
}

async function handleTokenSwapDeposit(
  strategy: any,
  sourceToken: { name: string; token: string; decimals: number },
  lstTokenAddress: string,
  amountRaw: string,
  userAddress: string,
  lstTokenInfo: any,
): Promise<CallResult> {
  const alerts: string[] = [];

  try {
    const amount = new MyNumber(amountRaw, sourceToken.decimals);

    // Fetch quote from AVNU for token -> LST swap
    const quotes: Quote[] = await fetchQuotes({
      sellTokenAddress: sourceToken.token,
      buyTokenAddress: lstTokenAddress,
      sellAmount: BigInt(amountRaw),
      takerAddress: userAddress,
      integratorName: 'Troves',
    });

    if (!quotes || quotes.length === 0) {
      throw new Error('No swap quotes available from AVNU');
    }

    const bestQuote = quotes[0];

    // Add swap info to alerts
    const sellAmountEther = amount.toEtherToFixedDecimals(6);
    const buyAmount = new MyNumber(
      bestQuote.buyAmount.toString(),
      lstTokenInfo.decimals,
    );
    const buyAmountEther = buyAmount.toEtherToFixedDecimals(6);

    const slippage = 0.05; // 5% slippage
    const slippagePercent = (slippage * 100).toFixed(1);

    alerts.push(
      `Swapping ${sellAmountEther} ${sourceToken.name} to approximately ${buyAmountEther} ${lstTokenInfo.symbol} before depositing into the vault (${slippagePercent}% slippage tolerance).`,
    );

    // Build swap transaction
    const swapTx = await fetchBuildExecuteTransaction(
      bestQuote.quoteId,
      userAddress,
      slippage,
      true, // includeApprove
    );

    // Get the LST deposit calls
    const lstAmount = new MyNumber(
      bestQuote.buyAmount.toString(),
      lstTokenInfo.decimals,
    );
    const depositHooks = await strategy.depositMethods({
      amount: lstAmount,
      address: userAddress,
      provider,
      isMax: false,
    });

    // Try to get additional alerts from strategy
    if (depositHooks[0]?.onClickButton) {
      try {
        const strategyAlerts = await depositHooks[0].onClickButton(lstAmount);
        if (Array.isArray(strategyAlerts)) {
          alerts.push(...strategyAlerts);
        }
      } catch (error) {
        console.error('Error getting strategy alerts:', error);
      }
    }

    // Combine swap calls + deposit calls
    const allCalls = [...swapTx.calls, ...depositHooks[0].calls];

    return {
      tokenInfo: {
        symbol: sourceToken.name,
        name: sourceToken.name,
        address: sourceToken.token,
        decimals: sourceToken.decimals,
      },
      calls: allCalls,
      alerts,
    };
  } catch (error: any) {
    console.error(`Error handling ${sourceToken.name} deposit:`, error);

    // Fallback: return error as alert
    return {
      tokenInfo: {
        symbol: sourceToken.name,
        name: sourceToken.name,
        address: sourceToken.token,
        decimals: sourceToken.decimals,
      },
      calls: [],
      alerts: [`Error preparing swap: ${error.message}`],
    };
  }
}
