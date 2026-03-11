import 'dart:io';
import 'package:logging/logging.dart';
import 'package:xml/xml.dart';
import 'package:html/parser.dart' as html;
import 'package:html/dom.dart';

import 'models/resource_model.dart';
import 'models/link_model.dart';
import 'models/module_model.dart';
import 'models/video_model.dart';
import 'utils/progress_tracker.dart';
import 'utils/file_utils.dart';
import 'utils/xml_utils.dart';

class IMSCCParser {
  final Logger _logger = Logger('IMSCCParser');
  final ProgressTracker progressTracker;
  
  // Error tracking
  final List<Map<String, dynamic>> _parsingErrors = [];
  final Map<String, int> _errorStatistics = {};

  IMSCCParser({required this.progressTracker});
  
  /// Get collected parsing errors
  List<Map<String, dynamic>> get parsingErrors => List.unmodifiable(_parsingErrors);
  
  /// Get error statistics
  Map<String, int> get errorStatistics => Map.unmodifiable(_errorStatistics);
  
  /// Record a parsing error with full context
  void _recordParsingError(String resourceId, String resourceType, dynamic error, StackTrace stackTrace) {
    _parsingErrors.add({
      'resourceId': resourceId,
      'resourceType': resourceType,
      'error': error.toString(),
      'timestamp': DateTime.now().toIso8601String(),
      'stackTrace': stackTrace.toString(),
    });

    // Update error statistics
    final errorType = error.runtimeType.toString();
    _errorStatistics[errorType] = (_errorStatistics[errorType] ?? 0) + 1;

    _logger.warning('Recorded parsing error for $resourceId ($resourceType): ${error.toString()}');
  }
  
  /// Attempt partial recovery of a failed resource
  ResourceModel? _attemptPartialRecovery(ResourceModel resource, Map<String, String> fileContents) {
    try {
      if (resource.analysisHref == null || !fileContents.containsKey(resource.analysisHref!)) {
        return null;
      }

      final content = fileContents[resource.analysisHref!]!;
      
      // Try to create a minimal document
      final minimalDoc = _createMinimalDocument(content);
      if (minimalDoc == null) {
        return null;
      }

      // Create recovery resource with basic data
      final recoveredResource = ResourceModel(
        title: resource.title,
        moduleTitle: resource.moduleTitle,
        modulePublished: resource.modulePublished,
        identifier: resource.identifier,
        identifierref: resource.identifierref,
        href: resource.href,
        published: resource.published,
        clarifiedType: resource.clarifiedType,
        contentType: resource.contentType,
        analysisHref: resource.analysisHref,
        analysisType: resource.analysisType,
      );

      // Try to extract basic links/attachments/videos
      try {
        recoveredResource.addLinks(_findLinksInDocument(minimalDoc, recoveredResource));
      } catch (e) {
        _logger.fine('Link recovery failed for ${resource.title}: ${e.toString()}');
      }

      try {
        recoveredResource.addAttachments(_findAttachmentsInDocument(minimalDoc, recoveredResource));
      } catch (e) {
        _logger.fine('Attachment recovery failed for ${resource.title}: ${e.toString()}');
      }

      try {
        recoveredResource.addVideos(_findVideosInDocument(minimalDoc, recoveredResource));
      } catch (e) {
        _logger.fine('Video recovery failed for ${resource.title}: ${e.toString()}');
      }

      _logger.info('Partially recovered resource: ${resource.title}');
      return recoveredResource;
      
    } catch (e, stackTrace) {
      _logger.warning('Partial recovery failed for ${resource.title}: ${e.toString()}', e, stackTrace);
      _recordParsingError(resource.identifier, resource.contentType, e, stackTrace);
      return null;
    }
  }
  
  /// Create minimal document from content
  Document? _createMinimalDocument(String content) {
    try {
      // Try to clean and parse as HTML
      final cleanText = content.replaceAll(RegExp(r'<[^>]*>'), ' ');
      return html.parse('<html><body>$cleanText</body></html>');
    } catch (e) {
      _logger.fine('Failed to create minimal document: ${e.toString()}');
      return null;
    }
  }

