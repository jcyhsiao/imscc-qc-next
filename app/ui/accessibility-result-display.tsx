import {
  AccessibilityResultType,
  Resource,
  EnhancedAxeResult,
} from "@/app/lib/definitions";
import {
  Accordion, Disclosure, DisclosureTitle, DisclosurePanel,
  Badge,
  ContextualHelp,
  Heading,
  Content,
  Grid,
  Well,
  Flex,
  Switch,
  Link,
  Text,
  View,
} from "@adobe/react-spectrum";
import React, { useState, useMemo } from "react";
import { capitalize, QC_BADGES } from "@/app/ui/helpers";
import CheckboxGroupBuilder from "@/app/ui/checkbox-group-builder";
// import ResourceObjectsAccordionsBuilder from "./resource-objects-accordions-builder";

export function AccessibilityResultsDisplay({
  resources,
}: {
  resources: Resource[];
}) {
  const { sortedResources, allResourcesIDandType, allResultTypes, allResourceTypes, allCountsByResultType, allCountsByResourceType, allResourceCountsByResultType } = useMemo(() => {
    const resourcesIDandType: Record<string, string> = {};
    const resourceTypeSet = new Set<string>();

    resources.forEach(resource => {
      resourcesIDandType[resource.identifier] = resource.clarifiedType || 'tbd'
      resourceTypeSet.add(resource.clarifiedType || 'tbd');
    });

    const results = resources
      .flatMap(result => result.accessibilityResults?.results || [])
    // TODO: Filter out 'inapplicable' later
    // .filter(result => result.type !== 'inapplicable');

    //   const resultsTypes = results.flatMap(result => result.type as AccessibilityResultType);
    const resultsTypesSet = new Set<AccessibilityResultType>();
    const countsByResultType: Record<string, number> = {};
    const countsByResourceType: Record<string, number> = {};

    const resourceCountsByResultType: Record<string, Record<string, number>> = {};

    results.forEach(result => {
      // Count by result type
      resultsTypesSet.add(result.type as AccessibilityResultType);
      countsByResultType[result.type] = (countsByResultType[result.type] || 0) + 1;

      // Count by resource type
      const resourceType = resourcesIDandType[result.parentResourceIdentifier];
      if (resourceType) { // Ensure parentResourceType is found
        countsByResourceType[resourceType] = (countsByResourceType[resourceType] || 0) + 1;
      }

      // Count by result type for each resource
      resourceCountsByResultType[result.parentResourceIdentifier] = resourceCountsByResultType[result.parentResourceIdentifier] || {};
      resourceCountsByResultType[result.parentResourceIdentifier][result.type] = (resourceCountsByResultType[result.parentResourceIdentifier][result.type] || 0) + 1;
    });

    const sorted = resources.sort((a, b) => a.title.localeCompare(b.title));

    return {
      sortedResources: sorted,
      allResultTypes: resultsTypesSet,
      allResourceTypes: resourceTypeSet,
      allResourcesIDandType: resourcesIDandType,
      allCountsByResultType: countsByResultType,
      allCountsByResourceType: countsByResourceType,
      allResourceCountsByResultType: resourceCountsByResultType,
    }
  }, [resources]);

  const [selectedResultTypes, setSelectedResultTypes] = useState([
    "violations",
  ]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([
    ...allResourceTypes,
  ]);
  const [showFromPublishedResourcesOnly, setShowFromPublishedResourcesOnly] =
    useState(false);
  const [showFromInModuleResourcesOnly, setShowFromInModuleResourcesOnly] =
    useState(false);

  return (
    <>
      <Flex gap="size-300">
        <CheckboxGroupBuilder
          label="Result Types"
          name="result types"
          values={Array.from(allResultTypes)}
          valuesCounts={allCountsByResultType}
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
          values={Array.from(allResourceTypes)}
          valuesCounts={allCountsByResourceType}
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
                <DisclosureTitle>
                  <AccessibilityResultTitle resource={resource} />
                </DisclosureTitle>
                <DisclosurePanel>
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    {resource.accessibilityResults?.results.map((result, index) => {
                      // Skip inapplicables
                      if (result.type === 'inapplicable') return;

                      const isHidden =
                        !(selectedResultTypes.includes(result.type) &&
                          selectedResourceTypes.includes(allResourcesIDandType[result.parentResourceIdentifier]));

                      return (
                        <li key={`${resource.identifier}-${index}`} id={`${resource.identifier}-${index}`} hidden={isHidden}>
                          <AccessibilityResultDisplay
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

export const AccessibilityResultTitle = React.memo(function AccessibilityResultTitle({resource}: {resource: Resource}) {
  return (
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
  );
});

export const AccessibilityResultDisplay = React.memo(function AccessibilityResultDisplay({
  type,
  result,
}: AccessibilityResultDisplayProps) {
  // Safe access for nodes array to avoid undefined errors
  // const nodeHtml = (axeResult.nodes && axeResult.nodes[0] && axeResult.nodes[0].html) ? axeResult.nodes[0].html.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const nodeHtml = useMemo(() =>
    result.nodes && result.nodes[0] && result.nodes[0].html
      ? result.nodes[0].html
      : "", [result.nodes]);
  const nodeTargets = useMemo(() =>
    result.nodes && result.nodes[0] && result.nodes[0].target
      ? result.nodes[0].target.join(", ")
      : "", [result.nodes]);
  const impactBadge = useMemo(() => result.impact
    ? QC_BADGES.accessibilityViolationImpact[result.impact]
    : null, [result.impact]);
  const typeBadge = useMemo(() => result.type
    ? QC_BADGES.accessibilityResultType[result.type as AccessibilityResultType]
    : null, [result.type]);

  return (
    <View padding="size-100">
      {typeBadge}
      {impactBadge}
      {result.help}

      <ContextualHelp
        variant="info"
        aria-label={`More information about ${result.impact ?? ""} ${type}: ${result.help}`}
      >
        <Heading>More Information</Heading>
        <Content>
          <Text>Description: </Text>
          <Text>{result.description}</Text>
          <br />
          {nodeHtml !== "" && (
            <>
              <Text>Affected Element:</Text>
              <Well>{nodeHtml}</Well>
            </>
          )}
          <Text>CSS Selector:</Text>
          <br />
          <Text>{nodeTargets}</Text>
          <br />
          <Link href={result.helpUrl} target="_blank" rel="noopener noreferrer">
            More Info
          </Link>
        </Content>
      </ContextualHelp>
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