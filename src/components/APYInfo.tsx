import CONSTANTS, { DEFAULT_APY_METHODLOGY } from '@/constants';
import { StrategyInfo } from '@/store/strategies.atoms';
import { TrovesStrategyAPIResult } from '@/store/troves.atoms';
import { MYSTYLES } from '@/style';
import {
  Flex,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  Tag,
  Spinner,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { APYToolTip } from './YieldCard';
import { APRSplit } from '@/store/pools';

export function APYInfo(props: {
  strategy: StrategyInfo<any>;
  strategyAPIResult: TrovesStrategyAPIResult;
}) {
  const { strategy, strategyAPIResult } = props;

  const leverage = useMemo(() => {
    if (!strategyAPIResult) return 0;
    return strategyAPIResult.leverage || 0;
  }, [strategyAPIResult]);

  const apySplits: APRSplit[] = [
    {
      apr: strategyAPIResult.apySplit.baseApy,
      title: 'Strategy APY',
      description: 'Includes fees & Defi spring rewards',
    },
  ];

  if (strategyAPIResult.apySplit.rewardsApy > 0) {
    apySplits.push({
      apr: strategyAPIResult.apySplit.rewardsApy,
      title: 'Boosted APY',
      description: CONSTANTS.BOOSTED_YIELD_TOOLTIP_TEXT,
    });
  }

  return (
    <Flex gap={'8px'}>
      <Tooltip
        label={APYToolTip({
          apyMethodology:
            strategy.metadata.apyMethodology || DEFAULT_APY_METHODLOGY,
          apySplits,
        })}
        {...MYSTYLES.TOOLTIP.STANDARD}
      >
        <Stat
          display={'flex'}
          flexDirection={'column'}
          bg={'mycard'}
          borderRadius={'md'}
          padding={'16px'}
          gap={'10px'}
        >
          <StatLabel
            color={'border_light'}
            fontSize={'14px'}
            fontWeight={'500'}
          >
            APY
          </StatLabel>
          <StatNumber
            color={(strategyAPIResult?.apy || 0) >= 0 ? 'light_green' : 'red'}
            lineHeight="100%"
            fontSize={'32px'}
            fontWeight={'700'}
          >
            {((strategyAPIResult?.apy || 0) * 100).toFixed(2)}%
          </StatNumber>
        </Stat>
      </Tooltip>

      {leverage > 1 && (
        <Tooltip
          label={CONSTANTS.BOOSTED_YIELD_TOOLTIP_TEXT}
          {...MYSTYLES.TOOLTIP.STANDARD}
        >
          <Tag
            alignSelf={'flex-end'}
            bg="mycard_dark"
            color={'text_secondary'}
            fontSize={'14px'}
            fontWeight={'500'}
            padding={'4px 8px'}
            width={'fit-content'}
            height={'29px'}
            borderRadius={'20px'}
          >
            🔥{leverage.toFixed(2)}x boosted
            {leverage === 0 && <Spinner size="xs" color="white" ml={'5px'} />}
          </Tag>
        </Tooltip>
      )}
    </Flex>
  );
}
