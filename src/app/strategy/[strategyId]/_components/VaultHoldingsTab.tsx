import {
  Box,
  Center,
  Spinner,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Avatar,
} from '@chakra-ui/react';
import { StrategyInfo } from '@/store/strategies.atoms';
import { VaultPosition } from '@strkfarm/sdk';
import { convertToMyNumber } from '@/utils';
import { useCallback, useEffect, useState } from 'react';

interface VaultHoldingsTabProps {
  strategy: StrategyInfo<any>;
  isMobile?: boolean;
}

function getProtocolName(position: VaultPosition): string {
  // For now, we'll use Vesu as the default since that's what the SDK returns
  // In the future, this could be enhanced to detect different protocols
  // based on the position data or strategy type
  return 'Vesu';
}

export function VaultHoldingsTab(props: VaultHoldingsTabProps) {
  const { strategy, isMobile } = props;
  const [positions, setPositions] = useState<VaultPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultPositions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const vaultPositions = await strategy.getVaultPositions();
      console.log('vaultPositions', vaultPositions);
      setPositions(vaultPositions);
    } catch (err) {
      console.error('Error fetching vault positions:', err);
      setError('Failed to load vault positions');
    } finally {
      setIsLoading(false);
    }
  }, [strategy]);

  useEffect(() => {
    fetchVaultPositions();
  }, [fetchVaultPositions]);

  if (isLoading) {
    return (
      <Box padding={'24px 16px'}>
        <Center>
          <Spinner size="lg" color="purple" />
        </Center>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={'24px 16px'}>
        <Center>
          <Text color="red" fontSize="14px">
            {error}
          </Text>
        </Center>
      </Box>
    );
  }

  if (positions.length === 0) {
    return (
      <Box padding={'24px 16px'}>
        <Center>
          <Text color="text_secondary" fontSize="14px">
            This feature isn&apos;t supported on this strategy yet.
          </Text>
        </Center>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Flex flexDirection="column" gap="16px" width="100%" padding={'16px'}>
        <Box>
          <Text fontSize="18px" color="white" fontWeight="600" mb={1}>
            Vault Holdings
          </Text>
          <Text fontSize="14px" color="border_light" mb={2}>
            A transparent breakdown of assets currently held by this vault,
            including their protocol allocation and purpose.
          </Text>
        </Box>
        {positions.map((position, index) => (
          <Box
            key={index}
            bg="mycard"
            borderRadius="lg"
            padding="16px"
            width="100%"
          >
            <Flex justifyContent="space-between" alignItems="center" mb={2}>
              <Text fontSize="14px" color="text_secondary" fontWeight="600">
                #{index + 1}
              </Text>
              <Text fontSize="14px" color="text_secondary">
                {getProtocolName(position)}
              </Text>
            </Flex>
            <Flex alignItems="center" gap={2} mb={2}>
              <Avatar
                size="sm"
                src={position.token.logo}
                name={position.token.name}
              />
              <Flex alignItems="center" gap={1}>
                <Text
                  color={
                    position.remarks.toLowerCase().includes('debt')
                      ? 'red'
                      : 'white'
                  }
                  fontSize="16px"
                  fontWeight="600"
                >
                  {position.remarks.toLowerCase().includes('debt') ? '-' : ''}
                  {convertToMyNumber(position.amount).toEtherToFixedDecimals(
                    position.token.displayDecimals || 2,
                  )}{' '}
                  {position.token.symbol}
                </Text>
                {position.remarks.toLowerCase().includes('debt') && (
                  <Text color="text_secondary" fontSize="12px">
                    (Debt)
                  </Text>
                )}
              </Flex>
            </Flex>
            <Text fontSize="14px" color="text_secondary">
              {position.remarks}
            </Text>
          </Box>
        ))}
      </Flex>
    );
  }

  return (
    <Flex padding={'24px 16px'} gap={'24px'}>
      <Flex width={'100%'} flexDirection={'column'} gap={5}>
        <Text fontSize={'24px'} fontWeight={'600'} color={'white'}>
          Vault Holdings
        </Text>
        <Text fontSize={'14px'} color={'text_secondary'}>
          A transparent breakdown of assets currently held by this vault,
          including their protocol allocation and purpose.
        </Text>

        <TableContainer width={'100%'}>
          <Table
            variant="simple"
            sx={{
              overflow: 'hidden',
              'border-collapse': 'separate',
              'border-spacing': '0px 3px',
            }}
          >
            <Thead
              display={{ base: 'none', md: 'table-header-group' }}
              bg={'mycard_light'}
            >
              <Tr>
                <Th
                  width={'50px'}
                  color={'white'}
                  fontSize={'14px'}
                  fontWeight={'600'}
                  textTransform={'capitalize'}
                  borderTopLeftRadius={'lg'}
                >
                  #
                </Th>
                <Th
                  color={'white'}
                  fontSize={'14px'}
                  fontWeight={'600'}
                  textTransform={'capitalize'}
                >
                  Asset
                </Th>
                <Th
                  color={'white'}
                  fontSize={'14px'}
                  fontWeight={'600'}
                  textTransform={'capitalize'}
                >
                  Protocol
                </Th>
                <Th
                  color={'white'}
                  fontSize={'14px'}
                  fontWeight={'600'}
                  textTransform={'capitalize'}
                  borderTopRightRadius={'lg'}
                >
                  Purpose / Remarks
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {positions.map((position, index) => (
                <Tr key={index} border={'none'} bg={'mycard_dark'}>
                  <Td color={'text_secondary'} fontSize={'14px'}>
                    {index + 1}.
                  </Td>
                  <Td color={'text_secondary'} fontSize={'14px'}>
                    <Flex gap={1}>
                      <Avatar
                        size="xs"
                        src={position.token.logo}
                        name={position.token.name}
                      />
                      <Text
                        mt={'2px'}
                        color={
                          position.remarks.toLowerCase().includes('debt')
                            ? 'red'
                            : 'text_secondary'
                        }
                      >
                        {position.remarks.toLowerCase().includes('debt')
                          ? '-'
                          : ''}
                        {convertToMyNumber(
                          position.amount,
                        ).toEtherToFixedDecimals(
                          position.token.displayDecimals || 2,
                        )}{' '}
                        {position.token.symbol}
                        {position.remarks.toLowerCase().includes('debt') && (
                          <Text
                            as="span"
                            color={'text_secondary'}
                            fontSize={'12px'}
                            ml={1}
                          >
                            (Debt)
                          </Text>
                        )}
                      </Text>
                    </Flex>
                  </Td>
                  <Td color={'text_secondary'} fontSize={'14px'}>
                    {getProtocolName(position)}
                  </Td>
                  <Td color={'text_secondary'} fontSize={'14px'}>
                    {position.remarks}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Flex>
    </Flex>
  );
}
