export interface ExtractionResult {
  confidence: 'high' | 'medium' | 'low';
  association: {
    name: string;
  };
  contact: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  warnings: string[];
}

export function parseContactAssociationText(text: string): ExtractionResult {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return createEmptyResult('low');
  }

  const result: ExtractionResult = {
    confidence: 'high',
    association: { name: '' },
    contact: {
      name: '',
      address: { street: '', city: '', postalCode: '', country: '' },
    },
    warnings: [],
  };

  let lineIdx = 0;

  // Extract organization name (first line)
  result.association.name = lines[lineIdx];
  lineIdx++;

  // Extract contact name (next line that looks like a name)
  if (lineIdx < lines.length) {
    result.contact.name = lines[lineIdx];
    lineIdx++;
  }

  // Extract email and phone from remaining lines
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\+\s\d\-()]+$/;

  const remainingLines: string[] = [];

  for (let i = lineIdx; i < lines.length; i++) {
    const line = lines[i];

    if (emailRegex.test(line)) {
      result.contact.email = line;
    } else if (phoneRegex.test(line) && line.length > 5) {
      result.contact.phone = line;
    } else {
      remainingLines.push(line);
    }
  }

  // Parse address from remaining lines
  parseAddress(remainingLines, result);

  // Score confidence
  scoreConfidence(result);

  return result;
}

function parseAddress(
  lines: string[],
  result: ExtractionResult
): void {
  if (lines.length === 0) {
    result.confidence = 'low';
    return;
  }

  // Street is first remaining line
  if (lines.length > 0) {
    result.contact.address.street = lines[0];
  }

  // Look for postal code pattern (5 digits) and city
  let postalLineIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const postalMatch = /(\d{5})\s+(.+)/.exec(line);
    if (postalMatch) {
      result.contact.address.postalCode = postalMatch[1];
      result.contact.address.city = postalMatch[2].trim();
      postalLineIdx = i;
      break;
    }
  }

  // Country is typically last line
  if (postalLineIdx >= 0 && postalLineIdx + 1 < lines.length) {
    result.contact.address.country = lines[postalLineIdx + 1];
  } else if (postalLineIdx >= 0) {
    // If no line after postal+city, assume country is not provided
    result.contact.address.country = 'Germany'; // default assumption
  }
}

function scoreConfidence(result: ExtractionResult): void {
  const addressComplete =
    result.contact.address.street &&
    result.contact.address.city &&
    result.contact.address.postalCode &&
    result.contact.address.country;

  const hasName = result.contact.name && result.association.name;
  const hasEmail = result.contact.email;

  if (addressComplete && hasName) {
    result.confidence = 'high';
  } else if (hasName && result.contact.address.street && result.contact.address.city && result.contact.address.postalCode) {
    result.confidence = 'medium';
  } else {
    result.confidence = 'low';
  }

  // Check for generic emails
  if (result.contact.email) {
    const genericDomains = ['example.com', 'test.com', 'mail.com'];
    const isGeneric = genericDomains.some((domain) => result.contact.email?.includes(domain));
    if (isGeneric || /^(contact|info|admin|support)@/i.test(result.contact.email)) {
      result.warnings.push('generic-email');
      if (result.confidence === 'high') {
        result.confidence = 'medium';
      }
    }
  }
}

function createEmptyResult(confidence: 'low' | 'medium' | 'high'): ExtractionResult {
  return {
    confidence,
    association: { name: '' },
    contact: {
      name: '',
      address: { street: '', city: '', postalCode: '', country: '' },
    },
    warnings: [],
  };
}
