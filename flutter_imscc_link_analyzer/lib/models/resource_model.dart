import 'dart:convert';
import 'link_model.dart';
import 'video_model.dart';

/// Model representing a resource from IMSCC manifest
class ResourceModel {
  /// Resource title
  final String title;
  
  /// Module title (if applicable)
  final String? moduleTitle;
  
  /// Whether module is published (if applicable)
  final bool modulePublished;
  
  /// Resource identifier
  final String identifier;
  
  /// Resource identifier reference
  final String? identifierref;
  
  /// Resource href
  final String? href;
  
  /// Whether resource is published
  final bool published;
  
  /// Clarified resource type
  final String? clarifiedType;
  
  /// Content type
  final String contentType;
  
  /// Analysis href
  final String? analysisHref;
  
  /// Analysis type
  final String? analysisType;
  
  /// List of links found in this resource
  final List<LinkModel> _links;
  
  /// List of file attachments found in this resource
  final List<LinkModel> _attachments;
  
  /// List of videos found in this resource
  final List<VideoModel> _videos;

  ResourceModel({
    required this.title,
    this.moduleTitle,
    this.modulePublished = false,
    required this.identifier,
    this.identifierref,
    this.href,
    required this.published,
    this.clarifiedType,
    required this.contentType,
    this.analysisHref,
    this.analysisType,
    List<LinkModel> links = const [],
    List<LinkModel> attachments = const [],
    List<VideoModel> videos = const [],
  }) : 
    _links = List.from(links),
    _attachments = List.from(attachments),
    _videos = List.from(videos);

  /// Get all links in this resource
  List<LinkModel> get links => List.unmodifiable(_links);
  
  /// Get all attachments in this resource
  List<LinkModel> get attachments => List.unmodifiable(_attachments);
  
  /// Get all videos in this resource
  List<VideoModel> get videos => List.unmodifiable(_videos);

  /// Add a link to this resource
  void addLink(LinkModel link) {
    _links.add(link);
  }

  /// Add multiple links to this resource
  void addLinks(List<LinkModel> newLinks) {
    _links.addAll(newLinks);
  }

  /// Add an attachment to this resource
  void addAttachment(LinkModel attachment) {
    _attachments.add(attachment);
  }

  /// Add multiple attachments to this resource
  void addAttachments(List<LinkModel> newAttachments) {
    _attachments.addAll(newAttachments);
  }
  
  /// Add a video to this resource
  void addVideo(VideoModel video) {
    _videos.add(video);
  }

  /// Add multiple videos to this resource
  void addVideos(List<VideoModel> newVideos) {
    _videos.addAll(newVideos);
  }

  /// Convert to JSON map
  Map<String, dynamic> toJson() => {
    'title': title,
    'moduleTitle': moduleTitle,
    'modulePublished': modulePublished,
    'identifier': identifier,
    'identifierref': identifierref,
    'href': href,
    'published': published,
    'clarifiedType': clarifiedType,
    'contentType': contentType,
    'analysisHref': analysisHref,
    'analysisType': analysisType,
    'links': links.map((link) => link.toJson()).toList(),
    'attachments': attachments.map((attachment) => attachment.toJson()).toList(),
    'videos': videos.map((video) => video.toJson()).toList(),
  };

  /// Create from JSON map
  factory ResourceModel.fromJson(Map<String, dynamic> json) => ResourceModel(
    title: json['title'],
    moduleTitle: json['moduleTitle'],
    modulePublished: json['modulePublished'] ?? false,
    identifier: json['identifier'],
    identifierref: json['identifierref'],
    href: json['href'],
    published: json['published'],
    clarifiedType: json['clarifiedType'],
    contentType: json['contentType'],
    analysisHref: json['analysisHref'],
    analysisType: json['analysisType'],
    links: (json['links'] as List<dynamic>? ?? [])
        .map((linkJson) => LinkModel.fromJson(linkJson))
        .toList(),
    attachments: (json['attachments'] as List<dynamic>? ?? [])
        .map((attachmentJson) => LinkModel.fromJson(attachmentJson))
        .toList(),
    videos: (json['videos'] as List<dynamic>? ?? [])
        .map((videoJson) => VideoModel.fromJson(videoJson))
        .toList(),
  );

  @override
  String toString() => 'Resource: $title (${clarifiedType ?? contentType}) ${published ? "[Published]" : "[Unpublished]"}';
}