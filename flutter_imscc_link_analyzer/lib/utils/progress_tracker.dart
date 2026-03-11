import 'dart:async';
import 'package:logging/logging.dart';

/// Tracks and reports progress during IMSCC analysis
class ProgressTracker {
  final Logger _logger = Logger('ProgressTracker');
  
  final _totalSteps = 4; // Extraction, Parsing, Analysis, Reporting
  int _currentStep = 0;
  double _currentStepProgress = 0.0;
  
  final _stepNames = [
    'Extracting IMSCC archive',
    'Parsing manifest',
    'Analyzing resources',
    'Generating report'
  ];

  /// Start a new step
  void startStep(int stepIndex, {String? customName}) {
    if (stepIndex < 0 || stepIndex >= _totalSteps) {
      throw RangeError('Invalid step index: $stepIndex');
    }
    
    _currentStep = stepIndex;
    _currentStepProgress = 0.0;
    
    final stepName = customName ?? _stepNames[stepIndex];
    _logger.info('Starting: $stepName...');
  }

  /// Update progress within current step
  void updateProgress(double progress) {
    _currentStepProgress = progress.clamp(0.0, 1.0);
    
    final overallProgress = (_currentStep + _currentStepProgress) / _totalSteps;
    final percent = (overallProgress * 100).toStringAsFixed(1);
    
    _logger.fine('Progress: $percent% - Step ${_currentStep + 1}/$_totalSteps');
  }

  /// Complete current step
  void completeStep() {
    updateProgress(1.0);
    _logger.info('Completed: ${_stepNames[_currentStep]} ✓');
  }

  /// Get current overall progress (0.0 to 1.0)
  double getOverallProgress() {
    return (_currentStep + _currentStepProgress) / _totalSteps;
  }

  /// Get formatted progress string
  String getProgressString() {
    final overallProgress = getOverallProgress();
    final percent = (overallProgress * 100).toStringAsFixed(1);
    return '[$percent%] Step ${_currentStep + 1}/$_totalSteps: ${_stepNames[_currentStep]}';
  }
}