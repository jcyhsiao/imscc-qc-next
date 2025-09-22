import { LinkObject, Resource } from "@/app/lib/definitions";
import {
  Accordion,
  Button,
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
  Flex,
  Link,
  Text,
  View,
  Switch,
} from "@adobe/react-spectrum";
// import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel } from '@adobe/react-spectrum';
import { QC_BADGES } from "@/app/ui/helpers";
import { useState, useMemo } from "react";
import CheckboxGroupBuilder from "@/app/ui/checkbox-group-builder";
import ResourceAccordionTitle from "@/app/ui/resource-accordion-title";
import jsonToCsvExport from "json-to-csv-export";

type LinksDisplayProps = {
  resources: Resource[];
};

const isOSULibrariesLink = (link: LinkObject): boolean => {
  return (
    link.url.includes(".library.osu.edu") ||
    link.url.includes(".library.ohio-state.edu") ||
    link.url.includes(".proxy.lib.ohio-state.edu")
  );
};

export function LinksDisplay({ resources }: LinksDisplayProps) {

  const { allFoundLinks, allResourcesWithLinksSorted, allResourcesWithLinksIDAndType, allFoundLinkTypes, allFoundLinksCountsByType, allFoundLinksResourceTypes, allFoundLinksCountsByResourceType } = useMemo(() => {
    // const resourcesWithLinksIDAndType: Record<string, string> = {};
    const foundLinks: LinkObject[] = [];
    const foundLinksResourceTypes = new Set<string>();
    const foundLinksCountsByResourceType: Record<string, number> = {};

    const resourcesWithLinksSorted = resources.sort((a, b) => a.title.localeCompare(b.title))
      .filter(resource => resource.links.length >= 0);

    const resourcesWithLinksIDAndType: Record<string, string> = {};

    resourcesWithLinksSorted.forEach(resource => {
      const linkResourceType = resource.clarifiedType || 'tbd';

      foundLinks.push(...resource.links);
      // resourcesWithLinksIDAndType[resource.identifier] = resourcesWithLinksIDAndType[linkResourceType];
      foundLinksResourceTypes.add(linkResourceType);
      foundLinksCountsByResourceType[linkResourceType] = (foundLinksCountsByResourceType[linkResourceType] || 0) + 1;
      resourcesWithLinksIDAndType[resource.identifier] = linkResourceType;
    });

    const foundLinksTypes = new Set(foundLinks.map(link => link.type.toString()));
    const foundLinksCountsByType: Record<string, number> = {};
    foundLinksTypes.forEach(type =>
      foundLinksCountsByType[type] = foundLinks.filter(link => link.type === type).length
    );

    return {
      allFoundLinks: foundLinks,
      allFoundLinkTypes: foundLinksTypes,
      allFoundLinksCountsByType: foundLinksCountsByType,
      allFoundLinksResourceTypes: foundLinksResourceTypes,
      allFoundLinksCountsByResourceType: foundLinksCountsByResourceType,
      allResourcesWithLinksSorted: resourcesWithLinksSorted,
      allResourcesWithLinksIDAndType: resourcesWithLinksIDAndType,
    }
  }, [resources]);

  const [selectedLinkTypes, setSelectedLinkTypes] = useState([
    ...allFoundLinkTypes,
  ]);
  const [selectedResourceTypes, setSelectedResourceTypes] =
    useState([...allFoundLinksResourceTypes]);
  const [showFromPublishedResourcesOnly, setShowFromPublishedResourcesOnly] =
    useState(false);
  const [showFromInModuleResourcesOnly, setShowFromInModuleResourcesOnly] = useState(false);
  const [showOSULibrariesLinksOnly, setShowOSULibrariesLinksOnly] =
    useState(false);

  return (
    <>
      <View>
        <Text>
          Note: currently, this only lists links in rich content, EXCLUDING
          those in quiz questions. Use the Canvas link checker for batch checks.
        </Text>
      </View>
      <Flex gap="size-300" wrap>
        <CheckboxGroupBuilder
          label="Link Types"
          name="link type"
          values={Array.from(allFoundLinkTypes)}
          valuesLabelsOverrides={{ osu: "OSU" }}
          valuesCounts={allFoundLinksCountsByType}
          selectedValues={selectedLinkTypes}
          onChange={newSelectedLinkTypes =>
            setSelectedLinkTypes(newSelectedLinkTypes)
          }
        />
        <CheckboxGroupBuilder
          label="Found in Resource"
          name="resource type"
          values={Array.from(allFoundLinksResourceTypes)}
          valuesLabelsOverrides={{ modulelink: "Module Link" }}
          valuesCounts={allFoundLinksCountsByResourceType}
          selectedValues={selectedResourceTypes}
          onChange={
            newSelectedParentResourceTypes => setSelectedResourceTypes(newSelectedParentResourceTypes)}
        />
        <Flex>
          <Switch
            isSelected={showFromPublishedResourcesOnly}
            onChange={setShowFromPublishedResourcesOnly}
          >
            Show Published Items Only
          </Switch>
          <Switch isSelected={showFromInModuleResourcesOnly} onChange={setShowFromInModuleResourcesOnly}>
            Show In-Module Items Only
          </Switch>
          <Switch
            isSelected={showOSULibrariesLinksOnly}
            onChange={setShowOSULibrariesLinksOnly}
          >
            Show OSU Libraries Links Only
          </Switch>
        </Flex>
      </Flex>
      <Button variant='accent' onPress={() => jsonToCsvExport({data: allFoundLinks, filename: 'link_inventory.csv'})} >
        Download Link Inventory (CSV)
      </Button>
      <Accordion>
        {allResourcesWithLinksSorted.map((resource) => {

          let filteredLinksCount = 0;
          filteredLinksCount += resource.links.filter((link) =>
            selectedLinkTypes.includes(link.type.toString()),
          ).length;
          if (
            selectedLinkTypes.includes("osu") &&
            showOSULibrariesLinksOnly
          ) {
            filteredLinksCount -= resource.links.filter(
              (link) => !isOSULibrariesLink(link),
            ).length;
          }

          const isHidden = filteredLinksCount <= 0 ||
            !(selectedResourceTypes.includes(resource.clarifiedType || 'tbd')) ||
            (showFromPublishedResourcesOnly && !resource.published) ||
            (showFromInModuleResourcesOnly && (resource.moduleTitle === undefined && resource.clarifiedType !== 'modulelink'));
          return (
            <Disclosure
              id={resource.identifier}
              key={resource.identifier}
              isHidden={isHidden}
            >
              <DisclosureTitle>
                <ResourceAccordionTitle resource={resource} />
              </DisclosureTitle>
              <DisclosurePanel>
                <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                  {resource.links.map((link, index) => {
                    const isHidden =
                      !selectedLinkTypes.includes(link.type.toString()) ||
                      (selectedLinkTypes.includes("osu") &&
                        showOSULibrariesLinksOnly &&
                        !isOSULibrariesLink(link)) ||
                      !selectedResourceTypes.includes(
                        allResourcesWithLinksIDAndType[
                        link.parentResourceIdentifier]
                      );

                    return (
                      <li key={`${link.text}-${index}`} id={`${link.text}-${index}`}>
                        <LinkDisplay
                          link={link}
                          isHidden={isHidden}
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

type LinkDisplayProps = {
  link: LinkObject;
  isHidden: boolean;
  // linkCheckResult: string | null;
};

function LinkDisplay({ link, isHidden }: LinkDisplayProps) {
  return (
    <View padding={"size-100"} isHidden={isHidden}>
      <Text>
        {QC_BADGES.linkType[link.type]} {link.text} [
        <Link href={link.url} target="_blank">
          {link.url}
        </Link>
        ]
      </Text>
    </View>
  );
}


// Cool code

/*
const groupedByLinkType = links.reduce((acc, link) => {
    const linkType = link.type.toString();
    // This is kinda cool; if undefined, assign empty array, then push
    (acc[linkType] = acc[linkType] || []).push(link);
    return acc;
}, {} as { [key: string]: LinkObject[] });

const groupedByParentResourceType = links.reduce((acc, link) => {
    const linkParentResourceType = link.parentResourceType;
    // This is kinda cool; if undefined, assign empty array, then push
    (acc[linkParentResourceType] = acc[linkParentResourceType] || []).push(link);
    return acc;
}, {} as { [key: string]: LinkObject[] });
*/
