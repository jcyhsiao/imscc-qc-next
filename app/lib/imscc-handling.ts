import { PlatformDOMParser } from "@/app/lib/definitions";
import { Module, ModuleItem, Resource } from "@/app/lib/definitions";
import {
  LinkObject,
  LinkType,
  VideoObject,
  FileObject,
} from "@/app/lib/definitions";
import { EnhancedAxeResult, EnhancedAxeResults } from "@/app/lib/definitions";
import type * as Axe from "axe-core";

import axe from "axe-core";
import JSZip from "jszip";

/**
 * Extracts files from the provided IMSCC ZIP archive.
 * It filters out directory entries and files starting with "web_resources/".
 *
 * @param file The File object or ArrayBuffer representing the ZIP archive.
 * @returns A Promise that resolves to an object mapping file names (paths) to their string content.
 * @throws If there's an error loading or processing the ZIP file.
 */
export async function extractIMSCC(
  file: File | ArrayBuffer,
): Promise<{ [key: string]: string }> {
  try {
    const zip = await JSZip.loadAsync(file);

    const fileContents: { [key: string]: string } = {};
    const zipFiles = Object.values(zip.files).filter(
      (f) => !f.dir && !f.name.startsWith("web_resources/"),
    );

    for (const zipEntry of zipFiles) {
      const content = await zipEntry.async("string");
      fileContents[zipEntry.name] = content;
    }
    return fileContents;
  } catch (error) {
    throw error;
  }
}

/**
 * Inventories and processes the `imsmanifest.xml` file from an IMSCC package
 * to extract information about all resources. It identifies resource types,
 * titles, publication status, and relevant file paths for further analysis.
 *
 * @param parser A DOMParser instance for parsing XML/HTML content.
 * @param fileContents An object mapping file paths to their string content from the IMSCC package.
 * @returns A Promise that resolves to an array of `Resource` objects, each representing a resource found in the manifest.
 * @throws If `imsmanifest.xml` is not found or if critical data is missing.
 */
