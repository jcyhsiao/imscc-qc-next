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
 * Extracts files from the provided ZIP archive and returns a map of name->content.
 */
export async function extractIMSCC(
  file: File | ArrayBuffer,
): Promise<{ [key: string]: string }> {
  try {
    // updateProgress && updateProgress(10, 'Unzipping archive...');
    const zip = await JSZip.loadAsync(file);

    // updateProgress && updateProgress(30, 'Reading all course files...');

    const fileContents: { [key: string]: string } = {};
    const zipFiles = Object.values(zip.files).filter(
      (f) => !f.dir && !f.name.startsWith("web_resources/"),
    );
    // const totalFiles = zipFiles.length;
    // let fileCount = 0;

    for (const zipEntry of zipFiles) {
      const content = await zipEntry.async("string");
      fileContents[zipEntry.name] = content;
      // fileCount++;
      // const progress = 30 + (60 * (fileCount / totalFiles));
      // if (progress % 10 === 0 && updateProgress) updateProgress(progress, `Reading file ${fileCount} of ${totalFiles}`);
    }
    return fileContents;
  } catch (error) {
    // loadingStatus.textContent = `Error: ${(error as Error).message}`;
    // progressBar.style.backgroundColor = '#ef4444';
    throw error;
  }
}

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

  // Helper to find a manifest <resource> element by an identifier (e.g., its corresponding <item>'s identifierref)
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
    const resourceFileHref = manifestResourceElement.getElementsByTagName('file')?.[0].getAttribute('href');
    const resourceType = manifestResourceElement.getAttribute("type")!;

    // Skip supporting element
    if (
      resourceIdentifier &&
      manifestSupportingResourceElements.includes(resourceIdentifier)
    )
      continue;

    // Skip several types of resources:LTIs, links in modules, and qustion banks (for now)
    if (
      // LTIs
      resourceType === "imsbasiclti_xmlv1p3" ||
      // Question banks
      resourceHref?.includes("non_cc_assessments") ||
      // Course settings entry
      resourceHref?.includes("canvas_export.txt") ||
      // File
      (resourceType === "webcontent" &&
        resourceHref &&
        resourceHref.startsWith("web_resources/"))
    )
      continue;

    let resourceStatus = false;
    let resourceTitle = "untitled";

    let resourceAnalysisHref: string | null = null;
    let resourceAnalysisType = "html";
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

    let resourceClarifiedType: string | null = null;
    let resourceIdentifierRef: string | null = null;

    // TODO: A lot of refactoring opportunities here
    if (isLink) {
      resourceClarifiedType = 'modulelink';
      const linkContent = fileContents[resourceFileHref];
      if (linkContent) {
        const linkDoc = parser.parseFromString(
          linkContent,
          "application/xml",
        );
        resourceTitle = linkDoc.getElementsByTagName("title").length > 0
          ? linkDoc.getElementsByTagName("title")[0].textContent ||
          resourceTitle
          : resourceTitle;
      }
      resourceAnalysisHref = resourceFileHref;
    }
    else if (isSyllabus) {
      resourceClarifiedType = 'syllabus';
      const pageContent = fileContents[resourceHref];
      if (pageContent) {
        const pageDoc = parser.parseFromString(pageContent, "text/html");
        resourceTitle =
          pageDoc.getElementsByTagName("title").length > 0
            ? pageDoc.getElementsByTagName("title")[0].textContent ||
            resourceTitle
            : resourceTitle;
        // This is not true; but we are keeping things simple for now
        resourceStatus = true;
      }
      resourceAnalysisHref = resourceHref;
    }
    else if (isPage) {
      resourceClarifiedType = "page";
      const pageContent = fileContents[resourceHref];
      if (pageContent) {
        const pageDoc = parser.parseFromString(pageContent, "text/html");
        // resourceTitle = pageDoc.querySelector('title')?.textContent || resourceTitle;
        resourceTitle =
          pageDoc.getElementsByTagName("title").length > 0
            ? pageDoc.getElementsByTagName("title")[0].textContent ||
            resourceTitle
            : resourceTitle;
        // resourceStatus = pageDoc.querySelector('meta[name="workflow_state"]')?.getAttribute('content') === 'active' ? 'active' : 'unpublished';
        const metaElements = Array.from(pageDoc.getElementsByTagName("meta"));
        const workflowStateMeta = metaElements.find(
          (meta) => meta.getAttribute("name") === "workflow_state",
        );
        resourceStatus =
          workflowStateMeta?.getAttribute("content") === "active"
            ? true
            : false;
      }
      resourceAnalysisHref = resourceHref;
    } else if (isAssignment) {
      resourceClarifiedType = "assignment";
      const assignmentSettingsPath = Object.keys(fileContents).find(
        (fileName) =>
          fileName.startsWith(`${resourceIdentifier}/`) &&
          fileName.endsWith("assignment_settings.xml"),
      );
      if (assignmentSettingsPath) {
        const settingsDoc = parser.parseFromString(
          fileContents[assignmentSettingsPath],
          "application/xml",
        );
        // resourceStatus = settingsDoc.querySelector('workflow_state')?.textContent === 'active' ? 'active' : 'unpublished';
        resourceStatus =
          settingsDoc.getElementsByTagName("workflow_state").length > 0 &&
            settingsDoc.getElementsByTagName("workflow_state")[0].textContent ===
            "active"
            ? true
            : false;
        // resourceTitle = settingsDoc.querySelector('title')?.textContent || resourceTitle;
        resourceTitle =
          settingsDoc.getElementsByTagName("title").length > 0
            ? settingsDoc.getElementsByTagName("title")[0].textContent ||
            resourceTitle
            : resourceTitle;
      }
      const assignmentHtmlPath = Object.keys(fileContents).find(
        (fileName) =>
          fileName.startsWith(`${resourceIdentifier}/`) &&
          fileName.endsWith(".html"),
      );
      if (assignmentHtmlPath) resourceAnalysisHref = assignmentHtmlPath;
    } else if (isQuizOrSurvey) {
      // const resourceIdentifierRef = manifestResourceElement.querySelector('dependency')!.getAttribute("identifierref")!;
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

        resourceAnalysisHref =
          matchingManifestResourceElement.getAttribute("href");
        resourceAnalysisType = "xml";
        if (resourceAnalysisHref === null)
          throw new Error("resourceAnalysisHref should NOT be null.");

        const itemMetaDoc = parser.parseFromString(
          fileContents[resourceAnalysisHref],
          "application/xml",
        );
        if (itemMetaDoc) {
          // resourceTitle = itemMetaDoc.querySelector('title')?.textContent || resourceTitle;
          resourceTitle =
            itemMetaDoc.getElementsByTagName("title").length > 0
              ? itemMetaDoc.getElementsByTagName("title")[0].textContent ||
              resourceTitle
              : resourceTitle;
          // resourceStatus = itemMetaDoc.querySelector('available')?.textContent === 'true' ? 'active' : 'unpublished';
          resourceStatus =
            itemMetaDoc.getElementsByTagName("available").length > 0 &&
              itemMetaDoc.getElementsByTagName("available")[0].textContent ===
              "true"
              ? true
              : false;
        }
        // const quizType = itemMetaDoc.querySelector('quiz_type')?.textContent;
        const quizType =
          itemMetaDoc.getElementsByTagName("quiz_type").length > 0
            ? itemMetaDoc.getElementsByTagName("quiz_type")[0].textContent
            : null;
        if (quizType === "survey") {
          resourceClarifiedType = "survey";
        } else {
          resourceClarifiedType = "quiz";
        }
      }
    } else if (isDiscussion) {
      resourceClarifiedType = "discussion";
      const discussionXmlPath = `${resourceIdentifier}.xml`;
      if (fileContents[discussionXmlPath]) {
        resourceAnalysisHref = discussionXmlPath;
        resourceAnalysisType = "discussion_xml";
        const discussionDoc = parser.parseFromString(
          fileContents[discussionXmlPath],
          "application/xml",
        );
        // resourceTitle = discussionDoc.querySelector('title')?.textContent || resourceTitle;
        resourceTitle =
          discussionDoc.getElementsByTagName("title").length > 0
            ? discussionDoc.getElementsByTagName("title")[0].textContent ||
            resourceTitle
            : resourceTitle;

        // const resourceIdentifierRef = manifestResourceElement.querySelector('dependency')!.getAttribute("identifierref")!;
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

          const settingsHref =
            matchingManifestResourceElement.getAttribute("href");
          if (settingsHref === null)
            throw new Error("settingsHref should NOT be null.");

          const itemSettingsDoc = parser.parseFromString(
            fileContents[settingsHref],
            "application/xml",
          );
          if (itemSettingsDoc) {
            // resourceStatus = itemSettingsDoc.querySelector('workflow_state')?.textContent === 'active' ? 'active' : 'unpublished';
            resourceStatus =
              itemSettingsDoc.getElementsByTagName("workflow_state").length >
                0 &&
                itemSettingsDoc.getElementsByTagName("workflow_state")[0]
                  .textContent === "active"
                ? true
                : false;
          }
          // const discussionType = itemSettingsDoc.querySelector('type')?.textContent;
          const discussionType =
            itemSettingsDoc.getElementsByTagName("type").length > 0
              ? itemSettingsDoc.getElementsByTagName("type")[0].textContent
              : null;
          if (discussionType === "announcement") {
            resourceClarifiedType = "announcement";
          }
        }
      }
    }

    if (!resourceClarifiedType) continue;

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

    // const moduleTitle = metaModuleElement.querySelector('title')?.textContent!;
    const moduleTitle =
      metaModuleElement.getElementsByTagName("title").length > 0
        ? metaModuleElement.getElementsByTagName("title")[0].textContent!
        : "ERROR: untitled module";
    // const moduleStatus = metaModuleElement.querySelector('workflow_state')?.textContent === 'active' ? 'active' : 'unpublished';
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
      // const indent = parseInt(metaModuleItemElement.querySelector('indent')?.textContent!, 10);
      const itemIndent = parseInt(
        metaModuleItemElement.getElementsByTagName("indent").length > 0
          ? metaModuleItemElement.getElementsByTagName("indent")[0].textContent!
          : "0",
        10,
      );
      // const status = metaModuleItemElement.querySelector('workflow_state')?.textContent!;
      const itemStatus =
        metaModuleItemElement.getElementsByTagName("workflow_state").length >
          0 &&
          metaModuleItemElement.getElementsByTagName("workflow_state")[0]
            .textContent === "active"
          ? true
          : false;
      // const contentType = metaModuleItemElement.querySelector('content_type')?.textContent!;
      const itemContentType =
        metaModuleItemElement.getElementsByTagName("content_type").length > 0
          ? metaModuleItemElement.getElementsByTagName("content_type")[0]
            .textContent!
          : "ERROR: no content_type";
      // const title = metaModuleItemElement.querySelector('title')?.textContent!;
      const itemTitle =
        metaModuleItemElement.getElementsByTagName("title").length > 0
          ? metaModuleItemElement.getElementsByTagName("title")[0].textContent!
          : "ERROR: untitled item";
      // const moduleItemIdentifierRef = metaModuleItemElement.querySelector('identifierref')?.textContent || null;
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

    // console.log(moduleObj);
    allModules.push(moduleObj);
  });

  return allModules;
}

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

  allModules = reconciledModules;
  allResources = reconciledResources;
}

