import { LinkObject, Resource } from "@/app/lib/definitions";
import { CheckboxGroup, Checkbox, Switch, Link } from 'react-aria-components';
import { capitalize, QC_BADGES } from "@/app/ui/helpers";
import { getResourceByIdentifier } from "@/app/lib/imscc-handling";
import { useState } from "react";
import { 
  Badge, 
  View, 
  Text, 
  Grid, 
  Flex 
} from "@/app/components/CustomComponents";

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
  const allFoundLinks: LinkObject[] = [];
  resources.forEach((resource) => {
    allFoundLinks.push(...resource.links);
  });

  const allFoundLinkTypes = new Set(
    allFoundLinks.map((link) => link.type.toString()),
  );

  const countsByTypes: { [key: string]: number } = {};
  Array.from(allFoundLinkTypes).forEach((type) => {
    countsByTypes[type] = allFoundLinks.filter(
      (link) => link.type.toString() === type,
    ).length;
  });

  const allResourcesWithLinks = resources.filter(
    (resource) => resource.links.length > 0,
  );
  const allFoundParentResourceTypes = new Set(
    allResourcesWithLinks.map((resource) => resource.clarifiedType || "tbd"),
  );

  const countsByParentResourceTypes: { [key: string]: number } = {};
  Array.from(allFoundParentResourceTypes).forEach((type) => {
    countsByParentResourceTypes[type] = allFoundLinks.filter(
      (link) =>
        getResourceByIdentifier(resources, link.parentResourceIdentifier)
          ?.clarifiedType === type,
    ).length;
  });

  const [selectedLinkTypes, setSelectedLinkTypes] = useState([
    ...allFoundLinkTypes,
  ]);
  const [selectedParentResourceTypes, setSelectedParentResourceTypes] =
    useState([...allFoundParentResourceTypes]);
  const [showFromPublishedParentOnly, setShowFromPublishedParentOnly] =
    useState(false);
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
        <CheckboxGroup
          value={selectedLinkTypes}
          onChange={setSelectedLinkTypes}
        >
          <Text>Link Types</Text>
          {Array.from(allFoundLinkTypes).map((type) => (
            <Checkbox key={type} value={type}>
              {type === "osu" ? type.toUpperCase() : capitalize(type)} (
              {countsByTypes[type]})
            </Checkbox>
          ))}
        </CheckboxGroup>
        <CheckboxGroup
          value={selectedParentResourceTypes}
          onChange={setSelectedParentResourceTypes}
        >
          <Text>Found in Parent Resource</Text>
          {Array.from(allFoundParentResourceTypes).map((type) => (
            <Checkbox key={type} value={type}>
              {capitalize(type)} ({countsByParentResourceTypes[type]})
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
          isSelected={showOSULibrariesLinksOnly}
          onChange={setShowOSULibrariesLinksOnly}
        >
          Show OSU Libraries Links Only
        </Switch>
      </Flex>
      <div>
        {allResourcesWithLinks
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((resource) => {
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

            const isHidden = 
              filteredLinksCount <= 0 ||
              (resource.clarifiedType !== undefined &&
                !selectedParentResourceTypes.includes(
                  resource.clarifiedType,
                )) ||
              (showFromPublishedParentOnly && !resource.published);

            if (isHidden) return null;

            return (
              <details
                key={resource.identifier}
                style={{ margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <summary style={{ padding: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <Grid columns={["5fr", "1fr"]} gap="size-100" width="90vw">
                    <Text>{resource.title}</Text>
                    <Flex gap="size-100" justifyContent="end">
                      <Badge variant="neutral">
                        {capitalize(resource.clarifiedType!)}
                      </Badge>
                      {resource.published
                        ? QC_BADGES.publishStatus.published
                        : QC_BADGES.publishStatus.unpublished}
                    </Flex>
                  </Grid>
                </summary>
                <div style={{ padding: '8px' }}>
                  <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                    {resource.links.map((link) => (
                      <li key={`${link.text}-rand${Math.random() * 1000}`}>
                        <LinkDisplay
                          link={link}
                          isHidden={
                            !selectedLinkTypes.includes(link.type.toString()) ||
                            (selectedLinkTypes.includes("osu") &&
                              showOSULibrariesLinksOnly &&
                              !isOSULibrariesLink(link)) ||
                            !selectedParentResourceTypes.includes(
                              getResourceByIdentifier(
                                resources,
                                link.parentResourceIdentifier,
                              )?.clarifiedType || "tbd",
                            )
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            );
          })}
      </div>
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
        <Link href="{link.url}" target="_blank">
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