  /// Main method to parse IMSCC file
  Future<List<ResourceModel>> parseIMSCC(File imsccFile) async {
    progressTracker.startStep(0); // Extraction step
    
    // Extract ZIP archive
    final fileContents = await FileUtils.extractZipToMemory(imsccFile);
    progressTracker.completeStep();
    
    progressTracker.startStep(1); // Parsing step
    
    // Parse manifest
    final resources = await _parseManifest(fileContents);
    
    // Parse modules
    final modules = await _parseModules(fileContents);
    
    // Reconcile modules with resources
    _reconcileModulesAndResources(modules, resources);
    
    progressTracker.completeStep();
    
    progressTracker.startStep(2); // Analysis step
    
    // Analyze resources for links and attachments
    await _analyzeResources(resources, fileContents);
    progressTracker.completeStep();
    
    return resources;
  }

  /// Parse the IMSCC manifest file
  Future<List<ResourceModel>> _parseManifest(
    Map<String, String> fileContents,
  ) async {
    final manifestContent = fileContents['imsmanifest.xml'];
    if (manifestContent == null) {
      throw Exception('imsmanifest.xml not found in IMSCC archive');
    }

    final manifestDoc = XmlUtils.parseXmlString(manifestContent);
    final resourceElements = XmlUtils.findElements(manifestDoc, 'resource');
    
    final resources = <ResourceModel>[];
    
    for (final resourceElement in resourceElements) {
      try {
        final resourceIdentifier = XmlUtils.getAttribute(resourceElement, 'identifier') ?? 'unknown';
        final resourceHref = XmlUtils.getAttribute(resourceElement, 'href');
        final resourceType = XmlUtils.getAttribute(resourceElement, 'type') ?? 'unknown';
        
        _logger.fine('Processing resource: $resourceIdentifier (type: $resourceType, href: $resourceHref)');
        
        final resource = await _parseResourceElement(
          resourceElement, 
          fileContents,
          manifestDoc,
        );
        if (resource != null) {
          resources.add(resource);
          _logger.fine('Added resource: ${resource.title} (${resource.clarifiedType ?? resource.contentType})');
        } else {
          _logger.fine('Skipped resource: $resourceIdentifier');
        }
      } catch (e) {
        _logger.warning('Failed to parse resource: ${e.toString()}');
      }
    }
    
    _logger.info('Parsed ${resources.length} resources from manifest');
    return resources;
  }

  /// Parse individual resource element
  Future<ResourceModel?> _parseResourceElement(
    XmlElement resourceElement,
    Map<String, String> fileContents,
    XmlDocument manifestDoc,
  ) async {
    final resourceIdentifier = XmlUtils.getAttribute(
      resourceElement, 'identifier'
    ) ?? 'unknown';
    
    final resourceHref = XmlUtils.getAttribute(resourceElement, 'href');
    final resourceType = XmlUtils.getAttribute(resourceElement, 'type') ?? 'unknown';
    
    // Skip certain resource types (same as original app)
    if (_shouldSkipResource(resourceType, resourceHref)) {
      return null;
    }
    
    // Determine resource properties
    final resourceProps = await _determineResourceProperties(
      resourceIdentifier,
      resourceType,
      resourceHref,
      resourceElement,
      fileContents,
      manifestDoc,
    );
    
    if (resourceProps == null) return null;
    
    return ResourceModel(
      title: resourceProps['title'] ?? 'Untitled',
      moduleTitle: resourceProps['moduleTitle'],
      modulePublished: resourceProps['modulePublished'] ?? false,
      identifier: resourceIdentifier,
      identifierref: resourceProps['identifierref'],
      href: resourceHref,
      published: resourceProps['published'] ?? false,
      clarifiedType: resourceProps['clarifiedType'],
      contentType: resourceType,
      analysisHref: resourceProps['analysisHref'],
      analysisType: resourceProps['analysisType'] ?? 'html',
    );
  }

  /// Determine if resource should be skipped
  bool _shouldSkipResource(String? resourceType, String? resourceHref) {
    return resourceType == 'imsbasiclti_xmlv1p3' ||
           resourceHref?.contains('non_cc_assessments') == true ||
           resourceHref?.contains('canvas_export.txt') == true ||
           (resourceType == 'webcontent' && 
            resourceHref?.startsWith('web_resources/') == true);
  }

