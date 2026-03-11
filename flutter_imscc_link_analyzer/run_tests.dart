import 'dart:io';
import 'dart:convert';
import 'package:args/args.dart';

/// Test case definition
class TestCase {
  final String name;
  final String inputFile;
  final int expectedResources;
  final int expectedLinks;
  final int expectedAttachments;
  final List<String> expectedLinkTypes;
  
  TestCase({
    required this.name,
    required this.inputFile,
    required this.expectedResources,
    required this.expectedLinks,
    required this.expectedAttachments,
    this.expectedLinkTypes = const ['external', 'osu', 'course'],
  });
}

/// Test runner
class TestRunner {
  final List<TestCase> testCases;
  final bool verbose;
  
  TestRunner({required this.testCases, this.verbose = false});
  
  Future<void> runAllTests() async {
    int passed = 0;
    int failed = 0;
    
    print('=== Running IMSCC Link Analyzer Tests ===');
    print('');
    
    for (final testCase in testCases) {
      final testResult = await _runSingleTest(testCase);
      if (testResult) {
        passed++;
        print('✅ PASS: ${testCase.name}');
      } else {
        failed++;
        print('❌ FAIL: ${testCase.name}');
      }
    }
    
    print('');
    print('=== Test Results ===');
    print('Passed: $passed/${testCases.length}');
    print('Failed: $failed/${testCases.length}');
    
    if (failed > 0) {
      exit(1);
    }
  }
  
  Future<bool> _runSingleTest(TestCase testCase) async {
    try {
      if (verbose) {
        print('Running test: ${testCase.name}...');
      }
      
      // Run the analyzer
      final result = await Process.run(
        'dart', 
        ['run', 'lib/main.dart', '--input', testCase.inputFile, '--output', 'test_output.json'],
        workingDirectory: Directory.current.path,
        runInShell: true,
      );
      
      if (result.exitCode != 0) {
        if (verbose) {
          print('CLI failed: ${result.stderr}');
        }
        return false;
      }
      
      // Determine expected output path based on input file
      final inputDir = testCase.inputFile.contains('/') 
          ? testCase.inputFile.substring(0, testCase.inputFile.lastIndexOf('/')) 
          : '.';
      final expectedOutputPath = '$inputDir/test_output.json';
      
      final outputFile = File(expectedOutputPath);
      
      if (!await outputFile.exists()) {
        if (verbose) {
          print('Output file not created at expected location: $expectedOutputPath');
        }
        return false;
      }
      
      final actualOutputFile = outputFile;
      
      final content = await actualOutputFile.readAsString();
      final jsonData = jsonDecode(content);
      
      // Validate results
      final resourceCount = jsonData['metadata']['resourceCount'];
      final linkCount = jsonData['metadata']['linkCount'];
      final attachmentCount = jsonData['metadata']['attachmentCount'];
      
      bool valid = true;
      
      if (resourceCount != testCase.expectedResources) {
        if (verbose) {
          print('  Expected ${testCase.expectedResources} resources, got $resourceCount');
        }
        valid = false;
      }
      
      if (linkCount != testCase.expectedLinks) {
        if (verbose) {
          print('  Expected ${testCase.expectedLinks} links, got $linkCount');
        }
        valid = false;
      }
      
      if (attachmentCount != testCase.expectedAttachments) {
        if (verbose) {
          print('  Expected ${testCase.expectedAttachments} attachments, got $attachmentCount');
        }
        valid = false;
      }
      
      // Check link types
      final linkTypes = <String, int>{};
      for (final link in jsonData['links']) {
        final type = link['type'];
        linkTypes[type] = (linkTypes[type] ?? 0) + 1;
      }
      
      for (final expectedType in testCase.expectedLinkTypes) {
        if (!linkTypes.containsKey(expectedType)) {
          if (verbose) {
            print('  Missing expected link type: $expectedType');
          }
          valid = false;
        }
      }
      
      // Clean up
      await actualOutputFile.delete();
      
      return valid;
      
    } catch (e) {
      if (verbose) {
        print('Test failed with exception: $e');
      }
      return false;
    }
  }
}

Future<void> main(List<String> arguments) async {
  // Set up argument parser
  final parser = ArgParser()
    ..addFlag('verbose', abbr: 'v', help: 'Verbose output', defaultsTo: false)
    ..addFlag('help', abbr: 'h', help: 'Show this help', negatable: false);

  final results = parser.parse(arguments);
  final bool verbose = results['verbose'] as bool;

  try {
    if (results['help'] as bool) {
      print('IMSCC Link Analyzer Test Runner');
      print('Usage: dart run run_tests.dart [options]');
      print(parser.usage);
      return;
    }
    
    // Define test cases
    final testCases = [
      TestCase(
        name: 'Basic Wiki Page Test',
        inputFile: 'test_data/test_imscc.imscc',
        expectedResources: 1,
        expectedLinks: 4,
        expectedAttachments: 1,
        expectedLinkTypes: ['external', 'osu'],
      ),
      TestCase(
        name: 'Assignment Link Test',
        inputFile: 'test_cases/test_assignment.imscc',
        expectedResources: 1,
        expectedLinks: 4, // Assignment contains 4 external links
        expectedAttachments: 1, // Assignment contains 1 file attachment
        expectedLinkTypes: ['external', 'osu'], // Contains both external and OSU links
      ),
      TestCase(
        name: 'Real Course Template',
        inputFile: 'test_data/distance-education-core-template-latest-export.imscc',
        expectedResources: 44,
        expectedLinks: 89, // Enhanced parsing now detects 2 additional links
        expectedAttachments: 4,
        expectedLinkTypes: ['external', 'osu'], // No course links in this template
      ),
    ];

    // Run tests
    final testRunner = TestRunner(testCases: testCases, verbose: verbose);
    await testRunner.runAllTests();
    
  } catch (e, stackTrace) {
    print('Error running tests: $e');
    if (results['verbose'] as bool) {
      print('Stack trace: $stackTrace');
    }
    exit(1);
  }
}