import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0a0f0f;
    color: #c8d6d6;
    line-height: 1.7;
    padding: 0;
  }
  .page-wrap {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 24px 80px;
  }
  header {
    border-bottom: 1px solid #1e2e2e;
    padding-bottom: 24px;
    margin-bottom: 40px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .brand-logo {
    width: 36px;
    height: 36px;
    background: #14b8a6;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0a0f0f;
    font-weight: 800;
    font-size: 18px;
  }
  .brand-name {
    font-size: 20px;
    font-weight: 700;
    color: #e2f0f0;
  }
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #e2f0f0;
    margin-bottom: 6px;
  }
  .effective-date {
    font-size: 14px;
    color: #5e8080;
  }
  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #14b8a6;
    margin-top: 36px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #1e2e2e;
  }
  p {
    margin-bottom: 14px;
    color: #9ab8b8;
    font-size: 15px;
  }
  ul, ol {
    padding-left: 22px;
    margin-bottom: 14px;
  }
  li {
    color: #9ab8b8;
    font-size: 15px;
    margin-bottom: 6px;
  }
  .highlight-box {
    background: #0d1f1f;
    border: 1px solid #1e3a3a;
    border-left: 4px solid #14b8a6;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 20px 0;
  }
  .highlight-box p {
    margin-bottom: 0;
    font-size: 14px;
    color: #a0c8c8;
  }
  .highlight-box strong {
    color: #14b8a6;
  }
  a { color: #14b8a6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  footer {
    margin-top: 60px;
    padding-top: 24px;
    border-top: 1px solid #1e2e2e;
    font-size: 13px;
    color: #3e6060;
    text-align: center;
  }
  footer a { color: #5e9090; }
`;

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — MyRentCard</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="page-wrap">
    <header>
      <div class="brand">
        <div class="brand-logo">M</div>
        <span class="brand-name">MyRentCard</span>
      </div>
      ${body.startsWith("<h1") ? "" : ""}
    </header>
    ${body}
    <footer>
      <p>&copy; ${new Date().getFullYear()} MyRentCard. All rights reserved.</p>
      <p style="margin-top:8px">
        <a href="/api/privacy">Privacy Policy</a> &nbsp;·&nbsp; <a href="/api/terms">Terms of Service</a>
      </p>
    </footer>
  </div>
</body>
</html>`;
}

