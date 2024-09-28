import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Grid,
  GridItem,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import React from 'react';

import { useERC20Balance } from '@/hooks/useERC20Balance';
import { TradeStrategy } from '@/strategies/trade.strat';

import TradingCard from './TradingCard';
import TradingViewWidget from './TradingViewWidget';

export interface AccordionRowProps {
  strategy: TradeStrategy;
}

const AccordionRow: React.FC<AccordionRowProps> = ({ strategy }) => {
  const result = useERC20Balance(strategy.mainToken);
  const mainTokenValue = Number(result.balance) / 10 ** 18;

  const colSpan1: any = { base: '5', md: '3' };
  const colSpan2: any = { base: '5', md: '2' };

  return (
    <AccordionItem minW="948px" w="full" border={'none'}>
      <AccordionButton
        display="flex"
        alignItems="start"
        justifyContent="space-between"
        w="full"
        bg="#D9D9D9"
        gap={16}
        py="8px"
        borderRadius={'4px'}
        _hover={{ bg: '#D9D9D9' }}
      >
        <Box display="flex" flexDir={'column'} alignItems="start" w="100px">
          <Text
            fontSize={'17px'}
            fontWeight={'700'}
            color={'#575757'}
            style={{ textWrap: 'nowrap' }}
          >
            {strategy.name}
          </Text>
          <Text
            fontSize={'12px'}
            fontWeight={'700'}
            color={'#959595'}
            style={{ textWrap: 'nowrap' }}
          >
            using ETH
          </Text>
        </Box>

        <Tooltip label={`$${mainTokenValue}`}>
          <Box
            color={'white'}
            display="flex"
            flexDir={'column'}
            alignItems="end"
            w="60px"
          >
            <Text
              fontSize={'10px'}
              color="#919191"
              fontWeight={'700'}
              style={{ textWrap: 'nowrap' }}
            >
              PRICE
            </Text>
            <Text
              fontSize="15px"
              fontWeight="700"
              color="#333333"
              style={{ textWrap: 'nowrap' }}
            >
              ${mainTokenValue.toFixed(2)}
            </Text>
          </Box>
        </Tooltip>

        <Box
          color={'white'}
          display="flex"
          flexDir={'column'}
          alignItems="end"
          w="100px"
        >
          <Text
            fontSize={'10px'}
            color="#919191"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            P&L
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="#333333"
            style={{ textWrap: 'nowrap' }}
          >
            0.01 ETH
          </Text>
          <Text fontSize={'11px'} fontWeight={'700'} color={'#757575'}>
            $30.00
          </Text>
        </Box>

        <Box
          color={'white'}
          display="flex"
          flexDir={'column'}
          alignItems="end"
          w="100px"
        >
          <Text
            fontSize={'10px'}
            color="#919191"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            YOUR APY
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="#333333"
            style={{ textWrap: 'nowrap' }}
          >
            {(strategy.netYield * 100).toFixed(2)}%
          </Text>
        </Box>

        <Box
          color={'white'}
          display="flex"
          flexDir={'column'}
          alignItems="end"
          w="100px"
        >
          <Text
            fontSize={'10px'}
            color="#919191"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            YOUR LEVERAGE
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="#333333"
            style={{ textWrap: 'nowrap' }}
          >
            {strategy.leverage.toFixed(2)}x
          </Text>
        </Box>

        <Box
          color={'white'}
          display="flex"
          flexDir={'column'}
          alignItems="end"
          w="100px"
        >
          <Text
            fontSize={'10px'}
            color="#919191"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            YOUR COLLATERAL
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="#333333"
            style={{ textWrap: 'nowrap' }}
          >
            0.005 ETH
          </Text>
          <Text fontSize={'11px'} fontWeight={'700'} color={'#757575'}>
            $15.00
          </Text>
        </Box>

        <Box
          color={'white'}
          display="flex"
          flexDir={'column'}
          alignItems="end"
          w="100px"
        >
          <Text
            fontSize={'10px'}
            color="#919191"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            LIQ PRICE
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="#333333"
            style={{ textWrap: 'nowrap' }}
          >
            $2,100.00
          </Text>
          <Text fontSize={'11px'} fontWeight={'700'} color={'#757575'}>
            below -17%
          </Text>
        </Box>
      </AccordionButton>

      <AccordionPanel pb={4} color={'white'}>
        <Grid width={'100%'} templateColumns="repeat(5, 1fr)" gap={2}>
          <GridItem display="flex" colSpan={colSpan1}>
            <TradingViewWidget />
          </GridItem>
          <GridItem display="flex" colSpan={colSpan2}>
            <TradingCard strategy={strategy} />
          </GridItem>
        </Grid>
      </AccordionPanel>
    </AccordionItem>
  );
};

export default AccordionRow;
