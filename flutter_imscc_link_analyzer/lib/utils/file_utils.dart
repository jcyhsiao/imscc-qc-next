import 'dart:io';
import 'dart:convert';
import 'package:archive/archive.dart';
import 'package:path/path.dart' as path;

/// Utility class for file operations
class FileUtils {
  /// Extract ZIP archive to memory
  static Future<Map<String, String>> extractZipToMemory(File zipFile) async {
    final bytes = await zipFile.readAsBytes();
    final archive = ZipDecoder().decodeBytes(bytes);
    
    final files = <String, String>{};
    
    for (final file in archive.files) {
      if (file.isFile) {
        final content = String.fromCharCodes(file.content as List<int>);
        files[file.name] = content;
      }
    }
    
    return files;
  }

  /// Save JSON data to file
  static Future<void> saveJsonToFile(
    Map<String, dynamic> jsonData, 
    String filePath, 
  ) async {
    final jsonString = _prettyJson(jsonData);
    final file = File(filePath);
    await file.writeAsString(jsonString);
  }

  /// Convert JSON to pretty-printed string
  static String _prettyJson(Map<String, dynamic> jsonData) {
    return JsonEncoder.withIndent('  ').convert(jsonData);
  }

  /// Get file extension from URL
  static String? getFileExtensionFromUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;
    
    final pathSegments = uri.pathSegments;
    if (pathSegments.isEmpty) return null;
    
    final lastSegment = pathSegments.last;
    final extensionMatch = RegExp(r'\.[a-zA-Z0-9]+(?=[?#]|$)').firstMatch(lastSegment);
    
    return extensionMatch?.group(0);
  }

  /// Check if file exists and is readable
  static Future<bool> isFileAccessible(String filePath) async {
    try {
      final file = File(filePath);
      return await file.exists() && await file.length() > 0;
    } catch (e) {
      return false;
    }
  }

  /// Get file size in human-readable format
  static String getHumanReadableFileSize(int bytes) {
    if (bytes < 1024) return '${bytes} B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(2)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}