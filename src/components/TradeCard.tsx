import CONSTANTS from '@/constants';
import { PoolInfo } from '@/store/pools';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Center,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Image,
  Link,
  Spinner,
  Stack,
  Td,
  Text,
  Tooltip,
  Tr,
  VStack,
} from '@chakra-ui/react';
import shield from '@/assets/shield.svg';
import { IStrategyProps, StrategyLiveStatus } from '@/strategies/IStrategy';
import { useAtomValue } from 'jotai';
import { getDisplayCurrencyAmount } from '@/utils';
import { addressAtom } from '@/store/claims.atoms';
import { FaWallet } from 'react-icons/fa';
import { UserStats, userStatsAtom } from '@/store/utils.atoms';
import { getPoolInfoFromStrategy } from '@/store/protocols';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import { useState } from 'react';
import mixpanel from 'mixpanel-browser';
import { TradeInfo } from '@/store/trades.atoms';

interface TradeCardProps {
  pool: TradeInfo;
  index: number;
  showProtocolName?: boolean;
}

function getStratCardBg(status: StrategyLiveStatus, index: number) {
  if (status == StrategyLiveStatus.ACTIVE || status == StrategyLiveStatus.NEW) {
    return index % 2 === 0 ? 'color1_50p' : 'color2_50p';
  }
  return 'bg';
}

function getStratCardBadgeBg(status: StrategyLiveStatus) {
  if (status === StrategyLiveStatus.NEW) {
    return 'cyan';
  } else if (status === StrategyLiveStatus.COMING_SOON) {
    return 'yellow';
  }
  return 'bg';
}

