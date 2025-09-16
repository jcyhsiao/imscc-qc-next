import { Module } from '@/app/lib/definitions';
import { ModulesDisplay } from '@/app/ui/course_structure/modules-display';
import { Text } from '@/app/components/CustomComponents';
import { Suspense } from 'react';

export default function CourseStructureTab({ modules }: { modules: Module[] }) {
    return (
        <Suspense fallback={<Text>Loading modules...</Text>}>
            {
            modules.length > 0
                ? <ModulesDisplay modules={modules} />
                : <Text>ERROR: No modules found</Text>
            }
        </Suspense>
    )
}