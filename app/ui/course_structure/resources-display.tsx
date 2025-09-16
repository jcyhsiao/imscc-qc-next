import { Resource } from "@/app/lib/definitions";
import { getReadableType } from "@/app/lib/imscc-handling";
import { capitalize } from "@/app/ui/helpers";
import { 
  Badge, 
  View, 
  Text, 
  Grid, 
  Flex 
} from "@/app/components/CustomComponents";

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
      <div>
        {Object.entries(groupedByType).map(([type, items]) => (
          <details key={type} style={{ margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}>
            <summary style={{ padding: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              {capitalize(type)} ({items.length})
            </summary>
            <div style={{ padding: '8px' }}>
              <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                {items
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((item) => (
                    <li key={item.identifier}>
                      <ResourceItemDisplay resource={item} />
                    </li>
                  ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
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
