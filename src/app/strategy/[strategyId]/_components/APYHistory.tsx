import { Box, Flex, Text } from '@chakra-ui/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

import { StrategyInfo } from '@/store/strategies.atoms';

interface ITransaction {
  amount: string;
  timestamp: number;
  type: string;
  txHash: string;
  asset: string;
  __typename: 'Investment_flows';
}
interface TransactionsTabProps {
  strategy: StrategyInfo<any>;
  // txHistoryResult: AtomWithQueryResult<TxHistory, Error>;
  txHistory: {
    findManyInvestment_flows: ITransaction[];
  };
  isMobile?: boolean;
}

// Dummy APY history data for months and APY percentage
interface APYHistoryPoint {
  month: string;
  apy: number;
}

const dummyAPYHistory: APYHistoryPoint[] = [
  { month: '2023-10', apy: 4.2 },
  { month: '2023-11', apy: 4.5 },
  { month: '2023-12', apy: 4.7 },
  { month: '2024-01', apy: 5.0 },
  { month: '2024-02', apy: 5.1 },
  { month: '2024-03', apy: 5.3 },
  { month: '2024-04', apy: 5.0 },
  { month: '2024-05', apy: 5.2 },
];

function getMinMax<T>(arr: T[], key: keyof T & string): [number, number] {
  const values = arr.map((item) => item[key] as unknown as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [min - 1, max + 1];
  }
  return [min, max];
}

function generateTicks([min, max]: [number, number]): number[] {
  const step = Math.max(0.1, (max - min) / 4);
  return [min, min + step, min + 2 * step, min + 3 * step, max];
}

function formatYAxis(value: number): string {
  return `${value.toFixed(1)}%`;
}

const yAxisDomain: [number, number] = getMinMax(dummyAPYHistory, 'apy');

const renderAPYHistoryChart = () => {
  return (
    <Box
      className="faded-purple-gradient"
      borderRadius="xl"
      boxShadow="lg"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      height="100%"
      width={'70%'}
      padding={'10px'}
    >
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.700"
      >
        <Text fontWeight="bold" fontSize="lg" color="white">
          APY History
        </Text>
      </Flex>
      <Box p={4} flex="1 1 0" display="flex" flexDirection="column">
        <Box flex="1 1 0" minHeight="300px">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dummyAPYHistory}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              syncId="validator-charts"
            >
              <defs>
                <linearGradient id="colorAPY" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="rgba(16, 185, 129, 0.8)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="rgba(16, 185, 129, 0.1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="none"
                opacity={0.4}
              />
              <XAxis
                dataKey="month"
                stroke="none"
                tick={{ fill: '#10B981', fontSize: 10 }}
                tickFormatter={(value) => {
                  // Format YYYY-MM to 'MMM YY'
                  const [year, month] = value.split('-');
                  return new Date(
                    Number(year),
                    Number(month) - 1,
                  ).toLocaleString('default', {
                    month: 'short',
                    year: '2-digit',
                  });
                }}
                type="category"
              />
              <YAxis
                stroke="#10B981"
                tick={{ fill: '#10B981', fontSize: 10 }}
                ticks={generateTicks(yAxisDomain)}
                tickFormatter={formatYAxis}
                domain={yAxisDomain}
                width={60}
                axisLine={false}
                tickLine={false}
              />
              <Area
                type="monotone"
                dataKey="apy"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorAPY)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  );
};

function APYHistory() {
  return <>{renderAPYHistoryChart()}</>;
}

export function APYHistoryTab() {
  return (
    <Box background="black">
      <Flex
        maxWidth={'1152px'}
        margin={'0 auto'}
        flexDirection="column"
        gap="16px"
        width="100%"
        padding={'32px 0px'}
      >
        <APYHistory />
      </Flex>
    </Box>
  );
}