  /// Determine resource properties based on type
  Future<Map<String, dynamic>?> _determineResourceProperties(
    String resourceIdentifier,
    String resourceType,
    String? resourceHref,
    XmlElement resourceElement,
    Map<String, String> fileContents,
    XmlDocument manifestDoc,
  ) async {
    // Default values
    String? clarifiedType;
    String? analysisHref = resourceHref;
    String? analysisType = 'html';
    String? identifierref;
    bool published = false;
    String? title;
    
    // Determine resource type and properties
    if (resourceType.contains('associatedcontent/imscc_xmlv1p1/learning-application-resource') &&
        resourceHref?.endsWith('html') == true &&
        !resourceHref!.startsWith('course_settings/')) {
      // Assignment
      clarifiedType = 'assignment';
      analysisType = 'xml';
      
      // Find assignment settings file
      final settingsFile = fileContents.keys.firstWhere(
        (fileName) => fileName.startsWith('$resourceIdentifier/') && 
                     fileName.endsWith('assignment_settings.xml'),
        orElse: () => '',
      );
      
      if (settingsFile.isNotEmpty) {
        analysisHref = settingsFile;
        final settingsContent = fileContents[settingsFile];
        if (settingsContent != null) {
          final settingsDoc = XmlUtils.parseXmlString(settingsContent);
          title = XmlUtils.getElementText(
            XmlUtils.findFirstElement(settingsDoc, 'title')
          ) ?? 'Untitled Assignment';
          
          published = XmlUtils.getElementText(
            XmlUtils.findFirstElement(settingsDoc, 'workflow_state')
          ) == 'active';
        }
      }
    }
    else if (resourceType.contains('imsqti_xmlv1p2/imscc_xmlv1p1/assessment')) {
      // Quiz or Survey
      clarifiedType = 'quiz';
      analysisType = 'xml';
      identifierref = _getDependencyIdentifier(resourceElement);
      
      if (identifierref != null) {
        final depResource = _findResourceByIdentifier(
          manifestDoc, identifierref
        );
        if (depResource != null) {
          final depHref = XmlUtils.getAttribute(depResource, 'href');
          if (depHref != null && fileContents.containsKey(depHref)) {
            analysisHref = depHref;
            final quizContent = fileContents[depHref];
            if (quizContent != null) {
              final quizDoc = XmlUtils.parseXmlString(quizContent);
              title = XmlUtils.getElementText(
                XmlUtils.findFirstElement(quizDoc, 'title')
              ) ?? 'Untitled Quiz';
              
              published = XmlUtils.getElementText(
                XmlUtils.findFirstElement(quizDoc, 'available')
              ) == 'true';
              
              // Check if it's a survey
              final quizType = XmlUtils.getElementText(
                XmlUtils.findFirstElement(quizDoc, 'quiz_type')
              );
              if (quizType == 'survey') {
                clarifiedType = 'survey';
              }
            }
          }
        }
      }
    }
    else if (resourceType.contains('imsdt_xmlv1p1')) {
      // Discussion
      clarifiedType = 'discussion';
      analysisType = 'discussion_xml';
      identifierref = _getDependencyIdentifier(resourceElement);
      
      if (identifierref != null) {
        final depResource = _findResourceByIdentifier(
          manifestDoc, identifierref
        );
        if (depResource != null) {
          final depHref = XmlUtils.getAttribute(depResource, 'href');
          if (depHref != null) {
            analysisHref = '$resourceIdentifier.xml';
            
            // Check discussion settings for title and published status
            final settingsHref = XmlUtils.getAttribute(depResource, 'href');
            if (settingsHref != null && fileContents.containsKey(settingsHref)) {
              final settingsContent = fileContents[settingsHref];
              if (settingsContent != null) {
                final settingsDoc = XmlUtils.parseXmlString(settingsContent);
                title = XmlUtils.getElementText(
                  XmlUtils.findFirstElement(settingsDoc, 'title')
                ) ?? 'Untitled Discussion';
                
                published = XmlUtils.getElementText(
                  XmlUtils.findFirstElement(settingsDoc, 'workflow_state')
                ) == 'active';
                
                // Check if it's an announcement
                final discussionType = XmlUtils.getElementText(
                  XmlUtils.findFirstElement(settingsDoc, 'type')
                );
                if (discussionType == 'announcement') {
                  clarifiedType = 'announcement';
                }
              }
            }
          }
        }
      }
    }
    else if (resourceType == 'webcontent' && 
             resourceHref?.startsWith('wiki_content/') == true) {
      // Page
      clarifiedType = 'page';
      analysisType = 'html';
      
      if (resourceHref != null && fileContents.containsKey(resourceHref)) {
        final pageContent = fileContents[resourceHref];
        if (pageContent != null) {
          try {
            // Try HTML parsing first (more robust)
            final pageDoc = html.parse(pageContent);
            title = pageDoc.querySelector('title')?.text ?? 'Untitled Page';
            
            // Check for published status in meta tags
            final metaTags = pageDoc.querySelectorAll('meta');
            for (final meta in metaTags) {
              if (meta.attributes['name'] == 'workflow_state' && 
                  meta.attributes['content'] == 'active') {
                published = true;
                break;
              }
            }
          } catch (e) {
            _logger.fine('HTML parsing failed for page, using defaults: ${e.toString()}');
            title = 'Untitled Page';
            published = false;
          }
        }
      }
    }
    else if (resourceIdentifier.endsWith('_syllabus') && resourceHref != null) {
      // Syllabus
      clarifiedType = 'syllabus';
      analysisType = 'html';
      title = 'Course Syllabus';
      published = true; // Syllabus is typically always published
    }
    else if (resourceType == 'imswl_xmlv1p1') {
      // Module link
      clarifiedType = 'modulelink';
      analysisType = 'xml';
      
      // Find the file href for module links
      final fileElement = XmlUtils.findFirstElement(resourceElement, 'file');
      if (fileElement != null) {
        analysisHref = XmlUtils.getAttribute(fileElement, 'href');
      }
    }
    
    // If we couldn't determine a clarified type, skip this resource
    if (clarifiedType == null) {
      return null;
    }
    
    // Find module information for this resource
    final moduleInfo = _findModuleForResource(resourceIdentifier, manifestDoc);
    
    return {
      'title': title ?? 'Untitled',
      'moduleTitle': moduleInfo?['title'],
      'modulePublished': moduleInfo?['published'] ?? false,
      'clarifiedType': clarifiedType,
      'analysisHref': analysisHref,
      'analysisType': analysisType,
      'identifierref': identifierref,
      'published': published,
    };
  }

