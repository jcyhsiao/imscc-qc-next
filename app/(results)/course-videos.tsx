import { Resource } from '@/app/lib/definitions';
import VideosDisplay from '@/app/ui/videos-display';

type Props = {
    resources: Resource[];
}

export default function CourseVideosTab({resources}: Props) {

  return (
    <VideosDisplay resources={resources} />
  );
}