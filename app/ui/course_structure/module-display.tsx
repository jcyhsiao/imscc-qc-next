import { Module, ModuleItem } from '@/app/lib/definitions';
import { getReadableType } from '@/app/lib/file-handling';
import { QC_BADGES, getIconForItemType } from '@/app/ui/helpers';

import { Text, Flex } from '@adobe/react-spectrum';
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

export function ModuleDisplay({module}: {module: Module}) {

}

export function ModuleItemDisplay({item}: {item: ModuleItem}) {    
    // Use numeric indent from module_meta.xml (safe default 0)
    const rawIndent = item.indent; // Use the indent from the item directly
    const indentLevel = Number.isFinite(rawIndent) ? Math.max(0, Math.floor(rawIndent)) : 0;

    const itemClarifiedType = (item.clarifiedType != 'tbd' && item.clarifiedType != 'unspecified') ? item.clarifiedType : item.contentType;
    const itemReadableType = getReadableType(itemClarifiedType.toLowerCase());
    const itemStatusIndicator = item.status === 'active'
                        ? QC_BADGES.status.published
                        : QC_BADGES.status.unpublished;

    const itemIcon = getIconForItemType(itemClarifiedType.toLowerCase());

    // TODO: Apply visual indentation (padding-left) so layout remains stable.

    return (
        <Flex marginStart={indentLevel}>
            {itemIcon}
            <Text>{item.title}</Text>
            <Text>{itemReadableType}</Text>
            {itemStatusIndicator}
        </Flex>
    );
}
