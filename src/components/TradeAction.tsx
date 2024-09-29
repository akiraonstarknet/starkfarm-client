import { DUMMY_BAL_ATOM } from '@/store/balance.atoms';
import { StrategyInfo } from '@/store/strategies.atoms';
import { positionChangeAtom } from '@/store/trades.atoms';
import { StrategyTxProps } from '@/store/transactions.atom';
import { IStrategyActionHook } from '@/strategies/IStrategy';
import {
  TradeActionAdditionalData,
  TradeStrategy,
} from '@/strategies/trade.strat';
import { MyMenuItemProps, MyMenuListProps } from '@/utils';
import MyNumber from '@/utils/MyNumber';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Image as ImageC,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useAccount, useProvider } from '@starknet-react/core';
import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProviderInterface } from 'starknet';
import { BalanceComponent, MaxButton } from './Deposit';
import { MyNumberInput, MyNumberInputRef } from './MyNumberInput';
import TxButton from './TxButton';

export function Label(props: { text: string }) {
  return (
    <Text
      color="color2"
      fontSize={'13px'}
      fontWeight={'bold'}
      width={'100%'}
      marginBottom={'2px'}
    >
      {props.text}
    </Text>
  );
}

interface TradeActionProps<T> {
  strategy: StrategyInfo<TradeActionAdditionalData>;
  // ? If you want to add more button text, you can add here
  // ? @dev ensure below actionType is updated accordingly
  buttonText: 'Long' | 'Short';
  callsInfoProm: (
    amount: MyNumber,
    address: string,
    provider: ProviderInterface,
    additionalData: T,
  ) => Promise<IStrategyActionHook[]>;

  maxTradeAmount?: MyNumber;
  maxUserTradeAmount: MyNumber;
  minTradeAmount: MyNumber;
  minCollateralAmount: MyNumber;
  isLoading: boolean;
}

