// src/client/hooks/useExtraction.ts

import type { ExtractedData } from '../components/Offer/types';

/**
 * Extract organization and contact information from pasted text
 * Handles German address formats (e.g., "45770 Marl")
 */
export function extractContactInfo(text: string): Partial<ExtractedData> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let organizationName = '';
  let street = '';
  let city = '';
  let postalCode = '';
  let country = 'Germany'; // Default to Germany
  let contactName = '';
  let email = '';
  let phone = '';

  for (const line of lines) {
    // Email pattern
    if (line.includes('@')) {
      email = line;
      continue;
    }

    // Phone pattern (starts with + or digit, contains spaces/dashes)
    if (/^\+?\d[\d\s\-\/()]{6,}/.test(line)) {
      phone = line;
      continue;
    }

    // Organization pattern (contains e.V., e.v., gmbh, verband, verein)
    if (
      /e\.V\.|e\.v\.|gmbh|GmbH|verband|Verband|verein|Verein/i.test(line) ||
      !organizationName
    ) {
      if (!organizationName) {
        organizationName = line;
        continue;
      }
      // If we already have one, but this one matches the regex, it's a better candidate
      if (/e\.V\.|e\.v\.|gmbh|GmbH|verband|Verband|verein|Verein/i.test(line)) {
        // Shift previous organization to contact name if empty
        if (!contactName) {
          contactName = organizationName;
        }
        organizationName = line;
        continue;
      }
    }

    // Street pattern (contains Straße, strasse, str., weg, allee, gasse, platz, etc.)
    if (
      /straße|strasse|str\.|weg|allee|gasse|platz|avenue|street|str/i.test(
        line
      )
    ) {
      street = line;
      continue;
    }

    // Postal code + city pattern (5-digit postal followed by city name)
    const postalMatch = line.match(/^(\d{5})\s+(.+)/);
    if (postalMatch) {
      postalCode = postalMatch[1];
      city = postalMatch[2];
      continue;
    }

    // Contact name (after we've found organization)
    if (!contactName && organizationName && !street && !email && !phone) {
      contactName = line;
    }
  }

  return {
    organizationName: organizationName || undefined,
    street: street || undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
    country: country || undefined,
    contactName: contactName || undefined,
    email: email || undefined,
    phone: phone || undefined,
  };
}

/**
 * Validate extracted data has required fields
 */
export function isValidExtraction(data: Partial<ExtractedData>): boolean {
  return !!(
    data.organizationName &&
    data.contactName &&
    data.email &&
    data.city &&
    data.postalCode
  );
}

/**
 * Get human-readable feedback on extraction quality
 */
export function getExtractionFeedback(data: Partial<ExtractedData>): {
  confidence: 'high' | 'medium' | 'low';
  message: string;
  missing: string[];
} {
  const required = ['organizationName', 'contactName', 'email', 'city', 'postalCode'];
  const missing = required.filter((field) => !data[field as keyof ExtractedData]);

  if (missing.length === 0) {
    return {
      confidence: 'high',
      message: '✓ High-confidence extraction',
      missing: [],
    };
  }

  if (missing.length <= 2) {
    return {
      confidence: 'medium',
      message: `Partial extraction (missing ${missing.join(', ')})`,
      missing,
    };
  }

  return {
    confidence: 'low',
    message: 'Low-confidence extraction - please review and complete',
    missing,
  };
}
