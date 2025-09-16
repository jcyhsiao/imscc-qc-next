import { LinksDisplay } from "@/app/ui/course_structure/links-display";
import { Resource } from "@/app/lib/definitions";

export default function CourseLinksTab({resources}: {resources: Resource[]}) {
    return (
        <>
       <LinksDisplay resources={resources} />
        </>
    );
}