  /// Get dependency identifier from resource element
  String? _getDependencyIdentifier(XmlElement resourceElement) {
    final dependency = XmlUtils.findFirstElement(resourceElement, 'dependency');
    if (dependency != null) {
      return XmlUtils.getAttribute(dependency, 'identifierref');
    }
    return null;
  }

  /// Find resource by identifier
  XmlElement? _findResourceByIdentifier(
    XmlDocument manifestDoc, 
    String identifier,
  ) {
    return XmlUtils.findElements(manifestDoc, 'resource').firstWhere(
      (element) => XmlUtils.getAttribute(element, 'identifier') == identifier,
      orElse: () => throw Exception('Resource not found'),
    );
  }

  /// Find module information for a resource
  Map<String, dynamic>? _findModuleForResource(
    String resourceIdentifier,
    XmlDocument manifestDoc,
  ) {
    try {
      // Look for organization structure in manifest
      final organizations = XmlUtils.findElements(manifestDoc, 'organizations');
      if (organizations.isEmpty) {
        return null;
      }
      
      final organization = organizations.first;
      final moduleItems = organization.findElements('item');
      
      // Search through top-level items (modules)
      for (final moduleItem in moduleItems) {
        // Check if this module contains our resource
        final moduleInfo = _findResourceInModuleItem(moduleItem, resourceIdentifier);
        if (moduleInfo != null) {
          return moduleInfo;
        }
      }
      
    } catch (e) {
      _logger.fine('Failed to find module for resource: ${e.toString()}');
    }
    
    return null;
  }

  /// Recursively search through module items to find a resource
  Map<String, dynamic>? _findResourceInModuleItem(
    XmlElement moduleItem,
    String resourceIdentifier,
  ) {
    try {
      // Check if this item directly references our resource
      final identifierref = XmlUtils.getAttribute(moduleItem, 'identifierref');
      _logger.fine('Checking item: ${XmlUtils.getElementText(XmlUtils.findFirstElement(moduleItem, 'title')) ?? 'Untitled'}, identifierref: $identifierref, looking for: $resourceIdentifier');
      
      if (identifierref == resourceIdentifier) {
        // This item is our resource, get the parent module title
        final moduleTitle = XmlUtils.getElementText(
          XmlUtils.findFirstElement(moduleItem.parent!, 'title')
        );
        _logger.fine('Found resource in module: $moduleTitle');
        
        return {
          'title': moduleTitle,
          'published': true, // Module published status would need to be determined separately
        };
      }
      
      // Recursively search through child items
      final childItems = moduleItem.findElements('item');
      for (final childItem in childItems) {
        final result = _findResourceInModuleItem(childItem, resourceIdentifier);
        if (result != null) {
          return result;
        }
      }
      
    } catch (e) {
      _logger.fine('Failed to search module item: ${e.toString()}');
    }
    
    return null;
  }

