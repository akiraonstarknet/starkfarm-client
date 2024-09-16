import CONSTANTS from '@/constants';
import { strategiesAtom } from '@/store/strategies.atoms';
import {
  Box,
  Container,
  Link,
  Skeleton,
  Stack,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { userStatsAtom } from '@/store/utils.atoms';
import { allPoolsAtomUnSorted, filteredPools } from '@/store/protocols';
import { addressAtom } from '@/store/claims.atoms';
import { usePagination } from '@ajna/pagination';
import { YieldStrategyCard } from './YieldCard';
import { tradePoolsAtom } from '@/store/trades.atoms';
import TradeCard from './TradeCard';

export default function Trade() {
    const allPools = useAtomValue(allPoolsAtomUnSorted);
    const tradeOptions = useAtomValue(tradePoolsAtom);
    const address = useAtomValue(addressAtom);

  return (
    <Container width="100%" float={'left'} padding={'0px'} marginTop={'0px'}>
      <Text color="color2Text" fontSize={'15px'}>
        <b>What is Long/Short?</b>
      </Text>
      <Text color="color2Text" fontSize={'15px'} marginBottom={'15px'}>
        In simple terms, Long/Short is Decentralised spot margin trading. It allows you to take a leveraged spot position while earning high yield through Defi Spring. 
      </Text>
      <Table variant="simple">
        <Thead display={{ base: 'none', md: 'table-header-group' }}>
          <Tr fontSize={'18px'} color={'white'} bg="bg">
            <Th>Trade</Th>
            <Th textAlign={'right'}>Max Leverage</Th>
            <Th textAlign={'right'}>Max APY</Th>
            <Th textAlign={'right'}>Collateral</Th>
          </Tr>
        </Thead>
        <Tbody>
          {allPools.length > 0 && tradeOptions.length > 0 && (
            <>
              {tradeOptions.map((trade, index) => {
                return (
                  <TradeCard
                    key={index}
                    pool={trade}
                    index={index}
                  />
                );
              })}
            </>
          )}
        </Tbody>
      </Table>
      {allPools.length > 0 && tradeOptions.length === 0 && (
        <Box padding="10px 0" width={'100%'} float={'left'}>
          <Text color="light_grey" textAlign={'center'}>
            Nothing yet. Check back again soon.
          </Text>
        </Box>
      )}
      {allPools.length === 0 && (
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
