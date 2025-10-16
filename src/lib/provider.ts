import { RpcProvider } from 'starknet';

class RPCProviderSingleton {
  private static instance: RpcProvider | null = null;

  static getInstance(): RpcProvider {
    if (!this.instance) {
      this.instance = new RpcProvider({
        nodeUrl: process.env.NEXT_PUBLIC_RPC_URL!,
      });
    }
    return this.instance;
  }
}

export const getProvider = () => RPCProviderSingleton.getInstance();
