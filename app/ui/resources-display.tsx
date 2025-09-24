import { Resource } from "@/app/lib/definitions";
import {
  Accordion,
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
  Badge,
  Divider,
  Flex,
  Text,
  View,
} from "@adobe/react-spectrum";
import { capitalize, getIconForItemType } from "@/app/ui/helpers";
import { useMemo } from 'react';

export function ResourcesDisplay({ resources }: { resources: Resource[] }) {

  const { allResourcesByType } = useMemo(() => {
    const resourcesTypes = resources.map(resource => resource.clarifiedType || 'tbd');
    const resourcesTypesSet = new Set(resourcesTypes);

    const resourcesByType: Record<string, Resource[]> = {};
    Array.from(resourcesTypesSet).forEach(type =>
      resourcesByType[type] = resources
        .filter(resource => (resource.clarifiedType || 'tbd') === type)
        .sort((a, b) => a.title.localeCompare(b.title))
    );

    return { allResourcesByType: resourcesByType };
  }, [resources]);

  return (
    <>
      <p>
        Note: this does not currently list raw links in modules, including
        external tools
      </p>
      <Accordion>
        {Object.entries(allResourcesByType).map(([type, items]) => {
          const icon = getIconForItemType(type);
          return (
            <Disclosure id={type} key={type}>
              <DisclosureTitle>
                <Text aria-level={3}>{icon}&nbsp;
                {type === 'modulelink' ? 'Link in Module' : capitalize(type)} ({items.length})
              </Text>
              </DisclosureTitle>
              <DisclosurePanel>
                <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                  {items
                    .map((item) => (
                      <li key={item.identifier}>
                        <ResourceItemDisplay resource={item} />
                      </li>
                    ))}
                </ul>
              </DisclosurePanel>
            </Disclosure>
          )
        })}
      </Accordion>
    </>
  );
}

export function ResourceItemDisplay({ resource }: { resource: Resource }) {
  if (resource.clarifiedType === 'attachment') {
    console.log('Attachment');
    console.log(resource.moduleTitle === undefined);
  }

  return (
    <View padding={"size-100"} borderColor='gray-200' borderBottomWidth='thick'>
      <Flex direction='row' gap="size-100" wrap>
        {resource.published ? (
          <Badge variant="positive">Published</Badge>
        ) : (
          <Badge variant="negative">Unpublished</Badge>
        )}
        {resource.moduleTitle === undefined ? (
          <Badge variant="neutral">Not in Module</Badge>
        ) : (
          <Badge variant="info">In Module</Badge>
        )}
        <Text>{resource.title}</Text>
      </Flex>
    </View>
  );
}
