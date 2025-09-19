import { AttachmentsDisplay } from '@/app/ui/attachments-display';
import { Resource } from '@/app/lib/definitions';

export default function CourseAttachmentsTab({ resources }: { resources: Resource[] }) {
    return (
        <AttachmentsDisplay resources={resources} />
    );
}