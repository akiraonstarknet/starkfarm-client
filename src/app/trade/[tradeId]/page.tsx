'use client';

import {
  Avatar,
  Box,
  Card,
  Center,
  Flex,
  Grid,
  GridItem,
  ListItem,
  Container,
  OrderedList,
  Spinner,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useEffect, useMemo } from 'react';
import { isMobile } from 'react-device-detect';

import Deposit from '@/components/Deposit';
import CONSTANTS from '@/constants';
import { DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import { transactionsAtom } from '@/store/transactions.atom';
import { getDisplayCurrencyAmount, getSign, getUniqueById } from '@/utils';
import {
  currentTradeIdAtom,
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
  tradeStratAtoms,
  userTradeAddressAtom,
} from '@/store/trades.atoms';
import TradeAction, { Label } from '@/components/TradeAction';
import { TradeStrategy } from '@/strategies/trade.strat';
import MyNumber from '@/utils/MyNumber';
import { ProviderInterface } from 'starknet';
import { TokenInfo } from '@/strategies/IStrategy';

const TradeStrategyPage = (props: { strategy: TradeStrategy }) => {
  const { strategy } = props;
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
    <Container maxWidth={'1200px'} margin={'0 auto'} padding="30px 10px">
      <Flex marginBottom={'10px'}>
        <Avatar marginRight={'5px'} src={strategy.mainToken.logo} />
        <Text
          marginTop={'6px'}
          fontSize={{ base: '18px', md: '25px' }}
          fontWeight={'bold'}
          color="white"
        >
          {strategy.name}
        </Text>
      </Flex>
      <VStack width={'100%'}>
        <Grid width={'100%'} templateColumns="repeat(5, 1fr)" gap={2}>
          <GridItem display="flex" colSpan={colSpan1}>
            <Card width="100%" padding={'15px'} color="white" bg="highlight">
              <Box display={{ base: 'block', md: 'flex' }}>
                <Box width={{ base: '100%', md: '60%' }} float={'left'}>
                  <Text
                    fontSize={'20px'}
                    marginBottom={'0px'}
                    fontWeight={'bold'}
                  >
                    How does it work?
                  </Text>
                  <Text color="light_grey" marginBottom="5px" fontSize={'15px'}>
                    {strategy.description}
                  </Text>
                  <Wrap>
                    {getUniqueById(
                      strategy.actions.map((p) => ({
                        id: p.pool.protocol.name,
                        logo: p.pool.protocol.logo,
                      })),
                    ).map((p) => (
                      <WrapItem marginRight={'10px'} key={p.id}>
                        <Center>
                          <Avatar
                            size="2xs"
                            bg={'black'}
                            src={p.logo}
                            marginRight={'2px'}
                          />
                          <Text marginTop={'2px'}>{p.id}</Text>
                        </Center>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
                <Box
                  width={{ base: '100%', md: '40%' }}
                  float={'left'}
                  marginTop={{ base: '10px' }}
                >
                  <Stat>
                    <StatLabel textAlign={{ base: 'left', md: 'right' }}>
                      MAX APY
                    </StatLabel>
                    <StatNumber
                      color="cyan"
                      textAlign={{ base: 'left', md: 'right' }}
                    >
                      {(strategy.netYield * 100).toFixed(2)}%
                    </StatNumber>
                    <StatHelpText textAlign={{ base: 'left', md: 'right' }}>
                      upto {strategy.leverage.toFixed(2)}x leverage
                    </StatHelpText>
                  </Stat>
                </Box>
              </Box>
              <Box
                padding={'10px'}
                borderRadius={'10px'}
                bg={'bg'}
                color="cyan"
                marginTop={'20px'}
              >
                {!balData.isLoading &&
                  !balData.isError &&
                  !balData.isPending &&
                  balData.data &&
                  balData.data.tokenInfo && (
                    <Text display={'flex'}>
                      <b>Your P&L: </b>
                      {address ? (
                        <Text
                          color={
                            (tradeProfit?.profitInUSD || 0) < 0 ? 'red' : 'cyan'
                          }
                          marginLeft={'10px'}
                        >
                          {tradeProfit?.profitInTradeToken.toFixed(4)}{' '}
                          {tradeProfit?.tokenInfo?.name} (
                          {getSign(tradeProfit?.profitInUSD || 0)}$
                          {getDisplayCurrencyAmount(
                            tradeProfit?.profitInUSD || 0,
                            2,
                          )}
                          )
                        </Text>
                      ) : isMobile ? (
                        CONSTANTS.MOBILE_MSG
                      ) : (
                        'Connect wallet'
                      )}
                    </Text>
                  )}
                {(balData.isLoading ||
                  balData.isPending ||
                  !balData.data?.tokenInfo) && (
                  <Text>
                    <b>Your Holdings: </b>
                    {address ? (
                      <Spinner size="sm" marginTop={'5px'} />
                    ) : isMobile ? (
                      CONSTANTS.MOBILE_MSG
                    ) : (
                      'Connect wallet'
                    )}
                  </Text>
                )}
                {balData.isError && (
                  <Text>
                    <b>Your Holdings: Error</b>
                  </Text>
                )}
              </Box>

              <Grid
                templateColumns="repeat(3, 1fr)"
                templateRows="repeat(2, 1fr)"
              >
                {tradeMetrics.map((m, index) => (
                  <GridItem padding={'30px 20px'} key={index}>
                    <Text
                      fontSize={'14px'}
                      marginBottom={'5px'}
                      fontWeight={'bold'}
                      color={'color2'}
                    >
                      {m.name}
                    </Text>
                    <Text color="white" fontSize={'15px'}>
                      {m.value}
                    </Text>
                    {m.subText && (
                      <Text color="light_grey" fontSize={'14px'}>
                        {m.subText}
                      </Text>
                    )}
                  </GridItem>
                ))}
              </Grid>
            </Card>
          </GridItem>
          <GridItem display="flex" colSpan={colSpan2}>
            <Card width="100%" padding={'15px'} color="white" bg="highlight">
              <Tabs position="relative" variant="unstyled" width={'100%'}>
                <TabList>
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
                  borderRadius="1px"
                />
                <TabPanels>
                  <TabPanel
                    bg="highlight"
                    float={'left'}
                    width={'100%'}
                    padding={'10px 0'}
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
                        maxTradeAmountRes.isLoading ||
                        minTradeAmountRes.isLoading
                      }
                    />
                  </TabPanel>
                  <TabPanel
                    bg="highlight"
                    width={'100%'}
                    float={'left'}
                    padding={'10px 0'}
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
                    padding={'10px 0'}
                  >
                    <Tabs position="relative" variant="unstyled" width={'100%'}>
                      <TabList
                        bg="color2_50p"
                        padding={'0 10px'}
                        borderRadius={'10px'}
                      >
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
                          padding={'10px 0'}
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
                          padding={'10px 0'}
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
                height={'1px'}
                width={'100%'}
                margin={'10px 0'}
              ></Box>

              <VStack width={'100%'} spacing={1} gap={1}>
                <Flex justifyContent={'space-between'} width={'100%'}>
                  <Box>
                    <Label
                      text={`Max trade amount at ${leverage.value.toFixed(2)}x`}
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
                    newLiquidationPriceInfo.price != 0 && (
                      <Box>
                        <Text
                          color="color2"
                          fontSize={'12px'}
                          textAlign={'right'}
                        >
                          {newLiquidationPriceInfo.price.toFixed(2)} per{' '}
                          {strategy.mainToken.name}
                        </Text>
                        <Text
                          color="color2"
                          fontSize={'12px'}
                          textAlign={'right'}
                        >
                          ({newLiquidationPriceInfo.percentChange.toFixed(2)}%)
                        </Text>
                      </Box>
                    )}
                  {newLiquidationPriceInfo == null ? (
                    <Spinner size={'xs'} />
                  ) : isNaN(newLiquidationPriceInfo.price) ? (
                    <Text>-</Text>
                  ) : null}
                </Flex>
                <Text>{positionChange.collateral.toEtherStr()}</Text>
                <Text>{positionChange.tradeAmount.toEtherStr()}</Text>
                <Flex justifyContent={'space-between'} width={'100%'}>
                  <Box>
                    <Label text="Our fee:"></Label>
                  </Box>
                  <Text color="color2" fontSize={'12px'}>
                    0.1%
                  </Text>
                </Flex>
              </VStack>
            </Card>
          </GridItem>
        </Grid>

        {/* Risks card */}
        <Card width={'100%'} color="white" bg="highlight" padding={'15px'}>
          <Text fontSize={'20px'} marginBottom={'10px'} fontWeight={'bold'}>
            Risks
          </Text>
          <OrderedList>
            {strategy.risks.map((r) => (
              <ListItem
                color="light_grey"
                key={r}
                fontSize={'14px'}
                marginBottom={'5px'}
              >
                {r}
              </ListItem>
            ))}
          </OrderedList>
        </Card>

        {/* Transaction history card */}
        <Card width={'100%'} color="white" bg="highlight" padding={'15px'}>
          <Text fontSize={'20px'} marginBottom={'10px'} fontWeight={'bold'}>
            Transaction history
          </Text>

          {/* If more than 1 filtered tx */}
          {transactions.filter((tx) => tx.info.strategyId == strategy.id)
            .length > 0 && (
            <>
              <Text fontSize={'14px'} marginBottom={'10px'} color="light_grey">
                Note: This feature saves and shows transactions made on this
                device since it was added. Clearing your browser cache will
                remove this data.
              </Text>
            </>
          )}

          {/* If no filtered tx */}
          {transactions.filter((tx) => tx.info.strategyId == strategy.id)
            .length == 0 && (
            <Text fontSize={'14px'} textAlign={'center'} color="light_grey">
              No transactions recorded since this feature was added. We use your{' '}
              {"browser's"} storage to save your transaction history. Make a
              deposit or withdrawal to see your transactions here. Clearning
              browser cache will remove this data.
            </Text>
          )}
        </Card>
      </VStack>
    </Container>
  );
};

const TradePage = ({ params }: { params: { tradeId: string } }) => {
  console.log('params', params);
  const tradeStrats = useAtomValue(tradeStratAtoms);
  const setCurrentTradeId = useSetAtom(currentTradeIdAtom);

  const strategy: TradeStrategy | undefined = useMemo(() => {
    const id = params.tradeId;
    setCurrentTradeId(id);
    console.log('id', id);

    return tradeStrats.find((s) => s.id === id);
  }, [params.tradeId, tradeStrats]);

  useEffect(() => {
    mixpanel.track('Strategy page open', { name: params.tradeId });
  }, [params.tradeId]);

  if (!strategy) {
    return <Text color="white">Page not found</Text>;
  }

  return <TradeStrategyPage strategy={strategy} />;
};

export default TradePage;
