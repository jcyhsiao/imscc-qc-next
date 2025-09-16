import { Module, ModuleItem } from "@/app/lib/definitions";
import { getReadableType } from "@/app/lib/imscc-handling";
import { QC_BADGES, getIconForItemType, capitalize } from "@/app/ui/helpers";
import { Text, Grid, View, Flex, Badge } from "@/app/components/CustomComponents";

export function ModulesDisplay({ modules }: { modules: Module[] }) {
  return (
    <div>
      {modules.map((module) => (
        <details key={module.identifier} style={{ margin: '8px 0', border: '1px solid #ccc', borderRadius: '4px' }}>
          <summary style={{ padding: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <Grid columns={["11fr", "1fr"]} width="90vw">
              <Text>{module.title}</Text>
              {module.published
                ? QC_BADGES.publishStatus.published
                : QC_BADGES.publishStatus.unpublished}
            </Grid>
          </summary>
          <div style={{ padding: '8px' }}>
            <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
              {module.items.map((item) => (
                <li
                  aria-description={
                    item.indent > 0 ? `indent level: ${item.indent}` : undefined
                  }
                  key={item.identifier}
                >
                  <ModuleItemDisplay item={item} />
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </div>
  );
}

export function ModuleItemDisplay({ item }: { item: ModuleItem }) {
  // Use numeric indent from module_meta.xml (safe default 0)
  const rawIndent = item.indent; // Use the indent from the item directly
  const indentLevel = Number.isFinite(rawIndent)
    ? Math.max(0, Math.floor(rawIndent))
    : 0;

  const itemClarifiedType =
    item.clarifiedType != "tbd" && item.clarifiedType != "unspecified"
      ? item.clarifiedType
      : item.contentType;
  const itemReadableType = getReadableType(itemClarifiedType.toLowerCase());
  const itemStatusIndicator = item.published
    ? QC_BADGES.publishStatus.published
    : QC_BADGES.publishStatus.unpublished;

  const itemIcon = getIconForItemType(itemClarifiedType.toLowerCase());

  return (
    <View padding={"size-100"} paddingStart={`${indentLevel * 1.5}rem`}>
      <Grid columns={["1fr", "9fr", "2fr"]} gap="size-100">
        {itemIcon}
        <Text>{item.title}</Text>
        <Flex gap="size-100" justifyContent="end">
          <Badge variant="neutral">{capitalize(itemReadableType!)}</Badge>
          {itemStatusIndicator}
        </Flex>
      </Grid>
    </View>
  );
}
