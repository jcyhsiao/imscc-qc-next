import {
  AccessibilityResultType,
  Resource,
  EnhancedAxeResult,
} from "@/app/lib/definitions";
import {
  Badge,
  ContextualHelp,
  Heading,
  Content,
  Grid,
  Well,
  Accordion,
  CheckboxGroup,
  Checkbox,
  Flex,
  Disclosure,
  Switch,
  DisclosureTitle,
  DisclosurePanel,
  Link,
  Text,
  View,
} from "@adobe/react-spectrum";
import { useState } from "react";
import { capitalize, QC_BADGES } from "@/app/ui/helpers";
import { getResourceByIdentifier } from "@/app/lib/imscc-handling";

export function AccessibilityResultsDisplay({
  resources,
}: {
  resources: Resource[];
}) {
  const allResults: EnhancedAxeResult[] = [];
  const allResultTypes: Set<AccessibilityResultType> = new Set();
  resources.forEach((resource) => {
    const results = resource.accessibilityResults;
    if (results) {
      if (results.violations.length > 0) {
        allResultTypes.add("violations");
        allResults.push(...results.violations);
      }
      if (results.passes.length > 0) {
        allResultTypes.add("passes");
        allResults.push(...results.passes);
      }
      if (results.incomplete.length > 0) {
        allResultTypes.add("incomplete");
        allResults.push(...results.incomplete);
      }
    }
  });

  const allParentResourceTypes = new Set(
    resources.map((resource) => resource.clarifiedType || "tbd"),
  );

  const [selectedResultTypes, setSelectedResultTypes] = useState([
    "violations",
  ]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([
    ...allParentResourceTypes,
  ]);
  const [showFromPublishedParentOnly, setShowFromPublishedParentOnly] =
    useState(false);
  const [showFromInModuleParentOnly, setShowFromInModuleParentOnly] =
    useState(false);

  return (
    <>
      <Flex gap="size-300">
        <CheckboxGroup
          label="Result Types"
          name="result type"
          value={selectedResultTypes}
          onChange={setSelectedResultTypes}
        >
          {Array.from(allResultTypes).map((type) => (
            <Checkbox key={type} value={type}>
              {type !== "incomplete" ? capitalize(type) : "Investigate"} (
              {allResults.filter((result) => result.type == type).length})
            </Checkbox>
          ))}
        </CheckboxGroup>
        <CheckboxGroup
          label="Found in Parent Resource"
          name="parent resource type"
          value={selectedResourceTypes}
          onChange={setSelectedResourceTypes}
        >
          {Array.from(allParentResourceTypes).map((type) => (
            <Checkbox key={type} value={type}>
              {capitalize(type)} (
              {
                allResults.filter(
                  (result) =>
                    getResourceByIdentifier(
                      resources,
                      result.parentItemIdentifier,
                    )?.clarifiedType === type,
                ).length
              }
              )
            </Checkbox>
          ))}
        </CheckboxGroup>
        <Switch
          isSelected={showFromPublishedParentOnly}
          onChange={setShowFromPublishedParentOnly}
        >
          Show Published Items Only
        </Switch>
        <Switch
          isSelected={showFromInModuleParentOnly}
          onChange={setShowFromInModuleParentOnly}
        >
          Show Items in Modules Only
        </Switch>
      </Flex>

      <Accordion>
        {resources
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((resource) => {
            const resourceResults = allResults.filter(
              (result) => result.parentItemIdentifier === resource.identifier,
            );

            const filteredResultsCount = resourceResults.filter((result) =>
              selectedResultTypes.includes(result.type),
            ).length;

            return (
              <Disclosure
                id={resource.identifier}
                key={resource.identifier}
                isHidden={
                  resourceResults.length === 0 ||
                  filteredResultsCount === 0 ||
                  !selectedResourceTypes.includes(
                    resource.clarifiedType || "tbd",
                  ) ||
                  (showFromPublishedParentOnly && !resource.published) ||
                  (showFromInModuleParentOnly &&
                    resource.moduleTitle === undefined)
                }
              >
                <DisclosureTitle>
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
                </DisclosureTitle>
                <DisclosurePanel>
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    <li id={`${resource.identifier}-${Math.random() * 1000}`}>
                      {resourceResults.map((result) => (
                        <AccessibilityResultDisplay
                          key={result.id}
                          type={result.type}
                          result={result}
                          selectedResultTypes={selectedResultTypes}
                          selectedParentResourceTypes={selectedResourceTypes}
                          resources={resources}
                        />
                      ))}
                    </li>
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
  selectedResultTypes: string[];
  selectedParentResourceTypes: string[];
  resources: Resource[];
};

export function AccessibilityResultDisplay({
  type,
  result,
  selectedResultTypes,
  selectedParentResourceTypes,
  resources,
}: AccessibilityResultDisplayProps) {
  // Safe access for nodes array to avoid undefined errors
  // const nodeHtml = (axeResult.nodes && axeResult.nodes[0] && axeResult.nodes[0].html) ? axeResult.nodes[0].html.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const nodeHtml =
    result.nodes && result.nodes[0] && result.nodes[0].html
      ? result.nodes[0].html
      : "";
  const nodeTargets =
    result.nodes && result.nodes[0] && result.nodes[0].target
      ? result.nodes[0].target.join(", ")
      : "";
  const isHidden = !(
    selectedResultTypes.includes(type) &&
    selectedParentResourceTypes.includes(
      getResourceByIdentifier(resources, result.parentItemIdentifier)
        ?.clarifiedType || "tbd",
    )
  );
  const impactBadge = result.impact
    ? QC_BADGES.accessibilityViolationImpact[result.impact]
    : null;
  const typeBadge = result.type
    ? QC_BADGES.accessibilityResultType[result.type as AccessibilityResultType]
    : null;

  console.log(result);
  return (
    <View padding="size-100" isHidden={isHidden}>
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
}
