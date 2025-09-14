import { LinksDisplay } from "@/app/ui/course_structure/links-display";
import { Resource } from "@/app/lib/definitions";
/*
import { Button } from "@adobe/react-spectrum";
import { useState } from "react";
import { checkLinks } from "@/app/lib/link-checker";
*/

export default function CourseLinksTab({resources}: {resources: Resource[]}) {
    return (
        <>
       <LinksDisplay resources={resources} />
        </>
    );
}