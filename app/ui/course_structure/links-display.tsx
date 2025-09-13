import { LinkObject } from '@/app/lib/definitions';
import { Checkbox, Flex, CheckboxGroup, Badge, Grid, Text, View } from '@adobe/react-spectrum';
// import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel } from '@adobe/react-spectrum';
import { getReadableType } from '@/app/lib/imscc-handling';
import { capitalize } from '@/app/ui/helpers';
import { useMemo, useState } from 'react';

type LinksDisplayProps = {
    links: LinkObject[];
    // linkCheckResults: { [key: string]: string};
}

export function LinksDisplay({ links }: LinksDisplayProps) {
const allFoundLinkTypes = useMemo(() => {
        return new Set(links.map(link => link.type.toString()));
    }, [links]); // Dependency: links

    const countsByTypes = useMemo(() => {
        const counts: { [key: string]: number } = {};
        Array.from(allFoundLinkTypes).forEach(type => {
            counts[type] = links.filter(link => link.type.toString() === type).length;
        });
        return counts;
    }, [links, allFoundLinkTypes]); // Dependencies: links, allFoundLinkTypes

     const allFoundParentResourceTypes = useMemo(() => {
        return new Set(links.map(link => link.parentResourceType));
    }, [links]); // Dependency: links

    const countsByParentResourceTypes = useMemo(() => {
        const counts: { [key: string]: number } = {};
        Array.from(allFoundParentResourceTypes).forEach(type => {
            counts[type] = links.filter(link => link.parentResourceType === type).length;
        });
        return counts;
    }, [links, allFoundParentResourceTypes]); // Dependencies: links, allFoundParentResourceTypes

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

    const [selectedLinkTypes, setSelectedLinkTypes] = useState([...allFoundLinkTypes]);
    const [selectedParentResourceTypes, setSelectedParentResourceTypes] = useState([...allFoundParentResourceTypes]);

    return (
        <>
        <View>
                <Text>Note: currently, this only lists links in rich content, EXCLUDING those in quiz questions. Use the Canvas link checker for batch checks.</Text>
            </View>
            <Flex gap="size-300" wrap>
                <CheckboxGroup label="Link Types" name='link type' value={selectedLinkTypes} onChange={setSelectedLinkTypes}>
                    {Array.from(allFoundLinkTypes).map(type => (
                        <Checkbox key={type} value={type}>{type === 'osu' ? type.toUpperCase() : capitalize(type)} ({countsByTypes[type]})</Checkbox>
                    ))}
                </CheckboxGroup>
                <CheckboxGroup label="Found in Parent Resource" name='parent resource type' value={selectedParentResourceTypes} onChange={setSelectedParentResourceTypes}>
                    {Array.from(allFoundParentResourceTypes).map(type => (
                        <Checkbox key={type} value={type}>{capitalize(type)} ({countsByParentResourceTypes[type]})</Checkbox>
                    ))}
                </CheckboxGroup>
            </Flex>

            <View>
                {
                    links.sort((a, b) => a.parentResourceTitle.localeCompare(b.parentResourceTitle)).map(link => (
                        // (link.type in selectedLinkTypes) && (link.parentResourceType in selectedParentResourceTypes) &&

                        // <LinkDisplay key={`${link.text}-rand${Math.random() * 1000}`} link={link} linkCheckResult={linkCheckResults[link.url] || null} />
                        <LinkDisplay key={`${link.text}-rand${Math.random() * 1000}`} link={link} isHidden={
                            selectedLinkTypes.includes(link.type.toString())
                            && selectedParentResourceTypes.includes(link.parentResourceType)
                        } />
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
    isHidden: boolean;
    // linkCheckResult: string | null;
}

function LinkDisplay({ link, isHidden }: LinkDisplayProps ) {
    return (
        <View padding={'size-100'} isHidden={!isHidden}>
            <Grid columns={['1fr']} >
                <Text>{link.text}</Text>
                <Text>Found in: <Badge variant='neutral'>{getReadableType(link.parentResourceType)}</Badge> {link.parentResourceTitle}</Text>
                <Text>Target: {link.url}</Text>
                {/* <Text>Link status: {linkCheckResult ? '' : linkCheckResult}</Text> */}
            </Grid>
        </View>
    )
}