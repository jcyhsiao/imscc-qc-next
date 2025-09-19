import { Resource } from '@/app/lib/definitions';
import VideosDisplay from '@/app/ui/videos-display';

export default function CourseVideosTab({resources}: {resources: Resource[]}) {

  return (
    <VideosDisplay resources={resources} />
  );
}