// transaction history stored in local storage
// Also handles tx status popup

import { TOKENS } from '@/constants';
import { capitalize, standariseAddress } from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { Getter, Setter, atom } from 'jotai';
import toast from 'react-hot-toast';
import { TransactionExecutionStatus } from 'starknet';
import { StrategyInfo, strategiesAtom } from './strategies.atoms';
import { atomWithQuery } from 'jotai-tanstack-query';
import { gql } from '@apollo/client';
import apolloClient from '@/utils/apolloClient';
import { getProvider } from '@/lib/provider';

export interface StrategyTxProps {
  strategyId: string;
  actionType: 'deposit' | 'withdraw' | 'redeem' | 'claim';
  amount: MyNumber;
  tokenAddr: string;
  block_number: number;
  tx_index: number;
  event_index: number;
  request_id?: string; // for withdraw NFT
}

// Standard tx info to be stored in local storage
export interface TransactionInfo {
  tx_hash: string;
  info: StrategyTxProps; // can add more types of txs in future
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;
}

export interface TxHistory {
  findManyInvestment_flows: {
    amount: string;
    timestamp: number;
    type: string;
    tx_hash: string;
    request_id?: string;
    asset: string;
    block_number: number;
    tx_index: number;
    event_index: number;
    __typename: 'Investment_flows';
  }[];
}

async function getTxHistory(
  contract: string,
  owner: string,
): Promise<TxHistory> {
  try {
    const contractAddrFormatted = standariseAddress(contract);
    const ownerAddrFormatted = standariseAddress(owner);
    const { data } = await apolloClient.query({
      query: gql`
        query Query($where: Investment_flowsWhereInput) {
          findManyInvestment_flows(where: $where) {
            block_number
            tx_index
            event_index
            amount
            timestamp
            type
            request_id
            tx_hash
            asset
            quote_amount
          }
        }
      `,
      variables: {
        where: {
          contract: {
            equals: contractAddrFormatted,
          },
          owner: {
            equals: ownerAddrFormatted,
          },
        },
      },
      fetchPolicy: 'no-cache', // ignores cache completely
    });

    // merge types redeem and claim.
    // if exists a tx of type claim for same request id, claim is selected, else redeem is selected
    // but only one request_id for a given tx
    const mergedTxs: TxHistory['findManyInvestment_flows'] = [];
    const txMap: Record<string, TxHistory['findManyInvestment_flows'][number]> =
      {};

    data.findManyInvestment_flows.forEach((tx: any) => {
      if (tx.type == 'redeem' || tx.type == 'claim') {
        if (!txMap[tx.request_id]) {
          txMap[tx.request_id] = tx;
        } else if (tx.type === 'claim') {
          txMap[tx.request_id] = tx;
        }
      } else {
        mergedTxs.push(tx);
      }
    });
    Object.values(txMap).forEach((tx) => {
      mergedTxs.push(tx);
    });

    return { findManyInvestment_flows: mergedTxs };
  } catch (error) {
    console.error('GraphQL Error:', error);
    throw error;
  }
}

export const newTxsAtom = atom<TransactionInfo[]>([]);

export const TxHistoryAtom = (contract: string, owner: string) =>
  atomWithQuery((get) => ({
    // balData just to trigger a refetch
    queryKey: ['tx_history', contract, owner, JSON.stringify(get(newTxsAtom))],
    queryFn: async ({ queryKey }: any): Promise<TxHistory> => {
      // const [, { contract, owner }] = queryKey;
      const res = await getTxHistory(contract, owner);

      console.log('TxHistoryAtom res', res, { contract, owner, queryKey });
      // add new txs from local cache
      const newTxs = get(newTxsAtom);
      console.log('TxHistoryAtom newTxs', newTxs);
      const allTxs = res.findManyInvestment_flows.concat(
        newTxs
          .filter((newTx) => {
            // must not exist in indexed data
            return !res.findManyInvestment_flows.find(
              (tx) =>
                standariseAddress(tx.tx_hash) ===
                standariseAddress(newTx.tx_hash),
            );
          })
          .map((tx) => {
            return {
              amount: tx.info.amount.toString(),
              timestamp: Math.round(tx.createdAt.getTime() / 1000),
              type: tx.info.actionType,
              tx_hash: tx.tx_hash,
              request_id: tx.info.request_id,
              asset: tx.info.tokenAddr,
              __typename: 'Investment_flows',
              block_number: tx.info.block_number,
              tx_index: tx.info.tx_index,
              event_index: tx.info.event_index,
            };
          }),
      );

      console.log('TxHistoryAtom', allTxs, res.findManyInvestment_flows);
      // remove any duplicate txs by tx_hash
      const txMap: any = {}; // tx_hash: boolean
      const tx_hashes = allTxs.filter((txInfo) => {
        let uniqueKey = `${txInfo.block_number}-${txInfo.tx_index}-${txInfo.event_index}`;
        if (txInfo.block_number == 0) {
          uniqueKey = txInfo.tx_hash;
        }
        if (txMap[uniqueKey]) {
          return false;
        }
        txMap[uniqueKey] = true;
        return true;
      });

      console.log('TxHistoryAtom tx_hashes', tx_hashes);
      return {
        findManyInvestment_flows: tx_hashes,
      };
    },
  }));

