import { Resource } from "@/app/lib/definitions";
import { ResourcesDisplay } from "@/app/ui/resources-display";

export default function CourseResourcesTab({
  resources,
}: {
  resources: Resource[];
}) {
  return resources.length > 0 ? (
    <ResourcesDisplay resources={resources} />
  ) : (
    <p>ERROR: No resources found</p>
  );
}
