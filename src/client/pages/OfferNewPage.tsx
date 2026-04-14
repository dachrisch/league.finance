// src/client/pages/OfferNewPage.tsx

import { OfferCreateWizard } from '../components/Offer/OfferCreateWizard';

export default function OfferNewPage() {
  return (
    <div style={{ padding: '40px 20px', background: '#f9fafb', minHeight: '100vh' }}>
      <OfferCreateWizard />
    </div>
  );
}
