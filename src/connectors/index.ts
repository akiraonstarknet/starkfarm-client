import {
  isInArgentMobileAppBrowser,
  ArgentMobileConnector,
} from 'starknetkit/argentMobile';
import {
  BraavosMobileConnector,
  isInBraavosMobileAppBrowser,
} from 'starknetkit/braavosMobile';
import {
  isInKeplrMobileAppBrowser,
  KeplrMobileConnector,
} from 'starknetkit/keplrMobile';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import { ControllerConnector } from 'starknetkit/controller';
import { getStarknet } from '@starknet-io/get-starknet-core';
import { constants } from 'starknet';
import { StarknetkitConnector } from 'starknetkit';

const isMobileDevice = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  getStarknet();
  // Primary method: User Agent + Touch support check
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA =
    // eslint-disable-next-line wrap-regex
    /android|webos|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent);
  const hasTouchSupport =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Backup method: Screen size
  const isSmallScreen = window.innerWidth <= 768;

  // Combine checks: Must match user agent AND (touch support OR small screen)
  return isMobileUA && (hasTouchSupport || isSmallScreen);
};

export const availableConnectors = () => {
  const argentMobileConnector = ArgentMobileConnector.init({
    options: {
      url: typeof window !== 'undefined' ? window.location.href : '',
      dappName: 'Troves',
      chainId: constants.NetworkName.SN_MAIN,
    },
  });

  if (isInArgentMobileAppBrowser()) {
    return [argentMobileConnector];
  }

  if (isInBraavosMobileAppBrowser()) {
    return [BraavosMobileConnector.init({})];
  }

  if (isInKeplrMobileAppBrowser()) {
    return [KeplrMobileConnector.init()];
  }

  // Create injected connectors
  const argentXConnector = new InjectedConnector({
    options: { id: 'argentX', name: 'Argent X' },
  });
  const braavosConnector = new InjectedConnector({
    options: { id: 'braavos', name: 'Braavos' },
  });
  const keplrConnector = new InjectedConnector({
    options: {
      id: 'keplr',
      name: 'Keplr',
    },
  });
  const fordefiConnector = new InjectedConnector({
    options: {
      id: 'fordefi',
      name: 'Fordefi',
    },
  });

  const okx = new InjectedConnector({
    options: {
      id: 'okxwallet',
      name: 'OKX',
    },
  });

  const xverseConnector = new InjectedConnector({
    options: {
      id: 'xverse',
      name: 'Xverse',
    },
  });
  const cartridgeConnector = new ControllerConnector();

  const webWalletConnector = new WebWalletConnector({
    url: 'https://web.argent.xyz',
  }) as StarknetkitConnector;

  const injectedConnectors = [
    argentXConnector,
    braavosConnector,
    keplrConnector,
    xverseConnector,
    cartridgeConnector,
    fordefiConnector,
    okx,
    webWalletConnector,
    argentMobileConnector,
  ];

  // Check which wallets are installed
  const isInstalled = injectedConnectors.map((wallet) => {
    return {
      id: wallet.id,
      isInstalled:
        typeof window === 'undefined'
          ? false
          : window[`starknet_${wallet.id}`] !== undefined,
    };
  });

  // Sort injected connectors: put installed wallets first
  const sortedInjectedConnectors: any[] = injectedConnectors.sort((a, b) => {
    const aInstalled = isInstalled.find(
      (wallet) => wallet.id === a.id,
    )?.isInstalled;
    const bInstalled = isInstalled.find(
      (wallet) => wallet.id === b.id,
    )?.isInstalled;

    if (aInstalled && bInstalled) {
      return 0;
    } else if (aInstalled) {
      return -1;
    }
    return 1;
  });

  const isMobile = isMobileDevice();
  // Add other connectors after sorted injected connectors
  if (isMobile) {
    return [
      argentMobileConnector,
      BraavosMobileConnector.init({}),
      webWalletConnector,
      cartridgeConnector,
    ];
  }

  return sortedInjectedConnectors;
};

export const connectors = availableConnectors();
