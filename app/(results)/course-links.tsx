import { LinksDisplay } from "@/app/ui/course_structure/links-display";
import { LinkObject } from "@/app/lib/definitions";
import { Button } from "@adobe/react-spectrum";
import { useState } from "react";
import { checkLinks } from "@/app/lib/link-checker";

export default function CourseLinksTab({links}: {links: LinkObject[]}) {
    const [linkCheckStarted, setLinkCheckStarted] = useState(false);
    const [linkCheckCompleted, setLinkCheckCompleted] = useState(false);
    let linkCheckResults: { [key: string]: string } = {};

    const startLinkCheck = async () => {
        setLinkCheckCompleted(false);
        setLinkCheckStarted(true);
        const urls = links.map(link => link.url);
        const results = await checkLinks(urls);
        linkCheckResults = results;
        setLinkCheckStarted(false);
        setLinkCheckCompleted(true);
    }

    return (
        <>
        {/* <Button variant="primary" onPress={startLinkCheck}>Check Links</Button> */}
        <LinksDisplay links={links} linkCheckResults={linkCheckResults} />
        </>
    );
}