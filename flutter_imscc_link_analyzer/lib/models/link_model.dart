/// Link type classification
enum LinkType {
  osu,        // Ohio State University links
  external,   // External links
  course,     // Internal course links
  unknown     // Unclassified links
}

/// Model representing a link found in IMSCC content
class LinkModel {
  /// The URL of the link
  final String url;
  
  /// The display text of the link
  final String text;
  
  /// Whether this is an OSU Libraries link
  final bool isOSULibrariesLink;
  
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
  
  /// The classified link type
  final LinkType type;
  
  /// File extension (for file attachments)
  final String? extension;

  LinkModel({
    required this.url,
    required this.text,
    required this.isOSULibrariesLink,
    required this.parentResourceIdentifier,
    required this.parentResourceStatus,
    required this.parentResourceTitle,
    required this.parentResourceType,
    this.parentResourceModuleTitle,
    required this.type,
    this.extension,
  });

  /// Convert to JSON map
  Map<String, dynamic> toJson() => {
    'url': url,
    'text': text,
    'isOSULibrariesLink': isOSULibrariesLink,
    'parentResourceIdentifier': parentResourceIdentifier,
    'parentResourceStatus': parentResourceStatus,
    'parentResourceTitle': parentResourceTitle,
    'parentResourceType': parentResourceType,
    'parentResourceModuleTitle': parentResourceModuleTitle,
    'type': type.toString().split('.').last,
    'extension': extension,
  };

  /// Create from JSON map
  factory LinkModel.fromJson(Map<String, dynamic> json) => LinkModel(
    url: json['url'],
    text: json['text'],
    isOSULibrariesLink: json['isOSULibrariesLink'],
    parentResourceIdentifier: json['parentResourceIdentifier'],
    parentResourceStatus: json['parentResourceStatus'],
    parentResourceTitle: json['parentResourceTitle'],
    parentResourceType: json['parentResourceType'],
    parentResourceModuleTitle: json['parentResourceModuleTitle'],
    type: _parseLinkType(json['type']),
    extension: json['extension'],
  );

  static LinkType _parseLinkType(String type) {
    return LinkType.values.firstWhere(
      (e) => e.toString().split('.').last == type,
      orElse: () => LinkType.unknown,
    );
  }

  @override
  String toString() => 'Link: $text ($url) in $parentResourceTitle';
}