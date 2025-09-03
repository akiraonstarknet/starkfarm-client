import { useIsMobile } from '@/hooks/use-mobile';
import { referralCodeAtom } from '@/store/referral.store';
import { StrategyTxProps, monitorNewTxAtom } from '@/store/transactions.atom';
import {
  TrovesBaseAPYsAtom,
  TrovesStrategyAPIResult,
} from '@/store/troves.atoms';
import { IStrategyProps, TokenInfo } from '@/strategies/IStrategy';
import { getReferralUrl } from '@/utils';
import {
  Box,
  Button,
  ButtonProps,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useAccount, useSendTransaction } from '@starknet-react/core';
import { useAtomValue, useSetAtom } from 'jotai';
import mixpanel from 'mixpanel-browser';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TwitterShareButton } from 'react-share';
import { Call } from 'starknet';
import ConfirmationDialog from './ConfirmationDialog';
import MyNumber from '@/utils/MyNumber';

interface TxButtonProps {
  txInfo: StrategyTxProps;
  buttonText?: 'Deposit' | 'Redeem';
  text: string;
  calls: Call[];
  buttonProps: ButtonProps;
  justDisableIfNoWalletConnect?: boolean;
  selectedMarket?: TokenInfo;
  strategy?: IStrategyProps<any>;
  resetDepositForm: () => void;
  onClickConfirmationPopup?: (
    amount: MyNumber,
  ) => Promise<React.ReactNode | string[]>;
}

