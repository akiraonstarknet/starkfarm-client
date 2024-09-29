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

import {
  getLiquidationPriceAtom,
  tradePositionAtom,
  tradePositionInUSDAtom,
} from '@/store/trades.atoms';
import { getDisplayCurrencyAmount } from '@/utils';
import { useAtomValue } from 'jotai';
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

  const collateralTokenName =
    strategy.baseConfig.collateral[0].token.name ?? '-';

  // get position values
  const positionRes = useAtomValue(tradePositionAtom);
  const position = React.useMemo(() => {
    if (positionRes.data) {
      return positionRes.data;
    }
    return null;
  }, [positionRes]);

  // position in usd
  const tradePositionInUSD = useAtomValue(tradePositionInUSDAtom);
  const tradePositionInUSDValue = React.useMemo(() => {
    if (tradePositionInUSD.data) {
      return tradePositionInUSD.data;
    }
    return null;
  }, [tradePositionInUSD]);

  // get liquidationn price
  const liquidationPriceRes = useAtomValue(getLiquidationPriceAtom);
  const liquidationPriceInfo = React.useMemo(() => {
    if (liquidationPriceRes.data) {
      return liquidationPriceRes.data;
    }
    return null;
  }, [liquidationPriceRes]);

  return (
    <AccordionItem minW="948px" w="full" border={'none'}>
      <AccordionButton
        display="flex"
        alignItems="start"
        justifyContent="space-between"
        w="full"
        bg="color1_65p"
        gap={16}
        py="8px"
        borderRadius={'4px'}
        _hover={{ bg: 'color1_50p' }}
      >
        <Box display="flex" flexDir={'column'} alignItems="start" w="100px">
          <Text
            fontSize={'17px'}
            fontWeight={'700'}
            color={'white'}
            style={{ textWrap: 'nowrap' }}
          >
            {strategy.name}
          </Text>
          <Text
            fontSize={'12px'}
            fontWeight={'500'}
            color={'light_grey'}
            style={{ textWrap: 'nowrap' }}
          >
            using {collateralTokenName}
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
              color="light_grey"
              fontWeight={'700'}
              style={{ textWrap: 'nowrap' }}
            >
              PRICE
            </Text>
            <Text
              fontSize="15px"
              fontWeight="700"
              color="white"
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
            color="light_grey"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            P&L
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="white"
            style={{ textWrap: 'nowrap' }}
          >
            {position?.tradeToken?.toEtherToFixedDecimals(4) ?? '0'}{' '}
            {strategy.mainToken.name}
          </Text>
          <Text fontSize={'11px'} fontWeight={'700'} color={'light_grey'}>
            {position
              ? `$${getDisplayCurrencyAmount(tradePositionInUSDValue?.tradeUSD || 0, 2)}`
              : '$0'}
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
            color="light_grey"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            YOUR APY
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="white"
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
            color="light_grey"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            YOUR LEVERAGE
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="white"
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
            color="light_grey"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            YOUR COLLATERAL
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="white"
            style={{ textWrap: 'nowrap' }}
          >
            {position?.collateral.toEtherToFixedDecimals(4) ?? '0'}{' '}
            {collateralTokenName}
          </Text>
          <Text fontSize={'11px'} fontWeight={'700'} color={'light_grey'}>
            $
            {getDisplayCurrencyAmount(
              tradePositionInUSDValue?.collateralUSD || 0,
              2,
            )}
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
            color="light_grey"
            fontWeight={'700'}
            style={{ textWrap: 'nowrap' }}
          >
            LIQ PRICE
          </Text>
          <Text
            fontSize="15px"
            fontWeight="700"
            color="white"
            style={{ textWrap: 'nowrap' }}
          >
            {(liquidationPriceInfo &&
              position &&
              `${liquidationPriceInfo.percentChange.toFixed(2)}%`) ??
              '$0'}
          </Text>
          <Text fontSize={'11px'} fontWeight={'700'} color={'light_grey'}>
            {liquidationPriceInfo && position
              ? `${liquidationPriceInfo.percentChange < 0 ? 'below' : 'above'} ${Math.abs(liquidationPriceInfo.percentChange).toFixed(2)}%`
              : '-'}
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