export async function inventoryIMSCCManifest(
  parser: PlatformDOMParser,
  fileContents: { [key: string]: string },
): Promise<Resource[]> {
  if (parser === null) throw Error("inventoryIMSCC: parser is null.");

  const allResources: Resource[] = [];

  // Map of resource items gathered from imsmanifest.xml
  const manifestFileContent = fileContents["imsmanifest.xml"];
  if (!manifestFileContent) {
    throw Error("processAndAnalyze: imsmanifest.xml not found in the archive.");
  }

  const manifestFileContentParsed = parser.parseFromString(
    manifestFileContent,
    "application/xml",
  );
  const manifestSupportingResourceElements: string[] = [];

  /**
   * Helper to find a manifest <resource> element by an identifier (e.g., its corresponding <item>'s identifierref).
   * @param id The identifier to search for.
   * @returns The matching Element or null if not found.
   */
  const findManifestResourceElementByIentifier = (
    id: string | null,
  ): Element | null => {
    if (!id) return null;
    return (
      Array.from(
        manifestFileContentParsed.getElementsByTagName("resource"),
      ).find((i) => i.getAttribute("identifier") === id) || null
    );
  };

  // Gather all manifest <resource> elements
  const manifestResourceElements = Array.from(
    manifestFileContentParsed.getElementsByTagName("resource"),
  );
  for (const manifestResourceElement of manifestResourceElements) {
    const resourceIdentifier =
      manifestResourceElement.getAttribute("identifier")!;
    const resourceHref = manifestResourceElement.getAttribute("href");
    let resourceFileHref = manifestResourceElement.getElementsByTagName('file')?.[0].getAttribute('href');
    const resourceType = manifestResourceElement.getAttribute("type")!;

    // Skip supporting element (e.g., files referenced by other resources)
    if (
      resourceIdentifier &&
      manifestSupportingResourceElements.includes(resourceIdentifier)
    )
      continue;

    // Skip several types of resources based on type or href patterns
    if (
      // LTIs
      resourceType === "imsbasiclti_xmlv1p3" ||
      // Question banks
      resourceHref?.includes("non_cc_assessments") ||
      // Course settings entry
      resourceHref?.includes("canvas_export.txt") ||
      // File (web_resources are handled separately or skipped)
      (resourceType === "webcontent" &&
        resourceHref &&
        resourceHref.startsWith("web_resources/"))
    )
      continue;

    // Set up new Resource object
    let resourceStatus = false;
    let resourceTitle = "untitled";
    let resourceAnalysisHref: string | null = null;
    let resourceAnalysisType = "html"; // Default analysis type
    let resourceClarifiedType: string | null = null;
    let resourceIdentifierRef: string | null = null;

    // Determine specific resource categories based on type and href
    const isAssignment =
      resourceType.includes(
        "associatedcontent/imscc_xmlv1p1/learning-application-resource",
      ) &&
      resourceHref &&
      resourceHref.endsWith("html") &&
      !resourceHref.startsWith("course_settings/");

    const isQuizOrSurvey = resourceType.includes(
      "imsqti_xmlv1p2/imscc_xmlv1p1/assessment",
    );

    const isDiscussion = resourceType.includes("imsdt_xmlv1p1");

    const isPage =
      resourceType === "webcontent" &&
      resourceHref &&
      resourceHref.startsWith("wiki_content/");

    const isSyllabus =
      resourceIdentifier.endsWith("_syllabus") &&
      resourceHref;

    const isLink =
      resourceType === 'imswl_xmlv1p1' &&
      resourceFileHref;


    let analysisHref = resourceFileHref;
    // Set clarified type and set up parsing
    // Update resourceFileHref as needed
    let resourceContentParseType: DOMParserSupportedType | '' = ''; // Explicitly type as DOMParserSupportedType or empty string
    let discussionSettingsHref = '';
    if (isLink) {
      resourceClarifiedType = 'modulelink';
      resourceContentParseType = 'application/xml';
    }

    if (isSyllabus) {
      resourceClarifiedType = 'syllabus';
      resourceContentParseType = 'text/html';
    }

    if (isPage) {
      resourceClarifiedType = "page";
      resourceContentParseType = 'text/html';
    }

    if (isAssignment) {
      resourceFileHref = Object.keys(fileContents).find(
        (fileName) =>
          fileName.startsWith(`${resourceIdentifier}/`) &&
          fileName.endsWith("assignment_settings.xml"),
      ) || null;

      resourceClarifiedType = "assignment";
      resourceContentParseType = 'application/xml';
      analysisHref = Object.keys(fileContents).find(
        (fileName) =>
          fileName.startsWith(`${resourceIdentifier}/`) &&
          fileName.endsWith(".html"),
      ) || '';
    }

    if (isDiscussion || isQuizOrSurvey) {
      resourceIdentifierRef =
        manifestResourceElement.getElementsByTagName("dependency").length > 0
          ? manifestResourceElement
            .getElementsByTagName("dependency")[0]
            .getAttribute("identifierref")!
          : null;
      const matchingManifestResourceElement =
        findManifestResourceElementByIentifier(resourceIdentifierRef);

      if (
        matchingManifestResourceElement &&
        fileContents[matchingManifestResourceElement.getAttribute("href")!]
      ) {
        const matchingManifestResourceElementIdentifier =
          matchingManifestResourceElement.getAttribute("identifier");
        if (matchingManifestResourceElementIdentifier === null)
          throw new Error(
            "matchingManifestResourceElementIdentifier should NOT be null.",
          );
        manifestSupportingResourceElements.push(
          matchingManifestResourceElementIdentifier,
        );

        if (isQuizOrSurvey) {
          resourceContentParseType = 'application/xml';
          // Setting clarifiedType after getting resourceDoc

          analysisHref =
            matchingManifestResourceElement.getAttribute("href");
          resourceAnalysisType = "xml";
          if (analysisHref === null)
            throw new Error("resourceAnalysisHref should NOT be null.");
          resourceFileHref = analysisHref;
        }

        if (isDiscussion) {
          resourceContentParseType = 'application/xml';
          // Setting clarifiedType after getting resourceDoc

          const discussionXmlPath = `${resourceIdentifier}.xml`;
          analysisHref = discussionXmlPath;
          resourceFileHref = discussionXmlPath;
          resourceAnalysisType = 'discussion_xml';

          const settingsHref =
            matchingManifestResourceElement.getAttribute("href");
          if (settingsHref === null)
            throw new Error("settingsHref should NOT be null.");
          discussionSettingsHref = settingsHref;
        }
      }
    }

    // If a primary content file is identified, parse it to extract title and status
    if (resourceFileHref) {
      const resourceContent = fileContents[resourceFileHref]

      if (resourceContent) {
        const resourceDoc = parser.parseFromString(
          resourceContent,
          resourceContentParseType as DOMParserSupportedType,
        );

        resourceTitle = resourceDoc.getElementsByTagName("title").length > 0
          ? resourceDoc.getElementsByTagName("title")[0].textContent ||
          resourceTitle
          : resourceTitle;

        // Set status
        if (isSyllabus) {
          // This is not necessarily true; but not worth trying to parse through other things
          resourceStatus = true;
        }
        if (isPage) {
          const metaElements = Array.from(resourceDoc.getElementsByTagName("meta"));
          const workflowStateMeta = metaElements.find(
            (meta) => meta.getAttribute("name") === "workflow_state",
          );
          resourceStatus =
            workflowStateMeta?.getAttribute("content") === "active"
              ? true
              : false;
        }
        if (isAssignment) {
          resourceStatus =
            resourceDoc.getElementsByTagName("workflow_state").length > 0 &&
              resourceDoc.getElementsByTagName("workflow_state")[0].textContent ===
              "active"
              ? true
              : false;
        }
        if (isDiscussion) {
          const discussionSettingsDoc = parser.parseFromString(
            fileContents[discussionSettingsHref],
            "application/xml",
          );
          if (discussionSettingsDoc) {
            resourceStatus =
              discussionSettingsDoc.getElementsByTagName("workflow_state").length >
                0 &&
                discussionSettingsDoc.getElementsByTagName("workflow_state")[0]
                  .textContent === "active"
                ? true
                : false;
          }
          // const discussionType = itemSettingsDoc.querySelector('type')?.textContent;
          const discussionType =
            discussionSettingsDoc.getElementsByTagName("type").length > 0
              ? discussionSettingsDoc.getElementsByTagName("type")[0].textContent
              : null;
          if (discussionType === "announcement") {
            resourceClarifiedType = "announcement";
          } else {
            resourceClarifiedType = 'discussion'
          }
        }
        if (isQuizOrSurvey) {
          resourceStatus =
            resourceDoc.getElementsByTagName("available").length > 0 &&
              resourceDoc.getElementsByTagName("available")[0].textContent ===
              "true"
              ? true
              : false;

          // Set clarifiedType for quiz or survey
          const quizType =
            resourceDoc.getElementsByTagName("quiz_type").length > 0
              ? resourceDoc.getElementsByTagName("quiz_type")[0].textContent
              : null;
          if (quizType === "survey") {
            resourceClarifiedType = "survey";
          } else {
            resourceClarifiedType = "quiz";
          }
        }
      }
      // Finally set the resoruceAnalysisHref
      resourceAnalysisHref = analysisHref;
    }

    // If a clarified type was not determined, skip this resource
    if (!resourceClarifiedType) continue;

    // Add the processed resource to the list
    allResources.push({
      identifier: resourceIdentifier,
      title: resourceTitle,
      identifierref: resourceIdentifierRef,
      published: resourceStatus,
      clarifiedType: resourceClarifiedType,
      contentType: resourceType,
      analysisHref: resourceAnalysisHref,
      analysisType: resourceAnalysisType,
      links: [],
      videos: [],
      attachments: [],
      accessibilityResults: null,
    });

  }

  return allResources;
}

