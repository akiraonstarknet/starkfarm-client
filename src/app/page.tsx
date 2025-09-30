'use client';

import Strategies from '@/components/Strategies';
import TVL from '@/components/TVL';
import { useIsMobile } from '@/hooks/use-mobile';
import { StrategyTag } from '@/strategies/IStrategy';
import { useWindowSize } from '@/utils/useWindowSize';

import {
  Box,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TabIndicator,
  Text,
  Image as ChakraImage,
  Flex,
} from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';
import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import mixpanel from 'mixpanel-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';

const banner_images: any[] = [
  // {
  //   desktop: '/banners/strkfarm_braavos.svg',
  //   mobile: '/banners/strkfarm_braavos_mobile.svg',
  //   link: 'https://starknet.quest/quest/235',
  // },
  // {
  //   desktop: '/banners/endur.svg',
  //   mobile: '/banners/endur_mobile.svg',
  //   link: 'https://endur.fi/r/troves',
  // },
  // {
  //   desktop: '/banners/troves_starktember.svg',
  //   mobile: '/banners/troves_starktember_mobile.svg',
  //   link: 'https://x.com/trovesfi',
  // },
];

const BTCTokenAddr =
  'https://static-assets-8zct.onrender.com/integrations/tokens/btc.svg';

const TABs: {
  name: string | ReactNode;
  tags?: StrategyTag[];
  id: string;
  question: string;
  answer: string;
}[] = [
  {
    name: '✨ All Strategies',
    id: 'all',
    question: 'What are strategies?',
    answer:
      'Strategies are structured investment plans that combine multiple liquidity pools or protocols to optimize returns. They automate the process of maximizing yield by intelligently allocating assets across opportunities.',
  },
  {
    name: (
      <Flex gap={2}>
        <ChakraImage src={BTCTokenAddr} width={'20px'} height={'20px'} />
        <span> BTC Strategies</span>
      </Flex>
    ),
    id: 'btc',
    question: 'What are BTC strategies?',
    answer:
      'BTC strategies are strategies that are structured investment plans that combine multiple liquidity pools or protocols to optimize returns linked to BTC tokens. They automate the process of maximizing yield by intelligently allocating assets across opportunities.',
    tags: [StrategyTag.BTC],
  },
  {
    name: '🌱 Evergreen Strategies',
    tags: [StrategyTag.EVERGREEN],
    id: 'evergreen',
    question: 'What are Evergreen strategies?',
    answer:
      'Evergreen strategies are strategies that are always active and automatically switch between different strategies to maximize returns. Some strategies die over time, but evergreen strategies are always remain active by switching to different strategies.',
  },
  {
    name: 'Managed Ekubo Strategies',
    tags: [StrategyTag.EKUBO],
    id: 'ekubo',
    question: 'What are managed Ekubo strategies?',
    answer:
      'Ekubo is a highly efficient concentrated liquidity (CL) AMM on Starknet. Managing Ekubo pools is a advanced task that requires a lot of knowledge about the protocol and the market. These strategies curated by Re7 Labs and Troves team help you LP in Ekubo without having to manage the pool yourself.',
  },
  {
    name: 'Endur Strategies',
    tags: [StrategyTag.Endur],
    id: 'endur',
    question: 'What are Endur (LST) strategies?',
    answer:
      'Endur is a liquid staking protocol on Starknet supporting multiple LSTs on STRK and BTC. This allows to build multiple strategies around LSTs like managed LPing on Ekubo, leveraged liquid staking, and more.',
  },
];