/*
         // Building our list of in-module items. TODO: Utilize this
            inModuleResourceIdentifiers.add(moduleItemIdentifier);
            */

/**
 * Analyze provided items: extract links/files/videos and run accessibility checks.
 * items - items to analyze (with href and analysisType)
 */
export async function identifyObjectsInIMSCCResources(
  parser: PlatformDOMParser,
  resources: Resource[],
  fileContents: { [key: string]: string },
) {
  if (parser === null) throw Error("analyzeIMSCCContent: parser is null.");

  for (const resource of resources) {
    if (!resource.analysisHref) continue;

    const fileContent = fileContents[resource.analysisHref];
    if (!fileContent) continue;

    const allLinks: LinkObject[] = [],
      allAttachments: FileObject[] = [],
      allVideos: VideoObject[] = [];

    let richContent: Document;
    if (resource.analysisType === "xml") {
      const xmlDoc = parser.parseFromString(fileContent, "application/xml");
      // const description = xmlDoc.querySelector("description");
      const description =
        xmlDoc.getElementsByTagName("description").length > 0
          ? xmlDoc.getElementsByTagName("description")[0]
          : null;
      const htmlContent = description ? description.textContent : "";
      richContent = parser.parseFromString(htmlContent, "text/html");
    } else if (resource.analysisType === "discussion_xml") {
      const xmlDoc = parser.parseFromString(fileContent, "application/xml");
      // const text = xmlDoc.querySelector("text");
      const text =
        xmlDoc.getElementsByTagName("text").length > 0
          ? xmlDoc.getElementsByTagName("text")[0]
          : null;
      const htmlContent = text ? text.textContent : "";
      richContent = parser.parseFromString(htmlContent, "text/html");
    } else {
      richContent = parser.parseFromString(fileContent, "text/html");
    }

    allLinks.push(...findLinks(richContent, resource));
    allAttachments.push(...findFileAttachments(richContent, resource));
    allVideos.push(...findVideos(richContent, resource));

    resource.links = allLinks;
    resource.attachments = allAttachments;
    resource.videos = allVideos;
  }
}

