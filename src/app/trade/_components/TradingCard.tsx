import {
  Box,
  Card,
  Center,
  Flex,
  Spinner,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useMemo } from 'react';
import { ProviderInterface } from 'starknet';

import Deposit from '@/components/Deposit';
import TradeAction, { Label } from '@/components/TradeAction';
import { DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import {
  getLiquidationPriceAtom,
  newLiquidationPriceAtom,
  positionChangeAtom,
  tradeCloseActions,
  tradeEffectiveAPYAtom,
  tradeEffectiveLeverageAtom,
  tradeOpenMethodsAtom,
  tradePositionAtom,
  tradePositionInUSDAtom,
  tradeProfitAtom,
  userTradeAddressAtom,
} from '@/store/trades.atoms';
import { transactionsAtom } from '@/store/transactions.atom';
import { TokenInfo } from '@/strategies/IStrategy';
import { getDisplayCurrencyAmount } from '@/utils';
import MyNumber from '@/utils/MyNumber';

import { AccordionRowProps } from './AccordionRow';

const TradingCard: React.FC<AccordionRowProps> = ({ strategy }) => {
  const setBalQueryEnable = useSetAtom(strategy.balEnabled);
  const { address } = useAccount();
  const transactions = useAtomValue(transactionsAtom);
  const [positionChange, setPositionChange] = useAtom(positionChangeAtom);

  // user trade Address
  const userTradeAddressRes = useAtomValue(userTradeAddressAtom);
  const userTradeAddress = useMemo(() => {
    if (userTradeAddressRes.data) {
      return userTradeAddressRes.data;
    }
    return '0';
  }, [userTradeAddressRes]);

  // get position values
  const positionRes = useAtomValue(tradePositionAtom);
  const position = useMemo(() => {
    if (positionRes.data) {
      return positionRes.data;
    }
    return null;
  }, [positionRes]);

  // position in usd
  const tradePositionInUSD = useAtomValue(tradePositionInUSDAtom);
  const tradePositionInUSDValue = useMemo(() => {
    if (tradePositionInUSD.data) {
      return tradePositionInUSD.data;
    }
    return null;
  }, [tradePositionInUSD]);

  // open trade actions
  const tradeOpenActionsFn = useAtomValue(tradeOpenMethodsAtom);

  // close trade actions
  const tradeCloseActionsFn = useMemo(() => {
    console.log('tradeCloseActionsAtom4', 44, userTradeAddressRes);
    return (amount: MyNumber, address: string, provider: ProviderInterface) => {
      return tradeCloseActions(amount, address, strategy, userTradeAddressRes);
    };
  }, [userTradeAddressRes]);

  // get profit info
  const tradeProfitRes = useAtomValue(tradeProfitAtom);
  const tradeProfit = useMemo(() => {
    if (tradeProfitRes.data) {
      return tradeProfitRes.data;
    }
    return null;
  }, [tradeProfitRes]);

  // get liquidationn price
  const liquidationPriceRes = useAtomValue(getLiquidationPriceAtom);
  const liquidationPriceInfo = useMemo(() => {
    if (liquidationPriceRes.data) {
      return liquidationPriceRes.data;
    }
    return null;
  }, [liquidationPriceRes]);

  // get new liquidation price (based on form inputs)
  const newLiquidationPriceRes = useAtomValue(newLiquidationPriceAtom);
  const newLiquidationPriceInfo = useMemo(() => {
    if (newLiquidationPriceRes.data) {
      return newLiquidationPriceRes.data;
    }
    return null;
  }, [newLiquidationPriceRes]);

  // effective yield
  const tradeEffectiveAPYRes = useAtomValue(tradeEffectiveAPYAtom);
  const tradeEffectiveAPY = useMemo(() => {
    if (tradeEffectiveAPYRes.data) {
      return tradeEffectiveAPYRes.data;
    }
    return null;
  }, [tradeEffectiveAPYRes]);

  // effective leverage
  const tradeEffectiveLeverageRes = useAtomValue(tradeEffectiveLeverageAtom);
  const tradeEffectiveLeverage = useMemo(() => {
    if (tradeEffectiveLeverageRes.data) {
      return tradeEffectiveLeverageRes.data;
    }
    return null;
  }, [tradeEffectiveLeverageRes]);

  useEffect(() => {
    setBalQueryEnable(true);
  }, []);

  // This is the selected market token
  const selectedCollateralAtom = useAtomValue<TokenInfo>(
    strategy.selectedCollateralAtom,
  );

  const balData = useAtomValue(
    strategy.baseConfig.collateral.find(
      (a) => a.token.name === selectedCollateralAtom.name,
    )?.balanceAtom || DUMMY_BAL_ATOM,
  );
  const balance = useMemo(() => {
    return balData.data?.amount || MyNumber.fromZero();
  }, [balData]);

  useEffect(() => {
    console.log(
      'balData',
      balData.isError,
      balData.isLoading,
      balData.isPending,
      balData.data,
      balData.error,
    );
  }, [balData]);

  const colSpan1: any = { base: '5', md: '3' };
  const colSpan2: any = { base: '5', md: '2' };

  const tradeMetrics = [
    {
      name: 'Net value',
      value: position
        ? `${position?.tradeToken.toEtherToFixedDecimals(4)} ${strategy.mainToken.name}`
        : '-',
      subText: position
        ? `$${getDisplayCurrencyAmount(tradePositionInUSDValue?.tradeUSD || 0, 2)}`
        : '-',
    },
    {
      name: 'Liquidation price',
      value:
        liquidationPriceInfo && position
          ? `$${getDisplayCurrencyAmount(liquidationPriceInfo.price, 2)}`
          : '-',
      subText:
        liquidationPriceInfo && position
          ? `${liquidationPriceInfo.percentChange < 0 ? 'below' : 'above'} ${Math.abs(liquidationPriceInfo.percentChange).toFixed(2)}%`
          : '-',
    },
    {
      name: 'Effective APY',
      value: position ? `${tradeEffectiveAPY?.apy.toFixed(2)}%` : '-',
    },
    {
      name: 'Total debt',
      value: position
        ? `${position?.borrowed.toEtherToFixedDecimals(4)} ${strategy.baseConfig.debt.token.name}`
        : '-',
      subText: position
        ? `$${getDisplayCurrencyAmount(tradePositionInUSDValue?.debtUSD || 0, 2)}`
        : '-',
    },
    {
      name: 'Total collateral',
      value: position
        ? `${position?.collateral.toEtherToFixedDecimals(4)} ${strategy.baseConfig.collateral[0].token.name}`
        : '-',
      subText: position
        ? `$${getDisplayCurrencyAmount(tradePositionInUSDValue?.collateralUSD || 0, 2)}`
        : '-',
    },
    {
      name: 'Effective Leverage',
      value: position ? `${tradeEffectiveLeverage?.leverage.toFixed(2)}x` : '-',
    },
  ];

  //
  // form metrics
  //

  // selected leverage
  const leverage = useAtomValue(strategy.leverageAtom);

  // min trade
  const minTradeAmountRes = useAtomValue(strategy.minTradeAmountAtom);
  const minTradeAmount = useMemo(() => {
    if (minTradeAmountRes.data) {
      return minTradeAmountRes.data;
    }
    return MyNumber.fromZero();
  }, [minTradeAmountRes]);

  // min col
  const minCollateralAmountRes = useAtomValue(strategy.getMinCollateralAtom);
  const minCollateralAmount = useMemo(() => {
    return minCollateralAmountRes.data || MyNumber.fromZero();
  }, [minCollateralAmountRes]);

  // max trade
  const maxTradeAmountRes = useAtomValue(strategy.maxTradeAmountAtom);
  const maxUserTradeAmountRes = useAtomValue(strategy.maxUserTradeAmountAtom);

  const maxUserTradeAmount = useMemo(() => {
    const overAllMaxTradeAmount = maxTradeAmountRes.data || MyNumber.fromZero();
    const maxUserTradeAmount =
      maxUserTradeAmountRes.data || MyNumber.fromZero();
    return MyNumber.min(overAllMaxTradeAmount, maxUserTradeAmount);
  }, [maxTradeAmountRes, maxUserTradeAmountRes]);

  return (
    <Card width="100%" padding={'15px'} color="white" bg="#111119">
      <Tabs position="relative" variant="unstyled" width={'100%'}>
        <TabList
          display="flex"
          alignItems="center"
          justifyContent="start"
          w={'fit-content'}
          gap="4"
          bg="color2_50p"
          borderRadius={'4px'}
        >
          <Tab
            color="light_grey"
            _selected={{ color: 'purple' }}
            onClick={() => {
              // mixpanel.track('All pools clicked')
            }}
          >
            {/* Example: Deposit/Open */}
            {strategy.actionTabs[0]}
          </Tab>

          <Tab
            color="light_grey"
            _selected={{ color: 'purple' }}
            onClick={() => {
              // mixpanel.track('Strategies opened')
            }}
          >
            {/* Example: Withdraw/Close */}
            {strategy.actionTabs[1]}
          </Tab>

          <Tab
            color="light_grey"
            _selected={{ color: 'purple' }}
            onClick={() => {
              // mixpanel.track('Strategies opened')
            }}
          >
            Collateral
          </Tab>
        </TabList>

        <TabIndicator
          mt="-1.5px"
          height="2px"
          bg="purple"
          color="color1"
          borderRadius="4px"
        />

        <TabPanels mt="4">
          <TabPanel
            bg="highlight"
            float={'left'}
            width={'100%'}
            padding={'4px 0'}
            borderRadius="4px"
          >
            <TradeAction
              strategy={strategy}
              buttonText={strategy.isLong() ? 'Long' : 'Short'}
              callsInfoProm={tradeOpenActionsFn}
              maxUserTradeAmount={maxUserTradeAmount}
              maxTradeAmount={maxTradeAmountRes.data}
              minCollateralAmount={minCollateralAmount}
              minTradeAmount={minTradeAmount}
              isLoading={
                maxTradeAmountRes.isLoading || minTradeAmountRes.isLoading
              }
            />
          </TabPanel>

          <TabPanel
            bg="highlight"
            width={'100%'}
            float={'left'}
            padding={'10px 0'}
            borderRadius="4px"
          >
            <Deposit
              strategy={strategy}
              buttonText="Redeem"
              callsInfoProm={tradeCloseActionsFn}
              onChangeAmount={(amount, market) => {
                setPositionChange({
                  collateral: MyNumber.fromZero(),
                  collateralToken: selectedCollateralAtom,
                  tradeAmount: amount.operate('mul', -1),
                  actionType: 'close-trade',
                });
              }}
            />
          </TabPanel>

          <TabPanel
            bg="highlight"
            width={'100%'}
            float={'left'}
            padding={'10px 10px'}
            borderRadius="4px"
          >
            <Tabs position="relative" variant="unstyled" width={'100%'}>
              <TabList bg="color2_50p" borderRadius={'4px'}>
                <Tab
                  color="light_grey"
                  _selected={{ color: 'purple' }}
                  onClick={() => {
                    // mixpanel.track('All pools clicked')
                  }}
                >
                  Add
                </Tab>
                <Tab
                  color="light_grey"
                  _selected={{ color: 'purple' }}
                  onClick={() => {
                    // mixpanel.track('Strategies opened')
                  }}
                >
                  Reduce
                </Tab>
              </TabList>

              <TabIndicator
                mt="-1.5px"
                height="2px"
                bg="purple"
                color="color1"
                borderRadius="1px"
              />

              <TabPanels>
                <TabPanel
                  bg="highlight"
                  float={'left'}
                  width={'100%'}
                  paddingX={'0'}
                >
                  <Deposit
                    strategy={strategy}
                    buttonText="Deposit"
                    callsInfoProm={strategy.depositMethods}
                    onChangeAmount={(amount, market) => {
                      setPositionChange({
                        collateral: amount,
                        collateralToken: market,
                        tradeAmount: MyNumber.fromZero(),
                        actionType: 'add-collateral',
                      });
                    }}
                  />
                </TabPanel>

                <TabPanel
                  bg="highlight"
                  width={'100%'}
                  float={'left'}
                  paddingX={'0'}
                >
                  <Deposit
                    strategy={strategy}
                    buttonText="Redeem"
                    callsInfoProm={strategy.withdrawMethods}
                    onChangeAmount={(amount, market) => {
                      setPositionChange({
                        collateral: amount.operate('mul', -1),
                        collateralToken: market,
                        tradeAmount: MyNumber.fromZero(),
                        actionType: 'remove-collateral',
                      });
                    }}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Box
        bg="color2_50p"
        height={'1.5px'}
        width={'50%'}
        margin={'12px auto'}
      />

      <VStack width={'100%'} spacing={1} gap={1}>
        <Box display="flex" w="full" gap="3">
          <Box
            display="flex"
            flexDir={'column'}
            paddingY={'10px'}
            paddingX={'14px'}
            borderRadius={'4px'}
            bg="color2_50p"
            gap="1"
            w="full"
          >
            <Text
              color="light_grey"
              fontWeight={'700'}
              fontSize="13px"
              style={{ textWrap: 'nowrap' }}
            >
              Your Debt
            </Text>
            <Text
              fontWeight="700"
              fontSize="16px"
              style={{ textWrap: 'nowrap' }}
              opacity="0.8"
            >
              {position
                ? `${position?.borrowed.toEtherToFixedDecimals(4)} ${strategy.baseConfig.debt.token.name}`
                : '-'}
            </Text>
            <Text fontSize={'12px'} fontWeight={'700'} color={'light_grey'}>
              {position
                ? `$${getDisplayCurrencyAmount(tradePositionInUSDValue?.debtUSD || 0, 2)}`
                : '$0'}
            </Text>
          </Box>

          <Box
            display="flex"
            flexDir={'column'}
            paddingY={'10px'}
            paddingX={'14px'}
            borderRadius={'4px'}
            bg="color2_50p"
            gap="1"
            w="full"
          >
            <Text
              color="light_grey"
              fontWeight={'700'}
              fontSize="13px"
              style={{ textWrap: 'nowrap' }}
            >
              Your Collateral
            </Text>
            <Text
              fontWeight="700"
              fontSize="16px"
              style={{ textWrap: 'nowrap' }}
              opacity="0.8"
            >
              {position?.collateral.toEtherToFixedDecimals(4) ?? '0'}{' '}
              {strategy.baseConfig.collateral[0].token.name ?? '-'}
            </Text>
            <Text fontSize={'12px'} fontWeight={'700'} color={'light_grey'}>
              $
              {getDisplayCurrencyAmount(
                tradePositionInUSDValue?.collateralUSD || 0,
                2,
              )}
            </Text>
          </Box>
        </Box>

        <Flex justifyContent={'space-between'} width={'100%'} mt="3">
          <Box>
            <Label
              text={`Max trade amount at ${strategy.leverage.toFixed(2)}x`}
            ></Label>
          </Box>
          <Text color="color2" fontSize={'13px'}>
            {maxUserTradeAmount.toEtherToFixedDecimals(4) || '0.00'}{' '}
            {strategy.mainToken.name}
          </Text>
        </Flex>

        <Flex justifyContent={'space-between'} width={'100%'}>
          <Box>
            <Label text={`Min trade amount:`}></Label>
          </Box>
          <Text color="color2" fontSize={'13px'}>
            {minTradeAmount.toEtherToFixedDecimals(4) || '0.00'}{' '}
            {strategy.mainToken.name}
          </Text>
        </Flex>

        <Box width={'100%'}>
          <Flex width={'100%'} justifyContent={'space-between'}>
            <Box>
              <Label text="Collateral required:"></Label>
            </Box>
            <Center>
              {minCollateralAmountRes.isLoading && (
                <Spinner size={'xs'} marginRight={'5px'} />
              )}
              <Text color="color2" fontSize={'13px'}>
                {minCollateralAmount.toEtherToFixedDecimals(4)}{' '}
                {selectedCollateralAtom.name}
              </Text>
            </Center>
          </Flex>

          {balData.data?.amount.compare(minCollateralAmount, 'lt') && (
            <Text textAlign={'right'} fontSize="13px" color="red">
              Insufficient collateral {minCollateralAmount.toEtherStr()}{' '}
              {balData.data?.amount.toEtherStr()}
            </Text>
          )}
        </Box>

        <Flex justifyContent={'space-between'} width={'100%'}>
          <Box>
            <Label text="Liquidation price:"></Label>
          </Box>
          {newLiquidationPriceInfo &&
            !isNaN(newLiquidationPriceInfo.price) &&
            newLiquidationPriceInfo.price !== 0 && (
              <Box>
                <Text color="color2" fontSize={'12px'} textAlign={'right'}>
                  {newLiquidationPriceInfo.price.toFixed(2)} per{' '}
                  {strategy.mainToken.name}
                </Text>
                <Text color="color2" fontSize={'12px'} textAlign={'right'}>
                  ({newLiquidationPriceInfo.percentChange.toFixed(2)}%)
                </Text>
              </Box>
            )}
          {newLiquidationPriceInfo === null ? (
            <Spinner size={'xs'} />
          ) : isNaN(newLiquidationPriceInfo.price) ? (
            <Text>-</Text>
          ) : null}
        </Flex>

        <Flex justifyContent={'space-between'} width={'100%'}>
          <Box>
            <Label text="Our fee:"></Label>
          </Box>
          <Text color="color2" fontSize={'12px'}>
            0.1%
          </Text>
        </Flex>

        {/* <Text>{positionChange.collateral.toEtherStr()}</Text>
        <Text>{positionChange.tradeAmount.toEtherStr()}</Text> */}
      </VStack>
    </Card>
  );
};

export default TradingCard;
