/// Video type classification
enum VideoType {
  embed,     // Embedded video
  link,      // Video link
  unknown    // Unclassified video type
}

/// Video platform classification
enum VideoPlatform {
  youtube,      // YouTube videos
  vimeo,        // Vimeo videos
  mediasite,    // Mediasite videos
  echo360,      // Echo360 videos
  panopto,      // Panopto videos
  instream,     // Instructure Media videos
  external,     // External video platforms
  unknown       // Unknown platform
}

/// Model representing a video found in IMSCC content
class VideoModel {
  /// The title of the video
  final String title;
  
  /// The video platform
  final VideoPlatform platform;
  
  /// The video source URL
  final String src;
  
  /// The video type (embed or link)
  final VideoType type;
  
  /// Whether transcript or caption is mentioned
  final bool transcriptOrCaptionMentioned;
  
  /// The parent resource identifier
  final String parentResourceIdentifier;
  
  /// Whether the parent resource is published
  final bool parentResourceStatus;
  
  /// The parent resource title
  final String parentResourceTitle;
  
  /// The parent resource type
  final String parentResourceType;
  
  /// The parent resource module title (if any)
  final String? parentResourceModuleTitle;
  
  VideoModel({
    required this.title,
    required this.platform,
    required this.src,
    required this.type,
    required this.transcriptOrCaptionMentioned,
    required this.parentResourceIdentifier,
    required this.parentResourceStatus,
    required this.parentResourceTitle,
    required this.parentResourceType,
    this.parentResourceModuleTitle,
  });
  
  /// Convert to JSON map
  Map<String, dynamic> toJson() => {
    'title': title,
    'platform': platform.toString().split('.').last,
    'src': src,
    'type': type.toString().split('.').last,
    'transcriptOrCaptionMentioned': transcriptOrCaptionMentioned,
    'parentResourceIdentifier': parentResourceIdentifier,
    'parentResourceStatus': parentResourceStatus,
    'parentResourceTitle': parentResourceTitle,
    'parentResourceType': parentResourceType,
    'parentResourceModuleTitle': parentResourceModuleTitle,
  };
  
  /// Create from JSON map
  factory VideoModel.fromJson(Map<String, dynamic> json) => VideoModel(
    title: json['title'],
    platform: _parseVideoPlatform(json['platform']),
    src: json['src'],
    type: _parseVideoType(json['type']),
    transcriptOrCaptionMentioned: json['transcriptOrCaptionMentioned'] ?? false,
    parentResourceIdentifier: json['parentResourceIdentifier'],
    parentResourceStatus: json['parentResourceStatus'],
    parentResourceTitle: json['parentResourceTitle'],
    parentResourceType: json['parentResourceType'],
    parentResourceModuleTitle: json['parentResourceModuleTitle'],
  );
  
  static VideoPlatform _parseVideoPlatform(String platform) {
    return VideoPlatform.values.firstWhere(
      (e) => e.toString().split('.').last == platform,
      orElse: () => VideoPlatform.unknown,
    );
  }
  
  static VideoType _parseVideoType(String type) {
    return VideoType.values.firstWhere(
      (e) => e.toString().split('.').last == type,
      orElse: () => VideoType.unknown,
    );
  }
  
  @override
  String toString() => 'Video: $title (${platform.toString().split('.').last}) in $parentResourceTitle';
}