import { Resource } from '@/app/lib/definitions';
import CheckboxGroupBuilder from '@/app/ui/checkbox-group-builder';
import { Text, Flex } from '@adobe/react-spectrum';
import { useState, useMemo } from 'react';

export function AttachmentsDisplay({ resources }: { resources: Resource[] }) {
  const { allResourcesWithFoundAttachmentsIDAndType, allFoundAttachmentsResourceTypes, allFoundAttachmentsCountsByResourceType } = useMemo(() => {
    const resourcesWithFoundAttachmentsIDAndType: Record<string, string> = {};

    const resourcesWithFoundAttachments = resources.filter(resource => resource.attachments.length > 0);
    const foundAttachmentsResourceTypes = new Set<string>();
    const foundAttachmentsCountsByResourceType: Record<string, number> = {};

    resourcesWithFoundAttachments.forEach(resource => {
      foundAttachmentsResourceTypes.add(resource.clarifiedType || 'tbd');
      resourcesWithFoundAttachmentsIDAndType[resource.identifier] = resource.clarifiedType || 'tbd';
      foundAttachmentsCountsByResourceType[resource.clarifiedType || 'tbd'] = (foundAttachmentsCountsByResourceType[resource.clarifiedType || 'tbd'] || 0) + 1;
    });

    return {
      allResourcesWithFoundAttachmentsIDAndType: resourcesWithFoundAttachmentsIDAndType,
      allFoundAttachmentsResourceTypes: foundAttachmentsResourceTypes,
      allFoundAttachmentsCountsByResourceType: foundAttachmentsCountsByResourceType
    }
  }, [resources]);

  const [selectedResourceTypes, setSelectedResourceTypes] = useState([...allFoundAttachmentsResourceTypes]);
  const [showFromPublishedResourcesOnly, setShowFromPublishedResourcesOnly] = useState(false);
  const [showFromInModuleResourcesOnly, setShowFromInModuleResourcesOnly] = useState(false);

  return (
    <>
      <Flex gap='size-300'>
        <CheckboxGroupBuilder
          label='Found in Resource'
          name='resource type'
          values={[...allFoundAttachmentsResourceTypes]}
          valuesCounts={allFoundAttachmentsCountsByResourceType}
          selectedValues={selectedResourceTypes}
          onChange={(newSelectedValues) =>setSelectedResourceTypes(newSelectedValues)}
        />
      </Flex>
    </>
  );


}