  /// Analyze resources for links, attachments, and videos
  Future<void> _analyzeResources(
    List<ResourceModel> resources,
    Map<String, String> fileContents,
  ) async {
    final totalResources = resources.length;
    
    for (var i = 0; i < totalResources; i++) {
      final resource = resources[i];
      
      // Update progress
      final progress = i / totalResources;
      progressTracker.updateProgress(progress);
      
      try {
        if (resource.analysisHref != null && 
            fileContents.containsKey(resource.analysisHref!)) {
          
          final content = fileContents[resource.analysisHref!]!;
          
          // Parse content based on analysis type
          final doc = _parseContentByType(content, resource.analysisType!);
          
          if (doc != null) {
            // Find links, attachments, and videos
            final links = _findLinksInDocument(doc, resource);
            final attachments = _findAttachmentsInDocument(doc, resource);
            final videos = _findVideosInDocument(doc, resource);
            
            resource.addLinks(links);
            resource.addAttachments(attachments);
            resource.addVideos(videos);
            
            _logger.fine('Found ${links.length} links, ${attachments.length} attachments, ${videos.length} videos in ${resource.title}');
          }
        }
      } catch (e) {
        _logger.warning('Failed to analyze resource ${resource.identifier}: ${e.toString()}');
      }
    }
  }

  /// Parse content based on analysis type with progressive fallbacks
  Document? _parseContentByType(String content, String analysisType) {
    try {
      if (analysisType == 'xml') {
        // Level 1: Try XML parsing with description extraction
        try {
          final xmlDoc = XmlUtils.parseXmlString(content);
          final description = XmlUtils.findFirstElement(xmlDoc, 'description');
          if (description != null && description.innerText.isNotEmpty) {
            return html.parse(description.innerText);
          }
        } catch (e) {
          _logger.fine('XML description parsing failed: ${e.toString()}');
        }

        // Level 2: Try direct HTML parsing
        try {
          return html.parse(content);
        } catch (e) {
          _logger.fine('Direct HTML parsing failed: ${e.toString()}');
        }

        // Level 3: Create minimal document from text content
        try {
          final cleanText = content.replaceAll(RegExp(r'<[^>]*>'), ' ');
          return html.parse('<html><body>$cleanText</body></html>');
        } catch (e) {
          _logger.warning('All XML parsing attempts failed: ${e.toString()}');
          return null;
        }
      } else if (analysisType == 'discussion_xml') {
        // Level 1: Try discussion XML parsing with text extraction
        try {
          final xmlDoc = XmlUtils.parseXmlString(content);
          final text = XmlUtils.findFirstElement(xmlDoc, 'text');
          if (text != null && text.innerText.isNotEmpty) {
            return html.parse(text.innerText);
          }
        } catch (e) {
          _logger.fine('Discussion XML parsing failed: ${e.toString()}');
        }

        // Level 2: Try direct HTML parsing
        try {
          return html.parse(content);
        } catch (e) {
          _logger.fine('Fallback HTML parsing failed: ${e.toString()}');
        }

        // Level 3: Create minimal document from text content
        try {
          final cleanText = content.replaceAll(RegExp(r'<[^>]*>'), ' ');
          return html.parse('<html><body>$cleanText</body></html>');
        } catch (e) {
          _logger.warning('All discussion XML parsing attempts failed: ${e.toString()}');
          return null;
        }
      } else {
        // For HTML content, parse directly with fallback
        try {
          return html.parse(content);
        } catch (e) {
          _logger.fine('Direct HTML parsing failed: ${e.toString()}');
          
          // Fallback: Create minimal document from text content
          try {
            final cleanText = content.replaceAll(RegExp(r'<[^>]*>'), ' ');
            return html.parse('<html><body>$cleanText</body></html>');
          } catch (e) {
            _logger.warning('All HTML parsing attempts failed: ${e.toString()}');
            return null;
          }
        }
      }
    } catch (e) {
      _logger.severe('Unexpected parsing error: ${e.toString()}');
    }
    return null;
  }

