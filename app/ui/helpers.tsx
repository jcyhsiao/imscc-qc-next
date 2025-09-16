import { Badge } from '@/app/components/CustomComponents'
import { Heading, MessagesSquare, FileQuestionMark, BookA, BookCheck, NotebookText, Link as LRLink, MessageCircleQuestionMark, Megaphone } from 'lucide-react';
import { JSX } from 'react';
import { getReadableType } from '@/app/lib/imscc-handling'

export const QC_BADGES = {
    accessibilityResultType: {
        passes: <Badge variant='positive'>Pass</Badge>,
        violations: <Badge variant='negative'>Violation</Badge>,
        incomplete: <Badge variant='info'>Investigate</Badge>,
        inapplicable: <Badge variant='neutral'>Inapplicable</Badge>
    },
    accessibilityViolationImpact: {
        critical: <Badge variant='purple'>Critical</Badge>,
        serious: <Badge variant='magenta'>Critical</Badge>,
        moderate: <Badge variant='fuchsia'>Moderate</Badge>,
        minor: <Badge variant='yellow'>Minor</Badge>,
        info: <Badge variant='indigo'>Info</Badge>,
    },
   linkType: {
    osu: <Badge variant='magenta'>OSU</Badge>,
    external: <Badge variant='seafoam'>External</Badge>,
    course: <Badge variant='yellow'>Course</Badge>,
    unknown: <Badge variant='neutral'>Unknown</Badge>,
   },
    publishStatus: {
        published: <Badge variant='positive'>Published</Badge>,
        unpublished: <Badge variant='negative'>Unpublished</Badge>,
    }
};

export function capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function getIconForItemType(type: string): JSX.Element {
    const ariaLabel = getReadableType(type) || 'unknown type';
    const sharedProps = {strokeWidth: 1, ariaLabel: {ariaLabel}};
    let icon: JSX.Element;

    switch (type) {
        case 'contextmodulesubheader':
            icon = <Heading {...sharedProps}/>;
            break;
        case 'assignment':
            icon = <BookA {...sharedProps} />;
            break;
        case 'page':
            icon = <NotebookText {...sharedProps} />
            break;
        case 'externalurl':
            icon = <LRLink {...sharedProps} />
            break;
        case 'survey':
            icon = <MessageCircleQuestionMark {...sharedProps}/>
            break;
        case 'quiz':
            icon = <BookCheck {...sharedProps}/>
            break;
        case 'announcement':
            icon = <Megaphone {...sharedProps}/>
            break;
        case 'discussion':
            icon = <MessagesSquare {...sharedProps}/>
            break;
        default:
            icon = <FileQuestionMark {...sharedProps}/>
    }

    return icon;
}

