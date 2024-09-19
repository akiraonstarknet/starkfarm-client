import { atom } from 'jotai';
import { RpcProvider } from 'starknet';

// helps mock a address for testing
// to be used by components that need mocked address, else prefer using `useAccount` hook by `@starknet-react/core`
export const addressAtom = atom<string | undefined>('');
export function getProvider() {
  return new RpcProvider({ nodeUrl: process.env.NEXT_PUBLIC_RPC_URL || '' });
}
