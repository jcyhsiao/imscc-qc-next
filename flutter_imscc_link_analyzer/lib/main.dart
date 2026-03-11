import 'dart:io';
import 'package:args/args.dart';
import 'package:logging/logging.dart';
import 'package:path/path.dart' as path;

import 'imscc_parser.dart';
import 'report_generator.dart';
import 'utils/progress_tracker.dart';

final Logger _logger = Logger('IMSCCLinkAnalyzer');

Future<void> main(List<String> arguments) async {
  // Set up logging
  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    print('${record.level.name}: ${record.time}: ${record.message}');
    if (record.error != null) {
      print('Error: ${record.error}');
    }
    if (record.stackTrace != null) {
      print('Stack: ${record.stackTrace}');
    }
  });

  // Set up argument parser
  final parser = ArgParser()
    ..addOption('input', abbr: 'i', help: 'Path to IMSCC file', mandatory: true)
    ..addOption('output', abbr: 'o', help: 'Output JSON file name (default: links_report.json)')
    ..addFlag('verbose', abbr: 'v', help: 'Verbose output', defaultsTo: false)
    ..addFlag('help', abbr: 'h', help: 'Show this help', negatable: false);

  try {
    final results = parser.parse(arguments);
    
    if (results['help'] as bool) {
      print('IMSCC Link Analyzer - Extracts links from Canvas course exports');
      print('Usage: dart run flutter_imscc_link_analyzer --input <file.imscc> [options]');
      print(parser.usage);
      return;
    }

    final inputPath = results['input'] as String;
    final outputName = results['output'] as String? ?? 'links_report.json';
    final verbose = results['verbose'] as bool;
    
    if (verbose) {
      Logger.root.level = Level.FINEST;
    }

    _logger.info('Starting IMSCC Link Analyzer');
    _logger.info('Input file: $inputPath');
    
    // Validate input file
    final inputFile = File(inputPath);
    if (!await inputFile.exists()) {
      throw Exception('Input file does not exist: $inputPath');
    }

    // Create progress tracker
    final progressTracker = ProgressTracker();
    
    // Parse IMSCC file
    _logger.info('Parsing IMSCC file...');
    final imsccParser = IMSCCParser(progressTracker: progressTracker);
    final resources = await imsccParser.parseIMSCC(inputFile);
    
    // Generate report
    _logger.info('Generating report...');
    final reportGenerator = ReportGenerator();
    final report = reportGenerator.generateReport(resources);
    
    // Save report
    final outputDir = path.dirname(inputPath);
    final outputPath = path.join(outputDir, outputName);
    
    // Create directory if it doesn't exist
    final outputFile = File(outputPath);
    if (!await outputFile.parent.exists()) {
      await outputFile.parent.create(recursive: true);
    }
    
    await reportGenerator.saveReport(report, outputPath);
    await reportGenerator.saveReportAsCsv(report, outputPath);
    
    _logger.info('Analysis complete!');
    _logger.info('Report saved to: $outputPath');
    _logger.info('CSV files saved to:');
    _logger.info('  - ${outputPath.replaceAll('.json', '_links.csv')}');
    _logger.info('  - ${outputPath.replaceAll('.json', '_attachments.csv')}');
    _logger.info('  - ${outputPath.replaceAll('.json', '_resources.csv')}');
    _logger.info('Found ${report.links.length} links in ${resources.length} resources');
    
  } catch (e, stackTrace) {
    _logger.severe('Error during analysis: $e', e, stackTrace);
    exit(1);
  }
}