/**
 * Inventories and processes the `module_meta.xml` file to extract information about modules and their items.
 *
 * @param parser A DOMParser instance for parsing XML content.
 * @param fileContents An object mapping file paths to their string content from the IMSCC package.
 * @returns A Promise that resolves to an array of `Module` objects.
 * @throws If `course_settings/module_meta.xml` is not found.
 */
export async function inventoryIMSCCModules(
  parser: PlatformDOMParser,
  fileContents: { [key: string]: string },
): Promise<Module[]> {
  if (parser === null) throw Error("inventoryIMSCCModules: parser is null.");

  const allModules: Module[] = [];

  // Gather modules and module contents
  const metaModuleFileContent = fileContents["course_settings/module_meta.xml"];
  if (!metaModuleFileContent) {
    throw new Error(
      "course_settings/module_meta.xml not found in the archive.",
    );
  }

  const moduleMetaFileContentParsed = parser.parseFromString(
    metaModuleFileContent,
    "application/xml",
  );
  const metaModuleElements = Array.from(
    moduleMetaFileContentParsed.getElementsByTagName("module"),
  );
  metaModuleElements.forEach((metaModuleElement) => {
    const moduleItems: ModuleItem[] = [];

    const moduleTitle =
      metaModuleElement.getElementsByTagName("title").length > 0
        ? metaModuleElement.getElementsByTagName("title")[0].textContent!
        : "ERROR: untitled module";
    const moduleStatus =
      metaModuleElement.getElementsByTagName("workflow_state").length > 0 &&
        metaModuleElement.getElementsByTagName("workflow_state")[0]
          .textContent === "active"
        ? true
        : false;
    const moduleIdentifier = metaModuleElement.getAttribute("identifier")!;

    const metaModuleItemElements = Array.from(
      metaModuleElement.getElementsByTagName("item"),
    );
    metaModuleItemElements.forEach((metaModuleItemElement) => {
      const moduleItemIdentifier =
        metaModuleItemElement.getAttribute("identifier")!;
      const itemIndent = parseInt(
        metaModuleItemElement.getElementsByTagName("indent").length > 0
          ? metaModuleItemElement.getElementsByTagName("indent")[0].textContent!
          : "0",
        10,
      );
      const itemStatus =
        metaModuleItemElement.getElementsByTagName("workflow_state").length >
          0 &&
          metaModuleItemElement.getElementsByTagName("workflow_state")[0]
            .textContent === "active"
          ? true
          : false;
      const itemContentType =
        metaModuleItemElement.getElementsByTagName("content_type").length > 0
          ? metaModuleItemElement.getElementsByTagName("content_type")[0]
            .textContent!
          : "ERROR: no content_type";
      const itemTitle =
        metaModuleItemElement.getElementsByTagName("title").length > 0
          ? metaModuleItemElement.getElementsByTagName("title")[0].textContent!
          : "ERROR: untitled item";
      const moduleItemIdentifierRef =
        metaModuleItemElement.getElementsByTagName("identifierref").length > 0
          ? metaModuleItemElement.getElementsByTagName("identifierref")[0]
            .textContent || null
          : null;

      const moduleItem: ModuleItem = {
        identifier: moduleItemIdentifier,
        title: itemTitle,
        identifierRef: moduleItemIdentifierRef,
        moduleTitle: moduleTitle,
        published: itemStatus,
        indent: itemIndent,
        clarifiedType: "tbd",
        contentType: itemContentType,
      };

      moduleItems.push(moduleItem);
    });

    const moduleObj = {
      identifier: moduleIdentifier,
      title: moduleTitle,
      items: moduleItems,
      published: moduleStatus,
    };

    allModules.push(moduleObj);
  });

  return allModules;
}

