import { Resource, FileObject, EXTENSION_COMMON_NAMES } from '@/app/lib/definitions';
import CheckboxGroupBuilder from '@/app/ui/checkbox-group-builder';
import { Badge, Button, View, Text, Switch, Accordion, Disclosure, DisclosureTitle, DisclosurePanel, Flex } from '@adobe/react-spectrum';
import { useState, useMemo } from 'react';
import ResourceAccordionTitle from '@/app/ui/resource-accordion-title';
import jsonToCsvExport from 'json-to-csv-export';

export function AttachmentsDisplay({ resources }: { resources: Resource[] }) {
  const { allFoundAttachments, allResourcesWithFoundAttachmentsSorted, allResourcesWithFoundAttachmentsIDAndType, allFoundAttachmentsResourceTypes, allFoundAttachmentsExtensions, allFoundAttachmentsCountsByResourceType, allFoundAttachmentsCountsByExtension } = useMemo(() => {
    const resourcesWithFoundAttachmentsIDAndType: Record<string, string> = {};

    const resourcesWithFoundAttachmentsSorted = resources
      .filter(resource => resource.attachments.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title));
    const foundAttachmentsResourceTypes = new Set<string>();
    const foundAttachmentsCountsByResourceType: Record<string, number> = {};
    const foundAttachments: FileObject[] = [];

    resourcesWithFoundAttachmentsSorted.forEach(resource => {
      foundAttachments.push(...resource.attachments);
      foundAttachmentsResourceTypes.add(resource.clarifiedType || 'tbd');
      resourcesWithFoundAttachmentsIDAndType[resource.identifier] = resource.clarifiedType || 'tbd';
      foundAttachmentsCountsByResourceType[resource.clarifiedType || 'tbd'] = (foundAttachmentsCountsByResourceType[resource.clarifiedType || 'tbd'] || 0) + 1;
    });

    const foundAttachmentsExtensionsSet = new Set<string>();
    const foundAttachmentsCountsByExtension: Record<string, number> = {};

    foundAttachments.forEach(attachment => {
      const extension = attachment.extension;
      if (extension) {
        foundAttachmentsExtensionsSet.add(extension);
        foundAttachmentsCountsByExtension[extension] = (foundAttachmentsCountsByExtension[extension] || 0) + 1;
      }
    });
    console.log(foundAttachmentsCountsByExtension);
    const foundAttachmentsExtensions = Array.from(foundAttachmentsExtensionsSet)
      .sort((a, b) => a.localeCompare(b));

    console.log(foundAttachmentsExtensionsSet);

    return {
      allFoundAttachments: foundAttachments,
      allResourcesWithFoundAttachmentsSorted: resourcesWithFoundAttachmentsSorted,
      allResourcesWithFoundAttachmentsIDAndType: resourcesWithFoundAttachmentsIDAndType,
      allFoundAttachmentsExtensions: foundAttachmentsExtensions,
      allFoundAttachmentsResourceTypes: foundAttachmentsResourceTypes,
      allFoundAttachmentsCountsByResourceType: foundAttachmentsCountsByResourceType,
      allFoundAttachmentsCountsByExtension: foundAttachmentsCountsByExtension,
    }
  }, [resources]);

  const [selectedResourceTypes, setSelectedResourceTypes] = useState([...allFoundAttachmentsResourceTypes]);
  const [selectedExtensions, setSelectedExtensions] = useState([...allFoundAttachmentsExtensions]);
  const [showFromPublishedResourcesOnly, setShowFromPublishedResourcesOnly] = useState(false);
  const [showFromInModuleResourcesOnly, setShowFromInModuleResourcesOnly] = useState(false);

  return (
    <>
      <p>Notes: Some regular links repurposed from previously attachment links may show up here as well. To ensure document accessibility, use the Ally tool in CarmenCanvas.</p>
      <Flex direction='row' gap="size-100" wrap>
        <CheckboxGroupBuilder
          label='File Type'
          name='file type'
          values={[...allFoundAttachmentsExtensions]}
          valuesCounts={allFoundAttachmentsCountsByExtension}
          valuesLabelsOverrides={EXTENSION_COMMON_NAMES}
          selectedValues={selectedExtensions}
          onChange={(newSelectedValues) => setSelectedExtensions(newSelectedValues)}
        />
        <CheckboxGroupBuilder
          label='Found in Resource'
          name='resource type'
          values={[...allFoundAttachmentsResourceTypes]}
          valuesCounts={allFoundAttachmentsCountsByResourceType}
          selectedValues={selectedResourceTypes}
          onChange={(newSelectedValues) => setSelectedResourceTypes(newSelectedValues)}
        />
          <Switch isSelected={showFromPublishedResourcesOnly} onChange={setShowFromPublishedResourcesOnly}>
            Show Published Items Only
          </Switch>
          <Switch isSelected={showFromInModuleResourcesOnly} onChange={setShowFromInModuleResourcesOnly}>
            Show Items in Modules Only
          </Switch>
      </Flex>
      <Button variant='accent' onPress={() => jsonToCsvExport({data: allFoundAttachments, filename: 'attachment_inventory.csv'})} >
        Download Attachment Inventory (CSV)
      </Button>
      <Accordion>
        {allResourcesWithFoundAttachmentsSorted.map((resource) => {
          const filteredCount = resource.attachments.filter(attachment =>
            selectedExtensions.includes(attachment.extension || 'no extension')
          ).length;

          const isHidden =
            filteredCount === 0 ||
            !(selectedResourceTypes.includes(resource.clarifiedType || 'tbd')) ||
            (showFromPublishedResourcesOnly && !resource.published) ||
            (showFromInModuleResourcesOnly && resource.moduleTitle === undefined);
          return (
            <Disclosure
              id={resource.identifier}
              key={resource.identifier}
              isHidden={isHidden}
            >
              <DisclosureTitle aria-level={3}>
                <ResourceAccordionTitle resource={resource} />
              </DisclosureTitle>
              <DisclosurePanel>
                <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                  {resource.attachments.map((attachment, index) => {
                    const isHidden =
                      !selectedResourceTypes.includes(
                        allResourcesWithFoundAttachmentsIDAndType[attachment.parentResourceIdentifier]) ||
                        !selectedExtensions.includes(
                        attachment.extension || 'no extension')
                      ;

                    return (
                      <li key={`${attachment.parentAnchorText}-${index}`} id={`${attachment.parentAnchorText}-${index}`}>
                        <AttachmentDisplay
                          attachment={attachment}
                          isHidden={isHidden}
                        />
                      </li>
                    )
                  })}
                </ul>
              </DisclosurePanel>
            </Disclosure>
          );
        })}
      </Accordion>
    </>
  );
}

type AttachmentDisplayProps = {
  attachment: FileObject;
  isHidden: boolean;
};

function AttachmentDisplay({ attachment, isHidden }: AttachmentDisplayProps) {
  return (
    <View padding={"size-100"} borderColor='gray-200' borderBottomWidth='thick' isHidden={isHidden}>
      <Flex direction='row' gap="size-100" wrap>
        <Badge variant='neutral'>{attachment.extension ? EXTENSION_COMMON_NAMES[attachment.extension] : attachment.extension?.toUpperCase()}</Badge>&nbsp;
      <Text>
        {attachment.parentAnchorText} <br />[
          {/* TODO: just get the filename */}
          {attachment.href}
        ]
      </Text>
        </Flex>
    </View>
  );
}