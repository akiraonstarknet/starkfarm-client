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
import { useAtomValue, useSetAtom } from 'jotai';
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
import TradeAction from '@/components/TradeAction';
import { TradeStrategy } from '@/strategies/trade.strat';
import MyNumber from '@/utils/MyNumber';
import { ProviderInterface } from 'starknet';

const TradeStrategyPage = (props: { strategy: TradeStrategy }) => {
  const { strategy } = props;
  const setBalQueryEnable = useSetAtom(strategy.balEnabled);
  const { address } = useAccount();
  const transactions = useAtomValue(transactionsAtom);

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

  // const balAtom = getBalanceAtom(strategy?.holdingTokens[0]);
  const balData = useAtomValue(strategy?.balanceAtom || DUMMY_BAL_ATOM);
  // cons{ balance, underlyingTokenInfo, isLoading, isError }
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
        ? `${position?.tradeToken.toEtherToFixedDecimals(4)} ${strategy.baseConfig.trade.name}`
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
                      buttonText="Long"
                      callsInfoProm={tradeOpenActionsFn}
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
                          />
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </TabPanel>
                </TabPanels>
              </Tabs>
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