/**
 * Reconciles module items with their corresponding resources.
 * It updates the `clarifiedType` of module items and adds `moduleTitle` to resources.
 *
 * @param allModules An array of `Module` objects.
 * @param allResources An array of `Resource` objects.
 */
export function reconcileIMSCCModulesAndResources(
  allModules: Module[],
  allResources: Resource[],
) {
  const reconciledModules: Module[] = [...allModules];
  const reconciledResources: Resource[] = [...allResources];

  reconciledModules.forEach((module) => {
    module.items.forEach((item) => {
      const matchingResource = reconciledResources.find(
        (r) => r.identifier === item.identifierRef,
      );

      if (matchingResource) {
        item.clarifiedType =
          matchingResource?.clarifiedType || item.contentType;
        matchingResource.moduleTitle = item.moduleTitle;
      }
    });
  });

  // TODO: The original code reassigns to allModules and allResources,
  // but if these are passed as state, this reassignment won't update the state.
  // It's generally better to return the reconciled arrays or ensure they are mutable references.
  // For now, keeping the original assignment behavior.
  allModules = reconciledModules;
  allResources = reconciledResources;
}


/**
 * Analyzes the content of each resource to identify embedded links, file attachments, and videos.
 * It parses the resource's content (HTML or XML) and populates the `links`, `attachments`,
 * and `videos` arrays within each `Resource` object.
 *
 * @param parser A DOMParser instance for parsing XML/HTML content.
 * @param resources An array of `Resource` objects to analyze.
 * @param fileContents An object mapping file paths to their string content from the IMSCC package.
 * @throws If `parser` is null.
 */
