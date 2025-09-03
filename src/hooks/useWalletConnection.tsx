import { useConnect } from '@starknet-react/core';
import { connect, ConnectOptionsWithConnectors } from 'starknetkit';

import { WalletConnector } from './wallet';
import { useIsMobile } from './use-mobile';
import { constants } from 'starknet';
import { useAtom } from 'jotai';
import { lastWalletAtom } from '@/store/utils.atoms';

// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

export function useWalletConnection() {
  const { connect: connectSnReact } = useConnect();
  const isMobile = useIsMobile();

  const walletConnector = new WalletConnector(isMobile);
  const [lastConnector, setLastConnector] = useAtom(lastWalletAtom);

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';

  console.log('useWalletConnection', hostname);

  const config: ConnectOptionsWithConnectors | any = {
    modalMode: 'canAsk',
    modalTheme: 'light',
    webWalletUrl: 'https://web.argent.xyz',
    argentMobileOptions: {
      dappName: 'Troves.fi',
      chainId: constants.NetworkName.SN_MAIN,
      url: hostname,
    },
    dappName: 'Troves.fi',
    connectors: walletConnector.getConnectors(),
  };

  const connectWallet = async (configParam = config) => {
    const { data, error } = await tryCatch(connect(configParam));
    console.log('useWalletConnection connectWallet', { data, error });
    const connector =
      data?.connector ||
      walletConnector.getConnectors().find((w) => w.id === lastConnector);
    console.log('useWalletConnection connectWallet2', {
      lastConnector,
      connectors: walletConnector.getConnectors(),
      connector,
      id: data?.connector?.id,
    });
    if (connector) {
      // connectSnReact({ connector: connector as any });
    }
    if (data?.connector) {
      setLastConnector(data.connector.id);
    }

    if (error) {
      console.error('connectWallet error', error.message);
    }
  };

  return { connectWallet, config };
}
