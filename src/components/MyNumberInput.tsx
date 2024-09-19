import { TokenInfo } from '@/strategies/IStrategy';
import MyNumber from '@/utils/MyNumber';
import {
  Box,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
} from '@chakra-ui/react';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';

interface MyNumberInputProps {
  market: TokenInfo;
  maxAmount: MyNumber;
  minAmount?: MyNumber;
  onChange?: (valueAsString: string, valueAsNumber: number) => void;
  placeHolder?: string;
}

export interface MyNumberInputRef {
  getValue: () => { amount: MyNumber; isMax: boolean };
  resetField: () => void;
  setValue: (value: MyNumber, isMax: boolean) => void;
}

const MyNumberInput = forwardRef<MyNumberInputRef, MyNumberInputProps>(
  (props, ref) => {
    const [amount, setAmount] = useState(
      new MyNumber('0', props.market.decimals),
    );
    const [rawAmount, setRawAmount] = useState('');
    const [dirty, setDirty] = useState(false);
    const [isMax, setIsMax] = useState(false);
    const minAmount = useMemo(() => {
      if (props.minAmount) {
        return props.minAmount;
      }
      return new MyNumber('0', props.market.decimals);
    }, [props.minAmount, props.market.decimals]);

    useImperativeHandle(ref, () => ({
      getValue: () => ({
        amount,
        isMax,
      }),
      resetField: () => {
        setAmount(MyNumber.fromEther('0', props.market.decimals));
        setRawAmount('');
        setDirty(false);
        setIsMax(false);
      },
      setValue: (value: MyNumber, isMax: boolean) => {
        setAmount(value);
        setIsMax(isMax);
        setRawAmount(value.toEtherStr());
        setDirty(false);
      },
    }));

    return (
      <Box width={'100%'}>
        <NumberInput
          min={Number(minAmount.toEtherStr())}
          color={'white'}
          bg={'bg'}
          borderRadius={'10px'}
          onChange={(value, valueAsNumber) => {
            setIsMax(false);
            if (value && Number(value) > 0)
              setAmount(MyNumber.fromEther(value, props.market.decimals));
            else {
              setAmount(new MyNumber('0', props.market.decimals));
            }
            //   setIsMaxClicked(false);
            setRawAmount(value);
            setDirty(true);
            if (props.onChange) {
              props.onChange(value, valueAsNumber);
            }
          }}
          keepWithinRange={false}
          clampValueOnBlur={false}
          value={rawAmount}
          isDisabled={props.maxAmount.isZero()}
        >
          <NumberInputField
            border={'0px'}
            borderRadius={'10px'}
            placeholder={props.placeHolder}
          />
          <NumberInputStepper>
            <NumberIncrementStepper color={'white'} border={'0px'} />
            <NumberDecrementStepper color={'white'} border={'0px'} />
          </NumberInputStepper>
        </NumberInput>

        {amount.compare(props.maxAmount, 'gt') && (
          <Text
            marginTop="2px"
            marginLeft={'7px'}
            color="red"
            fontSize={'13px'}
          >
            Amount to be less than {props.maxAmount.toEtherToFixedDecimals(18)}
          </Text>
        )}
        {rawAmount != '' && amount.compare(minAmount, 'lt') && (
          <Text
            marginTop="2px"
            marginLeft={'7px'}
            color="red"
            fontSize={'13px'}
          >
            Amount to be {'>'} {minAmount.toEtherToFixedDecimals(18)}
          </Text>
        )}
      </Box>
    );
  },
);

MyNumberInput.displayName = 'MyNumberInput';

export default MyNumberInput;
