// src/client/pages/OfferNewPage.tsx

import { OfferCreateWizard } from '../components/Offer/OfferCreateWizard';

export default function OfferNewPage() {
  return (
    <div style={{ padding: '20px', background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <OfferCreateWizard />
      </div>
    </div>
  );
}
