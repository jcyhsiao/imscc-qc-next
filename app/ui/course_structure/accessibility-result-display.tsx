import { EnhancedAxeResults, EnhancedAxeResult } from "@/app/lib/definitions";
import { Well, Accordion, CheckboxGroup, Checkbox, Flex, Disclosure, Switch, DisclosureTitle, DisclosurePanel, Link, Text, View } from "@adobe/react-spectrum";
import { useMemo, useState } from "react";
import { capitalize } from "@/app/ui/helpers";

type AccessibilityResultDisplayProps = {
    type: string;
    result: EnhancedAxeResult;
    selectedResultTypes: string[];
    selectedParentResourceTypes: string[];
}

export function AccessibilityResultsDisplay({ results }: { results: EnhancedAxeResults }) {
    const allResultTypes = useMemo(() => {
        const types: ('violations' | 'incomplete' | 'passes')[] = [];
        if (results.violations.length > 0) types.push('violations');
        if (results.incomplete.length > 0) types.push('incomplete');
        if (results.passes.length > 0) types.push('passes');
        return types;
    }, [results.violations.length, results.incomplete.length, results.passes.length]); // Dependencies: lengths of the arrays

    const combinedResults = useMemo(() => {
        return [
            ...results.violations,
            ...results.incomplete,
            ...results.passes,
        ];
    }, [results.violations, results.incomplete, results.passes]); // Dependencies: the arrays themselves


const allParentResourceTypes = useMemo(() => {
        return Array.from(new Set(combinedResults.map(result => result.parentItemType)));
    }, [combinedResults]); // Dependency: combinedResults

    const [selectedResultTypes, setSelectedResultTypes] = useState(['violations']);
    const [selectedResourceTypes, setSelectedResourceTypes] = useState([...allParentResourceTypes]);
    const [showFromPublishedParentOnly, setShowFromPublishedParentOnly] = useState(false);
    const [showFromInModuleParentOnly, setShowFromInModuleParentOnly] = useState(false);

 const allResourcesInResults = useMemo(() => {
        return Array.from(new Set(combinedResults.map(result => result.parentItemIdentifier)));
    }, [combinedResults]); // Dependency: combinedResults

     const allResultsByResource = useMemo(() => {
        const byResource: {
            [key: string]:
            {
                resourceTitle: string;
                parentModuleTitle: string;
                resourceType: string;
                resourceStatus: boolean;
                results: EnhancedAxeResult[]
            }
        } = {};
        allResourcesInResults.forEach(resourceIdentifier => {
            const resourceResults = combinedResults.filter(result => result.parentItemIdentifier === resourceIdentifier);
            if (resourceResults.length > 0) {
                const firstResourceResult = resourceResults[0];
                const resourceTitle = firstResourceResult.parentItemTitle;
                const parentModuleTitle = firstResourceResult.parentItemModuleTitle;
                const resourceType = firstResourceResult.parentItemType;
                const resourceStatus = firstResourceResult.parentItemPublished;

                byResource[resourceIdentifier] = {
                    resourceTitle,
                    parentModuleTitle,
                    resourceType,
                    resourceStatus,
                    results: resourceResults
                }
            }
        });
        return byResource;
    }, [allResourcesInResults, combinedResults]); // Dependencies: allResourcesInResults, combinedResults

    return (
        <>
            <Flex gap='size-300'>
                <CheckboxGroup label="Result Types" name='result type' value={selectedResultTypes} onChange={setSelectedResultTypes}>
                    {
                        allResultTypes.map(type => (
                            <Checkbox key={type} value={type}>{type !== 'incomplete' ? capitalize(type) : 'Calls for Manual Verification'} ({results[type as 'violations' | 'incomplete' | 'passes'].length})</Checkbox>
                        ))
                    }
                </CheckboxGroup>
                <CheckboxGroup label="Found in Parent Resource" name='parent resource type' value={selectedResourceTypes} onChange={setSelectedResourceTypes}>
                    {
                        allParentResourceTypes.map(type => (
                            <Checkbox key={type} value={type}>{type} ({combinedResults.filter(result => result.parentItemType === type).length})</Checkbox>
                        ))
                    }
                </CheckboxGroup>
                <Switch isSelected={showFromPublishedParentOnly} onChange={setShowFromPublishedParentOnly}>Show Published Items Only</Switch>
                <Switch isSelected={showFromInModuleParentOnly} onChange={setShowFromInModuleParentOnly}>Show Items in Modules Only</Switch>
            </Flex>
            <Accordion>
                {
                    Object.entries(allResultsByResource).map(([id, body]) => {
                        let resultsCount = 0;
                        selectedResultTypes.forEach(type => {
                            resultsCount += body.results.filter(result => result.type === type).length;
                        });


                        return (
                            <Disclosure id={id} key={id} isHidden={
                                resultsCount === 0 ||
                                !selectedResourceTypes.includes(body.resourceType) ||
                                showFromPublishedParentOnly && !body.resourceStatus ||
                                showFromInModuleParentOnly && body.parentModuleTitle === undefined
                            }>
                                <DisclosureTitle>
                                    {body.resourceTitle} {body.parentModuleTitle} {body.resourceType} {body.resourceStatus ? 'Published' : 'Unpublished'}
                                </DisclosureTitle>
                                <DisclosurePanel>
                                    <Accordion>
                                        {
                                            body.results.map(result => (
                                                <AccessibilityResultDisplay key={result.id} type={result.type} result={result} selectedResultTypes={selectedResultTypes} selectedParentResourceTypes={selectedResourceTypes} />
                                            ))
                                        }
                                    </Accordion>
                                </DisclosurePanel>
                            </Disclosure>
                        )
                    }
                    )
                }
            </Accordion>
        </>
    );
}

export function AccessibilityResultDisplay({ type, result, selectedResultTypes, selectedParentResourceTypes }: AccessibilityResultDisplayProps) {
    // Safe access for nodes array to avoid undefined errors
    // const nodeHtml = (axeResult.nodes && axeResult.nodes[0] && axeResult.nodes[0].html) ? axeResult.nodes[0].html.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const nodeHtml = (result.nodes && result.nodes[0] && result.nodes[0].html) ? result.nodes[0].html : '';
    const nodeTargets = (result.nodes && result.nodes[0] && result.nodes[0].target) ? result.nodes[0].target.join(', ') : '';
    const isHidden = !(selectedResultTypes.includes(type) && selectedParentResourceTypes.includes(result.parentItemType));

    return (
        <Disclosure id={result.id} isHidden={isHidden}>
            <DisclosureTitle>
                {type} {result.help} {result.impact?.toString()}
            </DisclosureTitle>
            <DisclosurePanel>
                <View>
                    <Text>Description:</Text>
                    {result.description}
                    {nodeHtml !== '' &&
                        <>
                            <Text>Affected Element:</Text>
                            <Well>{nodeHtml}</Well>
                        </>
                    }
                    <Text>CSS Selector:</Text>
                    <Text>{nodeTargets}</Text>
                    <Link href={result.helpUrl} target="_blank" rel="noopener noreferrer">More Info</Link>
                </View>
            </DisclosurePanel>
        </Disclosure>
    );
}