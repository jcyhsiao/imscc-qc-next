import { PlatformDOMParser } from '@/app/lib/definitions';
import { Module, ModuleItem, Resource } from '@/app/lib/definitions';
import { LinkObject, LinkType, VideoObject, FileObject } from '@/app/lib/definitions';
import { EnhancedAxeResult, EnhancedAxeResults } from '@/app/lib/definitions';
import type * as Axe from 'axe-core'

import axe from 'axe-core';
import JSZip from 'jszip';

/**
 * Extracts files from the provided ZIP archive and returns a map of name->content.
 */
export async function extractIMSCC(
    file: File | ArrayBuffer)
    : Promise<{ [key: string]: string }> {
    try {
        // updateProgress && updateProgress(10, 'Unzipping archive...');
        const zip = await JSZip.loadAsync(file);

        // updateProgress && updateProgress(30, 'Reading all course files...');

        const fileContents: { [key: string]: string } = {};
        const zipFiles = Object.values(zip.files).filter(f => !f.dir && !f.name.startsWith('web_resources/'));
        // const totalFiles = zipFiles.length;
        // let fileCount = 0;

        for (const zipEntry of zipFiles) {
            const content = await zipEntry.async('string');
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

/**
  * Parse the imsmanifest and assemble course structure, content items, and then analyze.
  * Preserves original behavior and logic.
*/
export async function inventoryIMSCC(
    parser: PlatformDOMParser,
    fileContents: { [key: string]: string }): Promise<{modulesResults: Module[], resourcesResults: Resource[]}> {
    if (parser === null) throw Error('inventoryIMSCC: parser is null.');

    const inModuleResourceIdentifiers: Set<string> = new Set();
    const allResources: Resource[] = [];
    const allModules: Module[] = [];

    // Map of resource items gathered from imsmanifest.xml
    const manifestFileContent = fileContents['imsmanifest.xml'];
    if (!manifestFileContent) {
        throw Error("processAndAnalyze: imsmanifest.xml not found in the archive.");
    }

    const manifestFileContentParsed = parser.parseFromString(manifestFileContent, "application/xml");
    const manifestSupportingResourceElements: string[] = [];

    // updateProgress(90, 'Parsing manifest...');

    // Helper to find a manifest <resource> element by an identifier (e.g., its corresponding <item>'s identifierref)
    const findManifestResourceElementByIentifier = (id: string | null): Element | null => {
        if (!id) return null;
        return Array.from(manifestFileContentParsed.getElementsByTagName('resource')).find(i => i.getAttribute('identifier') === id) || null;
    };

    // Gather all manifest <resource> elements
    const manifestResourceElements = Array.from(manifestFileContentParsed.getElementsByTagName("resource"));
    for (const manifestResourceElement of manifestResourceElements) {
        const resourceIdentifier = manifestResourceElement.getAttribute("identifier")!;
        const resourceHref = manifestResourceElement.getAttribute("href");
        const resourceType = manifestResourceElement.getAttribute("type")!;

        // Skip supporting element
        if (resourceIdentifier && manifestSupportingResourceElements.includes(resourceIdentifier)) continue;

        // Skip several types of resources:LTIs, links in modules, and qustion banks (for now)
        if (
            // LTIs
            resourceType === 'imsbasiclti_xmlv1p3' ||
            // Links in modules
            resourceType === 'imswl_xmlv1p1' ||
            // Question banks (for now)
            resourceHref?.includes('non_cc_assessments') ||
            // Syllabus entry in manifest
            resourceIdentifier.endsWith('_syllabus') ||
            // Course settings entry
            resourceHref?.includes('canvas_export.txt')
        ) continue;

        let resourceStatus = false;
        let resourceTitle = 'untitled';

        let resourceAnalysisHref: string | null = null;
        let resourceAnalysisType = 'html';
        const isAssignment = resourceType.includes('associatedcontent/imscc_xmlv1p1/learning-application-resource') && resourceHref && resourceHref.endsWith('html') && !resourceHref.startsWith('course_settings/');
        const isQuizOrSurvey = resourceType.includes('imsqti_xmlv1p2/imscc_xmlv1p1/assessment');
        const isDiscussion = resourceType.includes('imsdt_xmlv1p1');
        const isPage = resourceType === 'webcontent' && resourceHref && resourceHref.startsWith('wiki_content/');
        const isFile = resourceType === 'webcontent' && resourceHref && resourceHref.startsWith('web_resources/');

        let resourceClarifiedType: string | null = null;
        let resourceIdentifierRef: string | null = null;

        // TODO: A lot of refactoring opportunities here
        if (isFile) {
            resourceClarifiedType = 'file';
        } else if (isPage) {
            resourceClarifiedType = 'page';
            const pageContent = fileContents[resourceHref];
            if (pageContent) {
                const pageDoc = parser.parseFromString(pageContent, "text/html");
                // resourceTitle = pageDoc.querySelector('title')?.textContent || resourceTitle;
                resourceTitle = pageDoc.getElementsByTagName('title').length > 0 ? pageDoc.getElementsByTagName('title')[0].textContent || resourceTitle : resourceTitle;
                // resourceStatus = pageDoc.querySelector('meta[name="workflow_state"]')?.getAttribute('content') === 'active' ? 'active' : 'unpublished';
                const metaElements = Array.from(pageDoc.getElementsByTagName('meta'));
                const workflowStateMeta = metaElements.find(meta => meta.getAttribute('name') === 'workflow_state');
                resourceStatus = workflowStateMeta?.getAttribute('content') === 'active' ? true : false;
            }
            resourceAnalysisHref = resourceHref;
        } else if (isAssignment) {
            resourceClarifiedType = 'assignment';
            const assignmentSettingsPath = Object.keys(fileContents).find(fileName => fileName.startsWith(`${resourceIdentifier}/`) && fileName.endsWith('assignment_settings.xml'));
            if (assignmentSettingsPath) {
                const settingsDoc = parser.parseFromString(fileContents[assignmentSettingsPath], "application/xml");
                // resourceStatus = settingsDoc.querySelector('workflow_state')?.textContent === 'active' ? 'active' : 'unpublished';
                resourceStatus = settingsDoc.getElementsByTagName('workflow_state').length > 0 && settingsDoc.getElementsByTagName('workflow_state')[0].textContent === 'active' ? true : false;
                // resourceTitle = settingsDoc.querySelector('title')?.textContent || resourceTitle;
                resourceTitle = settingsDoc.getElementsByTagName('title').length > 0 ? settingsDoc.getElementsByTagName('title')[0].textContent || resourceTitle : resourceTitle;
            }
            const assignmentHtmlPath = Object.keys(fileContents).find(fileName => fileName.startsWith(`${resourceIdentifier}/`) && fileName.endsWith('.html'));
            if (assignmentHtmlPath) resourceAnalysisHref = assignmentHtmlPath;
        } else if (isQuizOrSurvey) {
            // const resourceIdentifierRef = manifestResourceElement.querySelector('dependency')!.getAttribute("identifierref")!;
            resourceIdentifierRef = manifestResourceElement.getElementsByTagName('dependency').length > 0 ? manifestResourceElement.getElementsByTagName('dependency')[0].getAttribute("identifierref")! : null;
            const matchingManifestResourceElement = findManifestResourceElementByIentifier(resourceIdentifierRef);

            if (matchingManifestResourceElement && fileContents[matchingManifestResourceElement.getAttribute('href')!]) {
                const matchingManifestResourceElementIdentifier = matchingManifestResourceElement.getAttribute('identifier');
                if (matchingManifestResourceElementIdentifier === null) throw new Error("matchingManifestResourceElementIdentifier should NOT be null.");
                manifestSupportingResourceElements.push(matchingManifestResourceElementIdentifier);

                resourceAnalysisHref = matchingManifestResourceElement.getAttribute('href');
                resourceAnalysisType = 'xml';
                if (resourceAnalysisHref === null) throw new Error('resourceAnalysisHref should NOT be null.');

                const itemMetaDoc = parser.parseFromString(fileContents[resourceAnalysisHref], "application/xml");
                if (itemMetaDoc) {
                    // resourceTitle = itemMetaDoc.querySelector('title')?.textContent || resourceTitle;
                    resourceTitle = itemMetaDoc.getElementsByTagName('title').length > 0 ? itemMetaDoc.getElementsByTagName('title')[0].textContent || resourceTitle : resourceTitle;
                    // resourceStatus = itemMetaDoc.querySelector('available')?.textContent === 'true' ? 'active' : 'unpublished';
                    resourceStatus = itemMetaDoc.getElementsByTagName('available').length > 0 && itemMetaDoc.getElementsByTagName('available')[0].textContent === 'true' ? true : false;
                }
                // const quizType = itemMetaDoc.querySelector('quiz_type')?.textContent;
                const quizType = itemMetaDoc.getElementsByTagName('quiz_type').length > 0 ? itemMetaDoc.getElementsByTagName('quiz_type')[0].textContent : null;
                if (quizType === 'survey') {
                    resourceClarifiedType = 'survey';
                } else {
                    resourceClarifiedType = 'quiz';
                }
            }
        } else if (isDiscussion) {
            resourceClarifiedType = 'discussion';
            const discussionXmlPath = `${resourceIdentifier}.xml`;
            if (fileContents[discussionXmlPath]) {
                resourceAnalysisHref = discussionXmlPath;
                resourceAnalysisType = 'discussion_xml';
                const discussionDoc = parser.parseFromString(fileContents[discussionXmlPath], "application/xml");
                // resourceTitle = discussionDoc.querySelector('title')?.textContent || resourceTitle;
                resourceTitle = discussionDoc.getElementsByTagName('title').length > 0 ? discussionDoc.getElementsByTagName('title')[0].textContent || resourceTitle : resourceTitle;

                // const resourceIdentifierRef = manifestResourceElement.querySelector('dependency')!.getAttribute("identifierref")!;
                resourceIdentifierRef = manifestResourceElement.getElementsByTagName('dependency').length > 0 ? manifestResourceElement.getElementsByTagName('dependency')[0].getAttribute("identifierref")! : null;
                const matchingManifestResourceElement = findManifestResourceElementByIentifier(resourceIdentifierRef);

                if (matchingManifestResourceElement && fileContents[matchingManifestResourceElement.getAttribute('href')!]) {
                    const matchingManifestResourceElementIdentifier = matchingManifestResourceElement.getAttribute('identifier');
                    if (matchingManifestResourceElementIdentifier === null) throw new Error("matchingManifestResourceElementIdentifier should NOT be null.");
                    manifestSupportingResourceElements.push(matchingManifestResourceElementIdentifier);

                    const settingsHref = matchingManifestResourceElement.getAttribute('href');
                    if (settingsHref === null) throw new Error('settingsHref should NOT be null.');

                    const itemSettingsDoc = parser.parseFromString(fileContents[settingsHref], "application/xml");
                    if (itemSettingsDoc) {
                        // resourceStatus = itemSettingsDoc.querySelector('workflow_state')?.textContent === 'active' ? 'active' : 'unpublished';
                        resourceStatus = itemSettingsDoc.getElementsByTagName('workflow_state').length > 0 && itemSettingsDoc.getElementsByTagName('workflow_state')[0].textContent === 'active' ? true : false;
                    }
                    // const discussionType = itemSettingsDoc.querySelector('type')?.textContent;
                    const discussionType = itemSettingsDoc.getElementsByTagName('type').length > 0 ? itemSettingsDoc.getElementsByTagName('type')[0].textContent : null;
                    if (discussionType === 'announcement') {
                        resourceClarifiedType = 'announcement';
                    }
                }
            }
        }

        if (!resourceClarifiedType || resourceClarifiedType === 'file') {
            continue;
        }
        allResources.push({
            identifier: resourceIdentifier,
            title: resourceTitle,
            identifierref: resourceIdentifierRef,
            published: resourceStatus,
            clarifiedType: resourceClarifiedType,
            contentType: resourceType,
            analysisHref: resourceAnalysisHref,
            analysisType: resourceAnalysisType,
        });
    }

    // Gather modules and module contents
    const metaModuleFileContent = fileContents['course_settings/module_meta.xml'];
    if (!metaModuleFileContent) {
        throw new Error("course_settings/module_meta.xml not found in the archive.");
    }

    const moduleMetaFileContentParsed = parser.parseFromString(metaModuleFileContent, "application/xml");
    const metaModuleElements = Array.from(moduleMetaFileContentParsed.getElementsByTagName("module"));
    metaModuleElements.forEach(metaModuleElement => {
        const moduleItems: ModuleItem[] = [];

        // const moduleTitle = metaModuleElement.querySelector('title')?.textContent!;
        const moduleTitle = metaModuleElement.getElementsByTagName('title').length > 0 ? metaModuleElement.getElementsByTagName('title')[0].textContent! : 'ERROR: untitled module';
        // const moduleStatus = metaModuleElement.querySelector('workflow_state')?.textContent === 'active' ? 'active' : 'unpublished';
        const moduleStatus = metaModuleElement.getElementsByTagName('workflow_state').length > 0 && metaModuleElement.getElementsByTagName('workflow_state')[0].textContent === 'active' ? true : false;
        const moduleIdentifier = metaModuleElement.getAttribute('identifier')!;

        const metaModuleItemElements = Array.from(metaModuleElement.getElementsByTagName('item'));
        metaModuleItemElements.forEach(metaModuleItemElement => {
            const moduleItemIdentifier = metaModuleItemElement.getAttribute('identifier')!;
            // const indent = parseInt(metaModuleItemElement.querySelector('indent')?.textContent!, 10);
            const itemIndent = parseInt(metaModuleItemElement.getElementsByTagName('indent').length > 0 ? metaModuleItemElement.getElementsByTagName('indent')[0].textContent! : '0', 10);
            // const status = metaModuleItemElement.querySelector('workflow_state')?.textContent!;
            const itemStatus = metaModuleItemElement.getElementsByTagName('workflow_state').length > 0 && metaModuleItemElement.getElementsByTagName('workflow_state')[0].textContent === 'active' ? true : false;
            // const contentType = metaModuleItemElement.querySelector('content_type')?.textContent!;
            const itemContentType = metaModuleItemElement.getElementsByTagName('content_type').length > 0 ? metaModuleItemElement.getElementsByTagName('content_type')[0].textContent! : 'ERROR: no content_type';
            // const title = metaModuleItemElement.querySelector('title')?.textContent!;
            const itemTitle = metaModuleItemElement.getElementsByTagName('title').length > 0 ? metaModuleItemElement.getElementsByTagName('title')[0].textContent! : 'ERROR: untitled item';
            // const moduleItemIdentifierRef = metaModuleItemElement.querySelector('identifierref')?.textContent || null;
            const moduleItemIdentifierRef = metaModuleItemElement.getElementsByTagName('identifierref').length > 0 ? metaModuleItemElement.getElementsByTagName('identifierref')[0].textContent || null : null;
            let itemClarifiedType = 'tbd';

            const matchingResource = allResources.find(r => r.identifier === moduleItemIdentifierRef);

            if (matchingResource) {
                itemClarifiedType = matchingResource?.clarifiedType || itemContentType;
                matchingResource.moduleTitle = moduleTitle;
            }

            const moduleItem: ModuleItem = {
                identifier: moduleItemIdentifier,
                title: itemTitle,
                identifierRef: moduleItemIdentifierRef,
                moduleTitle: moduleTitle,
                published: itemStatus,
                indent: itemIndent,
                clarifiedType: itemClarifiedType,
                contentType: itemContentType
            };

            moduleItems.push(moduleItem);
            // Building our list of in-module items
            inModuleResourceIdentifiers.add(moduleItemIdentifier);
        });

        const moduleObj = {
            identifier: moduleIdentifier,
            title: moduleTitle,
            items: moduleItems,
            published: moduleStatus
        };

        // console.log(moduleObj);
        allModules.push(moduleObj);
    });

    return {modulesResults: allModules, resourcesResults: allResources};

    /*
    displayModules(allModules);
          displayCourseContent(allResources);

          updateProgress(95, 'Analyzing course content...');
          await analyzeContent(fileContents, allResources);

          updateProgress(100, 'Analysis complete!');
          */
}

/**
        * Analyze provided items: extract links/files/videos and run accessibility checks.
        * items - items to analyze (with href and analysisType)
        */
export async function analyzeIMSCCForObjects(parser: PlatformDOMParser, fileContents: { [key: string]: string }, items: Resource[]): Promise<{videosResults: VideoObject[], filesResults: FileObject[], linksResults: LinkObject[]}> {
    if (parser === null) throw Error('analyzeIMSCCContent: parser is null.');

    const allLinks: LinkObject[] = [], allFiles: FileObject[] = [], allVideos: VideoObject[] = [];

    for (const item of items) {
        if (!item.analysisHref) continue

        const content = fileContents[item.analysisHref];
        if (!content) continue;

        let richContent: Document;
        if (item.analysisType === 'xml') {
            const xmlDoc = parser.parseFromString(content, "application/xml");
            // const description = xmlDoc.querySelector("description");
            const description = xmlDoc.getElementsByTagName('description').length > 0 ? xmlDoc.getElementsByTagName('description')[0] : null;
            const htmlContent = description ? description.textContent : '';
            richContent = parser.parseFromString(htmlContent, "text/html");
        } else if (item.analysisType === 'discussion_xml') {
            const xmlDoc = parser.parseFromString(content, "application/xml");
            // const text = xmlDoc.querySelector("text");
            const text = xmlDoc.getElementsByTagName('text').length > 0 ? xmlDoc.getElementsByTagName('text')[0] : null;
            const htmlContent = text ? text.textContent : '';
            richContent = parser.parseFromString(htmlContent, "text/html");
        } else {
            richContent = parser.parseFromString(content, "text/html");
        }

        allLinks.push(...findLinks(richContent, item));
        allFiles.push(...findFileAttachments(richContent, item));
        allVideos.push(...findVideos(richContent, item));
    }

    return {videosResults: allVideos, filesResults: allFiles, linksResults: allLinks};

    // await runAndDisplayAccessibilityChecks(items, fileContents);
    // await checkAndDisplayLinks(allLinks);
    // displayFileAttachments(allFiles);
    // displayVideos(allVideos);
}

/**
         * Run axe accessibility checks on items and prepare data for the accessibility tab.
         */
export async function analyzeIMSCCRichContentForAccessibility(parser: PlatformDOMParser, items: Resource[], fileContents: { [key: string]: string }): Promise<EnhancedAxeResults>
 {
    if (parser === null) throw Error('analyzeIMSCCRichContentForAccessibility: parser is null.');

    let allResults: EnhancedAxeResults | null = null;

    for (const item of items) {
        if (!item.analysisHref) continue;
        const content = fileContents[item.analysisHref];
        if (!content) continue;

        let doc: Document;

        if (item.analysisType === 'xml') {
            const xmlDoc = parser.parseFromString(content, "application/xml");
            // const description = xmlDoc.querySelector("description");
            const description = xmlDoc.getElementsByTagName('description').length > 0 ? xmlDoc.getElementsByTagName('description')[0] : null;
            const htmlContent = description ? description.textContent : '';
            doc = parser.parseFromString(htmlContent, "text/html");
        } else if (item.analysisType === 'discussion_xml') {
            const xmlDoc = parser.parseFromString(content, "application/xml");
            // const text = xmlDoc.querySelector("text");
            const text = xmlDoc.getElementsByTagName('text').length > 0 ? xmlDoc.getElementsByTagName('text')[0] : null;
            const htmlContent = text ? text.textContent : '';
            doc = parser.parseFromString(htmlContent, "text/html");
        } else {
            doc = parser.parseFromString(content, "text/html");
        }

        if (doc.body && doc.body.innerHTML.trim() !== '') {
            try {
                if (doc.body.querySelectorAll('*').length > 0) {
                    const axeOptions = {
                        preload: false,
                        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
                    };
                    const results = await axe.run(doc.body.querySelectorAll('*'), axeOptions);

                    const addMetadata = (type: string, issue: Axe.Result) => ({
                        ...issue,
                        type,
                        parentItemTitle: item.title,
                        parentItemType: getReadableType(item.clarifiedType) || 'ERROR: unknown type',
                        parentItemPublished: item.published,
                        parentItemModuleTitle: item.moduleTitle
                    }) as EnhancedAxeResult;

                    // If allResults hasn't been initialized yet, do so now
                    if (allResults === null) allResults = {
                        ...results,
                        violations: [],
                        passes: [],
                        incomplete: [],
                        inapplicable: []
                    };

                    allResults.violations.push(...results.violations.map(issue => addMetadata('violations', issue)));
                    allResults.passes.push(...results.passes.map(issue => addMetadata('passes', issue)));
                    allResults.incomplete.push(...results.incomplete.map(issue => addMetadata('incomplete', issue)));
                    allResults.inapplicable.push(...results.inapplicable.map(issue => addMetadata('inapplicable', issue)));
                }
            } catch (e) {
                console.warn(`Accessibility scan skipped for ${item.title}: ${(e as Error).message}`);
            }
        }
    }

    if (!allResults) throw Error('analyzeIMSCCRichContentForAccessibility: allResults should NOT be null.');
    return allResults;

    // setupAccessibilityTab(accessibilityData, items);
}

/* =========================================================================
           Helpers
    ========================================================================= */

/**
 * Find external links in a document and return structured items.
 */
// TODO: Fix formatting issues
function findLinks(doc: Document, item: Resource): LinkObject[] {

    const links: LinkObject[] = [];
    if (!doc) return links;
    // doc.querySelectorAll('a[href]').forEach(a => {
    const aElements = Array.from(doc.getElementsByTagName('a')).filter(a => a.hasAttribute('href'));
    aElements.forEach(a => {
        const href = (a as HTMLAnchorElement).getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto') && !a.classList.contains('instructure_file_link') && !a.classList.contains('instructure_scribd_file')) {
            let type = 'unknown';
            if (href.startsWith('$CANVAS') || href.includes('$WIKI_REFERENCE$')) {
                type = 'course';
            } else if (href.includes('.osu.edu') || href.includes('.ohio-state.edu')) {
                type = 'osu';
            } else {
                type = 'external'
            }
            links.push({ url: href, text: a.textContent.trim(), parentResourceIdentifier: item.identifier, parentResourceTitle: item.title, parentResourceType: item.clarifiedType, type: type as LinkType });
        }
    });
    return links;
}

/**
 * Find file attachment links in a document.
 */
// TODO: Refactor
function findFileAttachments(doc: Document, item: Resource): FileObject[] {
    const files: FileObject[] = [];

    if (!doc) return files;
    const aElements = Array.from(doc.getElementsByTagName('a')).filter(a => a.classList.contains('instructure_file_link') || a.classList.contains('instructure_scribd_file'));
    // doc.querySelectorAll('a.instructure_file_link, a.instructure_scribd_file').forEach(a => {
    aElements.forEach(a => {
        files.push({
            parentAnchorText: a.textContent.trim(),
            parentResourceType: item.clarifiedType,
            parentResourceModuleTitle: item.moduleTitle === undefined ? '(None)' : item.moduleTitle,
            parentResourceTitle: item.title, href: (a as HTMLAnchorElement).href
        });
    });

    return files;
}

/**
 * Find embedded iframes that correspond to supported video platforms.
 */
function findVideos(doc: Document, item: Resource): VideoObject[] {
    const videos: VideoObject[] = [];
    if (!doc) return videos;

    // TODO: Future opportunity to refactor

    // Check videos
    const videoElements = Array.from(doc.getElementsByTagName('video'));

    // doc.querySelectorAll('video').forEach(video => {
    videoElements.forEach(video => {
        // const classes = (video.className || '').toLowerCase();
        const title = video.title || '(Title Not Found)';
        const source = video.querySelector('source');
        const src = source?.src || '';
        const platform: string = 'Instructure';
        const type = 'embed'
        // if (classes.includes('instructure_inline_media_comment')) platform = 'Instructure';

        if (platform != 'Unknown') {
            const traverseRootTag = video.parentElement instanceof HTMLParagraphElement ? video.parentElement : video;

            const adjacentText = ((traverseRootTag.previousElementSibling?.innerHTML || '') + ' ' + (traverseRootTag.nextElementSibling?.innerHTML || '') + (traverseRootTag.nextElementSibling?.nextElementSibling?.innerHTML || '')).toLowerCase();

            const transcriptOrCaptionMentioned = /transcript|caption/i.test(adjacentText);

            videos.push({ title: title, platform, src: src, type: type, transcriptOrCaptionMentioned: transcriptOrCaptionMentioned, parentResourceTitle: item.title });
        }
    });

    // Check iFrames
    const iFrameElements = Array.from(doc.getElementsByTagName('iframe'));
    // doc.querySelectorAll('iframe').forEach(iframe => {
    iFrameElements.forEach(iframe => {
        const src = (iframe.src || '').toLowerCase();
        const title = iframe.title || '(Title Not Found)';
        let platform = 'Unknown';
        const type = 'embed'
        if (src.includes('www.youtube.com/embed/')) platform = 'YouTube';
        else if (src.includes('player.vimeo.com')) platform = 'Vimeo';
        else if (src.includes('https://mediasite.osu.edu/mediasite/lti/home/coverplay') || src.includes('mediasite.osu.edu/mediasite/play')) platform = 'Mediasite';
        else if (src.includes('echo360.com/media')) platform = 'Echo360';
        else if (src.includes('osucon.hosted.panopto.com')) platform = 'Panopto'
        else if (src.includes('instructuremedia.com') || src.includes('media_attachments_iframe')) platform = 'Instructure';

        if (platform != 'Unknown') {
            const traverseRootTag = iframe.parentElement instanceof HTMLParagraphElement ? iframe.parentElement : iframe;

            const adjacentText = ((traverseRootTag.previousElementSibling?.innerHTML || '') + ' ' + (traverseRootTag.nextElementSibling?.innerHTML || '') + (traverseRootTag.nextElementSibling?.nextElementSibling?.innerHTML || '')).toLowerCase();

            const transcriptOrCaptionMentioned = /transcript|caption/i.test(adjacentText);

            videos.push({ title: title, platform, src: src, type: type, transcriptOrCaptionMentioned: transcriptOrCaptionMentioned, parentResourceTitle: item.title });
        }
    });

    const aElements = Array.from(doc.getElementsByTagName('a'));
    // doc.querySelectorAll('a').forEach(a => {
    aElements.forEach(a => {
        const src = (a.href || '').toLowerCase();
        const title = a.text || '(Title Not Found)';
        let platform = 'Unknown';
        const type = 'link'
        if (src.includes('www.youtube.com/watch') || src.includes('youtu.be')) platform = 'YouTube';
        else if (src.includes('vimeo.com')) platform = 'Vimeo';
        else if (src.includes('mediasite.osu.edu/mediasite/play')) platform = 'Mediasite';
        else if (src.includes('external_tools')) platform = 'External Tool (potentially Mediasite';
        else if (src.includes('echo360.org/media')) platform = 'Echo360';
        else if (src.includes('osucon.hosted.panopto.com')) platform = 'Panopto'
        else if (src.includes('instructuremedia.com') || src.includes('media_attachments_iframe')) platform = 'Instructure';

        if (platform != 'Unknown') {
            const traverseRootTag = a.parentElement instanceof HTMLParagraphElement ? a.parentElement : a;

            const adjacentText = ((traverseRootTag.previousElementSibling?.innerHTML || '') + ' ' + (traverseRootTag.nextElementSibling?.innerHTML || '') + (traverseRootTag.nextElementSibling?.nextElementSibling?.innerHTML || '')).toLowerCase();

            const transcriptOrCaptionMentioned = /transcript|caption/i.test(adjacentText);

            videos.push({ title: title, platform, src: src, type: type, transcriptOrCaptionMentioned: transcriptOrCaptionMentioned, parentResourceTitle: item.title });
        }
    });
    return videos;
}

export function getReadableType(type: string): string | null {
    switch (type) {
        case 'contextmodulesubheader':
            return 'Header';
        case 'assignment':
            return 'Assignment';
        case 'page':
            return 'Page';
        case 'externalurl':
            return 'Link';
        case 'survey':
            return 'Survey';
        case 'quiz':
            return 'Quiz';
        case 'announcement':
            return 'Announcement';
        case 'discussion':
            return 'Discussion';
        default:
            return null;
    }
}