import { Resource } from "../lib/definitions";
import { AccessibilityResultsDisplay } from "@/app/ui/accessibility-result-display";

type Props = {
  resources: Resource[];
};

export default function AccessibilityCheckTab({ resources }: Props) {
  return <AccessibilityResultsDisplay resources={resources} />;
}
