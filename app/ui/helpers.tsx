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

/**
 * A collection of pre-configured React Spectrum Badge components
 * for various quality control statuses and types.
 */
export const QC_BADGES = {
  /** Badges for different accessibility result types (e.g., pass, violation). */
  accessibilityResultType: {
    passes: <Badge variant="positive">Pass</Badge>,
    violations: <Badge variant="negative">Violation</Badge>,
    incomplete: <Badge variant="info">Investigate</Badge>,
    inapplicable: <Badge variant="neutral">Inapplicable</Badge>,
  },
  /** Badges indicating the impact level of an accessibility violation. */
  accessibilityViolationImpact: {
    critical: <Badge variant="purple">Critical</Badge>,
    serious: <Badge variant="fuchsia">Serious</Badge>,
    moderate: <Badge variant="magenta">Moderate</Badge>,
    minor: <Badge variant="yellow">Minor</Badge>,
    info: <Badge variant="indigo">Info</Badge>,
  },
  /** Badges for different types of links (e.g., OSU internal, external). */
  linkType: {
    osu: <Badge variant="magenta">OSU</Badge>,
    external: <Badge variant="indigo">External</Badge>,
    course: <Badge variant="yellow">Course</Badge>,
    unknown: <Badge variant="neutral">Unknown</Badge>,
  },
  /** Badges indicating the published status of an item. */
  publishStatus: {
    published: <Badge variant="positive">Published</Badge>,
    unpublished: <Badge variant="negative">Unpublished</Badge>,
  },
};

/**
 * Capitalizes the first letter of a given string.
 * If the string is empty or null, it returns an empty string.
 *
 * @param s The input string.
 * @returns The string with its first letter capitalized, or an empty string.
 */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/**
 * Returns a Lucide React icon component based on the provided item type.
 * Each icon includes an `aria-label` derived from the readable type.
 *
 * @param type The string identifier for the item type (e.g., "assignment", "page").
 * @returns A JSX.Element representing the corresponding icon. Defaults to a question mark icon if type is unknown.
 */
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