  /// Find links in document (works with HTML documents)
  List<LinkModel> _findLinksInDocument(
    Document doc, 
    ResourceModel resource,
  ) {
    final links = <LinkModel>[];
    
    // Find all <a> and <url> elements
    final aElements = doc.querySelectorAll('a');
    final urlElements = doc.querySelectorAll('url');
    
    final allElements = [...aElements, ...urlElements];
    
    for (final element in allElements) {
      final href = element.attributes['href'];
      if (href == null || href.startsWith('#') || href.startsWith('mailto:')) {
        continue;
      }
      
      // Skip Canvas file links
      final classAttr = element.attributes['class'] ?? '';
      if (classAttr.contains('instructure_file_link') ||
          classAttr.contains('instructure_scribd_file')) {
        continue;
      }
      
      // Determine link type
      LinkType linkType;
      if (href.startsWith('\u0000CANVAS') || href.contains('\u0000WIKI_REFERENCE\u0000')) {
        linkType = LinkType.course;
      } else if (href.contains('.osu.edu') || href.contains('.ohio-state.edu')) {
        linkType = LinkType.osu;
      } else {
        linkType = LinkType.external;
      }
      
      // Check if it's an OSU Libraries link
      final isOSULibrariesLink = href.contains('.library.osu.edu') ||
                                 href.contains('.library.ohio-state.edu') ||
                                 href.contains('.proxy.lib.ohio-state.edu');
      
      links.add(LinkModel(
        url: href,
        text: element.text?.trim() ?? '',
        isOSULibrariesLink: isOSULibrariesLink,
        parentResourceIdentifier: resource.identifier,
        parentResourceStatus: resource.published,
        parentResourceTitle: resource.title,
        parentResourceType: resource.clarifiedType ?? resource.contentType,
        parentResourceModuleTitle: resource.moduleTitle,
        type: linkType,
      ));
    }
    
    return links;
  }

  /// Find file attachments in document (works with HTML documents)
  List<LinkModel> _findAttachmentsInDocument(
    Document doc,
    ResourceModel resource,
  ) {
    final attachments = <LinkModel>[];
    
    // Find Canvas file link elements
    final aElements = doc.querySelectorAll('a');
    
    for (final element in aElements) {
      final classAttr = element.attributes['class'] ?? '';
      if (classAttr.contains('instructure_file_link') ||
          classAttr.contains('instructure_scribd_file')) {
        
        final href = element.attributes['href'];
        if (href == null) continue;
        
        final text = element.text?.trim() ?? '';
        final anchorText = text.isEmpty ? '(REMEDIATE: Phantom Link)' : text;
        
        // Get file extension
        final extension = FileUtils.getFileExtensionFromUrl(href);
        
        attachments.add(LinkModel(
          url: href,
          text: anchorText,
          isOSULibrariesLink: false,
          parentResourceIdentifier: resource.identifier,
          parentResourceStatus: resource.published,
          parentResourceTitle: resource.title,
          parentResourceType: resource.clarifiedType ?? resource.contentType,
          parentResourceModuleTitle: resource.moduleTitle,
          type: LinkType.course, // Attachments are internal course files
          extension: extension,
        ));
      }
    }
    
    return attachments;
  }
  
