'use client';

import Navbar from "@/components/Navbar";
import EkuboAtoms from "@/store/ekobu.store";
import Ekubo from "@/store/ekobu.store";
import Jediswap from "@/store/jedi.store";
import { PoolInfo, StrkDexIncentivesAtom, filteredPools, sortPoolsAtom } from "@/store/pools";
import { Avatar, AvatarGroup, Box, Card, CardBody, CardHeader, Center, Container, Flex, HStack, Heading, Link, LinkBox, LinkOverlay, Skeleton, Stack, Text, Tooltip } from "@chakra-ui/react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import useSWR from 'swr'
import { Pagination, PaginationContainer, usePagination, PaginationNext, PaginationPrevious, PaginationPage, PaginationPageGroup } from '@ajna/pagination';
import CONSTANTS from "@/constants";
import Filters from "@/components/Filters";

export default function Home() {
  const _allPools = useAtomValue(filteredPools);
  const ITEMS_PER_PAGE = 15;
  const {
    currentPage,
    setCurrentPage,
    pagesCount,
    pages
  } = usePagination({
    pagesCount: Math.floor(_allPools.length / ITEMS_PER_PAGE),
    initialState: { currentPage: 1 },
  });

  const pools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return _allPools.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [_allPools, currentPage])

  const sortedPools = useAtomValue(sortPoolsAtom)

  useEffect(() => {
    console.log('sortedPools', sortedPools)
  }, [sortedPools])
  useEffect(() => {
    console.log('pages', currentPage,
    setCurrentPage,
    pagesCount,
    pages)
  }, [currentPage,
    setCurrentPage,
    pagesCount,
    pages])

  function getAPRWithToolTip(pool: PoolInfo) {
    const tip = <Box width={'300px'}>
      {pool.aprSplits.map(split => {
        if (split.apr == 0) {
          return <Text key={split.title}>{split.title}: {split.description}</Text>
        }
        return <Flex width={'100%'} key={split.title}>
            <Text key='1' width={'70%'}>{split.title}:</Text>
            <Text width={'30%'} textAlign={'right'}  key='2'>{(split.apr * 100).toFixed(2)}%</Text>
          </Flex>
      })}
    </Box>
    return <Tooltip hasArrow label={''} bg="gray.300" color="black">
      <Center width={{base: 'auto', md: '50%'}}
        marginRight={'0px'}
        marginLeft={{base: 'auto', md: '0px'}}
        display={'flex'}
      >
        <Avatar size='xs' bg={'black'} src={CONSTANTS.LOGOS.STRK} marginRight={'2px'} alignContent={'right'}/>
        <Text  textAlign={{base: 'right', md: 'center'}} color='cyan' fontSize={'20px'}><b>{(pool.apr * 100).toFixed(2)}%</b></Text>
      </Center>
    </Tooltip>
}

  return (
    <Container maxWidth={'800px'} margin={'0 auto'} padding="0px">
        <Text color='cyan' textAlign={'center'} fontSize={'18px'} marginBottom={'20px'}>
          Identify the best $STRK rewarding pools and maximize your rewards</Text>
        <Filters/>
        {pools.length > ITEMS_PER_PAGE && <Container width={'100%'} float={'left'} padding='0px'>
          <Pagination
            pagesCount={pagesCount}
            currentPage={currentPage}
            isDisabled={false}
            onPageChange={(page) => {
              setCurrentPage(page)
            }}
          >
            <PaginationContainer
              align="right"
              float={'right'}
              p={4}
            >
              <PaginationPrevious marginRight='4px' bg='highlight'
                  color='cyan'>
                <Text>{"<"}</Text>
              </PaginationPrevious>
              <PaginationPageGroup>
              {pages.map((page: number) => (
                <PaginationPage 
                  key={`pagination_page_${page}`} 
                  page={page} 
                  padding={'2px 10px'}
                  isDisabled={page == currentPage}
                  bg='highlight'
                  color='cyan'
                />
              ))}
            </PaginationPageGroup>
              <PaginationNext marginLeft='4px' bg='highlight'
                  color='cyan'>
                <Text>{">"}</Text>
              </PaginationNext>
            </PaginationContainer>
          </Pagination>
        </Container>}
        <Container width='100%' float={'left'} padding={'0px'} marginTop={'10px'}>
          <Card variant={'filled'} bg='opacity_50p' color={'purple'}>
            <CardBody paddingTop={'5px'} paddingBottom={'5px'}>
              <HStack width={'100%'}>
                  <Heading width={{base: '50%', md: '33%'}} size='md'>Pool</Heading>
                  <Stack direction={{base: 'column', md: 'row'}} width={{base: '50%', md: '66%'}}>
                    <Heading width={{base: '100%', md: '50%'}} size='md' textAlign={{base: 'right', md: 'center'}}>STRK APY (%)</Heading>
                    <Heading width={{base: '100%', md: '50%'}} size='sm' textAlign={'right'}>TVL ($)</Heading>
                  </Stack>
              </HStack>
            </CardBody>
          </Card>
          {pools.length > 0 && <Stack spacing='4'>
            {pools.map((pool, index) => (
                <Card key={`${pool.pool.name}_${pool.protocol.name}`} variant={'filled'} bg={index % 2 == 0 ? 'color1_50p': 'color2_50p'} color='white'>
                  <Link href={pool.protocol.link} width={'100%'} borderWidth={'0px'} target="_blank">
                    <CardBody>
                      <HStack width={'100%'}>
                          <Box width={{base: '50%', md: '33%'}}>
                            <Flex>
                              <AvatarGroup size='xs' max={2} marginRight={'5px'}>
                                {pool.pool.logos.map(logo => <Avatar key={logo} src={logo} />)}
                              </AvatarGroup>
                              <Box>
                                <Heading size='md'>
                                  {pool.pool.name}
                                </Heading>
                                <Heading size='xs'> 
                                  <Avatar size='2xs' bg={'black'} name='Dan Abrahmov' src={pool.protocol.logo} marginRight={'2px'} />
                                  {pool.protocol.name}
                                </Heading>
                              </Box>
                            </Flex>
                          </Box>
                          <Stack direction={{base: 'column', md: 'row'}} width={{base: '50%', md: '66%'}}>
                            {getAPRWithToolTip(pool)}
                            <Text width={{base: '100%', md: '50%'}} textAlign={'right'}>${Math.round(pool.tvl).toLocaleString()}</Text>
                          </Stack>
                      </HStack>
                    </CardBody>
                </Link>
              </Card>
            ))}
          </Stack>}
          {pools.length == 0 && <Stack>
            <Skeleton height='70px' />
            <Skeleton height='70px' />
            <Skeleton height='70px' />
          </Stack>}
        </Container>
        <Box padding="10px 0" width={'100%'} float={'left'}>
          <Text color='light_grey' textAlign={'center'}>More features coming soon!</Text>
        </Box>
    </Container>
  );
}
