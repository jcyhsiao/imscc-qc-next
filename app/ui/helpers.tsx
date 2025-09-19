import { Badge } from "@adobe/react-spectrum";
import {
  Heading,
  MessagesSquare,
  FileQuestionMark,
  BookA,
  BookCheck,
  NotebookText,
  Link as LRLink,
  MessageCircleQuestionMark,
  Megaphone,
} from "lucide-react";
import { JSX } from "react";
import { getReadableType } from "@/app/lib/imscc-handling";

export const QC_BADGES = {
  accessibilityResultType: {
    passes: <Badge variant="positive">Pass</Badge>,
    violations: <Badge variant="negative">Violation</Badge>,
    incomplete: <Badge variant="info">Investigate</Badge>,
    inapplicable: <Badge variant="neutral">Inapplicable</Badge>,
  },
  accessibilityViolationImpact: {
    critical: <Badge variant="purple">Critical</Badge>,
    serious: <Badge variant="fuchsia">Serious</Badge>,
    moderate: <Badge variant="magenta">Moderate</Badge>,
    minor: <Badge variant="yellow">Minor</Badge>,
    info: <Badge variant="indigo">Info</Badge>,
  },
  linkType: {
    osu: <Badge variant="magenta">OSU</Badge>,
    external: <Badge variant="indigo">External</Badge>,
    course: <Badge variant="yellow">Course</Badge>,
    unknown: <Badge variant="neutral">Unknown</Badge>,
  },
  publishStatus: {
    published: <Badge variant="positive">Published</Badge>,
    unpublished: <Badge variant="negative">Unpublished</Badge>,
  },
};

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export function getIconForItemType(type: string): JSX.Element {
  const ariaLabel = getReadableType(type) || "unknown type";
  const sharedProps = { strokeWidth: 1 };
  let icon: JSX.Element;

  switch (type) {
    case "contextmodulesubheader":
      icon = <Heading aria-label={ariaLabel} {...sharedProps} />;
      break;
    case "assignment":
      icon = <BookA aria-label={ariaLabel} {...sharedProps} />;
      break;
    case "page":
      icon = <NotebookText aria-label={ariaLabel} {...sharedProps} />;
      break;
    case "externalurl":
      icon = <LRLink aria-label={ariaLabel} {...sharedProps} />;
      break;
    case "survey":
      icon = <MessageCircleQuestionMark aria-label={ariaLabel} {...sharedProps} />;
      break;
    case "quiz":
      icon = <BookCheck aria-label={ariaLabel} {...sharedProps} />;
      break;
    case "announcement":
      icon = <Megaphone aria-label={ariaLabel} {...sharedProps} />;
      break;
    case "discussion":
      icon = <MessagesSquare aria-label={ariaLabel} {...sharedProps} />;
      break;
    default:
      icon = <FileQuestionMark aria-label={ariaLabel} {...sharedProps} />;
  }

  return icon;
}