function StrategyInfo(props: TradeCardProps) {
  const { pool } = props;
  return (
    <Box>
      <HStack spacing={2}>
        <AvatarGroup size="xs" max={2} marginRight={'10px'}>
          {pool.pool.logos.map((logo) => (
            <Avatar key={logo} src={logo} />
          ))}
        </AvatarGroup>
        <Box>
          <HStack spacing={2}>
            <Heading size="sm" marginTop={'2px'}>
              {pool.pool.name}
            </Heading>
            {pool.additional &&
              pool.additional.tags
                .filter((tag) => tag != StrategyLiveStatus.ACTIVE)
                .map((tag) => {
                  return (
                    <Badge
                      ml="1"
                      bg={getStratCardBadgeBg(tag)}
                      fontFamily={'sans-serif'}
                      padding="2px 8px"
                      textTransform="capitalize"
                      fontWeight={500}
                      key={tag}
                    >
                      {tag}
                    </Badge>
                  );
                })}
            ;
            {pool.additional && pool.additional.isAudited && (
              <Tooltip label="Audited smart contract. Click to view the audit report.">
                <Link href={CONSTANTS.AUDIT_REPORT} target="_blank">
                  <Box
                    width={'24px'}
                    height={'24px'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={'rgba(0, 0, 0, 0.2)'}
                    borderRadius={'50%'}
                  >
                    <Image src={shield.src} alt="badge" />
                  </Box>
                </Link>
              </Tooltip>
            )}
          </HStack>
        <HStack marginTop={'5px'} spacing={1}>
            {/* <Avatar size={'2xs'} src={pool.protocol.logo} /> */}
            <Text fontSize={'12px'} marginTop={'2px'} color={'light_grey'}>
            Profit if {pool.pool.name.replace('Long ', '')} goes {pool.isLong ? "up" : "down"}
            </Text>
        </HStack>
        </Box>
      </HStack>
    </Box>
  );
}

function getAPRWithToolTip(pool: TradeInfo) {
  const tip = (
    <Box width={'300px'}>
      {pool.aprSplits.map((split) => {
        if (split.apr === 0) {
          return (
            <Text key={split.title}>
              {split.title}: {split.description}
            </Text>
          );
        }
        return (
          <Flex width={'100%'} key={split.title}>
            <Text key="1" width={'70%'}>
              {split.title} {split.description ? `(${split.description})` : ''}
            </Text>
            <Text fontSize={'xs'} width={'30%'} textAlign={'right'} key="2">
              {split.apr === 'Err' ? split.apr : (split.apr * 100).toFixed(2)}%
            </Text>
          </Flex>
        );
      })}
    </Box>
  );
  return (
    <Tooltip hasArrow label={tip} bg="gray.300" color="black">
      <Box
        width={'100%'}
        marginRight={'0px'}
        marginLeft={'auto'}
        display={'flex'}
        justifyContent={'flex-end'}
      >
        {pool.isLoading && <Spinner />}
        {!pool.isLoading && (
          <>
            <Text
              textAlign={'right'}
              color="white"
              fontSize={'16px'}
              fontWeight={'bolder'}
            >
              {(pool.apr * 100).toFixed(2)}%
            </Text>
          </>
        )}
      </Box>
    </Tooltip>
  );
}

function StrategyAPY(props: TradeCardProps) {
  const { pool } = props;
  return (
    <Box width={'100%'} marginBottom={'5px'}>
      {getAPRWithToolTip(pool)}
    </Box>
  );
}

function StrategyLeverage(props: TradeCardProps) {
    return <Tooltip label="Shows the increased capital efficiency of investments compared to direct deposit in popular lending protocols">
        <Box width={'100%'}>
        <Box float={'right'} display={'flex'} fontSize={'13px'}>
            <Text color="#FCC01E" textAlign={'right'}>
            ⚡
            </Text>
            <Text
            width="100%"
            color="cyan"
            textAlign={'right'}
            fontWeight={600}
            >
            {props.pool.additional?.leverage?.toFixed(1)}X
            </Text>
        </Box>
        </Box>
    </Tooltip>
}

function isLive(status: StrategyLiveStatus) {
  return (
    status === StrategyLiveStatus.ACTIVE || status === StrategyLiveStatus.NEW
  );
}

function CollateralInfo(props: TradeCardProps) {
    return <>
        {props.pool.collaterals.map((collateral) => {
            return <Badge
                key={collateral.name}
                padding={'5px 10px'}
                ml={'5px'}
                float={'right'}
                bg='highlight'
                color={'white'}
            >
                <Center>
                    <Avatar size={'xs'} src={collateral.logo}/>
                    <Text ml={'5px'}>{collateral.name}</Text>
                </Center>
            </Badge>
        })}
    </>
}

function getStrategyWiseInfo(
  userData: UserStats | null | undefined,
  id: string,
) {
  const amount = userData?.strategyWise.find((item) => item.id === id);
  return amount?.usdValue ? amount?.usdValue : 0;
}

function StrategyMobileCard(props: TradeCardProps) {
  const { pool, index } = props;
  return (
    <Grid
      color={'white'}
      bg={getStratCardBg(
        pool.additional?.tags[0] || StrategyLiveStatus.ACTIVE,
        index,
      )}
      templateColumns={'repeat(3, 1fr)'}
      templateRows={
        props.showProtocolName ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'
      }
      display={{ base: 'grid', md: 'none' }}
      padding={'20px'}
      gap={2}
      borderBottom={'1px solid var(--chakra-colors-bg)'}
      as={'a'}
      {...getLinkProps(pool, props.showProtocolName)}
    >
      <GridItem colSpan={3} rowSpan={props.showProtocolName ? 2 : 1}>
        <StrategyInfo
          pool={pool}
          index={index}
          showProtocolName={props.showProtocolName}
        />
      </GridItem>
      <GridItem colSpan={1} rowSpan={2}>
        <Text
          textAlign={'right'}
          color={'color2'}
          fontWeight={'bold'}
          fontSize={'13px'}
        >
          Leverage
        </Text>
        <StrategyLeverage pool={pool} index={index} />
      </GridItem>
      <GridItem colSpan={1} rowSpan={2}>
        <Text
          textAlign={'right'}
          color={'color2'}
          fontWeight={'bold'}
          fontSize={'13px'}
        >
          APY
        </Text>
        <StrategyAPY pool={pool} index={index} />
      </GridItem>
      <GridItem colSpan={1} rowSpan={2}>
        <Text
          textAlign={'right'}
          color={'color2'}
          fontWeight={'bold'}
          fontSize={'13px'}
        >
          Collateral
        </Text>
        <CollateralInfo pool={pool} index={index} />
      </GridItem>
    </Grid>
  );
}

function getLinkProps(pool: TradeInfo, showProtocolName?: boolean) {
  return {
    href: pool.protocol.link,
    target: '_blank',
    onClick: () => {
        // todo update the event name and info
      mixpanel.track('Pool clicked', {
        pool: pool.pool.name,
        protocol: pool.protocol.name,
        yield: pool.apr,
        risk: pool.additional.riskFactor,
        tvl: pool.tvl,
        showProtocolName,
      });
    },
  };
}
export default function TradeCard(props: TradeCardProps) {
  const { pool, index } = props;

  return (
    <>
      <Tr
        color={'white'}
        bg={index % 2 == 0 ? 'color1_50p' : 'color2_50p'}
        display={{ base: 'none', md: 'table-row' }}
        as={'a'}
        {...getLinkProps(pool, props.showProtocolName)}
      >
        <Td>
          <StrategyInfo
            pool={pool}
            index={index}
            showProtocolName={props.showProtocolName}
          />
        </Td>
        <Td>
            <StrategyLeverage pool={pool} index={index} />
        </Td>
        <Td>
          <StrategyAPY pool={pool} index={index} />
        </Td>
        <Td>
          <CollateralInfo pool={pool} index={index} />
        </Td>
      </Tr>
      <StrategyMobileCard
        pool={pool}
        index={index}
        showProtocolName={props.showProtocolName}
      />
    </>
  );
}
