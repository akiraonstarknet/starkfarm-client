import { usePagination } from '@ajna/pagination';
import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Container,
  Skeleton,
  Stack,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { Accordion } from '@chakra-ui/react';

import { filteredPools } from '@/store/protocols';
import {
  TrovesBaseAPYsAtom,
  TrovesStrategyAPIResult,
} from '@/store/troves.atoms';

import { YieldStrategyCard } from './YieldCard';
import { addressAtom } from '@/store/claims.atoms';
import { QuestionIcon } from '@chakra-ui/icons';
import { StrategyTag } from '@/strategies/IStrategy';

export default function Strategies({
  tags,
  question,
  answer,
}: {
  tags?: StrategyTag[];
  question: string;
  answer: string;
}) {
  const strkFarmPoolsRes = useAtomValue(TrovesBaseAPYsAtom);

  const strkFarmPools = useMemo(() => {
    if (!strkFarmPoolsRes || !strkFarmPoolsRes.data)
      return [] as TrovesStrategyAPIResult[];
    // Filter strategies by tags if provided
    // Tags are now included in API response, no need for client-side getStrategies()
    return strkFarmPoolsRes.data.strategies.filter((strategy) => {
      if (!tags) return true;
      return tags.some((tag) => strategy.tags?.includes(tag));
    });
  }, [strkFarmPoolsRes, tags]);

  const address = useAtomValue(addressAtom);

  const _filteredPools = useAtomValue(filteredPools);
  const ITEMS_PER_PAGE = 15;
  const { currentPage, setCurrentPage, pagesCount, pages } = usePagination({
    pagesCount: Math.floor(_filteredPools.length / ITEMS_PER_PAGE) + 1,
    initialState: { currentPage: 1 },
  });

  const pools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return _filteredPools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [_filteredPools, currentPage]);

  return (
    <Container
      width="100%"
      float={'left'}
      padding={'0px'}
      marginTop={'0px'}
      display={'flex'}
      flexDirection={'column'}
      gap={'1rem'}
    >
      <Accordion
        allowToggle={true}
        bg={'mycard_dark'}
        padding={'0.5rem'}
        borderRadius={'lg'}
      >
        <AccordionItem border={'none'}>
          <AccordionButton>
            <Text color="text_secondary" fontSize={'15px'} fontWeight={'600'}>
              <QuestionIcon marginTop={'-2px'} /> {question}
            </Text>
            {/* <AccordionIcon color={'text_primary'} /> */}
          </AccordionButton>
          <AccordionPanel>
            <Text color="text_secondary" fontSize={'15px'} fontWeight={'400'}>
              {answer}
            </Text>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      {strkFarmPools.length > 0 && (
        <VStack gap={2}>
          <Table
            variant="simple"
            sx={{
              overflow: 'hidden',
              'border-collapse': 'separate',
              'border-spacing': '0px 3px',
            }}
            gap={2}
          >
            <Thead
              display={{ base: 'none', md: 'table-header-group' }}
              bg={'header'}
              borderTopRadius={'12px'}
            >
              <Tr color={'white'}>
                <Th
                  color="white"
                  borderLeftRadius={'lg'}
                  borderRightWidth={'1px'}
                  borderColor={'mybg'}
                >
                  Strategy name
                </Th>
                <Th
                  color="white"
                  textAlign={'right'}
                  borderRightWidth={'1px'}
                  borderColor={'mybg'}
                >
                  APY
                </Th>
                <Th
                  color="white"
                  textAlign={'right'}
                  borderRightWidth={'1px'}
                  borderColor={'mybg'}
                >
                  Risk
                </Th>
                <Th
                  color="white"
                  textAlign={'right'}
                  borderRightRadius={address == undefined ? 'lg' : 'none'}
                  borderRightWidth={'1px'}
                  borderColor={'mybg'}
                >
                  TVL
                </Th>
                {address != undefined && (
                  <Th
                    color="white"
                    textAlign={'right'}
                    borderRightRadius={'lg'}
                  >
                    MY BAL
                  </Th>
                )}
              </Tr>
            </Thead>
            <Tbody>
              {strkFarmPools.length > 0 && (
                <>
                  {strkFarmPools.map((pool, index) => {
                    return (
                      <YieldStrategyCard
                        key={pool.id}
                        strat={pool}
                        index={index}
                      />
                    );
                  })}
                </>
              )}
            </Tbody>
          </Table>

          {/* <VStack gap={2} width={'100%'}>
          {strkFarmPools.length > 0 && (
            <>
              {strkFarmPools.map((pool, index) => {
                return (
                  <YieldStrategyCard key={pool.id} strat={pool} index={index} />
                );
              })}
            </>
          )}
        </VStack> */}
        </VStack>
      )}

      {strkFarmPools.length === 0 && (
        <Stack>
          <Skeleton height="70px" />
          <Skeleton height="70px" />
          <Skeleton height="70px" />
          <Skeleton height="70px" />
        </Stack>
      )}
    </Container>
  );
}
