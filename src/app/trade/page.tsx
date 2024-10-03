import { Box, Text } from '@chakra-ui/react';
import { NextPage } from 'next';
import AccordionWrapper from './_components/AccordionWrapper';

const TradePage: NextPage = () => {
  return (
    <div>
      <Box padding={'15px 30px'} borderRadius="10px" margin={'20px 0px 10px'}>
        <Text
          fontSize={{ base: '28px', md: '35px' }}
          lineHeight={'30px'}
          marginBottom={'10px'}
          textAlign={'center'}
        >
          <b className="theme-gradient-text">Leveraged Long/Short</b>
        </Text>
        <Text
          color="color2"
          textAlign={'center'}
          fontSize={{ base: '16px', md: '18px' }}
          mt={'20px'}
        >
          Say goodbye to overwhelming chart experience effortless trading <br />{' '}
          with a simple, user-friendly design
        </Text>
      </Box>

      <Box
        bg="#1A1A27"
        minHeight="calc(100vh - 264px)"
        height="full"
        width="full"
        py="10px"
        px="22px"
      >
        <Box maxW="1400px" marginX={'auto'}>
          <Box
            display={'flex'}
            alignItems="center"
            justifyContent={'start'}
            gap={'4'}
          >
            <Box
              bg="color1_50p"
              pl="12px"
              py="12px"
              pr={{ base: '12px', sm: '50px' }}
              borderRadius={'4px'}
            >
              <Text color={'light_grey'} fontSize={'14px'} fontWeight={'700'}>
                P&L
              </Text>
              <Text fontSize="22px" color="white" fontWeight={'bold'}>
                $12,000.00
              </Text>
            </Box>
            <Box
              bg="#111119"
              pl="12px"
              py="12px"
              pr={{ base: '12px', sm: '50px' }}
              borderRadius={'4px'}
            >
              <Text color={'light_grey'} fontSize={'14px'} fontWeight={'700'}>
                Net collateral
              </Text>
              <Text fontSize="22px" color="white" fontWeight={'bold'}>
                $12,000.00
              </Text>
            </Box>
          </Box>

          <AccordionWrapper />
        </Box>
      </Box>
    </div>
  );
};

export default TradePage;
