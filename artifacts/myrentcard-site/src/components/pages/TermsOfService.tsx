import { LegalPageLayout } from "./LegalPageLayout";

export function TermsOfService() {
  return (
    <LegalPageLayout>
      <h1 className="text-4xl font-black tracking-tight text-text-primary mb-2 md:text-5xl">
        Terms of Service
      </h1>
      <p className="text-sm text-text-muted mb-12">Last updated: March 31, 2026</p>

      {/* 1. Acceptance of Terms */}
      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using MyRentCard ("the Service"), you agree to be bound by these Terms of
          Service ("Terms"). If you do not agree to these Terms, do not use the Service. These
          Terms constitute a legally binding agreement between you and MyRentCard.
        </p>
      </Section>

      {/* 2. Description of Service */}
      <Section title="2. Description of Service">
        <p>
          MyRentCard is a B2B software-as-a-service (SaaS) platform that provides AI-powered
          leasing communication tools for landlords and property managers. The Service includes:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            A unified inbox for SMS, voice calls, and voicemails between landlords and rental
            prospects, facilitated through Twilio-provisioned phone numbers.
          </li>
          <li>
            AI-powered data extraction that automatically reads prospect communications and fills
            in details such as move-in date, budget, bedroom count, pet information, and income.
          </li>
          <li>
            AI-generated reply drafts that landlords review, edit, and approve before sending.
          </li>
          <li>
            A lead pipeline for tracking prospects from initial inquiry through qualification.
          </li>
          <li>Analytics, reporting, and data export capabilities (CSV, AppFolio).</li>
        </ul>
      </Section>

      {/* 3. SMS/Messaging Terms — A2P CRITICAL */}
      <Section title="3. SMS and Messaging Terms">
        <div className="rounded-xl border border-teal/20 bg-teal/5 p-6 space-y-4">
          <h3 className="text-lg font-bold text-text-primary">Consent to Receive Messages</h3>
          <p>
            By providing your phone number and opting in, you consent to receive SMS messages from
            MyRentCard related to rental inquiries, property communications, and service
            notifications. Consent is obtained when you (a) register for a MyRentCard account and
            agree to these Terms, or (b) initiate a text message to a MyRentCard-provisioned phone
            number.
          </p>

          <h3 className="text-lg font-bold text-text-primary">Message Frequency</h3>
          <p>
            Message frequency varies based on your rental inquiry activity and communication
            preferences. You may receive messages each time a prospect contacts you or when service
            notifications are triggered.
          </p>

          <h3 className="text-lg font-bold text-text-primary">Message and Data Rates</h3>
          <p>
            Message and data rates may apply. Contact your wireless carrier for details about your
            text messaging plan and any applicable charges.
          </p>

          <h3 className="text-lg font-bold text-text-primary">Opt-Out</h3>
          <p>
            You may opt out of receiving SMS messages at any time by texting{" "}
            <strong className="text-text-primary">STOP</strong> to any message received from
            MyRentCard. After opting out, you will receive a one-time confirmation message and no
            further SMS messages will be sent to that number. You may also email{" "}
            <a href="mailto:hello@myrentcard.com" className="text-teal-light hover:underline">
              hello@myrentcard.com
            </a>{" "}
            to request opt-out.
          </p>

          <h3 className="text-lg font-bold text-text-primary">Help</h3>
          <p>
            For assistance with SMS messaging, text{" "}
            <strong className="text-text-primary">HELP</strong> to any MyRentCard number or email{" "}
            <a href="mailto:hello@myrentcard.com" className="text-teal-light hover:underline">
              hello@myrentcard.com
            </a>
            .
          </p>
        </div>
      </Section>

      {/* 4. User Accounts */}
      <Section title="4. User Accounts">
        <p>To use MyRentCard, you must:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Be at least 18 years of age.</li>
          <li>Provide accurate and complete registration information.</li>
          <li>
            Maintain the security of your account credentials. You are responsible for all activity
            that occurs under your account.
          </li>
          <li>
            Notify us immediately at{" "}
            <a href="mailto:hello@myrentcard.com" className="text-teal-light hover:underline">
              hello@myrentcard.com
            </a>{" "}
            if you suspect unauthorized access to your account.
          </li>
        </ul>
      </Section>

      {/* 5. Acceptable Use */}
      <Section title="5. Acceptable Use">
        <p>You agree to use MyRentCard in compliance with all applicable laws, including:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">Fair Housing Act</strong> — you will not use the
            Service to discriminate against any person based on race, color, religion, sex,
            national origin, familial status, disability, or any other protected class.
          </li>
          <li>
            <strong className="text-text-primary">
              Telephone Consumer Protection Act (TCPA)
            </strong>{" "}
            — you will obtain proper consent before sending messages and honor all opt-out requests
            promptly.
          </li>
          <li>
            <strong className="text-text-primary">CAN-SPAM Act</strong> — you will not use the
            Service to send unsolicited commercial messages.
          </li>
        </ul>
        <p>You may not use MyRentCard to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Send spam, unsolicited messages, or harassing communications.</li>
          <li>Engage in any illegal activity or facilitate illegal transactions.</li>
          <li>Transmit malware, viruses, or other harmful code.</li>
          <li>
            Attempt to gain unauthorized access to other users' accounts or our systems.
          </li>
          <li>
            Resell, sublicense, or redistribute the Service without our written consent.
          </li>
        </ul>
      </Section>

      {/* 6. Intellectual Property */}
      <Section title="6. Intellectual Property">
        <p>
          MyRentCard owns all rights, title, and interest in the platform, including its AI models,
          algorithms, user interface, and underlying technology. Your use of the Service does not
          grant you any ownership rights in our intellectual property.
        </p>
        <p>
          You retain full ownership of your property data, prospect data, and communications. We
          claim no ownership over the content you create or upload through the Service.
        </p>
      </Section>

      {/* 7. Fees and Payment */}
      <Section title="7. Fees and Payment">
        <p>
          MyRentCard subscription fees are billed monthly. Pricing is displayed at the time of
          registration and may be updated with 30 days' notice. Early access members receive
          discounted rates for the promotional period specified at sign-up.
        </p>
        <p>
          Twilio usage costs (phone numbers, SMS, and voice minutes) are billed separately by
          Twilio according to their pricing. MyRentCard is not responsible for Twilio charges.
        </p>
      </Section>

      {/* 8. Limitation of Liability */}
      <Section title="8. Limitation of Liability">
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind, either
          express or implied. We do not guarantee uninterrupted service, message delivery, or the
          accuracy of AI-generated content.
        </p>
        <p>
          To the maximum extent permitted by law, MyRentCard's total liability for any claims
          arising from your use of the Service shall not exceed the amount you paid to MyRentCard
          in the twelve (12) months preceding the claim.
        </p>
        <p>
          MyRentCard shall not be liable for any indirect, incidental, special, consequential, or
          punitive damages, including but not limited to loss of revenue, lost profits, or loss of
          data.
        </p>
      </Section>

      {/* 9. Indemnification */}
      <Section title="9. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless MyRentCard, its officers, directors,
          employees, and agents from any claims, damages, losses, or expenses (including reasonable
          attorneys' fees) arising from your use of the Service, your violation of these Terms, or
          your violation of any applicable law.
        </p>
      </Section>

      {/* 10. Termination */}
      <Section title="10. Termination">
        <p>
          Either party may terminate the Service at any time. You may cancel your account by
          contacting us at{" "}
          <a href="mailto:hello@myrentcard.com" className="text-teal-light hover:underline">
            hello@myrentcard.com
          </a>
          .
        </p>
        <p>
          We may suspend or terminate your account if you violate these Terms or engage in activity
          that is harmful to other users or our platform. Upon termination, your data will be
          handled in accordance with our{" "}
          <a href="/#/privacy" className="text-teal-light hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </Section>

      {/* 11. Governing Law */}
      <Section title="11. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State
          of Delaware, without regard to its conflict of law provisions. Any disputes arising from
          these Terms or your use of the Service shall be resolved in the state or federal courts
          located in Delaware.
        </p>
      </Section>

      {/* 12. Changes to These Terms */}
      <Section title="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. For material changes, we will provide at
          least 30 days' notice via email or in-app notification before the changes take effect.
          Your continued use of MyRentCard after changes become effective constitutes acceptance of
          the updated Terms.
        </p>
      </Section>

      {/* 13. Contact Us */}
      <Section title="13. Contact Us" last>
        <p>If you have questions about these Terms of Service, contact us at:</p>
        <div className="rounded-xl border border-border bg-surface p-6 mt-4">
          <p className="font-semibold text-text-primary">MyRentCard</p>
          <p>
            Email:{" "}
            <a href="mailto:hello@myrentcard.com" className="text-teal-light hover:underline">
              hello@myrentcard.com
            </a>
          </p>
          <p>
            Website:{" "}
            <a href="https://myrentcard.com" className="text-teal-light hover:underline">
              myrentcard.com
            </a>
          </p>
        </div>
      </Section>
    </LegalPageLayout>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "mb-0" : "mb-12"}>
      <h2 className="text-2xl font-bold text-text-primary mb-4">{title}</h2>
      <div className="space-y-4 text-base leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}
