import 'link_model.dart';
import 'resource_model.dart';
import 'video_model.dart';

/// Model representing the complete analysis report
class ReportModel {
  /// List of all resources analyzed
  final List<ResourceModel> resources;
  
  /// List of all links found
  final List<LinkModel> links;
  
  /// List of all file attachments found
  final List<LinkModel> attachments;
  
  /// List of all videos found
  final List<VideoModel> videos;
  
  /// Timestamp of report generation
  final DateTime generatedAt;
  
  /// Version of the analyzer
  final String analyzerVersion;

  ReportModel({
    required this.resources,
    required this.links,
    required this.attachments,
    required this.videos,
    DateTime? generatedAt,
    String? analyzerVersion,
  }) : 
    generatedAt = generatedAt ?? DateTime.now(),
    analyzerVersion = analyzerVersion ?? '1.0.0';

  /// Convert to JSON map
  Map<String, dynamic> toJson() => {
    'metadata': {
      'generatedAt': generatedAt.toIso8601String(),
      'analyzerVersion': analyzerVersion,
      'resourceCount': resources.length,
      'linkCount': links.length,
      'attachmentCount': attachments.length,
      'videoCount': videos.length,
    },
    'resources': resources.map((resource) => resource.toJson()).toList(),
    'links': links.map((link) => link.toJson()).toList(),
    'attachments': attachments.map((attachment) => attachment.toJson()).toList(),
    'videos': videos.map((video) => video.toJson()).toList(),
  };

  /// Create from JSON map
  factory ReportModel.fromJson(Map<String, dynamic> json) => ReportModel(
    resources: (json['resources'] as List<dynamic>)
        .map((resourceJson) => ResourceModel.fromJson(resourceJson))
        .toList(),
    links: (json['links'] as List<dynamic>)
        .map((linkJson) => LinkModel.fromJson(linkJson))
        .toList(),
    attachments: (json['attachments'] as List<dynamic>)
        .map((attachmentJson) => LinkModel.fromJson(attachmentJson))
        .toList(),
    videos: (json['videos'] as List<dynamic>? ?? [])
        .map((videoJson) => VideoModel.fromJson(videoJson))
        .toList(),
    generatedAt: DateTime.parse(json['metadata']['generatedAt']),
    analyzerVersion: json['metadata']['analyzerVersion'],
  );

  /// Get summary statistics
  Map<String, dynamic> getSummary() => {
    'totalResources': resources.length,
    'totalLinks': links.length,
    'totalAttachments': attachments.length,
    'totalVideos': videos.length,
    'publishedResources': resources.where((r) => r.published).length,
    'unpublishedResources': resources.where((r) => !r.published).length,
  };
}