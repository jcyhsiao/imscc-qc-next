import Axe from "axe-core";

export interface Resource {
  title: string;
  moduleTitle?: string;
  identifier: string;
  identifierref: string | null;
  href?: string;
  published: boolean;
  clarifiedType?: string;
  contentType: string;
  analysisHref: string | null;
  analysisType: string | null;
  links: LinkObject[];
  videos: VideoObject[];
  attachments: FileObject[];
  accessibilityResults: EnhancedAxeResults | null;
}

export interface Module {
  identifier: string;
  title: string;
  items: ModuleItem[];
  published: boolean;
}

export interface ModuleItem {
  identifier: string;
  title: string;
  identifierRef: string | null;
  moduleTitle: string;
  published: boolean;
  indent: number;
  clarifiedType: string;
  contentType: string;
}


export interface VideoObject {
  title: string;
  platform: string;
  type: string;
  src: string;
  transcriptOrCaptionMentioned: boolean;
  // parentResourceTitle: string;
  parentResourceIdentifier: string;
}

export interface FileObject {
  href: string;
  parentAnchorText: string;
  parentResourceIdentifier: string;
  // parentResourceType: string;
  // parentResourceModuleTitle: string;
  // parentResourceTitle: string;
}

type LINK_TYPES = ["osu", "external", "course", "unknown"];
export type LinkType = LINK_TYPES[number];

export interface LinkObject {
  url: string;
  text: string;
  // parentResourceStatus: boolean;
  parentResourceIdentifier: string;
  // parentResourceTitle: string;
  // parentResourceType: string;
  type: LinkType;
}

type ACCESSIBILITY_RESULT_TYPES = ["violations", "passes", "incomplete"];
export type AccessibilityResultType = ACCESSIBILITY_RESULT_TYPES[number];

export type EnhancedAxeResult = Axe.Result & {
  type: string;
  parentResourceIdentifier: string;
  // parentItemTitle: string;
  // parentItemType: string;
  // parentItemPublished: boolean;
  // parentItemModuleTitle: string;
};

export type EnhancedAxeResults = Omit<
  Axe.AxeResults,
  "violations" | "passes" | "incomplete" | "inapplicable"
> & {
  // retire_violations: EnhancedAxeResult[];
  // retire_passes: EnhancedAxeResult[];
  // retire_incomplete: EnhancedAxeResult[];
  // retire_inapplicable: EnhancedAxeResult[];
  results: EnhancedAxeResult[];
};

export type ResourceObjectTypeLiteral = 'videos' | 'links' | 'files' | 'accessibilityResults';
export type ResourceObjectType = VideoObject | LinkObject | FileObject | EnhancedAxeResult | null;

export type PlatformDOMParser = DOMParser | null;