export async function identifyObjectsInIMSCCResources(
  parser: PlatformDOMParser,
  resources: Resource[],
  fileContents: { [key: string]: string },
) {
  if (parser === null) throw Error("analyzeIMSCCContent: parser is null.");

  for (const resource of resources) {
    if (!resource.analysisHref) continue; // Skip if no content to analyze

    const fileContent = fileContents[resource.analysisHref];
    if (!fileContent) continue; // Skip if content file is missing

    const allLinks: LinkObject[] = [],
      allAttachments: FileObject[] = [],
      allVideos: VideoObject[] = [];

    let richContent: Document;
    // Parse content based on its analysis type
    if (resource.analysisType === "xml") {
      const xmlDoc = parser.parseFromString(fileContent, "application/xml");
      const description =
        xmlDoc.getElementsByTagName("description").length > 0
          ? xmlDoc.getElementsByTagName("description")[0]
          : null;
      const htmlContent = description ? description.textContent : "";
      richContent = parser.parseFromString(htmlContent, "text/html");
    } else if (resource.analysisType === "discussion_xml") {
      const xmlDoc = parser.parseFromString(fileContent, "application/xml");
      const text =
        xmlDoc.getElementsByTagName("text").length > 0
          ? xmlDoc.getElementsByTagName("text")[0]
          : null;
      const htmlContent = text ? text.textContent : "";
      richContent = parser.parseFromString(htmlContent, "text/html");
    } else {
      // Default to HTML parsing
      richContent = parser.parseFromString(fileContent, "text/html");
    }

    // Find and collect various objects
    allLinks.push(...findLinks(richContent, resource));
    allAttachments.push(...findFileAttachments(richContent, resource));
    allVideos.push(...findVideos(richContent, resource));

    // Assign collected objects back to the resource
    resource.links = allLinks;
    resource.attachments = allAttachments;
    resource.videos = allVideos;
  }
}

/**
 * Runs axe-core accessibility checks on the content of each resource and
 * prepares the results for display in the accessibility tab.
 *
 * @param parser A DOMParser instance for parsing XML/HTML content.
 * @param resources An array of `Resource` objects to check.
 * @param fileContents An object mapping file paths to their string content from the IMSCC package.
 * @throws If `parser` is null.
 */
