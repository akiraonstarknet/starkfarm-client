import {
  useAccount,
  useConnect,
  useDisconnect,
  useStarkProfile,
} from '@starknet-react/core';
import { StarknetkitConnector, useStarknetkitConnectModal } from 'starknetkit';
import {
  Box,
  Button,
  Center,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react';
import { ChevronDownIcon, EmailIcon } from '@chakra-ui/icons';

import argentMobile from '@/assets/argentMobile.svg';

import { useIsMobile } from '@/hooks/use-mobile';
import {
  MyMenuItemProps,
  MyMenuListProps,
  shortAddress,
  truncate,
} from '@/utils';

const walletIconMap: Record<string, any> = {
  argentMobile,
  argentWebWallet: EmailIcon,
};

const getWalletIcon = (walletId: string) => {
  return walletIconMap[walletId];
};

const ConnectButton = () => {
  const { connectAsync, connectors } = useConnect();
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();

  const { data: starkProfile } = useStarkProfile({ address });

  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as StarknetkitConnector[],
    modalTheme: 'dark',
    modalMode: 'alwaysAsk',
    dappName: 'Troves',
  });

  const isMobile = useIsMobile();

  async function connectWallet() {
    if (isConnected) return;

    const { connector } = await starknetkitConnectModal();
    if (!connector) {
      // or throw error
      return;
    }
    await connectAsync({ connector });
  }

  return (
    <>
      <Box display={'flex'} alignItems={'center'}>
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={address ? <ChevronDownIcon /> : <></>}
            iconSpacing={{ base: '1px', sm: '5px' }}
            background="connect_button_gradient"
            color={'black'}
            borderRadius={'8px'}
            display={{ base: 'flex' }}
            height={{ base: '2rem', sm: '2.5rem' }}
            my={{ base: 'auto', sm: 'initial' }}
            paddingX={{ base: '0.75rem', sm: '1rem' }}
            fontSize={{ base: '0.8rem', sm: '0.8rem' }}
            fontWeight={'bold'}
            _hover={{
              background: 'purple_hover_2',
            }}
            _active={{
              bg: 'purple_hover_2',
            }}
            onClick={() => {
              connectWallet();
            }}
          >
            <Center>
              {isConnected ? (
                <Center display="flex" alignItems="center" gap=".5rem">
                  <Image
                    src={
                      starkProfile?.profilePicture ||
                      connector?.id === 'argentMobile'
                        ? getWalletIcon(connector?.id ?? '')?.src ||
                          connector?.icon.toString() ||
                          '/fallback-profile-icon.jpeg'
                        : '/fallback-profile-icon.jpeg'
                    }
                    alt="pfp"
                    width={{ base: '20px', sm: '22px' }}
                    height={{ base: '20px', sm: '22px' }}
                    rounded="full"
                    background={'mybg'}
                    padding={'3px'}
                  />{' '}
                  <Text as="h3" marginTop={'3px !important'}>
                    {starkProfile && starkProfile.name
                      ? truncate(starkProfile.name, 6, isMobile ? 0 : 6)
                      : shortAddress(address!, 4, isMobile ? 0 : 4)}
                  </Text>
                </Center>
              ) : (
                'Connect wallet'
              )}
            </Center>
          </MenuButton>
          <MenuList {...MyMenuListProps}>
            {isConnected && (
              <MenuItem {...MyMenuItemProps} onClick={() => disconnect()}>
                Disconnect
              </MenuItem>
            )}
          </MenuList>
        </Menu>
      </Box>
    </>
  );
};

export { ConnectButton };
