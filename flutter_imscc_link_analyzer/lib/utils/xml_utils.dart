import 'package:xml/xml.dart';

/// Utility class for XML operations
class XmlUtils {
  /// Parse XML string
  static XmlDocument parseXmlString(String xmlString) {
    try {
      return XmlDocument.parse(xmlString);
    } catch (e) {
      throw FormatException('Failed to parse XML: ${e.toString()}');
    }
  }

  /// Find elements by tag name
  static List<XmlElement> findElements(XmlDocument doc, String tagName) {
    return doc.findAllElements(tagName).toList();
  }

  /// Find first element by tag name
  static XmlElement? findFirstElement(XmlNode node, String tagName) {
    if (node is XmlDocument) {
      return node.findAllElements(tagName).firstOrNull;
    } else if (node is XmlElement) {
      return node.findAllElements(tagName).firstOrNull;
    }
    return null;
  }

  /// Get text content from element
  static String? getElementText(XmlElement? element) {
    if (element == null) return null;
    return element.innerText.trim();
  }

  /// Get attribute value from element
  static String? getAttribute(XmlElement element, String attributeName) {
    return element.getAttribute(attributeName);
  }

  /// Find elements with specific attribute
  static List<XmlElement> findElementsWithAttribute(
    XmlDocument doc, 
    String tagName, 
    String attributeName, 
    String attributeValue,
  ) {
    return doc.findAllElements(tagName)
        .where((element) => 
            element.getAttribute(attributeName) == attributeValue
        )
        .toList();
  }

  /// Extract text from HTML content within XML
  static String? extractHtmlFromXmlElement(XmlElement? element) {
    if (element == null) return null;
    return element.innerText.trim();
  }

  /// Check if element has specific class
  static bool hasClass(XmlElement element, String className) {
    final classAttr = element.getAttribute('class');
    if (classAttr == null) return false;
    
    return classAttr.split(' ').contains(className);
  }
}