export async function checkIMSCCResourcesForAccessibility(
  parser: PlatformDOMParser,
  resources: Resource[],
  fileContents: { [key: string]: string },
) {
  if (parser === null)
    throw Error("checkIMSCCResourcesForAccessibility: parser is null.");

  for (const resource of resources) {
    if (!resource.analysisHref) continue; // Skip if no content to analyze
    const content = fileContents[resource.analysisHref];
    if (!content) continue; // Skip if content file is missing

    let allResults: EnhancedAxeResults | null = null;
    let doc: Document;

    // Parse content based on its analysis type
    if (resource.analysisType === "xml") {
      const xmlDoc = parser.parseFromString(content, "application/xml");
      const description =
        xmlDoc.getElementsByTagName("description").length > 0
          ? xmlDoc.getElementsByTagName("description")[0]
          : null;
      const htmlContent = description ? description.textContent : "";
      doc = parser.parseFromString(htmlContent, "text/html");
    } else if (resource.analysisType === "discussion_xml") {
      const xmlDoc = parser.parseFromString(content, "application/xml");
      const text =
        xmlDoc.getElementsByTagName("text").length > 0
          ? xmlDoc.getElementsByTagName("text")[0]
          : null;
      const htmlContent = text ? text.textContent : "";
      doc = parser.parseFromString(htmlContent, "text/html");
    } else {
      // Default to HTML parsing
      doc = parser.parseFromString(content, "text/html");
    }

    // Run axe-core only if the document body has content
    if (doc.body && doc.body.innerHTML.trim() !== "") {
      try {
        if (doc.body.querySelectorAll("*").length > 0) {
          const axeOptions = {
            preload: false,
            runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"], // Specify accessibility standards
          };
          const results = await axe.run(
            doc.body.querySelectorAll("*"), // Scan all elements in the body
            axeOptions,
          );

          /**
           * Adds metadata to an Axe.Result object, enhancing it for display.
           * @param type The type of accessibility result (e.g., "violations", "passes").
           * @param issue The raw Axe.Result object.
           * @returns An EnhancedAxeResult object with additional context.
           */
          const addMetadata = (type: string, issue: Axe.Result) => {
            const nodesHTML = issue.nodes.map((node) => node.html);

            return ({
              type,
              parentResourceIdentifier: resource.identifier,
              parentResourceTitle: resource.title,
              parentResourceType:
                getReadableType(resource.clarifiedType) ||
                "ERROR: unknown type",
              parentResourcePublished: resource.published,
              parentResourceModuleTitle: resource.moduleTitle || undefined,
              ...issue,
              nodesHTML: nodesHTML,
            }) as EnhancedAxeResult;
          }

          // If allResults hasn't been initialized yet, do so now
          if (allResults === null)
            allResults = {
              ...results,
              results: [] // Initialize the combined results array
            };

          // Map and push results from different categories
          allResults.results.push(
            ...results.violations.map((issue) =>
              addMetadata("violations", issue),
            ),
          );
          allResults.results.push(
            ...results.passes.map((issue) => addMetadata("passes", issue)),
          );
          allResults.results.push(
            ...results.incomplete.map((issue) =>
              addMetadata("incomplete", issue),
            ),
          );
          allResults.results.push(
            ...results.inapplicable.map((issue) =>
              addMetadata("inapplicable", issue),
            ),
          );

          if (!allResults)
            throw Error(
              "checkIMSCCResourcesForAccessibility: allResults should NOT be null.",
            );
          resource.accessibilityResults = allResults;
        }
      } catch (e) {
        console.warn(
          `Accessibility scan skipped for ${resource.title}: ${(e as Error).message}`,
        );
      }
    }
  }
}

/* =========================================================================
           Helpers
    ========================================================================= */

/**
 * Finds external and internal links within a given HTML document.
 * It filters out anchor links, mailto links, and specific Canvas file links.
 *
 * @param doc The HTML Document to search for links.
 * @param item The parent `Resource` object to associate with the links.
 * @returns An array of `LinkObject`s found in the document.
 */
function findLinks(doc: Document, item: Resource): LinkObject[] {
  const links: LinkObject[] = [];
  if (!doc) return links;

  // Select all <a> tags with an href attribute and <url> tags with an href attribute (specific to module links)
  const aElements = Array.from(doc.getElementsByTagName("a")).filter((a) =>
    a.hasAttribute("href"),
  );
  const urlElements = Array.from(doc.getElementsByTagName("url")).filter((url) =>
    url.hasAttribute('href'),
  );

  const aAndUrlElements = [...aElements, ...urlElements];

  aAndUrlElements.forEach((a) => {
    const href = (a as HTMLAnchorElement).getAttribute("href"); // Cast to HTMLAnchorElement for href property
    if (
      href &&
      !href.startsWith("#") && // Skip anchor links
      !href.startsWith("mailto") && // Skip mailto links
      !a.classList.contains("instructure_file_link") && // Skip Canvas file links
      !a.classList.contains("instructure_scribd_file") // Skip Canvas Scribd links
    ) {
      let type = "unknown";
      if (href.startsWith("$CANVAS") || href.includes("$WIKI_REFERENCE$")) {
        type = "course"; // Internal Canvas course link
      } else if (
        href.includes(".osu.edu") ||
        href.includes(".ohio-state.edu")
      ) {
        type = "osu"; // Ohio State University domain link
      } else {
        type = "external"; // External link
      }
      links.push({
        url: href,
        text: a.textContent?.trim() || '', // Ensure textContent is not null
        parentResourceIdentifier: item.identifier,
        parentResourceStatus: item.published,
        parentResourceTitle: item.title,
        parentResourceType:
          getReadableType(item.clarifiedType) || "ERROR: unknown type",
        parentResourceModuleTitle: item.moduleTitle || undefined,
        type: type as LinkType,
      });
    }
  });
  return links;
}

