import { Resource } from "@/app/lib/definitions";
import {
  Accordion,
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
  Badge,
  Grid,
  Flex,
  View,
  Text,
} from "@adobe/react-spectrum";
import { getReadableType } from "@/app/lib/imscc-handling";
import { capitalize } from "@/app/ui/helpers";

export function ResourcesDisplay({ resources }: { resources: Resource[] }) {
  const groupedByType = resources.reduce(
    (acc, item) => {
      const typeLabel = getReadableType(item.clarifiedType);
      if (typeLabel) (acc[typeLabel] = acc[typeLabel] || []).push(item);
      return acc;
    },
    {} as { [key: string]: Resource[] },
  );

  return (
    <>
      <View>
        <Text>
          Note: this does not currently list raw links in modules, including
          external tools
        </Text>
      </View>
      <Accordion>
        {Object.entries(groupedByType).map(([type, items]) => (
          <Disclosure id={type} key={type}>
            <DisclosureTitle>
              {capitalize(type)} ({items.length})
            </DisclosureTitle>
            <DisclosurePanel>
              <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                {items
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((item) => (
                    <li key={item.identifier}>
                      <ResourceItemDisplay resource={item} />
                    </li>
                  ))}
              </ul>
            </DisclosurePanel>
          </Disclosure>
        ))}
      </Accordion>
    </>
  );
}

export function ResourceItemDisplay({ resource }: { resource: Resource }) {
  return (
    <View padding={"size-100"}>
      <Grid columns={["9fr", "3fr"]} gap="size-100">
        <Text>{resource.title}</Text>
        <Flex gap="size-100" justifyContent="end">
          {resource.moduleTitle ? (
            <Badge variant="neutral">Not in Module</Badge>
          ) : (
            <Badge variant="info">In Module</Badge>
          )}
          {resource.published ? (
            <Badge variant="positive">Published</Badge>
          ) : (
            <Badge variant="negative">Unpublished</Badge>
          )}
        </Flex>
      </Grid>
    </View>
  );
}
