'use client';

import { useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import mixpanel from 'mixpanel-browser';
import { usePathname } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Center,
  Container,
  Flex,
  IconButton,
  Image,
  Link,
  Text,
} from '@chakra-ui/react';
import { useSetAtom } from 'jotai';

import tg from '@/assets/tg.svg';
import CONSTANTS from '@/constants';
import { getERC20Balance } from '@/store/balance.atoms';
import { addressAtom } from '@/store/claims.atoms';
import { getTokenInfoFromName, standariseAddress } from '@/utils';
import fulllogo from '@public/fulllogo.svg';
import TncModal from './TncModal';
import { ConnectButton } from './ConnectButton';

export default function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const setAddress = useSetAtom(addressAtom);

  const getTokenBalance = async (token: string, address: string) => {
    const tokenInfo = getTokenInfoFromName(token);
    const balance = await getERC20Balance(tokenInfo, address);

    return balance.amount.toEtherToFixedDecimals(6);
  };

  useEffect(() => {
    (async () => {
      if (address) {
        const standardAddr = standariseAddress(address);
        const userProps = {
          address: standardAddr,
          ethAmount: await getTokenBalance('ETH', address),
          usdcAmount: await getTokenBalance('USDC', address),
          strkAmount: await getTokenBalance('STRK', address),
        };
        mixpanel.track('wallet connect trigger', userProps);
        mixpanel.identify(standariseAddress(standardAddr));
        mixpanel.people.set(userProps);
      }
    })();
  }, [address]);

  // set address atom
  useEffect(() => {
    console.log('tncinfo address', address);
    setAddress(address);
  }, [address]);

  const hideTg = pathname.includes('slinks');

  return (
    <Container
      width={'100%'}
      padding={0}
      position={'sticky'}
      bg="mybg"
      zIndex={999}
      top="0"
    >
      {process.env.NEXT_PUBLIC_IGNORE_SIGNING != 'true' && <TncModal />}
      <Center bg="mycard" color="text_secondary" padding={0}>
        <Text
          fontSize="12px"
          textAlign={'center'}
          padding="6px 5px"
          color="white"
        >
          <span style={{ display: 'flex', gap: '2px' }}>
            Native USDC by Circle is now live on Starknet. The older version of
            USDC is now labeled USDC.e.
            <b
              style={{
                color: 'var(--chakra-colors-purple)',
                fontWeight: 'bold',
                marginLeft: '4px',
              }}
            >
              <a
                href="https://www.circle.com/blog/native-usdc-cctp-v2-are-coming-to-starknet-what-you-need-to-know"
                target="_blank"
                rel="noopener noreferrer"
              >
                [Read more]
              </a>
            </b>
          </span>
        </Text>
      </Center>
      <Box
        width={'100%'}
        maxWidth="1152px"
        margin={'0px auto'}
        padding={{ base: '20px 16px 10px', sm: '20px 10px 10px' }}
      >
        <Flex
          width={'100%'}
          gap={{ base: 1, sm: 2 }}
          justifyContent={'space-between'}
        >
          <Link
            href="/"
            margin={{ base: 'auto 20px auto 0', sm: 'auto 100px auto 0' }}
            textAlign={'left'}
          >
            <Image
              src={fulllogo.src}
              alt="logo"
              height={{ base: '35px', md: '35px' }}
            />
          </Link>

          <Flex gap={2}>
            {!hideTg && (
              <Link
                href={CONSTANTS.COMMUNITY_TG}
                textDecoration="none !important"
                isExternal
                display={'flex'}
                alignItems={'center'}
              >
                <IconButton
                  aria-label="tg"
                  variant={'ghost'}
                  borderColor={'color2'}
                  display={{ base: 'block', md: 'none' }}
                  icon={
                    <Avatar
                      size="sm"
                      bg="purple"
                      name="T G"
                      color="text_primary"
                      src={tg.src}
                      _hover={{
                        bg: 'purple_hover_2',
                      }}
                    />
                  }
                />
                <Button
                  color="purple"
                  bg={'mycard_light'}
                  variant="outline"
                  borderWidth={'0'}
                  fontSize="14px"
                  fontWeight="400"
                  leftIcon={
                    <Avatar
                      size="xs"
                      bg="highlight"
                      color="black"
                      name="T G"
                      src={tg.src}
                    />
                  }
                  _hover={{
                    bg: 'purple_hover_2',
                    color: 'black',
                  }}
                  display={{ base: 'none !important', md: 'flex !important' }}
                >
                  Telegram
                </Button>
              </Link>
            )}

            <ConnectButton />
          </Flex>
        </Flex>
      </Box>
    </Container>
  );
}
