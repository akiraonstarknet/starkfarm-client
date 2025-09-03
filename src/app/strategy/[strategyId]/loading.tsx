import { Spinner, Flex } from '@chakra-ui/react';

export default function Loading() {
  return (
    <Flex
      height="100vh"
      width="100vw"
      justify="center"
      align="center"
      bg="black" // optional, so white spinner is visible
    >
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.700"
        color="white"
        size="xl"
      />
    </Flex>
  );
}
