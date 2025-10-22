import { constants, RpcProvider } from 'starknet';
import { NFTInfo, TokenInfo } from './strategies/IStrategy';
import { getEndpoint, standariseAddress } from './utils';
import { Global } from '@strkfarm/sdk';

const LOGOS = {
  USDT: 'https://assets.troves.fi/integrations/tokens/usdt.svg?w=20',
  USDC: 'https://assets.troves.fi/integrations/tokens/usdc.svg?w=20',
  WBTC: 'https://assets.troves.fi/integrations/tokens/wbtc.svg?w=20',
  ETH: 'https://assets.troves.fi/integrations/tokens/eth.svg?w=20',
  STRK: 'https://assets.troves.fi/integrations/tokens/strk.svg?w=20',
  DAI: 'https://assets.troves.fi/integrations/tokens/dai.svg?w=20',
  xSTRK: '/imagedelivery/c1f44170-c1b0-4531-3d3b-5f0bacfe1300/logo',
  tBTC: 'https://assets.troves.fi/integrations/tokens/tbtc.svg?w=20',
  solvBTC: 'https://assets.troves.fi/integrations/tokens/solvbtc.svg?w=20',
  LBTC: 'https://assets.troves.fi/integrations/tokens/lbtc.svg?w=20',
};

export type TokenName =
  | 'USDT'
  | 'USDC'
  | 'ETH'
  | 'STRK'
  | 'WBTC'
  | 'DAI'
  | 'xSTRK';

export const CONSTANTS = {
  DEX_INCENTIVE_URL: '/strk-incentives/fetchFile?file=strk_grant.json',
  NOSTRA_DEGEN_INCENTIVE_URL: 'https://api.nostra.finance/query/pool_aprs',
  CARMINE_INCENTIVES_URL: '/carmine/api/v1/mainnet/defispring',
  CARMINE_URL: '/carmine/api/v2/mainnet',
  LENDING_INCENTIVES_URL:
    '/strk-incentives/fetchFile?file=prod-api/lending/lending_strk_grant.json',
  LOGOS,
  COMMUNITY_TG: 'https://troves.fi/tg',
  COMMUNITY_DISCORD: 'https://troves.fi/discord',
  COMMUNITY_TWITTER: 'https://troves.fi/twitter',
  NOSTRA: {
    LENDING_GRAPH_URL: '/nostra/app/data-yqlpb/endpoint/data/v1/action/find',
  },
  ZKLEND: {
    BASE_APR_API: '/zklend/api/poolsee',
  },
  NIMBORA: {
    DEX_APR_API: '/nimbora/yield-dex/strategies',
    STAKING_APR_API: '/nimbora/staking/strategy',
  },
  JEDI: {
    BASE_API: '/jediswap/graphql',
  },
  EKUBO: {
    CLAIMS_URL:
      '/ekubo/airdrops/{{address}}?token=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    BASE_API: '/ekubo',
  },
  HAIKO: {
    BASE_APR_API: '/haiko/markets?network=mainnet',
  },
  Troves: {
    BASE_APR_API: '/api/strategies',
  },
  MY_SWAP: {
    POOLS_API: '/myswap/data/pools/all.json',
    BASE_APR_API: '/myswap/data/pools',
  },
  CACHE_SERVER: 'https://cache-server-t2me.onrender.com',
  CONTRACTS: {
    Master: '0x50314707690c31597849ed66a494fb4279dc060f8805f21593f52906846e28e',
    AutoStrkFarm:
      '0x541681b9ad63dff1b35f79c78d8477f64857de29a27902f7298f7b620838ea',
    AutoUsdcFarm:
      '0x16912b22d5696e95ffde888ede4bd69fbbc60c5f873082857a47c543172694f',
    AutoxTroves:
      '0x2102068cf222a37076b9e322c6428cb9e7110591c8df8a733df2110fdb0c329',
    DeltaNeutralMMUSDCETH:
      '0x04937b58e05a3a2477402d1f74e66686f58a61a5070fcc6f694fb9a0b3bae422',
    DeltaNeutralMMSTRKETH:
      '0x20d5fc4c9df4f943ebb36078e703369c04176ed00accf290e8295b659d2cea6',
    DeltaNeutralMMETHUSDC:
      '0x9d23d9b1fa0db8c9d75a1df924c3820e594fc4ab1475695889286f3f6df250',
    DeltaNeutralMMETHUSDCXL:
      '0x9140757f8fb5748379be582be39d6daf704cc3a0408882c0d57981a885eed9',
    DeltaNeutralxSTRKSTRKXL:
      '0x7023a5cadc8a5db80e4f0fde6b330cbd3c17bbbf9cb145cbabd7bd5e6fb7b0b',
  },
  MOBILE_MSG: 'Desktop/Tablet only',
  BLOCK_EXPLORER: 'https://voyager.online',
  BOOSTED_YIELD_TOOLTIP_TEXT: 'Starktember incentives by Starknet',
};

export const DEFAULT_APY_METHODLOGY =
  'Current APY including any fees. Net returns subject to change based on market conditions.';