export default function Home() {
  const [tabIndex, setTabIndex] = useState(1);

  const { address } = useAccount();
  const searchParams = useSearchParams();
  const size = useWindowSize();
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
    },
    [Autoplay({ playOnInit: true, delay: 8000 })],
  );

  function setRoute(value: string) {
    router.push(`?tab=${value}`);
  }

  function handleTabsChange(index: number) {
    setRoute(TABs[index].id);
  }

  useEffect(() => {
    mixpanel.track('Page open');
  }, []);

  const isMobile = useIsMobile();

  useEffect(() => {
    (async () => {
      const tab = searchParams.get('tab');
      const tabIndex = TABs.findIndex((_tab) => _tab.id === tab);
      if (isMobile) {
        setTabIndex(0);
      } else if (tabIndex !== -1) {
        setTabIndex(tabIndex);
      }
    })();
  }, [searchParams, isMobile]);

  const ScreenBasedTabs = useMemo(() => {
    return TABs.filter((tab) => {
      if (isMobile) {
        return tab.id === 'all';
      }
      return true;
    });
  }, [isMobile]);

  return (
    <Container
      maxWidth={'1152px'}
      margin={'0 auto'}
      padding={{ base: '15px 10px' }}
    >
      <Box
        padding={{ base: '0px 15px 15px' }}
        borderRadius="10px"
        margin={{ base: '0', md: '20px 0px 10px' }}
      >
        <Text
          // color={'banner_text_gradient'}
          fontSize={{ base: '25px', md: '35px' }}
          lineHeight={{ base: '30px', md: '30px' }}
          marginBottom={'10px'}
          textAlign={'center'}
        >
          <b className="theme-gradient-text">
            Starknet&apos;s Yield Powerhouse
          </b>
          🚀
        </Text>
        <Text
          color="text_secondary"
          textAlign={'center'}
          fontSize={{ base: '15px', md: '18px' }}
          lineHeight={{ base: '20px', md: '20px' }}
          margin={{ base: '0 auto', md: '0' }}
          maxWidth={{ base: '80%', md: '100%' }}
        >
          Discover and invest in custom-built yield strategies.
        </Text>
      </Box>

      {/*<Box className="embla" ref={emblaRef} margin={0} width={'100%'}>
        <Box className="embla__container" cursor={'pointer'}>
          {banner_images.map((banner, index) => (
            <Box
              className="embla__slide"
              position="relative"
              height={'auto'}
              key={index}
              padding={'0px 0 20px'}
            >
              <Link href={banner.link} isExternal>
                <ChakraImage
                  border={'1px solid #ffffff1a'}
                  src={
                    (!isMobile && size.width > 450) || size.width == 0
                      ? banner.desktop
                      : banner.mobile
                  }
                  height={'auto'}
                  boxShadow={'none'}
                  width="100%"
                  alt="Banner"
                  style={{ objectFit: 'cover', borderRadius: '10px' }}
                />
              </Link>
            </Box>
          ))}
        </Box>
      </Box>*/}

      <TVL />

      <Tabs
        position="relative"
        variant="unstyled"
        width={'100%'}
        index={tabIndex}
        onChange={handleTabsChange}
        marginTop={'10px'}
        padding={0}
      >
        <TabList borderBottom={'2px solid var(--chakra-colors-mycard)'}>
          {ScreenBasedTabs.map((tab, index) => (
            <Tab
              color={'text_secondary'}
              _selected={{ color: 'purple', fontWeight: 'bold' }}
              onClick={() => {
                mixpanel.track('Strategies opened', {
                  tab: tab.id,
                });
              }}
              key={index}
            >
              {tab.name}
            </Tab>
          ))}
        </TabList>
        <TabIndicator
          mt="-1.5px"
          height="3px"
          bg="purple"
          color="color1"
          borderRadius="1px"
          boxShadow={'0px 0px 8px 0px var(--chakra-colors-purple)'}
        />
        <TabPanels>
          {ScreenBasedTabs.map((tab, index) => (
            <TabPanel
              key={index}
              bg="color_3"
              float={'left'}
              width={'100%'}
              // borderWidth={'1px'}
              borderColor={'color_3'}
              borderRadius={'8px'}
              padding={'1rem 0'}
            >
              <Strategies
                tags={tab.tags}
                question={tab.question}
                answer={tab.answer}
              />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
      {/* <hr style={{width: '100%', borderColor: '#5f5f5f', float: 'left', margin: '20px 0'}}/> */}
      {/* <Center padding="10px 0" width={'100%'} float={'left'}>
        <Link href={CONSTANTS.COMMUNITY_TG} isExternal>
          <ChakraImage
            src={tg.src}
            width={{ base: '10', md: '20' }}
            margin="0 auto"
          />
        </Link>
      </Center>
      <Center width={'100%'} float="left">
        <Box
          width="300px"
          maxWidth={'100%'}
          marginTop={'20px'}
          borderTop={'1px solid var(--chakra-colors-highlight)'}
          textAlign={'center'}
          textColor={'purple'}
          padding="10px 0"
          fontSize={'13px'}
        >
          Made with ❤️ on Starknet
        </Box>
      </Center> */}
    </Container>
  );
}
