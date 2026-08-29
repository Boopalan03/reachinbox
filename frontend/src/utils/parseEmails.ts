export interface ParsedEmails {
  emails: string[];
  invalidCount: number;
  duplicateCount: number;
}

export const parseEmails = (fileContent: string): ParsedEmails => {
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Basic CSV parsing and email extraction
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const extractedEmails: string[] = [];
  let invalidCount = 0;
  
  lines.forEach(line => {
    // If it's a CSV, we might have multiple columns. Let's just grab words that look like emails.
    const words = line.split(/[,\s]+/);
    words.forEach(word => {
      const cleanWord = word.trim();
      if (cleanWord) {
        if (emailRegex.test(cleanWord)) {
          extractedEmails.push(cleanWord);
        } else if (cleanWord.includes('@')) {
          invalidCount++;
        }
      }
    });
  });
  
  const uniqueEmails = Array.from(new Set(extractedEmails));
  const duplicateCount = extractedEmails.length - uniqueEmails.length;
  
  return {
    emails: uniqueEmails,
    invalidCount,
    duplicateCount
  };
};
