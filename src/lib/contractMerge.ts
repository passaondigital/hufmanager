/**
 * Merges a contract template HTML with provided variables.
 * Replaces all {{VARIABLE_NAME}} placeholders with their values.
 */
export function mergeContractTemplate(
  templateHtml: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    templateHtml
  );
}