// in local storage, objects like Date, MyNumber are stored as strings
// this function deserialises them back to their original types
// declare let localStorage: any;
async function deserialiseTxInfo(key: string, initialValue: TransactionInfo[]) {
  let storedValue;

  if (typeof window !== 'undefined') {
    storedValue = localStorage.getItem(key);
  }

  const txs: TransactionInfo[] = storedValue
    ? JSON.parse(storedValue)
    : initialValue;
  txs.forEach((tx) => {
    if (tx.info.amount) {
      tx.info.amount = new MyNumber(
        tx.info.amount.bigNumber.toString(),
        tx.info.amount.decimals,
      );
    }
    tx.createdAt = new Date(tx.createdAt);
  });
  return txs;
}

// call this func to add a new tx to the tx history
// initiates a toast notification
export const monitorNewTxAtom = atom(
  null,
  async (get, set, tx: TransactionInfo) => {
    console.log('monitorNewTxAtom', tx);
    set(newTxsAtom, (prev) => [...prev, tx]);
    await initToast(tx, get, set);
  },
);

async function waitForTransaction(
  tx: TransactionInfo,
  get: Getter,
  set: Setter,
) {
  const provider = getProvider();
  console.log('waitForTransaction', tx);
  await isTxAccepted(tx.tx_hash);

  console.log('waitForTransaction done', tx);
  const txs = await get(newTxsAtom);
  tx.status = 'success';
  set(newTxsAtom, txs);
}

// Somehow waitForTransaction is giving delayed confirmation
// even with 5s retry interval. So, using this function instead
async function isTxAccepted(tx_hash: string) {
  const provider = getProvider();
  let keepChecking = true;
  const maxRetries = 30;
  let retry = 0;
  while (keepChecking) {
    let txInfo: any;
    try {
      txInfo = await provider.getTransactionStatus(tx_hash);
    } catch (error) {
      retry++;
      if (retry > maxRetries) {
        console.error('isTxAccepted error', error, { retry });
        throw new Error('Transaction status unknown');
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    console.debug('isTxAccepted', txInfo);
    if (!txInfo.finality_status || txInfo.finality_status == 'RECEIVED') {
      // do nothing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
    if (txInfo.finality_status == 'ACCEPTED_ON_L2') {
      if (txInfo.execution_status === TransactionExecutionStatus.SUCCEEDED) {
        keepChecking = false;
        return true;
      }
      throw new Error('Transaction reverted');
    } else if (txInfo.finality_status == 'REJECTED') {
      throw new Error('Transaction rejected');
    } else {
      throw new Error('Transaction status unknown');
    }
  }
}

async function initToast(tx: TransactionInfo, get: Getter, set: Setter) {
  console.log('Deposit txInfo 2', tx, tx.info.amount.toEtherStr());

  const msg = StrategyTxPropsToMessage(tx.info, get);
  await toast.promise(
    waitForTransaction(tx, get, set),
    {
      loading: msg,
      error: msg,
      success: msg,
    },
    {
      position: 'bottom-right',
      style: {
        background: 'rgb(127 73 229)',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: '14px',
      },
    },
  );
}

// converts tx props to a human readable message meant to show in a toast
function StrategyTxPropsToMessage(tx: StrategyTxProps, get: Getter) {
  const strategies = get(strategiesAtom);
  return StrategyTxPropsToMessageWithStrategies(tx, strategies);
}

export function StrategyTxPropsToMessageWithStrategies(
  tx: StrategyTxProps,
  strategies: StrategyInfo<any>[],
) {
  const tokenInfo = TOKENS.find(
    (t) => standariseAddress(t.token) === standariseAddress(tx.tokenAddr),
  );
  if (!tokenInfo) {
    throw new Error(`Toast: Token ${tx.tokenAddr} not found`);
  }
  const strategy = strategies.find((s) => s.id === tx.strategyId);
  if (!strategy) {
    throw new Error(`Toast: Strategy ${tx.strategyId} not found`);
  }
  return `${capitalize(tx.actionType)} ${tx.amount.toEtherToFixedDecimals(4)} ${tokenInfo.name} in ${strategy.name}`;
}
