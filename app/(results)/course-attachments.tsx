import { AttachmentsDisplay } from '@/app/ui/attachments-display';
import { Resource } from '@/app/lib/definitions';

type Props = {
    resources: Resource[];
}

export default function CourseAttachmentsTab({ resources }: Props) {
    return (
        <AttachmentsDisplay resources={resources} />
    );
}