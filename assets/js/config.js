export const CONFIG = {
  brand: 'LabourLedger',
  productName: 'LabourLedger Pro',
  tagline: 'Labour-code compliance, documented.',
  price: 9999,
  launchPrice: 9999,
  perReport: 999,
  trialDays: 7,
  freeAudits: 3,

  // Paste the Razorpay / Stripe / Gumroad / PayPal checkout URL here.
  checkoutUrl: '',

  // Zero-cost order channel until checkout is connected.
  // Opens a prefilled GitHub issue. Replace with a real payment link before launch.
  orderUrl: 'https://github.com/omkaryele10/labourledger/issues/new?template=license-request.yml',

  supportEmail: '',

  // Optional: Gumroad product ID for online license verification.
  gumroadProductId: '',

  demo: {
    firmName: 'Deshmukh & Associates',
    partner: 'CA R. Deshmukh',
    designation: 'Partner — Labour & Employment',
    membership: 'ICAI M.No. 123456',
    email: 'r.deshmukh@example.com',
    phone: '+91 98220 00000',
    address: 'Pune, Maharashtra',
    website: 'deshmukhassociates.example',
  },
};
