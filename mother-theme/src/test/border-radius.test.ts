import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Test to ensure no non-zero border-radius values exist in CSS files.
 * 
 * This test scans all CSS files in src/styles/ and verifies that:
 * - All border-radius values are 0 or use CSS variables that resolve to 0
 * - Variable definitions (--radius-*) are set to 0
 * - Comments are ignored
 */
describe('Border Radius Enforcement', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const stylesDir = join(__dirname, '../styles');
  const cssFiles = readdirSync(stylesDir).filter((file: string) => file.endsWith('.css'));

  it('should have no non-zero border-radius values in CSS files', () => {
    const violations: Array<{ file: string; line: number; content: string }> = [];

    // Regex to match border-radius declarations
    // Matches: border-radius: value; or border-radius: value
    // Also matches shorthand: border-top-left-radius, etc.
    const borderRadiusRegex = /border(?:-(?:top|bottom)(?:-(?:left|right))?)?-radius\s*:\s*([^;]+)/gi;

    // Regex to match CSS variable definitions: --*: value;
    const variableDefinitionRegex = /^(\s*)--[^:]+:\s*([^;]+);/m;

    // Regex to check if a value is zero (0, 0px, 0rem, etc.)
    const isZero = (value: string): boolean => {
      const trimmed = value.trim();
      // Check for literal 0, 0px, 0rem, 0em, etc.
      if (/^0(?:px|rem|em|%)?$/.test(trimmed)) {
        return true;
      }
      // Allow any CSS variable usage (var(...)) - we only check variable definitions
      if (trimmed.startsWith('var(')) {
        return true;
      }
      return false;
    };

    // Check if a variable name is a radius-related variable
    const isRadiusVariable = (varName: string): boolean => {
      return (
        varName.startsWith('--radius-') ||
        varName === '--tag-border-radius' ||
        varName.includes('border-radius')
      );
    };

    for (const file of cssFiles) {
      const filePath = join(stylesDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check for variable definitions first
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const varMatch = line.match(variableDefinitionRegex);
        if (varMatch) {
          // Extract variable name
          const varNameMatch = line.match(/--[^:]+/);
          if (varNameMatch) {
            const varName = varNameMatch[0];
            // Only check radius-related variables
            if (isRadiusVariable(varName)) {
              const value = varMatch[2]?.trim();
              if (value && !isZero(value)) {
                violations.push({
                  file,
                  line: i + 1,
                  content: line.trim(),
                });
              }
            }
          }
        }
      }

      // Remove comments from content before checking
      const contentWithoutComments = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, ''); // Remove // comments

      // Check for border-radius usage (only check literal values, not CSS variables)
      let match;
      while ((match = borderRadiusRegex.exec(contentWithoutComments)) !== null) {
        const value = match[1]?.trim() || '';
        
        // Skip CSS variable usages (var(...)) - we only check variable definitions
        if (value.startsWith('var(')) {
          continue;
        }

        // Find the line number
        const beforeMatch = contentWithoutComments.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        // Check if the value is zero (only for literal values)
        if (!isZero(value)) {
          violations.push({
            file,
            line: lineNumber,
            content: match[0].trim(),
          });
        }
      }
    }

    if (violations.length > 0) {
      const errorMessage = [
        'Found non-zero border-radius values:',
        '',
        ...violations.map(
          (v) => `  ${v.file}:${v.line} - ${v.content}`
        ),
        '',
        'All border-radius values must be 0 or use CSS variables that resolve to 0.',
      ].join('\n');

      expect.fail(errorMessage);
    }
  });
});

