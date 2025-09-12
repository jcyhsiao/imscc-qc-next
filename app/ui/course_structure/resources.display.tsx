import { Resource } from '@/app/lib/definitions';
import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel, Badge, Grid, Flex, View, Text } from '@adobe/react-spectrum';
import { getReadableType } from '@/app/lib/file-handling';
/*


            container.querySelectorAll('.accordion-header').forEach(button => {
                button.addEventListener('click', () => {
                    const content = button.nextElementSibling;
                    const icon = button.querySelector('svg');
                    if (content instanceof HTMLElement && icon) {
                        if (content.style.maxHeight.charAt(0) !== '0') {
                            content.style.maxHeight = '0px';
                            icon.classList.remove('rotate-180');
                        } else {
                            content.style.maxHeight = 'fit-content';
                            icon.classList.add('rotate-180');
                        }
                    }
                });
            });
        }
        */

export function ResourcesDisplay({ resources }: { resources: Resource[] }) {
    const groupedByType = resources.reduce((acc, item) => {
        const typeLabel = getReadableType(item.clarifiedType)
        if (typeLabel) (acc[typeLabel] = acc[typeLabel] || []).push(item);
        return acc;
    }, {} as { [key: string]: Resource[] });

    return (
            <Accordion width='95vw'>
                {
                    Object.entries(groupedByType).map(([type, items]) => (
                        <Disclosure id={type} key={type}>
                            <DisclosureTitle>{type} ({items.length})</DisclosureTitle>
                            <DisclosurePanel>
                                {items.sort((a, b) => a.title.localeCompare(b.title)).map(item => (
                                    <ResourceItemDisplay key={item.identifier} resource={item} />
                                ))}
                            </DisclosurePanel>
                        </Disclosure>
                    ))
                }
            </Accordion>
        );
}

export function ResourceItemDisplay({ resource }: { resource: Resource }) {
    return (
        <View padding={"size-100"}>
            <Grid columns={['9fr', '3fr']} gap='size-100'>
                {resource.title}
                <Flex gap='size-100' justifyContent='end'>
                    {
                        resource.moduleTitle
                            ? <Badge variant='neutral'>Not in Module</Badge>
                            : <Badge variant='info'>In Module</Badge>
                    }
                    {
                        resource.published
                            ? <Badge variant='positive'>Published</Badge>
                            : <Badge variant='negative'>Unpublished</Badge>
                    }
                </Flex>
            </Grid>
        </View>
    )
}