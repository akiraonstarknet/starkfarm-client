'use client';

import { Accordion, Box, Text } from '@chakra-ui/react';
import { useAtomValue } from 'jotai';
import React from 'react';

import { tradeStratAtoms } from '@/store/trades.atoms';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import AccordionRow from './AccordionRow';

const AccordionWrapper = () => {
  const [isBoolish, setIsBoolish] = React.useState(false);
  const tradeStrats = useAtomValue(tradeStratAtoms);

  console.log(
    tradeStrats.filter((strat) => strat.isLong),
    'strats',
  );

  return (
    <>
      <Box
        display={'flex'}
        alignItems="center"
        justifyContent={'start'}
        color={'white'}
        gap={1}
        mt={5}
        fontSize={'18px'}
        fontWeight={'700'}
        userSelect="none"
      >
        Profit from
        {!isBoolish ? (
          <Text
            cursor={'pointer'}
            color={'#C41E3A'}
            onClick={() => setIsBoolish(true)}
          >
            bearing <TriangleDownIcon />
          </Text>
        ) : (
          <Text
            cursor={'pointer'}
            color={'#14A68C'}
            onClick={() => setIsBoolish(false)}
          >
            bullish <TriangleUpIcon />
          </Text>
        )}
        movement
      </Box>

      <Box mt="2">
        <Accordion
          allowMultiple
          overflowX={'auto'}
          overflowY={'hidden'}
          display="flex"
          flexDir="column"
          gap="2"
          borderRadius="4px"
        >
          {isBoolish
            ? tradeStrats
                .filter((strat) => strat.isLong())
                ?.map((strat) => (
                  <AccordionRow strategy={strat} key={strat.id} />
                ))
            : tradeStrats?.map((strat) => (
                <AccordionRow strategy={strat} key={strat.id} />
              ))}
        </Accordion>
      </Box>
    </>
  );
};

export default AccordionWrapper;
