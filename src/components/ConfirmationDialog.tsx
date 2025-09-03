import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Text,
  Box,
  useDisclosure,
  Button,
  List,
  ListItem,
} from '@chakra-ui/react';
import React, { forwardRef, useImperativeHandle } from 'react';

export interface ConfirmationDialogProps {
  content: React.ReactNode | string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog = forwardRef(function ConfirmationDialog(
  props: ConfirmationDialogProps,
  ref,
) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleTrigger = () => {
    onOpen();
  };

  // Expose this function to parent via ref
  useImperativeHandle(ref, () => ({
    handleTrigger: () => handleTrigger(),
  }));

  return (
    <Modal onClose={onClose} isOpen={isOpen} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius=".5rem" maxW="32rem">
        <ModalCloseButton color="white" />
        <ModalBody
          backgroundColor={'var(--chakra-colors-purple)'}
          py="2rem"
          borderRadius=".5rem"
          color="white"
          display="flex"
          flexDirection="column"
          gap="1rem"
        >
          <Text textAlign="left" fontSize="1.5rem" fontWeight="bold">
            Please confirm your action.
          </Text>
          {Array.isArray(props.content) ? (
            <List>
              {props.content.map((content, index) => (
                <ListItem key={index} fontSize={'1rem'} marginBottom={'5px'}>
                  {index + 1}. {content}
                </ListItem>
              ))}
            </List>
          ) : (
            <Text fontSize="1rem" fontWeight="bold">
              {props.content}
            </Text>
          )}
          <Box width={'100%'} display={'flex'} justifyContent={'end'}>
            <Button
              onClick={() => {
                props.onConfirm();
                onClose();
              }}
              style={{ marginRight: '1rem' }}
            >
              Confirm
            </Button>
            <Button
              float={'right'}
              variant={'invisible'}
              onClick={() => {
                props.onCancel();
                onClose();
              }}
            >
              Cancel
            </Button>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});

export default ConfirmationDialog;