/**
 * Run axe accessibility checks on items and prepare data for the accessibility tab.
 */
export async function checkIMSCCResourcesForAccessibility(
  parser: PlatformDOMParser,
  resources: Resource[],
  fileContents: { [key: string]: string },
) {
  if (parser === null)
    throw Error("checkIMSCCResourcesForAccessibility: parser is null.");

  for (const resource of resources) {
    if (!resource.analysisHref) continue;
    const content = fileContents[resource.analysisHref];
    if (!content) continue;

    let allResults: EnhancedAxeResults | null = null;

    let doc: Document;

    if (resource.analysisType === "xml") {
      const xmlDoc = parser.parseFromString(content, "application/xml");
      // const description = xmlDoc.querySelector("description");
      const description =
        xmlDoc.getElementsByTagName("description").length > 0
          ? xmlDoc.getElementsByTagName("description")[0]
          : null;
      const htmlContent = description ? description.textContent : "";
      doc = parser.parseFromString(htmlContent, "text/html");
    } else if (resource.analysisType === "discussion_xml") {
      const xmlDoc = parser.parseFromString(content, "application/xml");
      // const text = xmlDoc.querySelector("text");
      const text =
        xmlDoc.getElementsByTagName("text").length > 0
          ? xmlDoc.getElementsByTagName("text")[0]
          : null;
      const htmlContent = text ? text.textContent : "";
      doc = parser.parseFromString(htmlContent, "text/html");
    } else {
      doc = parser.parseFromString(content, "text/html");
    }

    if (doc.body && doc.body.innerHTML.trim() !== "") {
      try {
        if (doc.body.querySelectorAll("*").length > 0) {
          const axeOptions = {
            preload: false,
            runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          };
          const results = await axe.run(
            doc.body.querySelectorAll("*"),
            axeOptions,
          );

          const addMetadata = (type: string, issue: Axe.Result) =>
            ({
              ...issue,
              type,
              parentResourceIdentifier: resource.identifier,
              parentItemTitle: resource.title,
              parentItemType:
                getReadableType(resource.clarifiedType) ||
                "ERROR: unknown type",
              parentItemPublished: resource.published,
              parentItemModuleTitle: resource.moduleTitle,
            }) as EnhancedAxeResult;

          // If allResults hasn't been initialized yet, do so now
          if (allResults === null)
            allResults = {
              ...results,
              results: [],
            };

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
 * Find external links in a document and return structured items.
 */
function findLinks(doc: Document, item: Resource): LinkObject[] {
  const links: LinkObject[] = [];
  if (!doc) return links;
  // doc.querySelectorAll('a[href]').forEach(a => {
  const aElements = Array.from(doc.getElementsByTagName("a")).filter((a) =>
    a.hasAttribute("href"),
  );
  // This is specific to module links
  const urlElements = Array.from(doc.getElementsByTagName("url")).filter((url) =>
    url.hasAttribute('href'),
  );

  const aAndUrlElements = [...aElements, ...urlElements];

  aAndUrlElements.forEach((a) => {
    const href = (a as HTMLAnchorElement).getAttribute("href");
    if (
      href &&
      !href.startsWith("#") &&
      !href.startsWith("mailto") &&
      !a.classList.contains("instructure_file_link") &&
      !a.classList.contains("instructure_scribd_file")
    ) {
      let type = "unknown";
      if (href.startsWith("$CANVAS") || href.includes("$WIKI_REFERENCE$")) {
        type = "course";
      } else if (
        href.includes(".osu.edu") ||
        href.includes(".ohio-state.edu")
      ) {
        type = "osu";
      } else {
        type = "external";
      }
      links.push({
        url: href,
        text: a.textContent.trim(),
        parentResourceIdentifier: item.identifier,
        // parentResourceStatus: item.published,
        // parentResourceTitle: item.title,
        // parentResourceType: item.clarifiedType || item.contentType,
        type: type as LinkType,
      });
    }
  });
  return links;
}

/**
 * Find file attachment links in a document.
 */
// TODO: Refactor
function findFileAttachments(doc: Document, item: Resource): FileObject[] {
  const attachments: FileObject[] = [];

  if (!doc) return attachments;
  const aElements = Array.from(doc.getElementsByTagName("a")).filter(
    (a) =>
      a.classList.contains("instructure_file_link") ||
      a.classList.contains("instructure_scribd_file"),
  );

  // /\.[a-zA-Z0-9]+(?=[\?#]|$)/

  // doc.querySelectorAll('a.instructure_file_link, a.instructure_scribd_file').forEach(a => {
  aElements.forEach((a) => {
    let anchorText = a.textContent.trim();
    if (anchorText === '') anchorText = '(REMEDIATE: Phantom Link)';
    const id = item.identifier;
    const href = (a as HTMLAnchorElement).href;

    const regex = /\.[a-zA-Z0-9]+(?=[\?#]|$)/;
    const extMatch = href.match(regex);

    const ext = extMatch ? extMatch[0] : undefined;

    attachments.push({
      parentAnchorText: anchorText,
      parentResourceIdentifier: id,
      /*
      parentResourceType: item.clarifiedType || item.contentType,
      parentResourceModuleTitle:
        item.moduleTitle === undefined ? "(None)" : item.moduleTitle,
      parentResourceTitle: item.title,
       */
      href: href,
      extension: ext,
    });
  });

  return attachments;
}

/**
 * Find embedded iframes that correspond to supported video platforms.
 */
function findVideos(doc: Document, item: Resource): VideoObject[] {
  const videos: VideoObject[] = [];

  if (!doc) return videos;

  // TODO: Future opportunity to refactor

  // Check videos
  const videoElements = Array.from(doc.getElementsByTagName("video"));
  // doc.querySelectorAll('video').forEach(video => {
  videoElements.forEach((video) => {
    // const classes = (video.className || '').toLowerCase();
    const title = video.title || "(REMEDIATE: Title Not Found)";
    const source = video.querySelector("source");
    const src = source?.src || "";
    const platform: string = "Instructure";
    const type = "embed";
    // if (classes.includes('instructure_inline_media_comment')) platform = 'Instructure';

    if (platform != "Unknown") {
      const traverseRootTag =
        video.parentElement instanceof HTMLParagraphElement
          ? video.parentElement
          : video;

      const adjacentText = (
        (traverseRootTag.previousElementSibling?.innerHTML || "") +
        " " +
        (traverseRootTag.nextElementSibling?.innerHTML || "") +
        (traverseRootTag.nextElementSibling?.nextElementSibling?.innerHTML ||
          "")
      ).toLowerCase();

      const transcriptOrCaptionMentioned = /transcript|caption/i.test(
        adjacentText,
      );

      videos.push({
        title: title,
        platform,
        src: src,
        type: type,
        transcriptOrCaptionMentioned: transcriptOrCaptionMentioned,
        // parentResourceTitle: item.title,
        parentResourceIdentifier: item.identifier,
      });
    }
  });

  // Check iFrames
  const iFrameElements = Array.from(doc.getElementsByTagName("iframe"));
  // console.log(iFrameElements);
  // doc.querySelectorAll('iframe').forEach(iframe => {
  iFrameElements.forEach((iframe) => {
    const src = (iframe.src || "");
        const srcToLower = src.toLowerCase();

    const title = iframe.title || "(REMEDIATE: Title Not Found)";
    let platform = "unknown";
    const type = "embed";
    if (srcToLower.includes("www.youtube.com/embed/")) platform = "youtube";
    else if (srcToLower.includes("player.vimeo.com")) platform = "vimeo";
    else if (
      srcToLower.includes("https://mediasite.osu.edu/mediasite/lti/home/coverplay") ||
      srcToLower.includes("mediasite.osu.edu/mediasite/play")
    )
      platform = "mediasite";
    else if (srcToLower.includes("echo360.com/media")) platform = "echo360";
    else if (srcToLower.includes("osucon.hosted.panopto.com")) platform = "panopto";
    else if (
      srcToLower.includes("instructuremedia.com") ||
      srcToLower.includes("media_attachments_iframe")
    )
      platform = "instructure";

    if (platform != "unknown") {
      const traverseRootTag =
        iframe.parentElement instanceof HTMLParagraphElement
          ? iframe.parentElement
          : iframe;

      const adjacentText = (
        (traverseRootTag.previousElementSibling?.innerHTML || "") +
        " " +
        (traverseRootTag.nextElementSibling?.innerHTML || "") +
        (traverseRootTag.nextElementSibling?.nextElementSibling?.innerHTML ||
          "")
      ).toLowerCase();

      const transcriptOrCaptionMentioned = /transcript|caption/i.test(
        adjacentText,
      );

      videos.push({
        title: title,
        platform,
        src: src,
        type: type,
        transcriptOrCaptionMentioned: transcriptOrCaptionMentioned,
        // parentResourceTitle: item.title,
        parentResourceIdentifier: item.identifier,
      });
    }
  });

  const aElements = Array.from(doc.getElementsByTagName("a"));
  // doc.querySelectorAll('a').forEach(a => {
  aElements.forEach((a) => {
    const src = (a.href || "");
            const srcToLower = src.toLowerCase();

    const title = a.text || "(Title Not Found)";
    let platform = "unknown";
    const type = "link";
    if (srcToLower.includes("www.youtube.com/watch") || srcToLower.includes("youtu.be"))
      platform = "youtube";
    else if (srcToLower.includes("vimeo.com")) platform = "vimeo";
    else if (srcToLower.includes("mediasite.osu.edu/mediasite/play"))
      platform = "mediasite";
    else if (srcToLower.includes("external_tools"))
      platform = "lti";
    else if (srcToLower.includes("echo360.org/media")) platform = "echo360";
    else if (srcToLower.includes("osucon.hosted.panopto.com")) platform = "panopto";
    else if (
      srcToLower.includes("instructuremedia.com") ||
      srcToLower.includes("media_attachments_iframe")
    )
      platform = "instructure";

    if (platform != "unknown") {
      const traverseRootTag =
        a.parentElement instanceof HTMLParagraphElement ? a.parentElement : a;

      const adjacentText = (
        (traverseRootTag.previousElementSibling?.innerHTML || "") +
        " " +
        (traverseRootTag.nextElementSibling?.innerHTML || "") +
        (traverseRootTag.nextElementSibling?.nextElementSibling?.innerHTML ||
          "")
      ).toLowerCase();

      const transcriptOrCaptionMentioned = /transcript|caption/i.test(
        adjacentText,
      );

      videos.push({
        title: title,
        platform,
        src: src,
        type: type,
        transcriptOrCaptionMentioned: transcriptOrCaptionMentioned,
        // parentResourceTitle: item.title,
        parentResourceIdentifier: item.identifier,
      });
    }
  });
  return videos;
}

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
