import { Badge, Icon, Text } from '@adobe/react-spectrum'
import { Heading, MessagesSquare, BookA, BookCheck, StickyNote, Link, MessageCircleQuestionMark, Megaphone } from 'lucide-react';
import { JSX } from 'react';
import { getReadableType } from '@/app/lib/file-handling'

export const QC_BADGES = {
    /*
    impact: {
        critical: createBadge('Critical', 'red'),
        serious: createBadge('Serious', 'pink'),
        moderate: createBadge('Moderate', 'yellow'),
        minor: createBadge('Minor', 'blue'),
        info: createBadge('Info'),
    },
    */
    status: {
        published: <Badge variant='positive'>Published</Badge>,
        unpublished: <Badge variant='negative'>Unpublished</Badge>,
    }
};

export function getIconForItemType(type: string): JSX.Element {
    const sharedProps = {};
    const ariaLabel = getReadableType(type);
    let icon: JSX.Element | null = null;

    switch (type) {
        case 'contextmodulesubheader':
            icon = <Heading />;
            break;
        case 'assignment':
            icon = <BookA />;
            break;
        case 'page':
            icon = <StickyNote />
            break;
        case 'externalurl':
            icon = <Link />
            break;
        case 'survey':
            icon = <MessageCircleQuestionMark />
            break;
        case 'quiz':
            icon = <BookCheck />
            break;
        case 'announcement':
            icon = <Megaphone />
            break;
        case 'discussion':
            icon = <MessagesSquare />
            break;
    }

    return (ariaLabel && icon)
        ? <Icon aria-label={ariaLabel} {...sharedProps}>{icon}</Icon>
        : <Text>getIconForItemType: ERROR label and/or icon null</Text>
}