export default function TxButton(props: TxButtonProps) {
  const { address } = useAccount();
  const monitorNewTx = useSetAtom(monitorNewTxAtom);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const referralCode = useAtomValue(referralCodeAtom);

  const isMobile = useIsMobile();

  const disabledStyle = {
    bg: 'mycard_light',
    color: 'disabled_text',
  };

  const {
    sendAsync: writeAsync,
    data,
    status,
    isSuccess,
    isPending,
    error,
    isError,
  } = useSendTransaction({
    calls: props.calls,
  });

  useEffect(() => {
    if (data && data.transaction_hash) {
      props.resetDepositForm();
      // initiates a toast and adds the tx to tx history if successful
      monitorNewTx({
        txHash: data.transaction_hash,
        info: props.txInfo,
        status: 'pending', // 'success' | 'failed'
        createdAt: new Date(),
      });
    }

    if (isSuccess && data && data.transaction_hash) {
      mixpanel.track('Transaction success', {
        strategyId: props.txInfo.strategyId,
        actionType: props.txInfo.actionType,
        amount: Number.isNaN(props.txInfo.amount.toString())
          ? 0
          : props.txInfo.amount.toEtherToFixedDecimals(6),
        tokenAddr: props.txInfo.tokenAddr,
        status: 'success',
        createdAt: new Date(),
      });
    }

    if (isError && error) {
      mixpanel.track('Transaction failed', {
        strategyId: props.txInfo.strategyId,
        actionType: props.txInfo.actionType,
        amount: Number.isNaN(props.txInfo.amount.toString())
          ? 0
          : props.txInfo.amount.toEtherToFixedDecimals(6),
        tokenAddr: props.txInfo.tokenAddr,
        status: 'failed',
        createdAt: new Date(),
      });
    }
  }, [status, data]);

  const disabledText = useMemo(() => {
    if (props.strategy?.settings.isPaused) {
      return 'Paused';
    }
    if (props.justDisableIfNoWalletConnect) {
      if (!address) return props.text;
      return '';
    }
    if (!address) return 'Connect wallet to continue';
    return '';
  }, [isMobile, address, props]);

  const strategiesInfo = useAtomValue(TrovesBaseAPYsAtom);
  const strategyCached = useMemo(() => {
    if (!strategiesInfo || !strategiesInfo.data) return null;
    const strategiesList: TrovesStrategyAPIResult[] =
      strategiesInfo.data.strategies;
    return strategiesList.find((s: any) => s.id === props.strategy?.id);
  }, [strategiesInfo, props.strategy?.id]);

  // Type the ref to match ConfirmationDialog's handleTrigger method
  type ConfirmationDialogRef = { handleTrigger: () => void };
  const buttonRef = useRef<ConfirmationDialogRef>(null);
  const loading = (
    <Box textAlign={'left'} fontSize={'1rem'}>
      Loading...
    </Box>
  );
  const [popupContent, setPopupContent] = useState<React.ReactNode | string[]>(
    loading,
  );

  async function preHandleButton() {
    if (props.onClickConfirmationPopup && buttonRef.current) {
      buttonRef.current.handleTrigger();
      try {
        const res = await props.onClickConfirmationPopup(props.txInfo.amount);
        setPopupContent(res);
      } catch (error) {
        setPopupContent(
          <Box>Something went wrong. Please try again later.</Box>,
        );
      }
    } else {
      handleButton();
    }
  }

  async function handleButton() {
    setPopupContent(loading);
    writeAsync().then((tx) => {
      if (props.buttonText === 'Deposit') onOpen();
      mixpanel.track('Submitted tx', {
        strategyId: props.txInfo.strategyId,
        txHash: tx.transaction_hash,
        text: props.text,
        address,
        buttonText: props.buttonText,
      });
    });
  }

  if (disabledText) {
    return (
      <Button
        fontSize={'14px'}
        fontWeight={'700'}
        _disabled={{
          ...disabledStyle,
        }}
        _hover={{
          ...disabledStyle,
        }}
        _active={{
          ...disabledStyle,
        }}
        isDisabled={true}
        width={'100%'}
        {...props.buttonProps}
      >
        {disabledText}
      </Button>
    );
  }

  return (
    <>
      <Modal onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius=".5rem" maxW="32rem">
          <ModalCloseButton color="white" />
          <ModalBody
            backgroundColor={'var(--chakra-colors-purple)'}
            pt="4rem"
            pb="3rem"
            borderRadius=".5rem"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            gap="1rem"
          >
            <Text textAlign="center" fontSize="1.5rem" fontWeight="bold">
              Thank you for your deposit!
            </Text>

            <Text textAlign="center" fontWeight="500">
              While your deposit is being processed, if you like Troves, do you
              mind sharing on X/Twitter?
            </Text>

            <Box
              bg="white"
              borderRadius=".5rem"
              px="1rem"
              py=".5rem"
              color="black"
              _hover={{
                opacity: 0.9,
              }}
              fontWeight="bold"
            >
              <TwitterShareButton
                url={`${getReferralUrl(referralCode)}`}
                title={`🚀I just invested my ${props.selectedMarket?.name ?? ''} in the  "${props.strategy?.name ?? ''}" strategy at @trovesfi, earning an impressive ${((props.strategy?.netYield || strategyCached?.apy || 0) * 100).toFixed(2)}% yield! 💸. \n\nWant in? Join me and start earning: `}
                related={['troves']}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.6rem',
                }}
              >
                Share on
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  version="1.1"
                  id="Layer_1"
                  width="15px"
                  height="15px"
                  viewBox="0 0 24 24"
                  xmlSpace="preserve"
                >
                  <path
                    fill="#7E49E5"
                    d="M14.095479,10.316482L22.286354,1h-1.940718l-7.115352,8.087682L7.551414,1H1l8.589488,12.231093L1,23h1.940717  l7.509372-8.542861L16.448587,23H23L14.095479,10.316482z M11.436522,13.338465l-0.871624-1.218704l-6.924311-9.68815h2.981339  l5.58978,7.82155l0.867949,1.218704l7.26506,10.166271h-2.981339L11.436522,13.338465z"
                  />
                </svg>{' '}
              </TwitterShareButton>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      <ConfirmationDialog
        content={popupContent}
        ref={buttonRef}
        onConfirm={handleButton}
        onCancel={() => {
          setPopupContent(loading);
        }}
      />
      <Box width={'100%'} textAlign={'center'}>
        <Button
          color={'black'}
          bg="purple"
          variant={'ghost'}
          width={'100%'}
          _active={{
            bg: 'var(--chakra-colors-bright_purple)',
          }}
          _hover={{
            bg: 'var(--chakra-colors-bright_purple)',
          }}
          _disabled={{
            bg: 'disabled_button',
            color: 'disabled_button_text',
          }}
          onClick={async () => {
            mixpanel.track('Click strategy button', {
              strategyId: props.txInfo.strategyId,
              buttonText: props.text,
              address,
            });

            preHandleButton();
          }}
          {...props.buttonProps}
        >
          {isPending && <Spinner size={'sm'} marginRight={'5px'} />}{' '}
          {props.text}
        </Button>
      </Box>
    </>
  );
}