router.get("/privacy", (_req: Request, res: Response) => {
  const body = `
    <h1>Privacy Policy</h1>
    <p class="effective-date">Effective Date: January 1, 2025 &nbsp;|&nbsp; Last Updated: March 2025</p>

    <h2>1. Introduction</h2>
    <p>MyRentCard ("we," "our," or "us") operates a leasing operations platform that helps landlords and property managers manage rental inquiries, communicate with prospective tenants, and streamline the leasing intake process. This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our services.</p>
    <p>By using MyRentCard, you agree to the collection and use of information in accordance with this policy.</p>

    <h2>2. Information We Collect</h2>
    <p>We collect the following categories of information:</p>
    <ul>
      <li><strong>Account Information:</strong> Name, email address, and account credentials when you register.</li>
      <li><strong>Property & Tenant Data:</strong> Property addresses, prospective tenant names, contact information (including phone numbers and email addresses), and rental inquiry details that you enter or that are received through our platform.</li>
      <li><strong>Phone Numbers:</strong> We collect and store phone numbers of prospective tenants and landlords in connection with our SMS and voice communication features.</li>
      <li><strong>Communication Content:</strong> SMS messages, voicemails, and transcripts exchanged through our platform between landlords and prospective tenants.</li>
      <li><strong>Usage Data:</strong> Log data, IP addresses, browser type, device identifiers, pages visited, and time spent on the platform.</li>
      <li><strong>Payment Information:</strong> Processed through our third-party payment processor; we do not store full payment card details.</li>
    </ul>

    <h2>3. How We Use Your Information</h2>
    <p>We use the information we collect to:</p>
    <ul>
      <li>Provide, maintain, and improve the MyRentCard platform and its features.</li>
      <li>Enable landlords to send and receive SMS and voice communications with prospective tenants through our platform.</li>
      <li>Process and display rental inquiry information and leasing intake data.</li>
      <li>Generate AI-assisted summaries and extractions from inbound communications.</li>
      <li>Send transactional and operational messages related to your account.</li>
      <li>Ensure compliance with applicable laws and our Terms of Service.</li>
      <li>Detect and prevent fraud, abuse, or unauthorized access.</li>
      <li>Respond to your support inquiries.</li>
    </ul>

    <h2>4. Text Messaging (SMS) Disclosure</h2>
    <div class="highlight-box">
      <p><strong>Important SMS Notice:</strong> MyRentCard facilitates SMS and MMS messaging on behalf of landlords and property managers. By providing your phone number to a landlord or property manager using MyRentCard, or by texting a MyRentCard-powered number, you may receive text messages including rental inquiry updates, scheduling confirmations, and property information.</p>
    </div>
    <ul>
      <li><strong>Consent:</strong> Phone numbers are only messaged with appropriate consent from the recipient or as part of an existing business relationship.</li>
      <li><strong>Message Frequency:</strong> Message frequency varies depending on your interaction with a landlord or property. You may receive multiple messages per rental inquiry.</li>
      <li><strong>Message &amp; Data Rates:</strong> Message and data rates may apply. Check with your wireless carrier for applicable rates.</li>
      <li><strong>Opt-Out:</strong> To stop receiving SMS messages, reply <strong>STOP</strong> to any message. You will receive one confirmation message and no further messages will be sent.</li>
      <li><strong>Help:</strong> Reply <strong>HELP</strong> for assistance, or contact us at <a href="mailto:support@myrentcard.com">support@myrentcard.com</a>.</li>
      <li><strong>Carriers:</strong> Carriers are not liable for delayed or undelivered messages.</li>
    </ul>

    <h2>5. How We Share Your Information</h2>
    <p>We do not sell your personal information. We may share information:</p>
    <ul>
      <li><strong>With Service Providers:</strong> Third-party vendors who help us operate our platform, including Twilio (for SMS/voice communications), cloud hosting providers, and analytics services.</li>
      <li><strong>Between Landlords and Prospects:</strong> Communication content is shared as necessary to facilitate the leasing relationship you have initiated.</li>
      <li><strong>For Legal Compliance:</strong> When required by law, subpoena, or other legal process, or to protect the rights, property, or safety of MyRentCard, our users, or the public.</li>
      <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with appropriate notice to users.</li>
    </ul>

    <h2>6. Data Retention</h2>
    <p>We retain your personal information for as long as your account is active or as needed to provide services. Communication records (SMS, voicemail transcripts) are retained for the duration of your account plus a reasonable period thereafter. You may request deletion of your data by contacting us.</p>

    <h2>7. Data Security</h2>
    <p>We implement industry-standard security measures including encryption in transit (TLS), access controls, and regular security reviews. No system is completely secure, and we cannot guarantee absolute security of your information.</p>

    <h2>8. Your Rights and Choices</h2>
    <p>Depending on your jurisdiction, you may have the right to:</p>
    <ul>
      <li>Access, correct, or delete your personal information.</li>
      <li>Opt out of SMS communications by replying STOP.</li>
      <li>Request a copy of the data we hold about you.</li>
      <li>Lodge a complaint with a data protection authority.</li>
    </ul>
    <p>To exercise these rights, contact us at <a href="mailto:privacy@myrentcard.com">privacy@myrentcard.com</a>.</p>

    <h2>9. Children's Privacy</h2>
    <p>MyRentCard is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children.</p>

    <h2>10. Third-Party Links</h2>
    <p>Our platform may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.</p>

    <h2>11. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page with an updated effective date. Continued use of our services after changes constitutes acceptance of the updated policy.</p>

    <h2>12. Contact Us</h2>
    <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
    <ul>
      <li>Email: <a href="mailto:privacy@myrentcard.com">privacy@myrentcard.com</a></li>
      <li>Support: <a href="mailto:support@myrentcard.com">support@myrentcard.com</a></li>
    </ul>
  `;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(htmlPage("Privacy Policy", body));
});

