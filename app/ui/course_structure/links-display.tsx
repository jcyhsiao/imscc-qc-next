import { LinkObject } from '@/app/lib/definitions';
import { Badge, Accordion, Disclosure, DisclosureTitle, DisclosurePanel, Grid, Text, View } from '@adobe/react-spectrum';
import { getReadableType } from '@/app/lib/file-handling';
import { capitalize } from '@/app/ui/helpers';

type LinksDisplayProps = {
    links: LinkObject[];
    linkCheckResults: { [key: string]: string};
}

export function LinksDisplay({ links, linkCheckResults }: LinksDisplayProps) {
    const groupedByType = links.reduce((acc, link) => {
        const linkType = link.type.toString();
        // This is kinda cool; if undefined, assign empty array, then push
        (acc[linkType] = acc[linkType] || []).push(link);
        return acc;
    }, {} as { [key: string]: LinkObject[] });

    return (
        <>
            <View>
                <Text>Note: currently, this only lists links in rich content, EXCLUDING those in quiz questions. Use the Canvas link checker for batch checks.</Text>
            </View>
            <Accordion width='95vw'>
                {
                    Object.entries(groupedByType).map(([type, links]) => (
                        <Disclosure id={type} key={type}>
                            <DisclosureTitle>{type === 'osu' ? type.toUpperCase() : capitalize(type)} ({links.length})</DisclosureTitle>
                            <DisclosurePanel>
                                {links.sort((a, b) => getReadableType(a.parentResourceType)?.localeCompare(getReadableType(b.parentResourceType) || '') || a.parentResourceTitle.localeCompare(b.parentResourceTitle)).map(link => (
                                    <LinkDisplay key={`${link.text}${Math.random() * 1000}`} link={link} linkCheckResult={linkCheckResults[link.url] || null} />
                                ))}
                            </DisclosurePanel>
                        </Disclosure>
                    ))
                }
            </Accordion>
        </>
    );
}

type LinkDisplayProps = {
    link: LinkObject;
    linkCheckResult: string | null;
}

function LinkDisplay({ link, linkCheckResult }: LinkDisplayProps ) {
    return (
        <View padding={'size-100'}>
            <Grid columns={['1fr']} >
                <Text>{link.text}</Text>
                <Text>Found in: <Badge variant='neutral'>{getReadableType(link.parentResourceType)}</Badge> {link.parentResourceTitle}</Text>
                <Text>Target: {link.url}</Text>
                <Text>Link status: {linkCheckResult ? '' : linkCheckResult}</Text>
            </Grid>
        </View>
    )
}