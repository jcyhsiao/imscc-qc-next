import { Resource } from '@/app/lib/definitions';
import { ResourcesDisplay } from '@/app/ui/course_structure/resources.display';


export default function CourseResources({resources}: {resources: Resource[]}) {
    return resources.length > 0
    ? <ResourcesDisplay resources={resources} />
    : <p>ERROR: No resources found</p>
}
