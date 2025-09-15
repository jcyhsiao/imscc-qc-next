import { Module, ModuleItem } from '@/app/lib/definitions';
import { getReadableType } from '@/app/lib/imscc-handling';
import { QC_BADGES, getIconForItemType, capitalize } from '@/app/ui/helpers';
import { Text, Grid } from '@adobe/react-spectrum';
import { Accordion, Badge, Disclosure, DisclosureTitle, DisclosurePanel, Flex, View } from '@adobe/react-spectrum'

export function ModulesDisplay({ modules }: { modules: Module[] }) {
    return (
        <Accordion>
            {modules.map(module =>
                <Disclosure id={module.title} key={module.identifier}>
                    <DisclosureTitle>
                        <Grid columns={['11fr', '1fr']} width='90vw'>
                            <Text>{module.title}</Text>
                            {module.published ? QC_BADGES.publishStatus.published : QC_BADGES.publishStatus.unpublished}
                        </Grid>
                    </DisclosureTitle>
                    <DisclosurePanel>
                        {module.items.map(item => (
                            <ModuleItemDisplay key={item.identifier} item={item} />
                        ))}
                    </DisclosurePanel>
                </Disclosure>
            )}
        </Accordion>
    );
}

export function ModuleItemDisplay({ item }: { item: ModuleItem }) {
    // Use numeric indent from module_meta.xml (safe default 0)
    const rawIndent = item.indent; // Use the indent from the item directly
    const indentLevel = Number.isFinite(rawIndent) ? Math.max(0, Math.floor(rawIndent)) : 0;

    const itemClarifiedType = (item.clarifiedType != 'tbd' && item.clarifiedType != 'unspecified') ? item.clarifiedType : item.contentType;
    const itemReadableType = getReadableType(itemClarifiedType.toLowerCase());
    const itemStatusIndicator = item.published
        ? QC_BADGES.publishStatus.published
        : QC_BADGES.publishStatus.unpublished;

    const itemIcon = getIconForItemType(itemClarifiedType.toLowerCase());

    return (
        <View padding={"size-100"} paddingStart={`${indentLevel * 1.5}rem`}>
            <Grid
                columns={['1fr', '9fr', '2fr']}
                gap='size-100'>
                {itemIcon}
                <Text>{item.title}</Text>
                <Flex gap='size-100' justifyContent='end'>
                    <Badge variant="neutral">{capitalize(itemReadableType!)}</Badge>
                    {itemStatusIndicator}

                </Flex>
            </Grid>
        </View>
    );
}
