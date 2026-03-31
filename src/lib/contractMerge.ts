/**
 * Merges a contract template HTML with provided variables.
 * Replaces all {{VARIABLE_NAME}} placeholders with their values.
 * Any remaining {{...}} placeholders are replaced with "–" to prevent
 * raw variable names from appearing in the final document.
 */
export function mergeContractTemplate(
  templateHtml: string,
  variables: Record<string, string>
): string {
  const merged = Object.entries(variables).reduce(
    (html, [key, value]) => html.split(`{{${key}}}`).join(value || "–"),
    templateHtml
  );
  // Strip any remaining unfilled variables
  return merged.replace(/\{\{[A-Z_]+\}\}/g, "–");
}
