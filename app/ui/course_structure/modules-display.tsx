import { Module, ModuleItem } from '@/app/lib/definitions';
import { getReadableType } from '@/app/lib/file-handling';
import { QC_BADGES, getIconForItemType } from '@/app/ui/helpers';
import { useId } from 'react';
import { Text, Grid } from '@adobe/react-spectrum';
import { Accordion, Badge, Disclosure, DisclosureTitle, DisclosurePanel, Flex, View } from '@adobe/react-spectrum'
/*
export interface ModuleItem {
    identifier: string,
    title: string,
    identifierRef: string | null,
    moduleTitle: string,
    status: string,
    indent: number,
    clarifiedType: string,
    contentType: string,
}
*/

export function ModulesDisplay({ modules }: { modules: Module[] }) {
    const uniqueID = () => useId();

    return (
        <Accordion width='95vw'>
            {modules.map(module =>
                <Disclosure id={module.title} key={uniqueID()}>
                    <DisclosureTitle>
                        <Grid width='100vw' columns={['11fr', '1fr']}>
                            {module.title}
                            {module.published ? QC_BADGES.status.published : QC_BADGES.status.unpublished}
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
        ? QC_BADGES.status.published
        : QC_BADGES.status.unpublished;

    const itemIcon = getIconForItemType(itemClarifiedType.toLowerCase());

    // TODO: Apply visual indentation (padding-left) so layout remains stable.
    return (
        <View padding={"size-100"} paddingStart={`${indentLevel * 1.5}rem`}>
            <Grid
                columns={['1fr', '9fr', '2fr']}
                gap='size-100'>
                {itemIcon}
                <Text>{item.title}</Text>
                <Flex gap='size-100' justifyContent='end'>
                    <Badge variant="neutral">{itemReadableType}</Badge>
                    {itemStatusIndicator}

                </Flex>
            </Grid>
        </View>
    );
}
