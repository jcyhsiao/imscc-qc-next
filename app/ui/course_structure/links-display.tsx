import { LinkObject, Resource } from '@/app/lib/definitions';
import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel, Checkbox, Flex, CheckboxGroup, Badge, Grid, Text, View, Switch } from '@adobe/react-spectrum';
// import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel } from '@adobe/react-spectrum';
import { getReadableType } from '@/app/lib/imscc-handling';
import { capitalize, QC_BADGES } from '@/app/ui/helpers';
import { useState } from 'react';

type LinksDisplayProps = {
    resources: Resource[];
}

export function LinksDisplay({ resources }: LinksDisplayProps) {
    const allFoundLinks: LinkObject[] = [];
    resources.forEach(resource => {
        allFoundLinks.push(...resource.links)
    });

    const allFoundLinkTypes = new Set(allFoundLinks.map(link => link.type.toString()));

    const countsByTypes: { [key: string]: number } = {};
    Array.from(allFoundLinkTypes).forEach(type => {
        countsByTypes[type] = allFoundLinks.filter(link => link.type.toString() === type).length;
    });

    const allResourcesWithLinks = resources.filter(resource => resource.links.length > 0);
    const allFoundParentResourceTypes = new Set(allResourcesWithLinks.map(resource => resource.clarifiedType || 'tbd'));

    const countsByParentResourceTypes: { [key: string]: number } = {};
    Array.from(allFoundParentResourceTypes).forEach(type => {
        countsByParentResourceTypes[type] = allFoundLinks.filter(link => link.parentResourceType === type).length;
    });

    const [selectedLinkTypes, setSelectedLinkTypes] = useState([...allFoundLinkTypes]);
    const [selectedParentResourceTypes, setSelectedParentResourceTypes] = useState([...allFoundParentResourceTypes]);
    const [showFromPublishedParentOnly, setShowFromPublishedParentOnly] = useState(false);

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
                <Switch isSelected={showFromPublishedParentOnly} onChange={setShowFromPublishedParentOnly}>Show Published Items Only</Switch>
            </Flex>
            <Accordion>
                {
                    allResourcesWithLinks.sort((a, b) => a.title.localeCompare(b.title)).map(resource => {
                        let filteredLinksCount = 0;
                        filteredLinksCount += resource.links.filter(link =>
                            selectedLinkTypes.includes(link.type.toString())
                        ).length;

                        return (
                            <Disclosure id={resource.identifier} key={resource.identifier} isHidden={
                                filteredLinksCount == 0 ||
                                (resource.clarifiedType !== undefined &&!selectedParentResourceTypes.includes(resource.clarifiedType)) ||
                                (showFromPublishedParentOnly && !resource.published)}>
                                <DisclosureTitle>{resource.title} {resource.clarifiedType} {resource.published ? 'Published' : 'Unpublished'}</DisclosureTitle>
                                <DisclosurePanel>
                                    {
                                        resource.links.map(link =>
                                        (
                                            <LinkDisplay key={`${link.text}-rand${Math.random() * 1000}`} link={link} isHidden={
                                                !selectedLinkTypes.includes(link.type.toString()) ||
                                                !selectedParentResourceTypes.includes(link.parentResourceType)} />
                                        )
                                        )
                                    }
                                </DisclosurePanel>
                            </Disclosure>
                        )
                    })
                }
            </Accordion>

        </>
    );
}



type LinkDisplayProps = {
    link: LinkObject;
    isHidden: boolean;
    // linkCheckResult: string | null;
}

function LinkDisplay({ link, isHidden }: LinkDisplayProps) {
    return (
        <View borderWidth='thin' borderColor='dark' borderRadius='medium' padding='size-250' marginBottom='size-100' isHidden={isHidden}>
            <Grid columns={['1fr']} gap='size-50' >
                <Text>{link.text}</Text>
                <Text>Found in: {link.parentResourceTitle} <Badge variant='neutral'>{getReadableType(link.parentResourceType)}</Badge></Text>
                <Text>Target: {link.url} {QC_BADGES.linkType[link.type]}</Text>
                {/* <Text>Link status: {linkCheckResult ? '' : linkCheckResult}</Text> */}
            </Grid>
        </View>
    )
}

// Cool code

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