  /// Find videos in document (works with HTML documents)
  List<VideoModel> _findVideosInDocument(
    Document doc,
    ResourceModel resource,
  ) {
    final videos = <VideoModel>[];
    
    if (doc == null) return videos;
    
    // Collect all relevant elements that might contain video content
    final videoElements = doc.querySelectorAll('video');
    final iFrameElements = doc.querySelectorAll('iframe');
    final aElements = doc.querySelectorAll('a');
    
    // Combine all elements into a single array with their type
    final allNodesToParse = <Map<String, dynamic>>[];
    
    for (final element in videoElements) {
      allNodesToParse.add({'type': 'video', 'element': element});
    }
    for (final element in iFrameElements) {
      allNodesToParse.add({'type': 'iframe', 'element': element});
    }
    for (final element in aElements) {
      allNodesToParse.add({'type': 'a', 'element': element});
    }
    
    for (final node in allNodesToParse) {
      final nodeType = node['type'] as String;
      final nodeElement = node['element'] as dynamic;
      
      String title = '(REMEDIATE: Title Not Found)';
      String src = '';
      VideoPlatform platform = VideoPlatform.unknown;
      VideoType videoType = VideoType.unknown;
      
      // Extract relevant data based on element type
      try {
        if (nodeType == 'video') {
          // For <video> elements
          final titleAttr = nodeElement.attributes['title'] ?? '';
          if (titleAttr.isNotEmpty) title = titleAttr;
          
          // Get source from <source> child element
          final source = nodeElement.querySelector('source');
          src = source?.attributes['src'] ?? '';
          platform = VideoPlatform.instream; // Assume Instructure media for <video> tags
          videoType = VideoType.embed;
        } else if (nodeType == 'iframe') {
          // For <iframe> elements
          final titleAttr = nodeElement.attributes['title'] ?? '';
          if (titleAttr.isNotEmpty) title = titleAttr;
          
          src = nodeElement.attributes['src'] ?? '';
          if (src.isNotEmpty) {
            platform = _determineVideoPlatform(src);
          }
          videoType = VideoType.embed;
        } else if (nodeType == 'a') {
          // For <a> elements (video links)
          final text = nodeElement.text?.trim() ?? '';
          if (text.isNotEmpty) title = text;
          
          src = nodeElement.attributes['href'] ?? '';
          if (src.isNotEmpty) {
            platform = _determineVideoPlatform(src);
          }
          videoType = VideoType.link;
        }
      } catch (e) {
        _logger.fine('Failed to parse video node: ${e.toString()}');
        continue;
      }
      
      // If we identified a known video platform, add it to the list
      if (platform != VideoPlatform.unknown && src.isNotEmpty) {
        // Check for transcript or caption mentions in adjacent text
        bool transcriptOrCaptionMentioned = false;
        
        try {
          // Determine the root element for traversing adjacent text
          final traverseRootTag = nodeElement.parent?.localName == 'p'
              ? nodeElement.parent
              : nodeElement;
          
          if (traverseRootTag != null) {
            // Concatenate text from previous and next sibling elements
            final adjacentText = (
              (traverseRootTag.previousElementSibling?.text?.toLowerCase() ?? '') +
              ' ' +
              (traverseRootTag.nextElementSibling?.text?.toLowerCase() ?? '') +
              (traverseRootTag.nextElementSibling?.nextElementSibling?.text?.toLowerCase() ?? '')
            ).toLowerCase();
            
            transcriptOrCaptionMentioned = adjacentText.contains('transcript') || 
                                         adjacentText.contains('caption');
          }
        } catch (e) {
          _logger.fine('Failed to check for transcript/caption: ${e.toString()}');
        }
        
        videos.add(VideoModel(
          title: title,
          platform: platform,
          src: src,
          type: videoType,
          transcriptOrCaptionMentioned: transcriptOrCaptionMentioned,
          parentResourceIdentifier: resource.identifier,
          parentResourceStatus: resource.published,
          parentResourceTitle: resource.title,
          parentResourceType: resource.clarifiedType ?? resource.contentType,
          parentResourceModuleTitle: resource.moduleTitle,
        ));
      }
    }
    
    return videos;
  }
  
  /// Determine video platform based on URL
  VideoPlatform _determineVideoPlatform(String src) {
    final srcLower = src.toLowerCase();
    
    // Check for known video platforms
    if (srcLower.contains('youtube.com') || srcLower.contains('youtu.be')) {
      return VideoPlatform.youtube;
    } else if (srcLower.contains('vimeo.com')) {
      return VideoPlatform.vimeo;
    } else if (srcLower.contains('mediasite.osu.edu') || srcLower.contains('mediasite.')) {
      return VideoPlatform.mediasite;
    } else if (srcLower.contains('echo360.com')) {
      return VideoPlatform.echo360;
    } else if (srcLower.contains('panopto.com')) {
      return VideoPlatform.panopto;
    } else if (srcLower.contains('instructuremedia.com') || srcLower.contains('media_attachments_iframe')) {
      return VideoPlatform.instream;
    } else if (srcLower.contains('external_tools')) {
      return VideoPlatform.external;
    }
    
    return VideoPlatform.unknown;
  }
  
