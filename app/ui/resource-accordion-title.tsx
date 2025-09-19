import { Resource } from '@/app/lib/definitions';
import { Grid, Text, Flex, Badge } from '@adobe/react-spectrum';
import { QC_BADGES, capitalize } from '@/app/ui/helpers';

export default function ResourceAccordionTitle({ resource }: { resource: Resource }) {
    return (
        <Grid columns={["5fr", "1fr"]} gap="size-100" width="90vw">
            <Text>{resource.title}</Text>
            <Flex gap="size-100" justifyContent="end">
                <Badge variant="neutral">
                    {capitalize(resource.clarifiedType === 'modulelink' ? 'Link' : resource.clarifiedType || 'tbd')}
                </Badge>
                {resource.clarifiedType === 'modulelink'
                    ? <Badge variant='info'>(In Module)</Badge>
                    : resource.published
                        ? QC_BADGES.publishStatus.published
                        : QC_BADGES.publishStatus.unpublished}
            </Flex>
        </Grid>
    );
}