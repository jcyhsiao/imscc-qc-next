'use client';

import { Button, Divider, FileTrigger, Flex, Heading, Text } from '@adobe/react-spectrum';
import { useState } from 'react';
import Results from '@/app/(results)/results';

export default function Home() {
  let [file, setFile] = useState<File | null>(null);
  let [isAnalyzing, setIsAnalyzing] = useState(false);

  return (
    <Flex direction="column" gap="size-200" alignItems="center" justifyContent="center" height="100vh">
      <Heading level={1}>Canvas Course QA Tool</Heading>
      <Text>Upload an IMSCC 1.1 archive to perform quality checks.</Text>
      <FileTrigger
        onSelect={(e) => {
          let files = Array.from(e!);
          setFile(files[0]);
          setIsAnalyzing(false);
        }}
        acceptedFileTypes={['.imscc']}
      >
        <Button variant='accent'>Pick IMSCC File</Button>
      </FileTrigger>
      <Button variant='accent' isDisabled={file === null} onPress={() => setIsAnalyzing(true)}>Run QA Checks</Button>
      <Divider />
      <Results selectedFile={file} isAnalyzing={isAnalyzing} setIsAnalyzing={(status: boolean) => setIsAnalyzing(status)} />

    </Flex>
  );
}
