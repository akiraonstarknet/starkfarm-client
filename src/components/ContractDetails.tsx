import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Flex,
  Image,
  Link,
  Text,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { StrategyInfo } from '@/store/strategies.atoms';
import CONSTANTS from '@/constants';
import shield from '@/assets/shield.svg';
import { shortAddress } from '@/utils';
import { getRiskString, StrategyLiveStatus } from '@/strategies/IStrategy';
import { getRiskColor, RiskType } from '@strkfarm/sdk';
import docs from '@/assets/docs.svg';

export function ContractDetails(props: { strategy: StrategyInfo<any> }) {
  const { strategy } = props;
  const isRetired = strategy.liveStatus === StrategyLiveStatus.RETIRED;

  return (
    <Flex alignItems={'center'} direction={'column'} gap={5}>
      {props.strategy.metadata.contractDetails.length > 0 && (
        <Accordion width={'100%'} allowToggle={true}>
          <AccordionItem borderRadius={'lg'} border="none" bg={'mycard_light'}>
            <AccordionButton flex={1} color={'text_secondary'}>
              <b>Contracts Info</b>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel
              pb={4}
              fontSize={'14px'}
              fontWeight={'400'}
              lineHeight={'20px'}
              color={'text_secondary'}
            >
              {props.strategy.metadata.contractDetails
                .filter((contract) => !contract.name.includes('AUM'))
                .map((contract, index) => (
                  <Flex
                    key={index}
                    fontSize={'14px'}
                    gap={2}
                    marginBottom={'5px'}
                  >
                    <Text>
                      <b style={{ color: 'var(--chakra-colors-purple)' }}>
                        {index + 1}. {contract.name}:
                      </b>{' '}
                      {shortAddress(contract.address.address)}
                    </Text>
                    <a
                      href={`${CONSTANTS.BLOCK_EXPLORER}/contract/${contract.address}`}
                      style={{ marginTop: '-1px' }}
                      target="_blank"
                    >
                      <ExternalLinkIcon />
                    </a>
                  </Flex>
                ))}
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
      <Flex gap={3} width={'100%'} justifyContent={'flex-start'}>
        {!isRetired && (
          <Badge
            textTransform={'capitalize'}
            display={'flex'}
            alignItems={'center'}
            bg="mycard_light"
            color={getRiskColor({
              type: RiskType.TECHNICAL_RISK, // dummy value, just to satisfy the type
              value: strategy.metadata.risk.netRisk,
              weight: 0, // just to satisfy the type
            })}
            padding={'8px'}
            borderRadius={'16px'}
          >
            Risk: {getRiskString(strategy.metadata.risk.netRisk)}
          </Badge>
        )}
        {strategy.metadata.docs && (
          <Link
            href={strategy.metadata.docs}
            target="_blank"
            color={'text_secondary'}
            textAlign={'left'}
            width={'auto'}
            fontSize={'14px'}
            display={'flex'}
            alignItems={'center'}
          >
            <Badge
              textTransform={'capitalize'}
              display={'flex'}
              alignItems={'center'}
              bg="mycard_light"
              padding={'8px'}
              borderRadius={'16px'}
              color={'text_secondary'}
              gap={1}
            >
              <Image
                src={docs.src}
                alt="badge"
                filter={'brightness(0) invert(0.7)'}
                width={'14px'}
              />
              Docs
            </Badge>
          </Link>
        )}
        {strategy.metadata.auditUrl && (
          <Link
            href={strategy.metadata.auditUrl}
            target="_blank"
            color={'text_secondary'}
            textAlign={'left'}
            width={'auto'}
            fontSize={'14px'}
            alignItems={'center'}
          >
            <Badge
              textTransform={'capitalize'}
              display={'flex'}
              alignItems={'center'}
              bg="mycard_light"
              padding={'8px'}
              borderRadius={'16px'}
              color={'text_secondary'}
              gap={1}
            >
              <Image
                src={shield.src}
                alt="badge"
                filter={'brightness(0) invert(0.7)'}
                width={'11px'}
              />
              <span>Audited</span>
            </Badge>
          </Link>
        )}
      </Flex>
    </Flex>
  );
}
