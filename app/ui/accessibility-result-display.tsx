import {
  AccessibilityResultType,
  Resource,
  EnhancedAxeResult,
} from "@/app/lib/definitions";
import {
  Accordion, Disclosure, DisclosureTitle, DisclosurePanel,
  Button,
  ContextualHelp,
  Heading,
  Content,
  Well,
  Flex,
  Switch,
  Link,
  Text,
  View,
} from "@adobe/react-spectrum";
import React, { useState, useMemo } from "react";
import { QC_BADGES } from "@/app/ui/helpers";
import CheckboxGroupBuilder from "@/app/ui/checkbox-group-builder";
import ResourceAccordionTitle from "@/app/ui/resource-accordion-title";
// import ResourceObjectsAccordionsBuilder from "./resource-objects-accordions-builder";
import jsonToCsvExport from "json-to-csv-export";

export function AccessibilityResultsDisplay({
  resources,
}: {
  resources: Resource[];
}) {
  const { sortedResources, allResults, allResourcesWithResultsIDAndType, allResourcesWithResultsResourceTypes, allResourcesWithResultsResultTypes, allResourceCountsByResourceType, allResultsCountsByResultType, allResourceCountsByResultType } = useMemo(() => {
    // NOTE: we are already excluding inapplicable in imscc-handling
    const omittedResourceTypes = ['modulelink'];

    const resourcesWithResultsSorted = resources
      .sort((a, b) => a.title.localeCompare(b.title))
      .filter(resource => (resource.accessibilityResults?.results.length || 0) > 0)
      .filter(resource => !omittedResourceTypes.includes(resource.clarifiedType || 'tbd'));

    const resourcesWithResultsIDAndType: Record<string, string> = {};
    const resourcesWithResultsResourceTypesSet = new Set<string>();
    const resourceCountsByResourceType: Record<string, number> = {};

    resourcesWithResultsSorted.forEach(resource => {
      resourcesWithResultsIDAndType[resource.identifier] = resource.clarifiedType || 'tbd'
      resourcesWithResultsResourceTypesSet.add(resource.clarifiedType || 'tbd');
      resourceCountsByResourceType[resource.clarifiedType || 'tbd'] = (resourceCountsByResourceType[resource.clarifiedType || 'tbd'] || 0) + 1;
    });

    const results = resources
      .flatMap(result => result.accessibilityResults?.results || [])
    results.sort((a, b) => a.type.localeCompare(b.type));
    //   const resultsTypes = results.flatMap(result => result.type as AccessibilityResultType);
    const resourcesWithResultsResultsTypesSet = new Set<AccessibilityResultType>();
    const resultsCountsByResultType: Record<string, number> = {};
    const resultsCountsByResourceType: Record<string, number> = {};
    const resourceCountsByResultType: Record<string, Record<string, number>> = {};

    results.forEach(result => {
      // Count by result type
      resourcesWithResultsResultsTypesSet.add(result.type as AccessibilityResultType);
      resultsCountsByResultType[result.type] = (resultsCountsByResultType[result.type] || 0) + 1;

      // Count by resource type
      const resourceType = resourcesWithResultsIDAndType[result.parentResourceIdentifier];
      if (resourceType) { // Ensure parentResourceType is found
        resultsCountsByResourceType[resourceType] = (resultsCountsByResourceType[resourceType] || 0) + 1;
      }

      // Count by result type for each resource
      resourceCountsByResultType[result.parentResourceIdentifier] = resourceCountsByResultType[result.parentResourceIdentifier] || {};
      resourceCountsByResultType[result.parentResourceIdentifier][result.type] = (resourceCountsByResultType[result.parentResourceIdentifier][result.type] || 0) + 1;
    });

    return {
      allResults: results,
      sortedResources: resourcesWithResultsSorted,
      allResourcesWithResultsResultTypes: resourcesWithResultsResultsTypesSet,
      allResourcesWithResultsResourceTypes: resourcesWithResultsResourceTypesSet,
      allResourcesWithResultsIDAndType: resourcesWithResultsIDAndType,
      allResultsCountsByResultType: resultsCountsByResultType,
      // allResultsCountsByResourceType: resultsCountsByResourceType,
      allResourceCountsByResultType: resourceCountsByResultType,
      allResourceCountsByResourceType: resourceCountsByResourceType,
    }
  }, [resources]);

  const [selectedResultTypes, setSelectedResultTypes] = useState([
    "violations",
  ]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([
    ...allResourcesWithResultsResourceTypes,
  ]);
  const [showFromPublishedResourcesOnly, setShowFromPublishedResourcesOnly] =
    useState(false);
  const [showFromInModuleResourcesOnly, setShowFromInModuleResourcesOnly] =
    useState(false);

  return (
    <>
      <p>Note: This does not currently check the syllabus page.</p>

      <Flex direction='row' gap="size-100" wrap>
        <CheckboxGroupBuilder
          label="Result Types"
          name="result types"
          values={Array.from(allResourcesWithResultsResultTypes)}
          valuesCounts={allResultsCountsByResultType}
          skippedValues={['inapplicable']}
          valuesLabelsOverrides={{ incomplete: "Investigate" }}
          selectedValues={selectedResultTypes}
          onChange={(newSelectedResultTypes: typeof selectedResultTypes) =>
            setSelectedResultTypes(newSelectedResultTypes)
          }
        />
        <CheckboxGroupBuilder
          label="Found in Resource"
          name="resource type"
          values={Array.from(allResourcesWithResultsResourceTypes)}
          valuesCounts={allResourceCountsByResourceType}
          selectedValues={selectedResourceTypes}
          onChange={(newSelectedResourceTypes: typeof selectedResourceTypes) =>
            setSelectedResourceTypes(newSelectedResourceTypes)
          }
        />

        <Switch
          isSelected={showFromPublishedResourcesOnly}
          onChange={setShowFromPublishedResourcesOnly}
        >
          Show Published Items Only
        </Switch>
        <Switch
          isSelected={showFromInModuleResourcesOnly}
          onChange={setShowFromInModuleResourcesOnly}
        >
          Show Items in Modules Only
        </Switch>
      </Flex>

      <Button variant='accent' onPress={() => jsonToCsvExport({ data: allResults, filename: 'automated_axe_accessibility_report.csv' })} >
        Download Automated Axe Accessibility Report (CSV)
      </Button>
      <Accordion>
        {sortedResources
          .map((resource) => {
            let filteredResultsCount = 0;
            selectedResultTypes.forEach(type => filteredResultsCount += allResourceCountsByResultType[resource.identifier]?.[type] || 0);

            const isHidden = filteredResultsCount === 0 ||
              !selectedResourceTypes.includes(resource.clarifiedType || "tbd") ||
              (showFromPublishedResourcesOnly && !resource.published) ||
              (showFromInModuleResourcesOnly &&
                resource.moduleTitle === undefined);

            return (
              <Disclosure
                id={resource.identifier}
                key={resource.identifier}
                isHidden={isHidden}
              >
                <DisclosureTitle aria-level={3}>
                  <ResourceAccordionTitle resource={resource} />
                </DisclosureTitle>
                <DisclosurePanel>
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    {resource.accessibilityResults?.results.map((result, index) => {
                      // Skip inapplicables
                      if (result.type === 'inapplicable') return;

                      const isHidden =
                        !(selectedResultTypes.includes(result.type) &&
                          selectedResourceTypes.includes(allResourcesWithResultsIDAndType[result.parentResourceIdentifier]));

                      return (
                        <li key={`${resource.identifier}-li-${index}`} id={`${resource.identifier}-li-${index}`} hidden={isHidden}>
                          <AccessibilityResultDisplay
                            key={`${resource.identifier}-result-${index}`}
                            type={result.type}
                            result={result}
                          />
                        </li>
                      )
                    })}
                  </ul>
                </DisclosurePanel>
              </Disclosure>
            );
          })}
      </Accordion>
    </>
  );
}

type AccessibilityResultDisplayProps = {
  type: string;
  result: EnhancedAxeResult;
  // selectedResultTypes: string[];
  // selectedParentResourceTypes: string[];
  // resources: Resource[];
};

export const AccessibilityResultDisplay = React.memo(function AccessibilityResultDisplay({
  type,
  result,
}: AccessibilityResultDisplayProps) {
  // Safe access for nodes array to avoid undefined errors
  // const nodeHtml = (axeResult.nodes && axeResult.nodes[0] && axeResult.nodes[0].html) ? axeResult.nodes[0].html.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  // TODO: Reimplement
  /*
  const nodeHtml = useMemo(() =>
    result.nodes && result.nodes[0] && result.nodes[0].html
      ? result.nodes[0].html
      : "", [result.nodes]);
  const nodeTargets = useMemo(() =>
    result.nodes && result.nodes[0] && result.nodes[0].target
      ? result.nodes[0].target.join(", ")
      : "", [result.nodes]);
  */
  const impactBadge = useMemo(() => result.impact
    ? QC_BADGES.accessibilityViolationImpact[result.impact]
    : null, [result.impact]);
  const typeBadge = useMemo(() => result.type
    ? QC_BADGES.accessibilityResultType[result.type as AccessibilityResultType]
    : null, [result.type]);

  return (
    <View padding="size-100" borderColor='gray-200' borderBottomWidth='thick'>
      <Flex direction='row' gap={"size-100"} wrap>
        {typeBadge}
        {impactBadge}
        {result.help}

        <ContextualHelp
          variant="info"
          aria-label={`More information about ${result.impact ?? ""} ${type}: ${result.help}`}
        >
          <Heading level={4}>More Information</Heading>
          <Content>
            <p>Description: </p>
            <p>{result.description}</p>
            <p>Affected Elements:</p>
            <br />
            {
              result.nodesHTML.length > 0
                ? result.nodesHTML.map((nodeHTML, index) =>
                  <>
                    <p>Element {index + 1}: </p>
                    <Well>{nodeHTML}</Well>
                  </>
                ) :
                <Well>(None Listed)</Well>
            }

            <br />
            <Link href={result.helpUrl} target="_blank" rel="noopener noreferrer">
              More Info
            </Link>
          </Content>
        </ContextualHelp>
      </Flex>
    </View>
  );
});

{/*

      <ResourceObjectsAccordionsBuilder
        resources={sortedResources}
        objectType='accessibilityResults'
        sortResourcesBy={(a, b) => a.title.localeCompare(b.title)}
        disclosureIsHidden={(resource) => {
          const filteredResultsCount = allResults
            .filter(result => selectedResultTypes.includes(result.type)).length;
          console.log(filteredResultsCount);
            return (
            filteredResultsCount === 0 ||
            !selectedResourceTypes.includes(resource.clarifiedType || "tbd") ||
            (showFromPublishedParentOnly && !resource.published) ||
            (showFromInModuleParentOnly && resource.moduleTitle === undefined)
          );
        }}
        objectIsHidden={object => {
          const resultObject = object as EnhancedAxeResult;
          return !selectedResultTypes.includes(resultObject.type);
        }}
        titleBuilder={(resource) => (
          <Grid columns={["5fr", "1fr"]} gap="size-100" width="90vw">
            <Grid columns={["1fr"]} gap="size-50">
              {resource.title} (in module:{" "}
              {resource.moduleTitle ?? "N/A"})
            </Grid>
            <Flex gap="size-50">
              <Badge variant="neutral">
                {capitalize(resource.clarifiedType!)}
              </Badge>
              {resource.published
                ? QC_BADGES.publishStatus.published
                : QC_BADGES.publishStatus.unpublished}
            </Flex>
          </Grid>
        )}
        objectBuilder={(object, resources) => {
          const resultObject = object as EnhancedAxeResult;
          return <AccessibilityResultDisplay
                          type={resultObject.type}
                          result={resultObject}
                        />
        }}
      />
    */}