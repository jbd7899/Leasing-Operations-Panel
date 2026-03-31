import { LegalPageLayout } from "./LegalPageLayout";

export function PrivacyPolicy() {
  return (
    <LegalPageLayout>
      <h1 className="text-4xl font-black tracking-tight text-text-primary mb-2 md:text-5xl">
        Privacy Policy
      </h1>
      <p className="text-sm text-text-muted mb-12">Last updated: March 31, 2026</p>

      {/* 1. Introduction */}
      <Section title="1. Introduction">
        <p>
          MyRentCard ("we," "us," or "our") operates a B2B software platform that provides
          AI-powered leasing communication tools for landlords and property managers. This Privacy
          Policy explains how we collect, use, store, and protect your information — including
          mobile phone numbers and SMS/voice communication data — when you use our services at
          myrentcard.com and the MyRentCard mobile application.
        </p>
        <p>
          By using MyRentCard, you agree to the practices described in this Privacy Policy. If you
          do not agree, please do not use our services.
        </p>
      </Section>

      {/* 2. Information We Collect */}
      <Section title="2. Information We Collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">Account information</strong> — name, email
            address, and phone number provided during registration.
          </li>
          <li>
            <strong className="text-text-primary">Mobile phone numbers</strong> — of landlords
            (provided during registration) and rental prospects (received when prospects initiate
            contact by texting or calling a MyRentCard-provisioned phone number).
          </li>
          <li>
            <strong className="text-text-primary">Communication data</strong> — SMS messages, call
            logs, and voicemail transcripts exchanged through MyRentCard-provisioned phone numbers.
          </li>
          <li>
            <strong className="text-text-primary">AI-processed data</strong> — prospect details
            extracted by our AI from communications, including move-in date, budget, bedroom
            preference, pet information, and income.
          </li>
          <li>
            <strong className="text-text-primary">Property and leasing data</strong> — property
            listings, unit details, and leasing pipeline information you enter into the platform.
          </li>
          <li>
            <strong className="text-text-primary">Usage data</strong> — device information, IP
            address, and analytics about how you interact with our platform.
          </li>
        </ul>
      </Section>

      {/* 3. How We Collect Mobile Phone Numbers */}
      <Section title="3. How We Collect Mobile Phone Numbers">
        <p>Mobile phone numbers are collected in two ways:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">Landlord/user numbers</strong> — provided
            directly by you when you create a MyRentCard account.
          </li>
          <li>
            <strong className="text-text-primary">Prospect numbers</strong> — received when a
            rental prospect initiates contact by sending a text message to or calling a
            MyRentCard-provisioned Twilio phone number. Consent is established at the point of
            contact through the prospect's voluntary initiation of communication.
          </li>
        </ul>
      </Section>

      {/* 4. How We Use Mobile Information */}
      <Section title="4. How We Use Mobile Information">
        <p>We use mobile phone numbers and communication data to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Facilitate SMS and voice communication between landlords and rental prospects.</li>
          <li>
            Extract and organize prospect data from messages using AI (e.g., move-in date, budget,
            pets, income).
          </li>
          <li>Generate suggested reply messages for landlord review and approval before sending.</li>
          <li>Send service-related notifications about your MyRentCard account.</li>
          <li>Provide analytics and reporting on your leasing pipeline.</li>
        </ul>
      </Section>

      {/* 5. Mobile Information Sharing Policy — A2P CRITICAL */}
      <Section title="5. Mobile Information Sharing Policy">
        <div className="rounded-xl border border-teal/20 bg-teal/5 p-6 space-y-4">
          <p className="font-semibold text-text-primary">
            We will not share, sell, or disclose mobile contact information, including phone
            numbers, with third parties or affiliates for marketing or promotional purposes.
          </p>
          <p className="font-semibold text-text-primary">
            Mobile opt-in data and consent information will not be shared with any third parties.
          </p>
          <p className="font-semibold text-text-primary">
            The mobile information of end users opting in to the MyRentCard messaging program will
            never be shared with or sold to third parties or lead generators.
          </p>
        </div>
        <p className="mt-4">
          We share mobile phone numbers with Twilio, Inc. solely to deliver SMS messages and
          facilitate voice calls on your behalf. Twilio acts as a communication infrastructure
          provider and is bound by a data processing agreement. Twilio does not use your data for
          any independent purpose.
        </p>
        <p>
          We do not share mobile information with advertising networks, data brokers, lead
          generators, or any other third parties for marketing purposes.
        </p>
      </Section>

      {/* 6. Data Storage and Security */}
      <Section title="6. Data Storage and Security">
        <p>We protect your data with industry-standard security measures:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">Encryption in transit</strong> — all data is
            transmitted over TLS 1.2 or higher.
          </li>
          <li>
            <strong className="text-text-primary">Encryption at rest</strong> — all stored data is
            encrypted using AES-256 encryption.
          </li>
          <li>
            <strong className="text-text-primary">Access controls</strong> — role-based access
            ensures only authorized team members can view prospect data.
          </li>
          <li>
            <strong className="text-text-primary">Infrastructure</strong> — data is stored in
            secure PostgreSQL databases hosted by reputable cloud providers.
          </li>
        </ul>
      </Section>

      {/* 7. Data Retention */}
      <Section title="7. Data Retention">
        <p>
          We retain your account and communication data for as long as your MyRentCard account is
          active and as needed to provide our services.
        </p>
        <p>
          Upon account termination, you may request deletion of your data by contacting us at{" "}
          <a href="mailto:hello@myrentcard.com" className="text-teal-light hover:underline">
            hello@myrentcard.com
          </a>
          . We will delete your data within 30 days of a verified request, except where retention
          is required by applicable law or regulation.
        </p>
        <p>
          Communication logs may be retained as required by telecommunications regulations.
        </p>
      </Section>

      {/* 8. Your Rights */}
      <Section title="8. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">Access</strong> your personal data held by
            MyRentCard.
          </li>
          <li>
            <strong className="text-text-primary">Correct</strong> inaccurate or incomplete data.
          </li>
          <li>
            <strong className="text-text-primary">Delete</strong> your personal data, subject to
            legal retention requirements.
          </li>
          <li>
            <strong className="text-text-primary">Opt out</strong> of SMS communications at any
            time by texting <strong>STOP</strong> to any MyRentCard message.
          </li>
          <li>
            <strong className="text-text-primary">Export</strong> your data in a portable format
            (CSV or compatible CRM format).
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:hello@myrentcard.com" className="text-teal-light hover:underline">
            hello@myrentcard.com
          </a>
          .
        </p>
      </Section>

      {/* 9. Third-Party Services */}
      <Section title="9. Third-Party Services">
        <p>We use the following third-party services to operate MyRentCard:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-text-primary">Twilio, Inc.</strong> — provides SMS and voice
            communication infrastructure. Phone numbers are shared with Twilio solely to deliver
            messages and facilitate calls.
          </li>
          <li>
            <strong className="text-text-primary">OpenAI</strong> — provides AI models used for
            data extraction and reply draft generation. Message content is processed by OpenAI's
            API; we use their data processing agreements and do not permit OpenAI to use your data
            for training.
          </li>
        </ul>
        <p>
          We do not share your data with advertising networks, data brokers, or lead generation
          services.
        </p>
      </Section>

      {/* 10. Children's Privacy */}
      <Section title="10. Children's Privacy">
        <p>
          MyRentCard is not directed at individuals under the age of 13. We do not knowingly
          collect personal information from children under 13. If we become aware that we have
          collected such information, we will take steps to delete it promptly.
        </p>
      </Section>

      {/* 11. Changes to This Policy */}
      <Section title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. For material changes, we will notify
          you via email or through an in-app notice at least 30 days before the changes take
          effect. Your continued use of MyRentCard after changes become effective constitutes
          acceptance of the updated policy.
        </p>
      </Section>

      {/* 12. Contact Us */}
      <Section title="12. Contact Us" last>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your data rights,
          contact us at:
        </p>
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
