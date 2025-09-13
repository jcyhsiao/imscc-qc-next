import { EnhancedAxeResults, EnhancedAxeResult } from "@/app/lib/definitions";
import { Accordion, CheckboxGroup, Checkbox, Flex, Disclosure, Switch, DisclosureTitle, DisclosurePanel, Link, Text, TextArea, View } from "@adobe/react-spectrum";
import Axe from "axe-core";
import { useState } from "react";
import { capitalize } from "@/app/ui/helpers";

export function AccessibilityResultsDisplay({ results }: { results: EnhancedAxeResults }) {
    const allResultTypes: string[] = []
    if (results.violations.length > 0) allResultTypes.push('violations');
    if (results.incomplete.length > 0) allResultTypes.push('incomplete');
    if (results.passes.length > 0) allResultTypes.push('passes');

    const combinedResults = [
        ...results.violations,
        ...results.incomplete,
        ...results.passes,
    ];

    const allParentResourceTypes = Array.from(new Set(combinedResults.map(result => result.parentItemType)));

    const [selectedResultTypes, setSelectedResultTypes] = useState(['violations']);
    const [selectedParentResourceTypes, setSelectedParentResourceTypes] = useState([...allParentResourceTypes]);
    const [showFromPublishedParentOnly, setShowFromPublishedParentOnly] = useState(false);
    const [showFromInModuleParentOnly, setShowFromInModuleParentOnly] = useState(false);

    const allResourcesInResults = Array.from(new Set(combinedResults.map(result => result.parentItemIdentifier)));
    const allResultsByResource: {
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

            allResultsByResource[resourceIdentifier] = {
                resourceTitle,
                parentModuleTitle,
                resourceType,
                resourceStatus,
                results: resourceResults
            }
        }
    });

    console.log(allResultsByResource);

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
                <CheckboxGroup label="Found in Parent Resource" name='parent resource type' value={selectedParentResourceTypes} onChange={setSelectedParentResourceTypes}>
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
                    Object.entries(allResultsByResource).map(([id, body]) => (
                        <Disclosure id={id} key={id} isHidden={
                            showFromPublishedParentOnly && !body.resourceStatus ||
                            showFromInModuleParentOnly && body.parentModuleTitle === undefined
                            }>
                            <DisclosureTitle>
                                {body.resourceTitle} {body.parentModuleTitle} {body.resourceType} {body.resourceStatus ? 'Published' : 'Unpublished'}
                            </DisclosureTitle>
                            <DisclosurePanel>
                                <AccessibilityResultDisplay resourceResults={body.results} />
                            </DisclosurePanel>
                        </Disclosure>
                    ))
                }
            </Accordion>
        </>
    );
}

export function AccessibilityResultDisplay({ resourceResults }: { resourceResults: EnhancedAxeResult[] }) {

    return (
        <Accordion>
            {
                resourceResults.map(result => (
                    <AxeResultDisplay type={result.type} axeResult={result} />
                ))
            }
        </Accordion>
    )
}

export function AxeResultDisplay({ type, axeResult } : {type: string, axeResult: Axe.Result}) {
    // Safe access for nodes array to avoid undefined errors
    const nodeHtml = (axeResult.nodes && axeResult.nodes[0] && axeResult.nodes[0].html) ? axeResult.nodes[0].html.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const nodeTargets = (axeResult.nodes && axeResult.nodes[0] && axeResult.nodes[0].target) ? axeResult.nodes[0].target.join(', ') : '';

    return (
        <Disclosure id={axeResult.id}>
            <DisclosureTitle>
                {type} {axeResult.help} {axeResult.impact?.toString()}
            </DisclosureTitle>
            <DisclosurePanel>
                <View>
                    <Text>Description:</Text>
                    {axeResult.description}
                    <Text>Affected Element:</Text>
                    <TextArea aria-label={nodeHtml} defaultValue={nodeHtml} isReadOnly />
                    <Text>CSS Selector:</Text>
                    <Text>{nodeTargets}</Text>
                    <Link href={axeResult.helpUrl} target="_blank" rel="noopener noreferrer">More Info</Link>
                </View>
            </DisclosurePanel>
        </Disclosure>
    );
}