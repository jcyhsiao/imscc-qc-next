import { LinkObject } from '@/app/lib/definitions';
import { Checkbox, Flex, CheckboxGroup, Badge, Grid, Text, View } from '@adobe/react-spectrum';
// import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel } from '@adobe/react-spectrum';
import { getReadableType } from '@/app/lib/file-handling';
import { capitalize } from '@/app/ui/helpers';
import { useState } from 'react';

type LinksDisplayProps = {
    links: LinkObject[];
    // linkCheckResults: { [key: string]: string};
}

export function LinksDisplay({ links }: LinksDisplayProps) {
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

    const [selectedLinkTypes, setSelectedLinkTypes] = useState(Object.keys(groupedByLinkType));
    const [allFoundLinkTypes] = useState([...selectedLinkTypes]);
    const [selectedParentResourceTypes, setSelectedParentResourceTypes] = useState(Object.keys(groupedByParentResourceType));
    const [allFoundParentResourceTypes] = useState([...selectedParentResourceTypes]);

    return (
        <>
        <View>
                <Text>Note: currently, this only lists links in rich content, EXCLUDING those in quiz questions. Use the Canvas link checker for batch checks.</Text>
            </View>
            <Flex gap="size-300" wrap>
                <CheckboxGroup label="Link Types" value={selectedLinkTypes} onChange={setSelectedLinkTypes}>
                    {allFoundLinkTypes.map(type => (
                        <Checkbox key={type} value={type}>{type === 'osu' ? type.toUpperCase() : capitalize(type)} ({groupedByLinkType[type]?.length || 0})</Checkbox>
                    ))}
                </CheckboxGroup>
                <CheckboxGroup label="Found in Parent Resource" value={selectedParentResourceTypes} onChange={setSelectedParentResourceTypes}>
                    {allFoundParentResourceTypes.map(type => (
                        <Checkbox key={type} value={type}>{capitalize(type)} ({groupedByParentResourceType[type]?.length || 0})</Checkbox>
                    ))}
                </CheckboxGroup>
            </Flex>

            <View>
                {
                    links.sort((a, b) => a.parentResourceTitle.localeCompare(b.parentResourceTitle)).map(link => (
                        // (link.type in selectedLinkTypes) && (link.parentResourceType in selectedParentResourceTypes) &&

                        (selectedLinkTypes.includes(link.type.toString()) && selectedParentResourceTypes.includes(link.parentResourceType)) &&
                        // <LinkDisplay key={`${link.text}-rand${Math.random() * 1000}`} link={link} linkCheckResult={linkCheckResults[link.url] || null} />
                        <LinkDisplay key={`${link.text}-rand${Math.random() * 1000}`} link={link} />
                    ))
                }
            </View>
        </>
    );
}

/*
                    Object.entries(groupedByLinkType).map(([type, links]) => (
                        <Disclosure id={type} key={type}>
                            <DisclosureTitle>{type === 'osu' ? type.toUpperCase() : capitalize(type)} ({links.length})</DisclosureTitle>
                            <DisclosurePanel>
                                {links.sort((a, b) => getReadableType(a.parentResourceType)?.localeCompare(getReadableType(b.parentResourceType) || '') || a.parentResourceTitle.localeCompare(b.parentResourceTitle)).map(link => (
                                    <LinkDisplay key={`${link.text}${Math.random() * 1000}`} link={link} linkCheckResult={linkCheckResults[link.url] || null} />
                                ))}
                            </DisclosurePanel>
                        </Disclosure>
                    ))
                        */

type LinkDisplayProps = {
    link: LinkObject;
    // linkCheckResult: string | null;
}

function LinkDisplay({ link }: LinkDisplayProps ) {
    return (
        <View padding={'size-100'}>
            <Grid columns={['1fr']} >
                <Text>{link.text}</Text>
                <Text>Found in: <Badge variant='neutral'>{getReadableType(link.parentResourceType)}</Badge> {link.parentResourceTitle}</Text>
                <Text>Target: {link.url}</Text>
                {/* <Text>Link status: {linkCheckResult ? '' : linkCheckResult}</Text> */}
            </Grid>
        </View>
    )
}