import { EnhancedAxeResult } from "@/app/lib/definitions";
import { Accordion, Disclosure, DisclosureTitle, DisclosurePanel, Link, Text, TextArea, View } from "@adobe/react-spectrum";
import Axe from "axe-core";



export function AxeResultDisplay(type: string, result: Axe.Result) {
    // Safe access for nodes array to avoid undefined errors
    const nodeHtml = (result.nodes && result.nodes[0] && result.nodes[0].html) ? result.nodes[0].html.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const nodeTargets = (result.nodes && result.nodes[0] && result.nodes[0].target) ? result.nodes[0].target.join(', ') : '';

    return (
            <Disclosure id={result.id}>
                <DisclosureTitle>
                    {type} {result.help} {result.impact?.toString()}
                </DisclosureTitle>
                <DisclosurePanel>
                    <View>
                        <Text>Description:</Text>
                        {result.description}
                        <Text>Affected Element:</Text>
                        <TextArea defaultValue={nodeHtml} isReadOnly />
                        <Text>CSS Selector:</Text>
                        <Text>{nodeTargets}</Text>
                        <Link href={result.helpUrl} target="_blank" rel="noopener noreferrer">More Info</Link>
                    </View>
                </DisclosurePanel>
            </Disclosure>
    );
}