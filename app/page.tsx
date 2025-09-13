'use client';

import { Button, Divider, Flex, Grid, FileTrigger, Link, Heading, Text, View } from '@adobe/react-spectrum';
import { useState } from 'react';
import Results from '@/app/(results)/results';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  return (
    // <Flex direction="column" gap="size-200" alignItems="center" justifyContent="center" height="100vh">
      <View margin='auto' width='90vw'>
        <Grid columns={['1fr']} gap='size-200' justifyItems={'center'}>
        <Heading level={1}>Canvas Course QA Tool</Heading>
        <Text>Upload an IMSCC 1.1 archive to perform quality checks.</Text>
        <Text>To try this out, download a sample imscc. Here is an example from Canvas Commons: <Link href='https://drive.google.com/file/d/1gkWnmA4RdjFOP1_xBSibah0mQjxEA_Qs/view?usp=sharing'>Growing with Canvas
   by Education Services</Link> (<Link href='https://lor.instructure.com/resources/149d663e5b6a4fd0940b5fbd8fc45e56?shared'>see on Canvas Commons</Link>)</Text>
        <Flex gap='size-100'>
          <FileTrigger
            onSelect={(e) => {
              const files = Array.from(e!);
              setFile(files[0]);
              setIsAnalyzing(false);
            }}
            acceptedFileTypes={['.imscc', '.zip']}
          >
            <Button variant='accent'>Pick IMSCC File</Button>
          </FileTrigger>
          <Button variant='accent' isDisabled={file === null} onPress={() => setIsAnalyzing(true)}>Run QA Checks</Button>

        </Flex><Divider />
          <Results selectedFile={file} isAnalyzing={isAnalyzing} setIsAnalyzing={(status: boolean) => setIsAnalyzing(status)} />
      </Grid>
      </View>
  );
}
