'use client';

import { ArrowBackIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Container,
  Flex,
  Link,
  Spinner,
  Stack,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { APYInfo } from '@/components/APYInfo';
import HarvestTime from '@/components/HarvestTime';
import { useIsMobile } from '@/hooks/use-mobile';
import { DUMMY_BAL_ATOM, returnEmptyBal } from '@/store/balance.atoms';
import { addressAtom } from '@/store/claims.atoms';
import { strategiesAtom, StrategyInfo } from '@/store/strategies.atoms';
import { TxHistoryAtom } from '@/store/transactions.atom';
import { EkuboTxHistoryAtom } from '@/store/ekuboTransactions.atom';
import {
  TrovesBaseAPYsAtom,
  TrovesStrategyAPIResult,
} from '@/store/troves.atoms';
import { MYSTYLES } from '@/style';
import MyNumber from '@/utils/MyNumber';
import { StrategyParams } from '../page';
import { DetailsTab } from './DetailsTab';
import { FAQTab } from './FAQTab';
import { ManageTab } from './ManageTab';
import { RiskTab } from './RiskTab';
import { StrategyInfoComponent } from './StrategyInfo';
import { TransactionsTab } from './TransactionsTab';
import { getTokenInfoFromAddr } from '@/utils';

function HoldingsText({
  strategy,
  address,
  balData,
}: {
  strategy: StrategyInfo<any>;
  address: string | undefined;
  balData: any;
}) {
  if (strategy.settings.isInMaintenance)
    return <span style={{ color: 'orange' }}>Maintenance Mode</span>;

  if (strategy?.isRetired()) return '-';

  if (!address)
    return <Text fontSize={'13px'}>You will see your holdings here</Text>;
  if (balData.isLoading || !balData.data?.tokenInfo) {
    return (
      <>
        <Spinner size="sm" marginTop={'5px'} />
      </>
    );
  }
  if (balData.isError) {
    console.error('Balance data error:', balData.error);
    return 'Error';
  }

  if (!balData.data.amount) {
    return '-';
  }

  const value = Number(
    balData.data.amount.toEtherToFixedDecimals(
      balData.data.tokenInfo?.displayDecimals || 2,
    ),
  );

  if (isNaN(value) || value === 0) return '-';

  return `${balData.data.amount.toEtherToFixedDecimals(
    balData.data.tokenInfo?.displayDecimals || 2,
  )} ${balData.data.tokenInfo?.name}`;
}

function NetEarningsText({
  strategy,
  address,
  profit,
  balData,
}: {
  strategy: StrategyInfo<any>;
  address: string | undefined;
  profit: number;
  balData: any;
}) {
  if (
    !address ||
    profit === 0 ||
    strategy?.isRetired() ||
    strategy.settings.isInMaintenance
  )
    return '-';
  return `${profit?.toFixed(
    balData.data?.tokenInfo?.displayDecimals || 2,
  )} ${balData.data?.tokenInfo?.name || 'STRK'}`;
}

function HoldingsAndEarnings({
  strategy,
  address,
  balData,
  profit,
}: {
  strategy: StrategyInfo<any>;
  address: string | undefined;
  balData: any;
  profit: number;
}) {
  return (
    <Flex
      width={'100%'}
      justifyContent={'space-between'}
      gap={2}
      minWidth={'400px'}
    >
      <Box padding={'16px'} bg="mycard" width={'100%'} borderRadius={'lg'}>
        <Text color={'text_secondary'}>
          <b>Your Holdings </b>
        </Text>
        <Text color="purple">
          <HoldingsText
            strategy={strategy}
            address={address}
            balData={balData}
          />
        </Text>
      </Box>
      {!strategy.settings.isTransactionHistDisabled &&
        !strategy.settings.hideNetEarnings && (
          <Tooltip
            label={!strategy?.isRetired() && 'Life time earnings'}
            {...MYSTYLES.TOOLTIP.STANDARD}
          >
            <Box
              padding={'16px'}
              bg="mycard"
              width={'100%'}
              borderRadius={'lg'}
            >
              <Text
                textAlign={'right'}
                fontWeight={'none'}
                color={'text_secondary'}
              >
                <b>Net earnings</b>
              </Text>
              <Text
                textAlign={'right'}
                color={
                  profit == 0
                    ? 'text_secondary'
                    : profit > 0
                      ? 'light_green_2'
                      : 'red'
                }
              >
                <NetEarningsText
                  strategy={strategy}
                  address={address}
                  profit={profit}
                  balData={balData}
                />
              </Text>
            </Box>
          </Tooltip>
        )}
    </Flex>
  );
}

const Strategy = ({ params }: StrategyParams) => {
  const address = useAtomValue(addressAtom);
  const strategies = useAtomValue(strategiesAtom);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tabIndex, setTabIndex] = useState(0);
  const [accordionIndex, setAccordionIndex] = useState(0);

  function setRoute(value: string) {
    router.push(`?tab=${value}`);
  }

  function handleTabsChange(index: number) {
    switch (index) {
      case 0:
        setRoute('manage');
        break;
      case 1:
        setRoute('details');
        break;
      case 2:
        setRoute('risks');
        break;
      case 3:
        setRoute('faq');
        break;
      case 4:
        setRoute('transactions');
        break;
      default:
        setRoute('manage');
        break;
    }
  }

  useEffect(() => {
    mixpanel.track('Page open');
  }, []);

  useEffect(() => {
    (async () => {
      const tab = searchParams.get('tab');

      switch (tab) {
        case 'manage':
          setTabIndex(0);
          break;
        case 'details':
          setTabIndex(1);
          break;
        case 'risks':
          setTabIndex(2);
          break;
        case 'faq':
          setTabIndex(3);
          break;
        case 'transactions':
          setTabIndex(4);
          break;
        default:
          setTabIndex(0);
          break;
      }
    })();
  }, [searchParams]);

  const strategy: StrategyInfo<any> | undefined = useMemo(() => {
    const id = params.strategyId;
    return strategies.find((s) => s.id === id);
  }, [params.strategyId, strategies.map((id) => id).toString()]);

  const strategyAddress = useMemo(() => {
    const holdingTokens = strategy?.holdingTokens;
    if (holdingTokens && holdingTokens.length) {
      const holdingTokenInfo: any = holdingTokens[0];
      return (holdingTokenInfo.address || holdingTokenInfo.token) as string;
    }
    return '';
  }, [strategy]);

  const setBalQueryEnable = useSetAtom(strategy?.balEnabled || atom(false));

  useEffect(() => {
    setBalQueryEnable(true);
  }, []);

  const balData = useAtomValue(strategy?.balanceSummaryAtom || DUMMY_BAL_ATOM);
  const individualBalances = useAtomValue(
    strategy?.balancesAtom || atom([returnEmptyBal()]),
  );
  console.log('balData', balData);

  // Determine if this is an Ekubo strategy
  const isEkuboStrategy = strategy?.id?.startsWith('ekubo_cl_');
  const txHistoryAtom = useMemo(
    () =>
      isEkuboStrategy
        ? EkuboTxHistoryAtom(
            strategyAddress,
            address!,
            strategy?.settings.quoteToken.address.address || '',
          )
        : TxHistoryAtom(strategyAddress, address!),
    [address, strategyAddress, isEkuboStrategy],
  );

  const txHistoryResult = useAtomValue(txHistoryAtom);
  const txHistory = useMemo(() => {
    if (txHistoryResult.data) {
      return {
        findManyInvestment_flows: [
          ...txHistoryResult.data.findManyInvestment_flows,
        ].sort((a, b) => {
          return b.timestamp - a.timestamp;
        }),
      };
    }
    console.log(
      'TxHistoryAtom',
      txHistoryResult.error,
      txHistoryResult.isError,
      txHistoryResult.isLoading,
    );
    return txHistoryResult.data || { findManyInvestment_flows: [] };
  }, [JSON.stringify(txHistoryResult.data)]);

  const [profit, setProfit] = useState(0);
  const computeProfit = useCallback(() => {
    if (!txHistory.findManyInvestment_flows.length) return 0;
    const tokenInfo = getTokenInfoFromAddr(
      txHistory.findManyInvestment_flows[0].asset,
    );
    if (!tokenInfo) return 0;
    const netDeposits = txHistory.findManyInvestment_flows.reduce(
      (acc, tx, index) => {
        const sign = tx.type === 'deposit' ? 1 : -1;
        console.log(
          `tx sum`,
          Number(tx.amount) / 1e18,
          tx.type,
          sign,
          acc,
          index,
          (sign * Number(tx.amount)) / 1e18,
          acc + (sign * Number(tx.amount)) / 1e18,
        );
        return (
          acc +
          sign *
            Number(
              new MyNumber(
                tx.amount,
                tokenInfo.decimals,
              ).toEtherToFixedDecimals(6),
            )
        );
      },
      0,
    );
    const currentValue = Number(
      balData.data?.amount.toEtherToFixedDecimals(6) || '0',
    );
    if (currentValue === 0) return 0;

    if (netDeposits === 0) return 0;
    setProfit(currentValue - netDeposits);
  }, [txHistory, balData]);

  useEffect(() => {
    if (profit == 0) {
      computeProfit();
    }
  }, [txHistory, computeProfit]);

  useEffect(() => {
    mixpanel.track('Strategy page open', { name: params.strategyId });
  }, [params.strategyId]);

  const colSpan1: any = { base: '5', md: '3' };
  const colSpan2: any = { base: '5', md: '2' };

  const isMobile = useIsMobile();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const strategiesInfo = useAtomValue(TrovesBaseAPYsAtom);
  const strategyCached = useMemo(() => {
    if (!strategiesInfo || !strategiesInfo.data) return null;
    const strategiesList: TrovesStrategyAPIResult[] =
      strategiesInfo.data.strategies;
    return strategiesList.find((s: any) => s.id === params.strategyId);
  }, [strategiesInfo, params.strategyId]);

  if (!isMounted) return null;

  function getUniqueById(items: { id: string; logo: string }[]) {
    const uniqueItems = new Map<string, { id: string; logo: string }>();
    items.forEach((item) => {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item);
      }
    });
    return Array.from(uniqueItems.values());
  }

  return (
    <Container
      display={{ base: 'block' }}
      justifyContent={'center'}
      width={'100%'}
      margin={'0 auto'}
      padding={'10px'}
      maxWidth={'1152px'}
    >
      <Flex
        width={'100%'}
        flexDirection={'column'}
        paddingTop={{ base: '10px', md: '32px' }}
        gap={'48px'}
      >
        <Box>
          <Link href="/?tab=strategies">
            <Button
              bg={'mycard_light'}
              color={'text_primary'}
              leftIcon={<ArrowBackIcon />}
              _hover={{
                bg: 'transparent',
                color: 'white',
              }}
            >
              Back
            </Button>
          </Link>
        </Box>
        <Stack
          direction={{ base: 'column', md: 'row' }}
          justifyContent={'space-between'}
          width={'100%'}
        >
          {strategy && (
            <VStack gap={6}>
              <StrategyInfoComponent strategy={strategy} />
              {!strategy?.isRetired() && strategyCached && (
                <Box
                  alignItems={'flex-start'}
                  justifyItems={'flex-start'}
                  width={'100%'}
                >
                  <APYInfo
                    strategy={strategy}
                    strategyAPIResult={strategyCached}
                  />
                </Box>
              )}
            </VStack>
          )}

          {strategy && (
            <VStack gap={'8px'}>
              <HoldingsAndEarnings
                strategy={strategy}
                address={address}
                balData={balData}
                profit={profit}
              />
              <HarvestTime strategy={strategy} balData={balData} />
            </VStack>
          )}
        </Stack>

        {!isMobile && (
          <Tabs
            position="relative"
            variant="unstyled"
            width={'100%'}
            index={tabIndex}
            onChange={handleTabsChange}
          >
            <TabList borderBottom={'2px solid var(--chakra-colors-mycard)'}>
              <Tab
                color={'text_secondary'}
                _selected={{ color: 'purple', fontWeight: 'bold' }}
                onClick={() => {
                  mixpanel.track('Manage clicked');
                }}
              >
                Manage
              </Tab>
              <Tab
                color={'text_secondary'}
                _selected={{ color: 'purple', fontWeight: 'bold' }}
                onClick={() => {
                  mixpanel.track('Details clicked');
                }}
              >
                Details
              </Tab>
              <Tab
                color={'text_secondary'}
                _selected={{ color: 'purple', fontWeight: 'bold' }}
                onClick={() => {
                  mixpanel.track('Risk clicked');
                }}
              >
                Risks
              </Tab>
              <Tab
                color={'text_secondary'}
                _selected={{ color: 'purple', fontWeight: 'bold' }}
                onClick={() => {
                  mixpanel.track('FAQs clicked');
                }}
              >
                FAQs
              </Tab>
              <Tab
                color={'text_secondary'}
                _selected={{ color: 'purple', fontWeight: 'bold' }}
                onClick={() => {
                  mixpanel.track('Transactions clicked');
                }}
              >
                Transactions
              </Tab>
            </TabList>
            <TabIndicator
              mt="-1.5px"
              height="3px"
              bg="purple"
              color="color1"
              borderRadius="1px"
            />
            <TabPanels>
              <TabPanel width={'100%'} padding={0}>
                {strategy && <ManageTab strategy={strategy} />}
              </TabPanel>
              <TabPanel width={'100%'} padding={0}>
                {strategyCached && strategy && (
                  <DetailsTab
                    strategyAPIResult={strategyCached}
                    strategy={strategy}
                  />
                )}
              </TabPanel>
              <TabPanel width={'100%'} padding={0}>
                {strategy && <RiskTab strategy={strategy} />}
              </TabPanel>

              <TabPanel width={'100%'} padding={0}>
                {strategy && <FAQTab strategy={strategy} />}
              </TabPanel>

              <TabPanel width={'100%'} padding={0}>
                {strategy && (
                  <TransactionsTab strategy={strategy} txHistory={txHistory} />
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}

        {/* MOBILE VIEW */}
        {isMobile && (
          <Box display="flex" flexDirection="column" gap="16px">
            <Accordion
              index={accordionIndex}
              defaultIndex={[0]}
              onChange={(expandedIndex) => {
                if (Array.isArray(expandedIndex)) {
                  setAccordionIndex(expandedIndex[0] ?? 0);
                } else {
                  setAccordionIndex(expandedIndex);
                }
              }}
              allowToggle
              width="100%"
              display="flex"
              flexDirection="column"
              gap="10px"
              borderRadius={'lg'}
            >
              {strategy &&
                [
                  {
                    label: 'Manage',
                    content: <ManageTab strategy={strategy} isMobile />,
                  },
                  {
                    label: 'Details',
                    content: strategyCached && (
                      <DetailsTab
                        strategyAPIResult={strategyCached}
                        strategy={strategy}
                        isMobile
                      />
                    ),
                  },
                  {
                    label: 'Risks',
                    content: <RiskTab strategy={strategy} isMobile />,
                  },
                  {
                    label: 'FAQs',
                    content: <FAQTab strategy={strategy} />,
                  },
                  {
                    label: 'Transactions',
                    content: (
                      <TransactionsTab
                        strategy={strategy}
                        txHistory={txHistory}
                        isMobile
                      />
                    ),
                  },
                ].map((item, index) => (
                  <AccordionItem
                    border="none"
                    key={index}
                    bg={'mycard'}
                    padding={'8px'}
                    borderRadius={'lg'}
                    _active={{ bg: 'mycard_light' }}
                    _hover={{ bg: 'mycard_light' }}
                  >
                    <AccordionButton
                      color="text_secondary"
                      padding={'16px 16px'}
                      _expanded={{ color: 'purple' }}
                      borderRadius="lg"
                      _active={{ bg: 'mycard_light' }}
                      _hover={{ bg: 'mycard_light' }}
                      _focusVisible={{
                        boxShadow: 'none',
                      }}
                    >
                      <Text
                        flex="1"
                        textAlign="left"
                        fontWeight="700"
                        fontSize="14px"
                      >
                        {item.label}
                      </Text>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel padding="0px">
                      {item.content}
                    </AccordionPanel>
                  </AccordionItem>
                ))}
            </Accordion>
          </Box>
        )}
      </Flex>
    </Container>
  );
};

export default Strategy;
