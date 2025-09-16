import { Heading, Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { useEffect, useState } from 'react';
import Alert from '@spectrum-icons/workflow/Alert';

import { extractIMSCC, retire_analyzeIMSCCRichContentForAccessibility, inventoryIMSCCModules, inventoryIMSCCManifest, reconcileIMSCCModulesAndResources, identifyObjectsInIMSCCResources, checkIMSCCResourcesForAccessibility } from '@/app/lib/imscc-handling';
import { Resource, Module } from '@/app/lib/definitions';
import { EnhancedAxeResults } from '@/app/lib/definitions';

import CourseStructureTab from '@/app/(results)/course-structure';
import CourseResourcesTab from '@/app/(results)/course-resources';
import CourseLinksTab from './course-links';
import AccessibilityCheckTab from './accessibility-check';
import { View, Text, ProgressCircle } from '@/app/components/CustomComponents';

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

                await identifyObjectsInIMSCCResources(domParser, resourcesResults, fileContentsResults);

                // TODO: Retire
                const accessibilityResults = await retire_analyzeIMSCCRichContentForAccessibility(domParser, resourcesResults, fileContentsResults);
                setAllAccessibilityResults(accessibilityResults);

                await checkIMSCCResourcesForAccessibility(domParser, resourcesResults, fileContentsResults);
                setAllResources(resourcesResults);

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
        <View width='90vw'>
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
                        <Tabs>
                            <TabList aria-label="Results Tabs">
                                <Tab id="struct">Structure</Tab>
                                <Tab id="rsc">Resources</Tab>
                                <Tab id="ally">Accessibility</Tab>
                                <Tab id="links">Links</Tab>
                                <Tab id="files">File Attachments</Tab>
                                <Tab id="videos">Videos</Tab>
                                <Tab id="exports">Export</Tab>
                            </TabList>
                            <TabPanel id="struct">
                                <CourseStructureTab modules={allModules} />
                            </TabPanel>
                            <TabPanel id="rsc">
                                <CourseResourcesTab resources={allResources} />
                            </TabPanel>
                            <TabPanel id="ally">
                                {allAccessibilityResults === null
                                ? <Text>(No accessibility results found)</Text>
                                : <AccessibilityCheckTab resources={allResources} />}
                            </TabPanel>
                            <TabPanel id="links">
                                <CourseLinksTab resources={allResources} />
                            </TabPanel>
                            <TabPanel id="files">
                                Alea jacta est.
                            </TabPanel>
                            <TabPanel id="videos">
                                Alea jacta est.
                            </TabPanel>
                            <TabPanel id="exports">
                                Alea jacta est.
                            </TabPanel>
                        </Tabs>
                    )
                    : <></>
            }

        </View>
    );
}