export default function TradeAction(
  props: TradeActionProps<TradeActionAdditionalData>,
) {
  const { address } = useAccount();
  const { provider } = useProvider();
  const [isMaxClicked, setIsMaxClicked] = useState(false);
  const [callsInfo, setCallsInfo] = useState<IStrategyActionHook[]>([]);
  const [sliderValue, setSliderValue] = useState(0);

  const {
    maxTradeAmount,
    maxUserTradeAmount,
    minTradeAmount,
    isLoading,
    minCollateralAmount,
  } = props;
  const [tradeAmount, setTradeAmountInStrat] = useAtom(
    getTradeStrategy().tradeAmountAtom,
  );
  const [leverage, setLeverage] = useAtom(getTradeStrategy().leverageAtom);

  const tradeAmountRef = useRef<MyNumberInputRef>(null); // Ref with a method signature

  const [selectedCollateralAtom, setSelectedCollateralAtom] = useAtom(
    getTradeStrategy().selectedCollateralAtom,
  );

  const depositMethodsFn = useCallback(async () => {
    console.log(
      'triggered getMinCollateral1 txCall',
      tradeAmount.toEtherStr(),
      minCollateralAmount.toEtherStr(),
    );
    try {
      const result = await props.callsInfoProm(
        minCollateralAmount,
        address || '0x0',
        provider,
        {
          tradeAmount,
        },
      );
      console.log('triggered getMinCollateral2 txCall', result);
      setCallsInfo(result);
    } catch (e) {
      console.error('triggered getMinCollateral3 txCall', e);
    }
  }, [tradeAmount, address, selectedCollateralAtom, minCollateralAmount]);

  const tvlInfo = useAtomValue(props.strategy.tvlAtom);

  const [positionChange, setPositionChange] = useAtom(positionChangeAtom);

  // This is used to store the raw amount entered by the user
  useEffect(() => {
    depositMethodsFn();
    setPositionChange({
      tradeAmount,
      collateral: minCollateralAmount,
      collateralToken: selectedCollateralAtom,
      actionType: 'add-trade',
    });
  }, [tradeAmount, selectedCollateralAtom, address, minCollateralAmount]);

  // use to maintain tx history and show toasts
  const txInfo: StrategyTxProps = useMemo(() => {
    return {
      strategyId: props.strategy.id,
      actionType: props.buttonText === 'Long' ? 'long' : 'short',
      amount: tradeAmount,
      tokenAddr: selectedCollateralAtom.token,
    };
  }, [tradeAmount, props]);

  // constructs tx calls
  const { calls } = useMemo(() => {
    const hook = callsInfo.find(
      (a) => a.tokenInfo.name === selectedCollateralAtom.name,
    );
    if (!hook) return { calls: [] };
    return { calls: hook.calls };
  }, [callsInfo, selectedCollateralAtom, tradeAmount, address, provider]);

  const balData = useAtomValue(
    callsInfo.find((a) => a.tokenInfo.name === selectedCollateralAtom.name)
      ?.balanceAtom || DUMMY_BAL_ATOM,
  );
  const balance = useMemo(() => {
    return balData.data?.amount || MyNumber.fromZero();
  }, [balData]);

  function getTradeStrategy() {
    return props.strategy as TradeStrategy;
  }

  const styleMarkStyle = {
    paddingTop: '10px',
    fontSize: '12px',
    color: 'light_grey',
    opacity: 0.75,
  };

  function getCurrentLeverage(_sliderValue: number) {
    const diff = ((getTradeStrategy().leverage - 1) * _sliderValue) / 100;
    return 1 + diff;
  }

  function getDynamicSliderValueCss(): any {
    if (sliderValue < 50) {
      return {
        left: `${sliderValue.toFixed(0)}%`,
        marginLeft: `-${((sliderValue * 12) / 50).toFixed(0)}px`,
        ...styleMarkStyle,
      };
    } else if (sliderValue == 50) {
      return {
        left: `auto !important`,
        width: '100%',
        textAlign: 'center',
        ...styleMarkStyle,
      };
    }
    return {
      right: `${(100 - sliderValue).toFixed(0)}%`,
      left: `auto !important`,
      marginRight: `-${(((100 - sliderValue) * 12) / 50).toFixed(0)}px`,
      ...styleMarkStyle,
    };
  }

  return (
    <Box width={'100%'} position={'relative'}>
      {(getTradeStrategy().netYield == 0 ||
        getTradeStrategy().leverage == 0 ||
        isLoading ||
        balData.isLoading) && (
        <Box
          width={'100%'}
          height={'100%'}
          position={'absolute'}
          zIndex={1000}
          bg="opacity_50p"
        >
          <Center height={'100%'}>
            <Spinner />
          </Center>
        </Box>
      )}
      <VStack spacing={4} width={'100%'} position={'relative'} padding={'10px'}>
        <Box
          width={'100%'}
          paddingX={'15px'}
          paddingY={'10px'}
          bg="color2_50p"
          borderRadius={'4px'}
        >
          <Label text="Collateral Market"></Label>
          <Grid
            templateColumns="repeat(5, 1fr)"
            gap={6}
            width={'100%'}
            mt="1.5"
          >
            <GridItem colSpan={2}>
              <Menu>
                <MenuButton
                  as={Button}
                  height={'100%'}
                  rightIcon={<ChevronDownIcon />}
                  bgColor={'highlight'}
                  borderColor={'bg'}
                  borderWidth={'1px'}
                  color="color2"
                  _hover={{
                    bg: 'bg',
                  }}
                >
                  <Center>
                    {/* <ImageC src={selectedMarket.logo.src} alt='' width={'20px'} marginRight='5px'/> */}
                    {balData.data && balData.data.tokenInfo
                      ? balData.data.tokenInfo.name
                      : '-'}
                  </Center>
                </MenuButton>
                <MenuList {...MyMenuListProps}>
                  {callsInfo.map((dep) => (
                    <MenuItem
                      key={dep.tokenInfo.name}
                      {...MyMenuItemProps}
                      onClick={() => {
                        if (selectedCollateralAtom.name != dep.tokenInfo.name) {
                          setSelectedCollateralAtom(dep.tokenInfo);
                          tradeAmountRef.current?.resetField();
                        }
                      }}
                    >
                      <Center>
                        <ImageC
                          src={dep.tokenInfo.logo.src}
                          alt=""
                          width={'20px'}
                          marginRight="5px"
                        />{' '}
                        {dep.tokenInfo.name}
                      </Center>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </GridItem>
            <GridItem colSpan={3}>
              <BalanceComponent
                token={selectedCollateralAtom}
                strategy={props.strategy}
                buttonText={props.buttonText}
                balData={balData}
              />
            </GridItem>
          </Grid>
        </Box>

        {/* Trade amount */}
        <Box width={'100%'}>
          <Flex width={'100%'} justifyContent={'space-between'}>
            <Label text={`Trade Amount`}></Label>
            <MaxButton
              onClick={() => {
                const amount = maxTradeAmount || MyNumber.fromZero();
                tradeAmountRef.current?.setValue(amount, true);
                setSliderValue(100);
                setTradeAmountInStrat(amount);
                setLeverage({ value: getCurrentLeverage(100), edited: true });
              }}
            ></MaxButton>
          </Flex>
          <MyNumberInput
            ref={tradeAmountRef}
            market={getTradeStrategy().mainToken}
            minAmount={minTradeAmount}
            maxAmount={maxUserTradeAmount}
            placeHolder={`Amount (${getTradeStrategy().mainToken.name})`}
            onChange={(valueAsString, valueAsNumber) => {
              console.log(
                'triggered getMinCollateral3',
                valueAsNumber,
                valueAsString,
              );
              setTradeAmountInStrat(
                MyNumber.fromEther(
                  valueAsString,
                  getTradeStrategy().mainToken.decimals,
                ),
              );
            }}
          />
        </Box>

        <Box width={'100%'} padding={'0px 0 10px'}>
          <Box justifyContent={'space-between'} display={'flex'} width={'100%'}>
            <Label text="Leverage"></Label>
            <MaxButton
              onClick={() => {
                setSliderValue(100);
                setLeverage({
                  value: getTradeStrategy().leverage,
                  edited: true,
                });
              }}
            ></MaxButton>
          </Box>
          <Slider
            aria-label="slider-ex-6"
            width={'100%'}
            defaultValue={0}
            onChange={(value) => {
              setSliderValue(value);
              setLeverage({ value: getCurrentLeverage(value), edited: true });
            }}
            value={sliderValue}
          >
            {sliderValue > 20 && (
              <SliderMark value={0} {...styleMarkStyle}>
                1.0x
              </SliderMark>
            )}
            <SliderMark
              value={sliderValue}
              {...getDynamicSliderValueCss()}
              fontWeight={'bold'}
              color={'purple'}
              opacity={1}
            >
              {leverage.value.toFixed(2)}x
            </SliderMark>
            {sliderValue <= 80 && (
              <SliderMark
                value={100}
                {...styleMarkStyle}
                left={'auto !important'}
                right={0}
              >
                {getTradeStrategy().leverage.toFixed(2)}x
              </SliderMark>
            )}
            <SliderTrack bg="bg">
              <SliderFilledTrack bg="rgb(113, 128, 150)" />
            </SliderTrack>
            <SliderThumb bg="color2" />
          </Slider>
        </Box>

        <Center width={'100%'}>
          <TxButton
            txInfo={txInfo}
            buttonText={props.buttonText}
            text={`${props.buttonText}: ${tradeAmount.toEtherToFixedDecimals(4)} ${selectedCollateralAtom.name}`}
            calls={calls}
            buttonProps={{
              isDisabled:
                tradeAmount.isZero() ||
                tradeAmount.compare(maxUserTradeAmount, 'gt'),
            }}
            selectedMarket={selectedCollateralAtom}
            strategy={props.strategy}
            resetDepositForm={tradeAmountRef.current?.resetField}
          />
        </Center>
      </VStack>
    </Box>
  );
}
