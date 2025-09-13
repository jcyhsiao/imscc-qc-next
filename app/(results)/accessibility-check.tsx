import { EnhancedAxeResults } from "../lib/definitions"
import { AccessibilityResultsDisplay } from "@/app/ui/course_structure/accessibility-result-display";

type Props = {
    results: EnhancedAxeResults;
}

export default function AccessibilityCheckTab({results}: Props) {

    return (


        <AccessibilityResultsDisplay results={results} />

    );
}

