'use client';

import { Button, Divider, FileTrigger, Flex, Heading, Text, View } from '@adobe/react-spectrum';
import { useState } from 'react';
import Results from '@/app/(results)/results';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  return (
    // <Flex direction="column" gap="size-200" alignItems="center" justifyContent="center" height="100vh">
      <View>
      <Heading level={1}>Canvas Course QA Tool</Heading>
      <Text>Upload an IMSCC 1.1 archive to perform quality checks.</Text>
      <FileTrigger
        onSelect={(e) => {
          const files = Array.from(e!);
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

    </View>
  );
}
