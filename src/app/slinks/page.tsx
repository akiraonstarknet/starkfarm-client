'use client';
import TxButton from '@/components/TxButton';
import { DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import { addressAtom } from '@/store/claims.atoms';
import { StrategyInfo, strategiesAtom } from '@/store/strategies.atoms';
import { StrategyTxProps } from '@/store/transactions.atom';
import { IStrategyActionHook } from '@/strategies/IStrategy';
import MyNumber from '@/utils/MyNumber';
import {
  Avatar,
  Box,
  Button,
  Card,
  Link,
  Container,
  Flex,
  Input,
  Text,
  Center,
} from '@chakra-ui/react';
import { useProvider } from '@starknet-react/core';
import { useAtomValue } from 'jotai';
import { Metadata } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';

const metadata: Metadata = {
  title: 'STRKFarm | Yield aggregator on Starknet',
  description:
    'Find and invest in high yield pools. STRKFarm is the best yield aggregator on Starknet.',
};

function GetCardSimple(strat: StrategyInfo<void>) {
  const [amount, setAmount] = useState(MyNumber.fromZero());
  const address = useAtomValue(addressAtom);
  const { provider } = useProvider();
  const [depositMethods, setDepositMethods] = useState<IStrategyActionHook[]>(
    [],
  );

  const depositMethodsFn = useCallback(async () => {
    const result = await strat.depositMethods(amount, address || '', provider);
    setDepositMethods(result);
  }, [amount, address, provider]);

  useEffect(() => {
    depositMethodsFn();
  }, [amount, address, provider]);

  const balData = useAtomValue(
    depositMethods.length ? depositMethods[0].balanceAtom : DUMMY_BAL_ATOM,
  );

  const balance = useMemo(() => {
    return balData.data?.amount || MyNumber.fromZero();
  }, [balData]);

  const txInfo: StrategyTxProps = useMemo(() => {
    if (!depositMethods.length) {
      return {
        strategyId: strat.id,
        actionType: 'deposit',
        amount: MyNumber.fromZero(),
        tokenAddr: '',
      };
    }
    return {
      strategyId: strat.id,
      actionType: 'deposit',
      amount,
      tokenAddr: depositMethods[0].tokenInfo.token,
    };
  }, [amount, balData, depositMethods]);

  const maxAmount: MyNumber = useMemo(() => {
    return balance;
  }, [balance]);

  // Function to reset the input fields to their initial state
  const resetDepositForm = () => {
    setAmount(MyNumber.fromZero());
  };

  return (
    <Card
      key={strat.id}
      bg="highlight"
      color="light_grey"
      padding={'10px'}
      marginBottom={'5px'}
    >
      <Flex justifyContent={'space-between'}>
        <Text fontWeight={'bold'} color="white" fontSize={'16px'}>
          <Avatar
            src={strat.holdingTokens[0].logo}
            size="xs"
            marginRight={'5px'}
          />
          {strat.name}{' '}
        </Text>
        <Text color="cyan">{(strat.netYield * 100).toFixed(2)}% APY</Text>
      </Flex>
      <Flex width={'100%'} marginTop={'5px'}>
        <Text width={'100%'} textAlign="right" fontSize={'13px'}>
          Bal: {balance.toEtherToFixedDecimals(2)}{' '}
          {depositMethods[0].tokenInfo.name}
        </Text>
      </Flex>
      <Flex justifyContent={'space-between'} marginTop={'5px'} width="100%">
        <Input
          bg="bg"
          borderWidth={'0'}
          size={'sm'}
          float={'right'}
          borderRadius={'5px'}
          marginRight={'10px'}
          placeholder="Amount"
          onChange={(event: any) => {
            const value = event.target.value;
            if (value && Number(value) > 0)
              setAmount(
                MyNumber.fromEther(value, depositMethods[0].tokenInfo.decimals),
              );
            else {
              setAmount(
                new MyNumber('0', depositMethods[0].tokenInfo.decimals),
              );
            }
          }}
          width={'40%'}
        />
        <Box width="60%">
          <TxButton
            txInfo={txInfo}
            text={`Deposit ${amount.toEtherToFixedDecimals(2)}`}
            calls={depositMethods[0].calls}
            justDisableIfNoWalletConnect={true}
            buttonProps={{
              size: 'sm',
              isDisabled: amount.isZero() || amount.compare(maxAmount, 'gt'),
            }}
            resetDepositForm={resetDepositForm}
          />
        </Box>
      </Flex>
    </Card>
  );
}

export default function Slinks() {
  const strategies = useAtomValue(strategiesAtom);
  return (
    <Container>
      <Text color={'white'}>Choose a strategy and invest</Text>
      {strategies
        .filter((s) => s.isLive())
        .map((strat) => GetCardSimple(strat))}

      <Link color={'white'} href="/" size="sm" marginTop="45px">
        <Center>
          <Button bg="highlight" color="light_grey">
            Take me home
          </Button>
        </Center>
      </Link>
    </Container>
  );
}
