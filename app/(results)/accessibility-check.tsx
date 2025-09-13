import { EnhancedAxeResult, EnhancedAxeResults, Resource } from "../lib/definitions"
import { CheckboxGroup, Flex, Checkbox, Text, View, Switch} from "@adobe/react-spectrum";
import { capitalize } from "@/app/ui/helpers";
import { useState } from "react";

type Props = {
    resources: Resource[];
    results: EnhancedAxeResults | null;
}

export default function AccessibilityCheckTab({resources, results}: Props) {
    if (results === null) return <Text>(No accessibility results found)</Text>

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

    return (
        <Flex gap='size-300'>
            <CheckboxGroup label="Result Types" name='result type' value={selectedResultTypes} onChange={setSelectedResultTypes}>
                {
                    allResultTypes.map(type => (
                        <Checkbox key={type} value={type}>{type !== 'incomplete' ? capitalize(type) : 'Calls for Manual Verification'} ({(results as any)[type].length})</Checkbox>
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
    );
}

