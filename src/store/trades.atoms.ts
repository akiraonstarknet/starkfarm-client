import { TokenInfo } from "@/strategies/IStrategy";
import { Category, PoolInfo, PoolType } from "./pools";
import CONSTANTS, { TOKENS } from "@/constants";
import { getTokenInfoFromName } from "@/utils";
import { atom } from "jotai";

export interface TradeInfo extends Omit<PoolInfo, 'borrow' | 'lending' | 'category' | 'type'> {
    collaterals: TokenInfo[];
    isLong: boolean;
}

interface BaseTradeConfig {
    collateral: TokenInfo[];
    debt: TokenInfo;
    trade: TokenInfo;
}

const allowedTrades: BaseTradeConfig[] = [{
    collateral: [getTokenInfoFromName('ETH'), getTokenInfoFromName('STRK')],
    debt: getTokenInfoFromName('USDC'),
    trade: getTokenInfoFromName('ETH'),
}]

export const tradePoolsAtom = atom<TradeInfo[]>(allowedTrades.map((trade) => {
    const poolInfo: TradeInfo = {
        pool: {
            id: getPoolId(trade),
            name: getPoolName(trade),
            logos: [trade.trade.logo],
        },
        protocol: {
            name: 'STRKFarm',
            link: '',
            logo: '',
        },
        tvl: 0,
        apr: 0,
        aprSplits: [],
        collaterals: trade.collateral,
        additional: {
            leverage: 2.5,
            riskFactor: 0,
            tags: [],
            isAudited: false,
        },
        isLong: trade.debt.name == 'USDC',
    }
    return poolInfo
}));

function getPoolName(config: BaseTradeConfig) {
    if (config.debt.name == 'USDC') {
        return `Long ${config.trade.name}`
    } else {
        return `Short ${config.trade.name}`
    }
}

function getPoolId(config: BaseTradeConfig) {
    if (config.debt.name == 'USDC') {
        return `long_${config.trade.name.toLowerCase()}`
    } else {
        return `short_${config.trade.name.toLowerCase()}`
    }
}