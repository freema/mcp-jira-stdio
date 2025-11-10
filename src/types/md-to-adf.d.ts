// Type declarations for md-to-adf package
declare module 'md-to-adf' {
  /**
   * Converts Markdown text to Atlassian Document Format (ADF)
   * @param markdown - The markdown text to convert
   * @returns An ADF document object
   */
  function mdToAdf(markdown: string): any;
  export default mdToAdf;
}
