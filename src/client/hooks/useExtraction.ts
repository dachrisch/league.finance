// src/client/hooks/useExtraction.ts

import type { ExtractedData } from '../components/Offer/types';
export { extractContactInfo, getExtractionFeedback } from '../../../shared/lib/extraction';

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