/**
 * Finds file attachment links (specifically Canvas-style file links) within a given HTML document.
 *
 * @param doc The HTML Document to search for file attachments.
 * @param item The parent `Resource` object to associate with the attachments.
 * @returns An array of `FileObject`s found in the document.
 */
function findFileAttachments(doc: Document, item: Resource): FileObject[] {
  const attachments: FileObject[] = [];

  if (!doc) return attachments;
  // Select <a> tags with specific Canvas file link classes
  const aElements = Array.from(doc.getElementsByTagName("a")).filter(
    (a) =>
      a.classList.contains("instructure_file_link") ||
      a.classList.contains("instructure_scribd_file"),
  );

  // /\.[a-zA-Z0-9]+(?=[\?#]|$)/ // Original regex comment

  aElements.forEach((a) => {
    let anchorText = a.textContent?.trim(); // Ensure textContent is not null
    if (anchorText === '') anchorText = '(REMEDIATE: Phantom Link)'; // Placeholder for empty link text
    const id = item.identifier;
    const href = (a as HTMLAnchorElement).href; // Cast to HTMLAnchorElement for href property

    // Regex to extract file extension from the URL
    const regex = /\.[a-zA-Z0-9]+(?=[\?#]|$)/;
    const extMatch = href.match(regex);

    const ext = extMatch ? extMatch[0] : undefined; // The matched extension including the dot

    attachments.push({
      parentAnchorText: anchorText,
      parentResourceIdentifier: id,
      parentResourceStatus: item.published,
      parentResourceTitle: item.title,
      parentResourceType:
        getReadableType(item.clarifiedType) || "ERROR: unknown type",
      parentResourceModuleTitle: item.moduleTitle || undefined,
      href: href,
      extension: ext,
    });
  });

  return attachments;
}

/**
 * Finds embedded video elements (video tags, iframes, or links to video platforms)
 * within a given HTML document.
 *
 * @param doc The HTML Document to search for videos.
 * @param item The parent `Resource` object to associate with the videos.
 * @returns An array of `VideoObject`s found in the document.
 */
function findVideos(doc: Document, item: Resource): VideoObject[] {
  const videos: VideoObject[] = [];

  if (!doc) return videos;

  /**
   * Determines the video platform based on the source URL.
   * @param src The source URL of the video.
   * @returns The identified platform name (e.g., 'youtube', 'vimeo', 'instructure') or 'unknown'.
   */
  function videoPlatform(src: string): string {
    const knownPlatforms = {
      'youtube': ['www.youtube.com/embed/', 'www.youtube.com/watch', 'youtu.be'],
      'vimeo': ['player.vimeo.com', 'vimeo.com'],
      'mediasite': [
        'https://mediasite.osu.edu/mediasite/lti/home/coverplay',
        'mediasite.osu.edu/mediasite/play',
      ],
      'echo360': ['echo360.com/media'],
      'panopto': ['osucon.hosted.panopto.com'],
      'instructure': ['instructuremedia.com', 'media_attachments_iframe'],
      'external_tools': ['external_tools'],
    }

    let platform = 'unknown';
    // Iterate through known platforms and their associated URLs
    Object.entries(knownPlatforms).forEach(knownPlatformObj => {
      const [knownPlatform, urls] = knownPlatformObj
      urls.forEach(url => {
        if (src.includes(url)) {
          platform = knownPlatform;
        }
      });
    });

    return platform;
  }

  // Collect all relevant elements that might contain video content
  const videoElements = Array.from(doc.getElementsByTagName("video"));
  const iFrameElements = Array.from(doc.getElementsByTagName("iframe"));
  const aElements = Array.from(doc.getElementsByTagName("a"));

  // Combine all elements into a single array with their type
  const allNodesToParse: Array<{ type: string, element: HTMLVideoElement | HTMLIFrameElement | HTMLAnchorElement }> = []
  videoElements.forEach(element =>
    allNodesToParse.push({ type: 'video', element: element })
  );
  iFrameElements.forEach(element =>
    allNodesToParse.push({ type: 'iframe', element: element })
  );
  aElements.forEach(element =>
    allNodesToParse.push({ type: 'a', element: element })
  );

  allNodesToParse.forEach(node => {
    const nodeType = node.type;
    const nodeElement: HTMLVideoElement | HTMLIFrameElement | HTMLAnchorElement = node.element;

    let tempTitle = '';
    let title = '(REMEDIATE: Title Not Found)';
    let src = '';
    let srcToLower = '';
    let platform = 'unknown';
    let type = 'tbd';

    // Extract relevant data based on element type
    switch (nodeType) {
      case 'video':
        tempTitle = nodeElement.title;
        if (tempTitle !== '') title = tempTitle;
        const source = nodeElement.querySelector("source");
        src = source?.src || "";
        platform = "Instructure"; // Assuming <video> tags are typically Instructure media
        type = 'embed';
        break;
      case 'iframe':
        tempTitle = nodeElement.title;
        if (tempTitle !== '') title = tempTitle;
        src = (nodeElement as HTMLIFrameElement).src;
        srcToLower = src.toLowerCase();
        type = 'embed';
        platform = videoPlatform(srcToLower);
        break;
      case 'a':
        tempTitle = (nodeElement as HTMLAnchorElement).text;
        if (tempTitle !== '') title = tempTitle;
        src = (nodeElement as HTMLAnchorElement).href;
        srcToLower = src.toLowerCase();
        type = 'link';
        platform = videoPlatform(srcToLower);
        break;
    }

    // If a known video platform is identified, further analyze for transcript/caption mentions
    if (platform != "unknown") {
      // Determine the root element for traversing adjacent text
      const traverseRootTag =
        nodeElement.parentElement instanceof HTMLParagraphElement
          ? nodeElement.parentElement
          : nodeElement;

      // Concatenate text from previous and next sibling elements
      const adjacentText = (
        (traverseRootTag.previousElementSibling?.innerHTML || "") +
        " " +
        (traverseRootTag.nextElementSibling?.innerHTML || "") +
        (traverseRootTag.nextElementSibling?.nextElementSibling?.innerHTML ||
          "")
      ).toLowerCase();

      // Check for keywords indicating transcript or caption availability
      const transcriptOrCaptionMentioned = /transcript|caption/i.test(
        adjacentText,
      );

      videos.push({
        title: title,
        platform,
        src: src,
        type: type as 'embed' | 'link', // Cast to specific types as per VideoObject definition
        transcriptOrCaptionMentioned: transcriptOrCaptionMentioned,
        parentResourceIdentifier: item.identifier,
        parentResourceStatus: item.published,
        parentResourceTitle: item.title,
        parentResourceModuleTitle: item.moduleTitle || undefined,
        parentResourceType:
          getReadableType(item.clarifiedType) || "ERROR: unknown type",
      });
    }
  });

  return videos;
}

/**
 * Converts a raw resource type string into a more human-readable format.
 *
 * @param type The raw type string (e.g., "assignment", "contextmodulesubheader").
 * @returns A human-readable string (e.g., "assignment", "header") or null if the type is unknown.
 */
export function getReadableType(type: string | undefined): string | null {
  if (type === undefined) return null;

  switch (type) {
    case "contextmodulesubheader":
      return "header";
    case "assignment":
      return "assignment";
    case "page":
      return "page";
    case "externalurl":
      return "link";
    case "survey":
      return "survey";
    case "quiz":
      return "quiz";
    case "announcement":
      return "announcement";
    case "discussion":
      return "discussion";
    default:
      return null;
  }
}

/**
 * Finds a `Resource` object in an array by its identifier.
 *
 * @param resources An array of `Resource` objects to search within.
 * @param id The identifier of the resource to find.
 * @returns The matching `Resource` object or null if no resource with the given ID is found.
 */
export function getResourceByIdentifier(
  resources: Resource[],
  id: string,
): Resource | null {
  const filterResult = resources.filter(
    (resource) => resource.identifier == id,
  );
  if (filterResult.length == 0) {
    return null;
  } else return filterResult[0];
}
