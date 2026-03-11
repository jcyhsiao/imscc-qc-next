import 'dart:io';
import 'dart:convert';

void main(List<String> arguments) async {
  if (arguments.isEmpty) {
    print('Usage: dart run summary.dart <report_file.json>');
    return;
  }
  
  final file = File(arguments[0]);
  if (!await file.exists()) {
    print('Report file not found: ${arguments[0]}');
    return;
  }

  final content = await file.readAsString();
  final jsonData = jsonDecode(content);

  print('=== IMSCC Link Analysis Summary ===');
  print('Generated: ${jsonData['metadata']['generatedAt']}');
  print('Analyzer Version: ${jsonData['metadata']['analyzerVersion']}');
  print('');
  print('Resources Analyzed: ${jsonData['metadata']['resourceCount']}');
  print('Total Links Found: ${jsonData['metadata']['linkCount']}');
  print('Total Attachments Found: ${jsonData['metadata']['attachmentCount']}');
  print('Total Videos Found: ${jsonData['metadata']['videoCount']}');
  print('');

  // Count link types
  final linkTypes = <String, int>{};
  for (final link in jsonData['links']) {
    final type = link['type'];
    linkTypes[type] = (linkTypes[type] ?? 0) + 1;
  }

  print('Link Type Breakdown:');
  linkTypes.forEach((type, count) {
    print('  $type: $count');
  });
  
  // Count video platforms
  final videoPlatforms = <String, int>{};
  for (final video in jsonData['videos']) {
    final platform = video['platform'];
    videoPlatforms[platform] = (videoPlatforms[platform] ?? 0) + 1;
  }
  
  if (videoPlatforms.isNotEmpty) {
    print('');
    print('Video Platform Breakdown:');
    videoPlatforms.forEach((platform, count) {
      print('  $platform: $count');
    });
  }
  
  print('');
  print('Resources with Links:');
  for (final resource in jsonData['resources']) {
    if (resource['links'].length > 0) {
      print('  - ${resource['title']} (${resource['clarifiedType'] ?? resource['contentType']}): ${resource['links'].length} links');
    }
  }
}