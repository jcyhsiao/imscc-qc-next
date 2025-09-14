import { Heading, ProgressCircle, Text, Item, TabList, TabPanels, Tabs } from '@adobe/react-spectrum';
import { useEffect, useState } from 'react';
import Alert from '@spectrum-icons/workflow/Alert';

import { extractIMSCC, retire_analyzeIMSCCForObjects, retire_analyzeIMSCCRichContentForAccessibility, inventoryIMSCCModules, inventoryIMSCCManifest, reconcileIMSCCModulesAndResources, identifyObjectsInIMSCCResources, checkIMSCCResourcesForAccessibility } from '@/app/lib/imscc-handling';
import { Resource, Module } from '@/app/lib/definitions';
import { VideoObject, FileObject, LinkObject } from '@/app/lib/definitions';
import { EnhancedAxeResults } from '@/app/lib/definitions';

import CourseStructureTab from '@/app/(results)/course-structure';
import CourseResourcesTab from '@/app/(results)/course-resources';
import CourseLinksTab from './course-links';
import AccessibilityCheckTab from './accessibility-check';

type Props = {
    selectedFile?: File | null;
    isAnalyzing: boolean;
    setIsAnalyzing: (value: boolean) => void;
}

export default function Results({ selectedFile, isAnalyzing, setIsAnalyzing }: Props) {
    const [isAnalysisErrored, setIsAnalysisErrored] = useState(false);
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
    const [, setParser] = useState<DOMParser | null>(null);

    const [, setAllFileContents] = useState<{ [key: string]: string }>({});
    const [allResources, setAllResources] = useState<Resource[]>([]);
    const [allModules, setAllModules] = useState<Module[]>([]);
    const [, setAllVideos] = useState<VideoObject[]>([]);
    const [, setAllFiles] = useState<FileObject[]>([]);
    const [allLinks, setAllLinks] = useState<LinkObject[]>([]);
    const [allAccessibilityResults, setAllAccessibilityResults] = useState<EnhancedAxeResults | null>(null);

    // Use useEffect to trigger the analysis when startAnalysis or selectedFile changes
    useEffect(() => {
        const performAnalysis = async () => {
            // Only proceed if analysis is requested and a file is selected, and not already complete
            if (!isAnalyzing || !selectedFile || isAnalysisComplete) {
                return;
            }

            setIsAnalysisComplete(false); // Reset in case it was true from a previous run
            setIsAnalysisErrored(false);

            try {
                const domParser = new DOMParser(); // Create parser instance here
                setParser(domParser); // Update state with the new parser

                const fileContentsResults = await extractIMSCC(selectedFile);
                setAllFileContents(fileContentsResults);
                // const { modulesResults, resourcesResults } = await retire_inventoryIMSCC(domParser, fileContentsResults);
                const modulesResults = await inventoryIMSCCModules(domParser, fileContentsResults);
                const resourcesResults = await inventoryIMSCCManifest(domParser, fileContentsResults);
                reconcileIMSCCModulesAndResources(modulesResults, resourcesResults);
                setAllModules(modulesResults);

                // TODO: Retire
                const { videosResults, filesResults, linksResults } = await retire_analyzeIMSCCForObjects(domParser, fileContentsResults, resourcesResults);
                setAllVideos(videosResults);
                setAllFiles(filesResults);
                setAllLinks(linksResults);

                await identifyObjectsInIMSCCResources(domParser, resourcesResults, fileContentsResults);

                // TODO: Retire
                const accessibilityResults = await retire_analyzeIMSCCRichContentForAccessibility(domParser, resourcesResults, fileContentsResults);
                setAllAccessibilityResults(accessibilityResults);

                await checkIMSCCResourcesForAccessibility(domParser, resourcesResults, fileContentsResults);
                setAllResources(resourcesResults);

                console.log(resourcesResults);

                setIsAnalyzing(false);
                setIsAnalysisComplete(true);
            } catch (e) {
                setIsAnalyzing(false);
                setIsAnalysisErrored(true);
                console.error(`startQACheck: ${e}`); // Use console.error for errors
            }
        };

        performAnalysis();
    }, [isAnalyzing, setIsAnalyzing,selectedFile, isAnalysisComplete]);

    return (
        <>
            <Heading level={2}>Results</Heading>
            {
                selectedFile
                    ? <Text>Selected document: {selectedFile.name}</Text>
                    : <Text>(No file selected)</Text>
            }
            {
                isAnalyzing
                    ? <ProgressCircle aria-label='Analyzing' isIndeterminate size='L' />
                    : <></>
            }
            {
                isAnalysisErrored
                    ? <Alert aria-label="Anylysis failed" color="negative" />
                    : <></>
            }
            {
                isAnalysisComplete && !isAnalysisErrored
                    ? (
                        <Tabs aria-label="Results Tabs">
                            <TabList>
                                <Item key="struct">Structure</Item>
                                <Item key="rsc">Resources</Item>
                                <Item key="ally">Accessibility</Item>
                                <Item key="links">Links</Item>
                                <Item key="files">File Attachments</Item>
                                <Item key="videos">Videos</Item>
                                <Item key="exports">Export</Item>
                            </TabList>
                            <TabPanels>
                                <Item key="struct">
                                    <CourseStructureTab modules={allModules} />
                                </Item>
                                <Item key="rsc">
                                    <CourseResourcesTab resources={allResources} />
                                </Item>
                                <Item key="ally">
                                    {allAccessibilityResults === null
                                    ? <Text>(No accessibility results found)</Text>
                                    : <AccessibilityCheckTab results={allAccessibilityResults!} />}
                                </Item>
                                <Item key="links">
                                    <CourseLinksTab resources={allResources} />
                                </Item>
                                <Item key="files">
                                    Alea jacta est.
                                </Item>
                                <Item key="videos">
                                    Alea jacta est.
                                </Item>
                                <Item key="exports">
                                    Alea jacta est.
                                </Item>
                            </TabPanels>
                        </Tabs>
                    )
                    : <></>
            }

        </>
    );
}