  /// Parse modules from course_settings/module_meta.xml
  Future<List<ModuleModel>> _parseModules(
    Map<String, String> fileContents,
  ) async {
    final moduleMetaContent = fileContents['course_settings/module_meta.xml'];
    if (moduleMetaContent == null) {
      _logger.info('No module_meta.xml found in IMSCC archive');
      return [];
    }
    
    try {
      final moduleMetaDoc = XmlUtils.parseXmlString(moduleMetaContent);
      final moduleElements = XmlUtils.findElements(moduleMetaDoc, 'module');
      
      final modules = <ModuleModel>[];
      
      for (final moduleElement in moduleElements) {
        try {
          final moduleIdentifier = XmlUtils.getAttribute(moduleElement, 'identifier') ?? 'unknown';
          final moduleTitle = XmlUtils.getElementText(
            XmlUtils.findFirstElement(moduleElement, 'title')
          ) ?? 'Untitled Module';
          
          final workflowState = XmlUtils.getElementText(
            XmlUtils.findFirstElement(moduleElement, 'workflow_state')
          ) ?? 'unpublished';
          final published = workflowState == 'active';
          
          final positionText = XmlUtils.getElementText(
            XmlUtils.findFirstElement(moduleElement, 'position')
          ) ?? '0';
          final position = int.tryParse(positionText) ?? 0;
          
          // Parse module items - use findAllElements to handle namespaces
          final itemElements = moduleElement.findAllElements('item');
          final items = <ModuleItemModel>[];
          
          _logger.fine('Found ${itemElements.length} items in module: $moduleTitle');
          
          for (final itemElement in itemElements) {
            try {
              final itemIdentifier = XmlUtils.getAttribute(itemElement, 'identifier') ?? 'unknown';
              final itemTitle = XmlUtils.getElementText(
                XmlUtils.findFirstElement(itemElement, 'title')
              ) ?? 'Untitled Item';
              
              final itemContentType = XmlUtils.getElementText(
                XmlUtils.findFirstElement(itemElement, 'content_type')
              ) ?? 'unknown';
              
              final itemWorkflowState = XmlUtils.getElementText(
                XmlUtils.findFirstElement(itemElement, 'workflow_state')
              ) ?? 'unpublished';
              final itemPublished = itemWorkflowState == 'active';
              
              final itemPositionText = XmlUtils.getElementText(
                XmlUtils.findFirstElement(itemElement, 'position')
              ) ?? '0';
              final itemPosition = int.tryParse(itemPositionText) ?? 0;
              
              final indentText = XmlUtils.getElementText(
                XmlUtils.findFirstElement(itemElement, 'indent')
              ) ?? '0';
              final indent = int.tryParse(indentText) ?? 0;
              
              final identifierref = XmlUtils.getElementText(
                XmlUtils.findFirstElement(itemElement, 'identifierref')
              );
              
              _logger.fine('  Item: $itemTitle (identifierref: $identifierref)');
              
              items.add(ModuleItemModel(
                identifier: itemIdentifier,
                title: itemTitle,
                contentType: itemContentType,
                published: itemPublished,
                position: itemPosition,
                indent: indent,
                identifierref: identifierref,
                moduleTitle: moduleTitle,
              ));
            } catch (e) {
              _logger.warning('Failed to parse module item: ${e.toString()}');
            }
          }
          
          modules.add(ModuleModel(
            identifier: moduleIdentifier,
            title: moduleTitle,
            published: published,
            position: position,
            items: items,
          ));
          
          _logger.fine('Parsed module: $moduleTitle with ${items.length} items');
          
        } catch (e) {
          _logger.warning('Failed to parse module: ${e.toString()}');
        }
      }
      
      _logger.info('Parsed ${modules.length} modules from module_meta.xml');
      return modules;
      
    } catch (e) {
      _logger.warning('Failed to parse module_meta.xml: ${e.toString()}');
      return [];
    }
  }
  
  /// Reconcile modules with resources
  void _reconcileModulesAndResources(
    List<ModuleModel> modules,
    List<ResourceModel> resources,
  ) {
    _logger.info('Reconciling ${modules.length} modules with ${resources.length} resources');
    
    for (final module in modules) {
      for (final item in module.items) {
        if (item.identifierref == null) continue;
        
        // Find matching resource
        final matchingResource = resources.firstWhere(
          (resource) => resource.identifier == item.identifierref,
          orElse: () => ResourceModel(
            title: 'Unknown',
            identifier: 'unknown',
            published: false,
            contentType: 'unknown',
          ),
        );
        
        if (matchingResource.identifier != 'unknown') {
          // Update item with resource type
          item.clarifiedType = matchingResource.clarifiedType ?? matchingResource.contentType;
          
          // Update resource with module information
          // Note: We need to find the actual resource in the list to update it
          final resourceIndex = resources.indexWhere(
            (resource) => resource.identifier == item.identifierref
          );
          
          if (resourceIndex != -1) {
            // Create a new resource with updated module info
            final originalResource = resources[resourceIndex];
            resources[resourceIndex] = ResourceModel(
              title: originalResource.title,
              moduleTitle: module.title,
              modulePublished: module.published,
              identifier: originalResource.identifier,
              identifierref: originalResource.identifierref,
              href: originalResource.href,
              published: originalResource.published,
              clarifiedType: originalResource.clarifiedType,
              contentType: originalResource.contentType,
              analysisHref: originalResource.analysisHref,
              analysisType: originalResource.analysisType,
              links: originalResource.links,
              attachments: originalResource.attachments,
            );
          }
        }
      }
    }
    
    _logger.info('Module reconciliation complete');
  }
}