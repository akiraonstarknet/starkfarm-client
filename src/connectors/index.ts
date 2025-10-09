import {
  isInArgentMobileAppBrowser,
  ArgentMobileConnector,
} from 'starknetkit/argentMobile';
import {
  BraavosMobileConnector,
  isInBraavosMobileAppBrowser,
} from 'starknetkit/braavosMobile';
import { InjectedConnector } from 'starknetkit/injected';
import { WebWalletConnector } from 'starknetkit/webwallet';
import { getStarknet } from '@starknet-io/get-starknet-core';
import { constants } from 'starknet';

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
  if (isInArgentMobileAppBrowser()) {
    return [
      ArgentMobileConnector.init({
        options: {
          url: typeof window !== 'undefined' ? window.location.href : '',
          dappName: 'Troves',
          chainId: constants.NetworkName.SN_MAIN,
        },
      }),
    ];
  }

  if (isInBraavosMobileAppBrowser()) {
    return [BraavosMobileConnector.init({})];
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

  const injectedConnectors = [
    argentXConnector,
    braavosConnector,
    keplrConnector,
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

  // Add other connectors after sorted injected connectors
  return [
    ...sortedInjectedConnectors,
    ArgentMobileConnector.init({
      options: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        dappName: 'Troves',
        chainId: constants.NetworkName.SN_MAIN,
      },
    }),
    isMobileDevice() ? BraavosMobileConnector.init({}) : null,
    new WebWalletConnector({ url: 'https://web.argent.xyz', theme: 'dark' }),
  ].filter((connector) => connector !== null);
};

export const connectors = availableConnectors();
