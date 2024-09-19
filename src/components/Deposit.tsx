import { BalanceResult, DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import { StrategyInfo } from '@/store/strategies.atoms';
import { StrategyTxProps } from '@/store/transactions.atom';
import { IStrategyActionHook, TokenInfo } from '@/strategies/IStrategy';
import { MyMenuItemProps, MyMenuListProps } from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Image as ImageC,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  Spinner,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useAccount, useProvider } from '@starknet-react/core';
import { useAtomValue } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProviderInterface, uint256 } from 'starknet';
import LoadingWrap from './LoadingWrap';
import TxButton from './TxButton';
import { DUMMY_TOKEN_INFO } from '@/constants';
import { MyNumberInput, MyNumberInputRef } from './MyNumberInput';
import { AtomWithQueryResult } from 'jotai-tanstack-query';

interface DepositProps {
  strategy: StrategyInfo<any>;
  // ? If you want to add more button text, you can add here
  // ? @dev ensure below actionType is updated accordingly
  buttonText: 'Deposit' | 'Redeem';
  callsInfoProm: (
    amount: MyNumber,
    address: string,
    provider: ProviderInterface,
  ) => Promise<IStrategyActionHook[]>;
}
export function MaxButton(props: { onClick: () => void }) {
  return (
    <Button
      size={'sm'}
      marginLeft={'5px'}
      color="color2"
      bg="none"
      padding="0"
      maxHeight={'25px'}
      _hover={{
        bg: 'highlight',
        color: 'color_50p',
      }}
      _active={{
        bg: 'highlight',
        color: 'color_50p',
      }}
      onClick={props.onClick}
    >
      [Max]
    </Button>
  );
}

export function BalanceComponent(props: {
  token: TokenInfo;
  strategy: StrategyInfo<any>;
  buttonText: string;
  balData: AtomWithQueryResult<BalanceResult, Error>;
  onClickMax?: () => void;
}) {
  const { balData } = props;

  const balance = useMemo(() => {
    return balData.data?.amount || MyNumber.fromZero();
  }, [balData]);

  return (
    <Box color={'light_grey'} textAlign={'right'}>
      <Text>Available balance </Text>
      <LoadingWrap
        isLoading={balData.isLoading || balData.isPending}
        isError={balData.isError}
        skeletonProps={{
          height: '10px',
          width: '50px',
          float: 'right',
          marginTop: '8px',
          marginLeft: '5px',
        }}
        iconProps={{
          marginLeft: '5px',
          boxSize: '15px',
        }}
      >
        <Tooltip label={balance.toEtherStr()}>
          <b style={{ marginLeft: '5px' }}>
            {balance.toEtherToFixedDecimals(4)}
          </b>
        </Tooltip>
        {props.onClickMax != undefined && (
          <MaxButton
            onClick={() => {
              if (props.onClickMax) props.onClickMax();
            }}
          ></MaxButton>
        )}
      </LoadingWrap>
    </Box>
  );
}

