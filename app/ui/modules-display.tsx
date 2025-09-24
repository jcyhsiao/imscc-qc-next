import { Module, ModuleItem } from "@/app/lib/definitions";
import { getReadableType } from "@/app/lib/imscc-handling";
import { QC_BADGES, getIconForItemType, capitalize } from "@/app/ui/helpers";
import { Text, Grid } from "@adobe/react-spectrum";
import {
  Accordion,
  Badge,
  Disclosure,
  DisclosureTitle,
  DisclosurePanel,
  Flex,
  Heading,
  View,
} from "@adobe/react-spectrum";

export function ModulesDisplay({ modules }: { modules: Module[] }) {
  return (
    <Accordion>
      {modules.map((module) => (
        <Disclosure id={module.title} key={module.identifier}>
          <DisclosureTitle>
            <Grid columns={["11fr", "1fr"]} width="90vw">
              <Text aria-level={3}>{module.title}</Text>
              {module.published
                ? QC_BADGES.publishStatus.published
                : QC_BADGES.publishStatus.unpublished}
            </Grid>
          </DisclosureTitle>
          <DisclosurePanel>
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
          </DisclosurePanel>
        </Disclosure>
      ))}
    </Accordion>
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
    <View padding={"size-100"} paddingStart={`${indentLevel * 1.5}rem`} borderColor='gray-200' borderBottomWidth='thick'>
      <Flex direction='row' gap="size-100" wrap>
        {itemIcon}
        {itemStatusIndicator}
          <Badge variant="neutral">{capitalize(itemReadableType!)}</Badge>
          
        <Text>{item.title}</Text>
        
      </Flex>
    </View>
  );
}
