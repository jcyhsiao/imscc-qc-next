import { EnhancedAxeResults, Resource } from "../lib/definitions"
import { AccessibilityResultsDisplay } from "@/app/ui/course_structure/accessibility-result-display";

type Props = {
    resources: Resource[];
    results: EnhancedAxeResults;
}

export default function AccessibilityCheckTab({resources, results}: Props) {

    return (


        <AccessibilityResultsDisplay results={results} />

    );
}

