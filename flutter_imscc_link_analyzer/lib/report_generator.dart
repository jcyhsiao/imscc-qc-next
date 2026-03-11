import 'dart:convert';
import 'dart:io';

import 'models/report_model.dart';
import 'models/resource_model.dart';
import 'models/link_model.dart';
import 'models/video_model.dart';

class ReportGenerator {
  /// Generate report from resources
  ReportModel generateReport(List<ResourceModel> resources) {
    // Collect all links, attachments, and videos
    final allLinks = <LinkModel>[];
    final allAttachments = <LinkModel>[];
    final allVideos = <VideoModel>[];
    
    for (final resource in resources) {
      allLinks.addAll(resource.links);
      allAttachments.addAll(resource.attachments);
      allVideos.addAll(resource.videos);
    }
    
    return ReportModel(
      resources: resources,
      links: allLinks,
      attachments: allAttachments,
      videos: allVideos,
      analyzerVersion: '1.0.0',
    );
  }

  /// Save report to JSON file
  Future<void> saveReport(ReportModel report, String filePath) async {
    final jsonData = report.toJson();
    final jsonString = JsonEncoder.withIndent('  ').convert(jsonData);
    
    final file = File(filePath);
    await file.writeAsString(jsonString);
  }

  /// Save report to CSV files
  Future<void> saveReportAsCsv(ReportModel report, String baseFilePath) async {
    // Save links CSV
    final linksCsv = _generateLinksCsv(report);
    final linksFilePath = baseFilePath.replaceAll('.json', '_links.csv');
    await File(linksFilePath).writeAsString(linksCsv);
    
    // Save attachments CSV
    final attachmentsCsv = _generateAttachmentsCsv(report);
    final attachmentsFilePath = baseFilePath.replaceAll('.json', '_attachments.csv');
    await File(attachmentsFilePath).writeAsString(attachmentsCsv);
    
    // Save videos CSV
    final videosCsv = _generateVideosCsv(report);
    final videosFilePath = baseFilePath.replaceAll('.json', '_videos.csv');
    await File(videosFilePath).writeAsString(videosCsv);
    
    // Save resources CSV
    final resourcesCsv = _generateResourcesCsv(report);
    final resourcesFilePath = baseFilePath.replaceAll('.json', '_resources.csv');
    await File(resourcesFilePath).writeAsString(resourcesCsv);
  }

  /// Generate CSV for links
  String _generateLinksCsv(ReportModel report) {
    final buffer = StringBuffer();
    buffer.writeln('Module,Resource,Resource Type,Link Text,Link URL,Link Type,Published');
    
    for (final resource in report.resources) {
      for (final link in resource.links) {
        buffer.writeln('"${resource.moduleTitle ?? ''}","${resource.title}","${resource.clarifiedType ?? resource.contentType}","${link.text}","${link.url}","${link.type.toString().split('.').last}","${resource.published}"');
      }
    }
    
    return buffer.toString();
  }

  /// Generate CSV for attachments
  String _generateAttachmentsCsv(ReportModel report) {
    final buffer = StringBuffer();
    buffer.writeln('Module,Resource,Resource Type,Attachment Name,Attachment URL,Extension,Published');
    
    for (final resource in report.resources) {
      for (final attachment in resource.attachments) {
        buffer.writeln('"${resource.moduleTitle ?? ''}","${resource.title}","${resource.clarifiedType ?? resource.contentType}","${attachment.text}","${attachment.url}","${attachment.extension ?? ''}","${resource.published}"');
      }
    }
    
    return buffer.toString();
  }

  /// Generate CSV for resources
  String _generateResourcesCsv(ReportModel report) {
    final buffer = StringBuffer();
    buffer.writeln('Module,Title,Type,Published,Links Count,Attachments Count,Videos Count');
    
    for (final resource in report.resources) {
      buffer.writeln('"${resource.moduleTitle ?? ''}","${resource.title}","${resource.clarifiedType ?? resource.contentType}","${resource.published}","${resource.links.length}","${resource.attachments.length}","${resource.videos.length}"');
    }
    
    return buffer.toString();
  }
  
  /// Generate CSV for videos
  String _generateVideosCsv(ReportModel report) {
    final buffer = StringBuffer();
    buffer.writeln('Module,Resource,Resource Type,Video Title,Video Platform,Video URL,Video Type,Has Transcript/Caption,Published');
    
    for (final resource in report.resources) {
      for (final video in resource.videos) {
        buffer.writeln('"${resource.moduleTitle ?? ''}","${resource.title}","${resource.clarifiedType ?? resource.contentType}","${video.title}","${video.platform.toString().split('.').last}","${video.src}","${video.type.toString().split('.').last}","${video.transcriptOrCaptionMentioned}","${resource.published}"');
      }
    }
    
    return buffer.toString();
  }

  /// Get report summary
  Map<String, dynamic> getReportSummary(ReportModel report) {
    return {
      'totalResources': report.resources.length,
      'totalLinks': report.links.length,
      'totalAttachments': report.attachments.length,
      'publishedResources': report.resources.where((r) => r.published).length,
      'unpublishedResources': report.resources.where((r) => !r.published).length,
      'linkTypes': _getLinkTypeBreakdown(report.links),
      'attachmentExtensions': _getAttachmentExtensionBreakdown(report.attachments),
    };
  }

  /// Get breakdown of link types
  Map<String, int> _getLinkTypeBreakdown(List<LinkModel> links) {
    final breakdown = <String, int>{};
    
    for (final link in links) {
      final typeName = link.type.toString().split('.').last;
      breakdown[typeName] = (breakdown[typeName] ?? 0) + 1;
    }
    
    return breakdown;
  }

  /// Get breakdown of attachment file extensions
  Map<String, int> _getAttachmentExtensionBreakdown(List<LinkModel> attachments) {
    final breakdown = <String, int>{};
    
    for (final attachment in attachments) {
      final extension = attachment.extension ?? 'unknown';
      breakdown[extension] = (breakdown[extension] ?? 0) + 1;
    }
    
    return breakdown;
  }
}