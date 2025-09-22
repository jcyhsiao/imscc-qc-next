import { LinksDisplay } from "@/app/ui/links-display";
import { Resource } from "@/app/lib/definitions";
/*
import { Button } from "@adobe/react-spectrum";
import { useState } from "react";
import { checkLinks } from "@/app/lib/link-checker";
*/

type Props = {
  resources: Resource[];
}

export default function CourseLinksTab({
  resources,
}: Props) {
  return (
    <>
      <LinksDisplay resources={resources} />
    </>
  );
}