export const TOKENS: TokenInfo[] = [
  ...Global.getDefaultTokens().map((token) => ({
    token: standariseAddress(token.address.address),
    name: token.symbol,
    decimals: token.decimals,
    displayDecimals: token.displayDecimals,
    isERC4626: false,
    logo: token.logo,
  })),
  // BTC tokens
  {
    token: '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
    name: 'WBTC',
    decimals: 8,
    displayDecimals: 6,
    logo: CONSTANTS.LOGOS.WBTC,
    isERC4626: false,
  },
  {
    token: '0x4daa17763b286d1e59b97c283c0b8c949994c361e426a28f743c67bdfe9a32f',
    name: 'tBTC',
    decimals: 18,
    displayDecimals: 6,
    logo: CONSTANTS.LOGOS.tBTC,
    isERC4626: false,
  },
  {
    token: '0x0593e034dda23eea82d2ba9a30960ed42cf4a01502cc2351dc9b9881f9931a68',
    name: 'solvBTC',
    decimals: 18,
    displayDecimals: 6,
    logo: CONSTANTS.LOGOS.solvBTC,
    isERC4626: false,
  },
  {
    token: '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4',
    name: 'LBTC',
    decimals: 8,
    displayDecimals: 6,
    logo: CONSTANTS.LOGOS.LBTC,
    isERC4626: false,
  },
  // STRK token
  {
    token: '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    name: 'STRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.STRK,
    isERC4626: false,
  },
  {
    token: '0x06d8fa671ef84f791b7f601fa79fea8f6ceb70b5fa84189e3159d532162efc21',
    name: 'zSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.STRK,
    isERC4626: false,
  },
  {
    token: '0x057146f6409deb4c9fa12866915dd952aa07c1eb2752e451d7f3b042086bdeb8',
    name: 'iETH-c', // nostra eth collateral
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.ETH,
    isERC4626: false,
  },
  {
    token: '0x1b5bd713e72fdc5d63ffd83762f81297f6175a5e0a4771cdadbc1dd5fe72cb1',
    name: 'zETH',
    decimals: 18,
    displayDecimals: 4,
    logo: CONSTANTS.LOGOS.ETH,
    isERC4626: false,
  },
  {
    token: CONSTANTS.CONTRACTS.AutoStrkFarm,
    name: 'frmzSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.STRK,
    isERC4626: true,
  },
  {
    token: '0x047ad51726d891f972e74e4ad858a261b43869f7126ce7436ee0b2529a98f486',
    name: 'zUSDC',
    decimals: 6,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.USDC,
    isERC4626: false,
  },
  {
    token: CONSTANTS.CONTRACTS.AutoUsdcFarm,
    name: 'frmzUSDC',
    decimals: 6,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.USDC,
    isERC4626: true,
  },
  {
    token: CONSTANTS.CONTRACTS.AutoxTroves,
    name: 'frmxSTRK',
    decimals: 18,
    displayDecimals: 2,
    logo: CONSTANTS.LOGOS.xSTRK,
    isERC4626: true,
  },
];

export const NFTS: NFTInfo[] = [
  {
    name: 'frmDNMMUSDCETH',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMUSDCETH,
    logo: CONSTANTS.LOGOS.USDC,
    config: {
      mainTokenName: 'USDC',
    },
  },
  {
    name: 'frmDNMMSTRKETH',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMSTRKETH,
    logo: CONSTANTS.LOGOS.STRK,
    config: {
      mainTokenName: 'STRK',
    },
  },
  {
    name: 'frmDNMMETHUSDC',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDC,
    logo: CONSTANTS.LOGOS.ETH,
    config: {
      mainTokenName: 'ETH',
    },
  },
  {
    name: 'frmDNMMETHUSDC2',
    address: CONSTANTS.CONTRACTS.DeltaNeutralMMETHUSDCXL,
    logo: CONSTANTS.LOGOS.ETH,
    config: {
      mainTokenName: 'ETH',
    },
  },
  {
    name: 'frmDNMMSTRKxSTRK',
    address: CONSTANTS.CONTRACTS.DeltaNeutralxSTRKSTRKXL,
    logo: CONSTANTS.LOGOS.STRK,
    config: {
      mainTokenName: 'STRK',
    },
  },
];

function getNetwork(): constants.StarknetChainId {
  if (process.env.NEXT_PUBLIC_NETWORK == 'sepolia') {
    return constants.StarknetChainId.SN_SEPOLIA;
  }
  return constants.StarknetChainId.SN_MAIN;
}

export const provider = new RpcProvider({
  nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
});

// ? When updating this, ensure there is redirect available for this route
// ? to respect version of doc in github
export const LATEST_TNC_DOC_VERSION = 'tnc/v2';
export const TnC_DOC_URL = `${getEndpoint()}/${LATEST_TNC_DOC_VERSION}`;
export const SIGNING_DATA = {
  types: {
    StarkNetDomain: [
      { name: 'name', type: 'felt' },
      { name: 'version', type: 'felt' },
      { name: 'chainId', type: 'felt' },
    ],
    Tnc: [
      { name: 'message', type: 'felt' },
      { name: 'document', type: 'felt' },
    ],
  },
  primaryType: 'Tnc',
  domain: {
    name: 'Troves',
    version: '2',
    chainId: getNetwork(),
  },
  message: {
    message: 'Read and Agree T&C',
    document: `${TnC_DOC_URL.replace('https://', '').replace('http://', '').slice(0, 25)}`,
  },
};

export default CONSTANTS;
