/// Model representing a module from IMSCC course_settings/module_meta.xml
class ModuleModel {
  /// Module identifier
  final String identifier;
  
  /// Module title
  final String title;
  
  /// Whether module is published
  final bool published;
  
  /// Module position
  final int position;
  
  /// List of module items
  final List<ModuleItemModel> items;
  
  ModuleModel({
    required this.identifier,
    required this.title,
    required this.published,
    required this.position,
    List<ModuleItemModel> items = const [],
  }) : items = List.unmodifiable(items);
  
  /// Convert to JSON map
  Map<String, dynamic> toJson() => {
    'identifier': identifier,
    'title': title,
    'published': published,
    'position': position,
    'items': items.map((item) => item.toJson()).toList(),
  };
  
  /// Create from JSON map
  factory ModuleModel.fromJson(Map<String, dynamic> json) => ModuleModel(
    identifier: json['identifier'],
    title: json['title'],
    published: json['published'] ?? false,
    position: json['position'] ?? 0,
    items: (json['items'] as List<dynamic>? ?? [])
        .map((itemJson) => ModuleItemModel.fromJson(itemJson))
        .toList(),
  );
  
  @override
  String toString() => 'Module: $title (${published ? "published" : "unpublished"})';
}

/// Model representing a module item from IMSCC course_settings/module_meta.xml
class ModuleItemModel {
  /// Item identifier
  final String identifier;
  
  /// Item title
  final String title;
  
  /// Item content type
  final String contentType;
  
  /// Whether item is published
  final bool published;
  
  /// Item position
  final int position;
  
  /// Item indent level
  final int indent;
  
  /// Reference to resource identifier
  final String? identifierref;
  
  /// Clarified resource type (to be set during reconciliation)
  String? clarifiedType;
  
  /// Module title (parent module)
  final String moduleTitle;
  
  ModuleItemModel({
    required this.identifier,
    required this.title,
    required this.contentType,
    required this.published,
    required this.position,
    required this.indent,
    this.identifierref,
    this.clarifiedType,
    required this.moduleTitle,
  });
  
  /// Convert to JSON map
  Map<String, dynamic> toJson() => {
    'identifier': identifier,
    'title': title,
    'contentType': contentType,
    'published': published,
    'position': position,
    'indent': indent,
    'identifierref': identifierref,
    'clarifiedType': clarifiedType,
    'moduleTitle': moduleTitle,
  };
  
  /// Create from JSON map
  factory ModuleItemModel.fromJson(Map<String, dynamic> json) => ModuleItemModel(
    identifier: json['identifier'],
    title: json['title'],
    contentType: json['contentType'],
    published: json['published'] ?? false,
    position: json['position'] ?? 0,
    indent: json['indent'] ?? 0,
    identifierref: json['identifierref'],
    clarifiedType: json['clarifiedType'],
    moduleTitle: json['moduleTitle'],
  );
  
  @override
  String toString() => 'ModuleItem: $title in $moduleTitle';
}