export default function Deposit(props: DepositProps) {
  const { address } = useAccount();
  const { provider } = useProvider();
  const [callsInfo, setCallsInfo] = useState<IStrategyActionHook[]>([]);
  const amountRef = useRef<MyNumberInputRef>(null);

  const [amount, setAmount] = useState(MyNumber.fromZero());

  const depositMethodsFn = useCallback(async () => {
    let _amount = amount;
    if (amountRef.current?.getValue().isMax) {
      _amount = new MyNumber(uint256.UINT_256_MAX.toString(), 0);
    }
    const result = await props.callsInfoProm(
      _amount,
      address || '0x0',
      provider,
    );
    if (callsInfo.length === 0 && result.length > 0) {
      setSelectedMarket(result[0].tokenInfo);
    }
    setCallsInfo(result);
  }, [amountRef.current, address, provider, props.callsInfoProm]);

  const tvlInfo = useAtomValue(props.strategy.tvlAtom);

  // This is the selected market token
  const [selectedMarket, setSelectedMarket] = useState(
    callsInfo.length ? callsInfo[0].tokenInfo : DUMMY_TOKEN_INFO,
  );

  // This is used to store the raw amount entered by the user
  useEffect(() => {
    depositMethodsFn();
  }, [amount, selectedMarket, address, provider]);

  // use to maintain tx history and show toasts
  const txInfo: StrategyTxProps = useMemo(() => {
    return {
      strategyId: props.strategy.id,
      actionType: props.buttonText === 'Deposit' ? 'deposit' : 'withdraw',
      amount,
      tokenAddr: selectedMarket.token,
    };
  }, [amount, props]);

  // constructs tx calls
  const { calls } = useMemo(() => {
    const hook = callsInfo.find(
      (a) => a.tokenInfo.name === selectedMarket.name,
    );
    if (!hook) return { calls: [] };
    return { calls: hook.calls };
  }, [callsInfo, selectedMarket, amount, address, provider]);

  const balData = useAtomValue(
    callsInfo.find((a) => a.tokenInfo.name === selectedMarket.name)
      ?.balanceAtom || DUMMY_BAL_ATOM,
  );
  const balance = useMemo(() => {
    return balData.data?.amount || MyNumber.fromZero();
  }, [balData]);
  // const { balance, isLoading, isError } = useERC20Balance(selectedMarket);
  const maxAmount: MyNumber = useMemo(() => {
    const currentTVl = tvlInfo.data?.amount || MyNumber.fromZero();
    const maxAllowed =
      props.strategy.settings.maxTVL - Number(currentTVl.toEtherStr());
    const adjustedMaxAllowed = MyNumber.fromEther(
      maxAllowed.toFixed(6),
      selectedMarket.decimals,
    );
    let reducedBalance = balance;
    if (props.buttonText === 'Deposit') {
      if (selectedMarket.name === 'STRK') {
        reducedBalance = balance.subtract(
          MyNumber.fromEther('1.5', selectedMarket.decimals),
        );
      } else if (selectedMarket.name === 'ETH') {
        reducedBalance = balance.subtract(
          MyNumber.fromEther('0.001', selectedMarket.decimals),
        );
      }
    }
    console.log('Deposit:: reducedBalance2', reducedBalance.toEtherStr());
    const min = MyNumber.min(reducedBalance, adjustedMaxAllowed);
    return MyNumber.max(min, MyNumber.fromEther('0', selectedMarket.decimals));
  }, [balance, props.strategy, selectedMarket]);

  function isTradeStrategy() {
    return props.strategy.actionTabs[0] == 'Open';
  }

  return (
    <VStack spacing={4}>
      <Grid templateColumns="repeat(5, 1fr)" gap={6} width={'100%'}>
        <GridItem colSpan={2}>
          <Menu>
            <MenuButton
              as={Button}
              height={'100%'}
              rightIcon={<ChevronDownIcon />}
              bgColor={'highlight'}
              borderColor={'bg'}
              borderWidth={'1px'}
              color="color2"
              _hover={{
                bg: 'bg',
              }}
            >
              <Center>
                {/* <ImageC src={selectedMarket.logo.src} alt='' width={'20px'} marginRight='5px'/> */}
                {balData.data && balData.data.tokenInfo
                  ? balData.data.tokenInfo.name
                  : '-'}
              </Center>
            </MenuButton>
            <MenuList {...MyMenuListProps}>
              {callsInfo.map((dep) => (
                <MenuItem
                  key={dep.tokenInfo.name}
                  {...MyMenuItemProps}
                  onClick={() => {
                    if (selectedMarket.name != dep.tokenInfo.name) {
                      setSelectedMarket(dep.tokenInfo);
                      amountRef.current?.setValue(
                        new MyNumber('0', dep.tokenInfo.decimals),
                        false,
                      );
                    }
                  }}
                >
                  <Center>
                    <ImageC
                      src={dep.tokenInfo.logo.src}
                      alt=""
                      width={'20px'}
                      marginRight="5px"
                    />{' '}
                    {dep.tokenInfo.name}
                  </Center>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </GridItem>
        <GridItem colSpan={3}>
          <BalanceComponent
            token={selectedMarket}
            strategy={props.strategy}
            buttonText={props.buttonText}
            balData={balData}
            onClickMax={() => {
              amountRef.current?.setValue(maxAmount, true);
              setAmount(maxAmount);
              mixpanel.track('Chose max amount', {
                strategyId: props.strategy.id,
                strategyName: props.strategy.name,
                buttonText: props.buttonText,
                amount: amount.toEtherStr(),
                token: selectedMarket.name,
                maxAmount: maxAmount.toEtherStr(),
                address,
              });
            }}
          />
        </GridItem>
      </Grid>

      {/* add min max validations and show err */}
      <MyNumberInput
        ref={amountRef}
        market={selectedMarket}
        maxAmount={maxAmount}
        placeHolder="Amount"
        onChange={(valueAsString, valueAsNumber) => {
          setAmount(MyNumber.fromEther(valueAsString, selectedMarket.decimals));
          mixpanel.track('Enter amount', {
            strategyId: props.strategy.id,
            strategyName: props.strategy.name,
            buttonText: props.buttonText,
            amount: amount.toEtherStr(),
            token: selectedMarket.name,
            maxAmount: maxAmount.toEtherStr(),
            address,
          });
        }}
      />

      <Center marginTop={'10px'} width={'100%'}>
        <TxButton
          txInfo={txInfo}
          buttonText={props.buttonText}
          text={`${props.buttonText}: ${amount.toEtherToFixedDecimals(4)} ${selectedMarket.name}`}
          calls={calls}
          buttonProps={{
            isDisabled: amount.isZero() || amount.compare(maxAmount, 'gt'),
          }}
          selectedMarket={selectedMarket}
          strategy={props.strategy}
          resetDepositForm={amountRef.current?.resetField}
        />
      </Center>

      {!isTradeStrategy() && (
        <Text
          textAlign="center"
          color="disabled_bg"
          fontSize="12px"
          marginTop="20px"
        >
          No additional fees by STRKFarm
        </Text>
      )}

      {!isTradeStrategy() && (
        <Box width="100%" marginTop={'15px'}>
          <Flex justifyContent="space-between">
            <Text fontSize={'12px'} color="color2" fontWeight={'bold'}>
              Current TVL Limit:
            </Text>
            <Text fontSize={'12px'} color="color2">
              {!tvlInfo || !tvlInfo?.data ? (
                <Spinner size="2xs" />
              ) : (
                Number(tvlInfo.data?.amount.toFixedStr(2)).toLocaleString()
              )}
              {' / '}
              {props.strategy.settings.maxTVL.toLocaleString()}{' '}
              {selectedMarket.name}
            </Text>
          </Flex>
          <Progress
            colorScheme="gray"
            bg="bg"
            value={
              (100 *
                (Number(tvlInfo.data?.amount.toEtherStr()) ||
                  props.strategy.settings.maxTVL)) /
              props.strategy.settings.maxTVL
            }
            isIndeterminate={!tvlInfo || !tvlInfo?.data}
          />
          {/* {tvlInfo.isError ? 1 : 0}{tvlInfo.isLoading ? 1 : 0} {JSON.stringify(tvlInfo.error)} */}
        </Box>
      )}
    </VStack>
  );
}
