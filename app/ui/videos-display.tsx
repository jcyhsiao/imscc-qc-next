import { Resource, VideoObject } from '@/app/lib/definitions';
import { Button, Accordion, Link, Badge, Disclosure, DisclosureTitle, DisclosurePanel, Flex, Text, View, Switch } from '@adobe/react-spectrum';
import CheckboxGroupBuilder from '@/app/ui/checkbox-group-builder';
import ResourceAccordionTitle from '@/app/ui/resource-accordion-title'
import { useState, useMemo } from 'react';
import { capitalize } from '@/app/ui/helpers';
import jsonToCsvExport from 'json-to-csv-export';

const videoPlatformLabelOverrides: { [key: string]: string } = {
  youtube: 'YouTube',
  echo360: 'Echo 360',
  lti: 'External Tool (potentially Mediasite)',
};

export default function VideosDisplay({ resources }: { resources: Resource[] }) {
  const { allFoundVideos, allResourcesWithVideosSorted, allResourcesWithVideosIDAndType, allFoundVideosTypes, allFoundVideosResourceTypes, allFoundVideosPlatforms, allFoundVideosCountsByType, allFoundVideosCountsByResourceType, allFoundVideosCountsByPlatform } = useMemo(() => {
    const resourcesWithVideosSorted = resources.filter(resource => resource.videos.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title));
    const resourcesWithVideosIDAndType: Record<string, string> = {};
    const foundVideosTypes: Set<string> = new Set();
    const foundVideosPlatforms: Set<string> = new Set();
    const foundVideosResourceTypes: Set<string> = new Set();
    const foundVideosCountsByType: Record<string, number> = {};
    const foundVideosCountsByResourceType: Record<string, number> = {};
    const foundVideosCountsByPlatform: Record<string, number> = {};
    resourcesWithVideosSorted.forEach(resource => {
      const id = resource.identifier;
      const type = resource.clarifiedType || 'tbd';
      resourcesWithVideosIDAndType[id] = type;
      foundVideosResourceTypes.add(type);
      foundVideosCountsByResourceType[type] = (foundVideosCountsByResourceType[type] || 0) + 1;
    })

    const foundVideos = resourcesWithVideosSorted.flatMap(resource => resource.videos);
    foundVideos.forEach(video => {
      foundVideosTypes.add(video.type);
      foundVideosPlatforms.add(video.platform);
      foundVideosCountsByType[video.type] = (foundVideosCountsByType[video.type] || 0) + 1;
      foundVideosCountsByPlatform[video.platform] = (foundVideosCountsByPlatform[video.platform] || 0) + 1;
    });

    return {
      allFoundVideos: foundVideos,
      allResourcesWithVideosSorted: resourcesWithVideosSorted,
      allResourcesWithVideosIDAndType: resourcesWithVideosIDAndType,
      allFoundVideosTypes: foundVideosTypes,
      allFoundVideosCountsByType: foundVideosCountsByType,
      allFoundVideosResourceTypes: foundVideosResourceTypes,
      allFoundVideosCountsByResourceType: foundVideosCountsByResourceType,
      allFoundVideosPlatforms: foundVideosPlatforms,
      allFoundVideosCountsByPlatform: foundVideosCountsByPlatform,
    };
  }, [resources]);

  const [selectedVideoTypes, setSelectedVideoTypes] = useState([...allFoundVideosTypes]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([...allFoundVideosResourceTypes]);
  const [selectedVideoPlatforms, setSelectedVideoPlatforms] = useState([...allFoundVideosPlatforms]);
  const [showFromPublishedResourcesOnly, setShowFromPublishedResourcesOnly] = useState(false);
  const [showFromInModuleResourcesOnly, setShowFromInModuleResourcesOnly] = useState(false);

  return (
    <>
      <View>
        <p>
          Note: currently, this only lists links in rich content, EXCLUDING
          those in quiz questions. Use the Canvas link checker for batch checks.
        </p>
      </View>
      <Flex direction='row' gap="size-100" wrap>
        <CheckboxGroupBuilder
          label="Video Type"
          name="video type"
          values={Array.from(allFoundVideosTypes)}
          valuesCounts={allFoundVideosCountsByType}
          selectedValues={selectedVideoTypes}
          onChange={newSelectedVideoTypes =>
            setSelectedVideoTypes(newSelectedVideoTypes)
          }
        />
        <CheckboxGroupBuilder
          label="Video Platform"
          name="video platform"
          values={Array.from(allFoundVideosPlatforms)}
          valuesCounts={allFoundVideosCountsByPlatform}
          valuesLabelsOverrides={videoPlatformLabelOverrides}
          selectedValues={selectedVideoPlatforms}
          onChange={newSelectedVideoPlatforms =>
            setSelectedVideoPlatforms(newSelectedVideoPlatforms)
          }
        />

        <CheckboxGroupBuilder
          label="Found in Resource"
          name="resource type"
          values={Array.from(allFoundVideosResourceTypes)}
          valuesCounts={allFoundVideosCountsByResourceType}
          selectedValues={selectedResourceTypes}
          onChange={
            newSelectedParentResourceTypes => setSelectedResourceTypes(newSelectedParentResourceTypes)}
        />
        <Switch
          isSelected={showFromPublishedResourcesOnly}
          onChange={setShowFromPublishedResourcesOnly}
        >
          Show Published Items Only
        </Switch>
        <Switch isSelected={showFromInModuleResourcesOnly} onChange={setShowFromInModuleResourcesOnly}>
          Show In-Module Items Only
        </Switch>
      </Flex>
      <Button variant='accent' onPress={() => jsonToCsvExport({ data: allFoundVideos, filename: 'video_inventory.csv' })} >
        Download Video Inventory (CSV)
      </Button>
      <Accordion>
        {allResourcesWithVideosSorted.map((resource) => {

          const filteredVideosCount = resource.videos.filter(video => selectedVideoTypes.includes(video.type) && selectedVideoPlatforms.includes(video.platform)).length;;

          const isHidden = filteredVideosCount === 0 ||
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
                  {resource.videos.map((video, index) => {
                    const isHidden =
                      !selectedVideoTypes.includes(video.type.toString()) ||
                      !selectedVideoPlatforms.includes(video.platform) ||
                      !selectedResourceTypes.includes(
                        allResourcesWithVideosIDAndType[
                        video.parentResourceIdentifier]
                      );

                    return (
                      <li key={`${video.src}-${index}`} id={`${video.src}-${index}`}>
                        <VideoDisplay
                          video={video}
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

type VideoDisplayProps = {
  video: VideoObject;
  isHidden: boolean;
};

function VideoDisplay({ video, isHidden }: VideoDisplayProps) {
  return (
    <View padding={"size-100"} borderColor='gray-200' borderBottomWidth='thick' isHidden={isHidden}>
      <Flex direction='row' gap="size-100" wrap>
        <Badge variant='neutral'>{videoPlatformLabelOverrides[video.platform] || capitalize(video.platform)}</Badge>
        <Badge variant='neutral'>{capitalize(video.type)}</Badge>
{
          video.transcriptOrCaptionMentioned
            ? <Badge variant='positive'>Transcript/Captions Download May be Mentioned</Badge>
            : <Badge variant='yellow'>Transcript/Captions Download Not Mentioned</Badge>
        }

        <Text>
          {video.title} <br />[
          <Link href={video.src} target='_blank'>{video.src}</Link>
          ]
        </Text>
        
      </Flex>
    </View>
  );
}