router.get("/terms", (_req: Request, res: Response) => {
  const body = `
    <h1>Terms of Service</h1>
    <p class="effective-date">Effective Date: January 1, 2025 &nbsp;|&nbsp; Last Updated: March 2025</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using MyRentCard ("Service," "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service. These Terms constitute a legally binding agreement between you and MyRentCard.</p>

    <h2>2. Description of Service</h2>
    <p>MyRentCard is a leasing operations platform that enables landlords, property managers, and real estate professionals to:</p>
    <ul>
      <li>Receive and manage rental inquiries via SMS, voice, and other channels.</li>
      <li>Communicate with prospective tenants via SMS and voice calls using Twilio-powered phone numbers.</li>
      <li>Use AI-assisted tools to process, summarize, and organize leasing intake information.</li>
      <li>Export leasing data in formats compatible with property management systems.</li>
      <li>Track and manage the leasing pipeline across multiple properties.</li>
    </ul>

    <h2>3. Eligibility and Registration</h2>
    <p>You must be at least 18 years old and have the legal capacity to enter into contracts to use our Service. By registering, you represent and warrant that the information you provide is accurate and complete. You are responsible for maintaining the confidentiality of your account credentials.</p>

    <h2>4. SMS and Voice Communications</h2>
    <div class="highlight-box">
      <p><strong>SMS Program Disclosure:</strong> MyRentCard facilitates SMS/MMS messaging between landlords and prospective tenants. The following terms apply to all text message communications sent through our platform.</p>
    </div>
    <ul>
      <li><strong>Consent:</strong> Landlords using our platform agree to only send SMS messages to individuals who have provided consent to receive such communications, or with whom they have an existing business relationship relating to a rental inquiry.</li>
      <li><strong>Message Frequency:</strong> Message frequency varies. Prospective tenants may receive messages in connection with their rental inquiry, including confirmations, follow-ups, scheduling, and property information.</li>
      <li><strong>Message &amp; Data Rates:</strong> Message and data rates may apply. Standard carrier rates apply to all SMS and MMS messages.</li>
      <li><strong>Opt-Out:</strong> Recipients may opt out of receiving SMS messages at any time by replying <strong>STOP</strong> to any message. Upon receiving a STOP request, no further messages will be sent to that number in connection with that messaging program.</li>
      <li><strong>Help:</strong> Recipients may reply <strong>HELP</strong> to any message for assistance, or contact support at <a href="mailto:support@myrentcard.com">support@myrentcard.com</a>.</li>
      <li><strong>Supported Carriers:</strong> Major US carriers are supported. Carrier is not liable for delayed or undelivered messages.</li>
      <li><strong>Prohibited Content:</strong> Users may not send SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco), unsolicited commercial messages, or any content that violates applicable laws or carrier guidelines.</li>
    </ul>

    <h2>5. Acceptable Use</h2>
    <p>You agree to use MyRentCard only for lawful purposes and in accordance with these Terms. You may not:</p>
    <ul>
      <li>Use the Service to send spam, unsolicited messages, or messages to recipients who have opted out.</li>
      <li>Impersonate any person or entity or misrepresent your affiliation.</li>
      <li>Violate any applicable local, state, national, or international law or regulation, including the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, and applicable state laws.</li>
      <li>Use the Service to harass, threaten, or intimidate any person.</li>
      <li>Attempt to gain unauthorized access to any part of the Service or its related systems.</li>
      <li>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
      <li>Use the Service to store or transmit malicious code.</li>
    </ul>

    <h2>6. User Data and Privacy</h2>
    <p>Your use of our Service is also governed by our <a href="/api/privacy">Privacy Policy</a>, which is incorporated herein by reference. By using our Service, you consent to the collection and use of your information as described in our Privacy Policy.</p>

    <h2>7. Intellectual Property</h2>
    <p>The Service and its original content, features, and functionality are and will remain the exclusive property of MyRentCard. Our trademarks and trade dress may not be used in connection with any product or service without prior written consent. You retain ownership of any data you upload to the platform.</p>

    <h2>8. Payment and Subscriptions</h2>
    <p>Certain features of the Service may require a paid subscription. Subscription fees are billed in advance on a recurring basis. You authorize us to charge your payment method for all applicable fees. Fees are non-refundable except as required by law or as expressly stated in our refund policy.</p>

    <h2>9. Disclaimer of Warranties</h2>
    <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.</p>

    <h2>10. Limitation of Liability</h2>
    <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MYRENTCARD SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE THREE MONTHS PRECEDING THE CLAIM.</p>

    <h2>11. Indemnification</h2>
    <p>You agree to indemnify, defend, and hold harmless MyRentCard and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.</p>

    <h2>12. Termination</h2>
    <p>We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or the integrity of the Service. Upon termination, your right to use the Service ceases immediately.</p>

    <h2>13. Governing Law and Disputes</h2>
    <p>These Terms shall be governed by and construed in accordance with the laws of the United States and the State of Delaware, without regard to conflict of law principles. Any dispute arising from or relating to these Terms or the Service shall be resolved through binding arbitration, except that either party may seek injunctive or other equitable relief in any court of competent jurisdiction.</p>

    <h2>14. Changes to Terms</h2>
    <p>We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on this page with a new effective date. Your continued use of the Service after changes become effective constitutes your acceptance of the revised Terms.</p>

    <h2>15. Contact Us</h2>
    <p>If you have questions about these Terms of Service, please contact us:</p>
    <ul>
      <li>Email: <a href="mailto:legal@myrentcard.com">legal@myrentcard.com</a></li>
      <li>Support: <a href="mailto:support@myrentcard.com">support@myrentcard.com</a></li>
    </ul>
  `;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(htmlPage("Terms of Service", body));
});

export default router;
