import Axe from 'axe-core';

export interface Resource {
    title: string,
    moduleTitle?: string,
    identifier: string,
    identifierref: string | null,
    href?: string,
    published: boolean,
    clarifiedType: string,
    contentType: string,
    analysisHref: string | null,
    analysisType: string | null
};

export interface Module {
    title: string,
    items: ModuleItem[],
    published: boolean,
};

export interface ModuleItem {
    identifier: string,
    title: string,
    identifierRef: string | null,
    moduleTitle: string,
    published: boolean,
    indent: number,
    clarifiedType: string,
    contentType: string,
}

export interface VideoObject {
    title: string;
    platform: string;
    type: string;
    src: string;
    transcriptOrCaptionMentioned: boolean;
    parentResourceTitle: string;
}

export interface FileObject {
    href: string;
    parentAnchorText: string;
    parentResourceType: string;
    parentResourceModuleTitle: string;
    parentResourceTitle: string;
};

const LINK_TYPES = ['osu', 'external', 'course', 'unknown'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export interface LinkObject {
    url: string;
    text: string;
    parentResourceTitle: string;
    type: LinkType;
};

export type EnhancedAxeResult = Axe.Result & {
    type: string,
    parentItemTitle: string,
    parentItemType: string,
    parentItemPublished: boolean,
    parentItemModuleTitle: string,
};

export type EnhancedAxeResults = Omit<Axe.AxeResults, 'violations' | 'passes' | 'incomplete' | 'inapplicable'> & {
    violations: EnhancedAxeResult[],
    passes: EnhancedAxeResult[],
    incomplete: EnhancedAxeResult[],
    inapplicable: EnhancedAxeResult[]
};

export type PlatformDOMParser = DOMParser | null;