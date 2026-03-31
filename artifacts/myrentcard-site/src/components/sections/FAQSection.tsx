import { SectionWrapper } from "@/components/shared/SectionWrapper";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Do I need a Twilio account to use MyRentCard?",
    a: "Yes — Twilio provides the phone numbers for SMS and voice. We walk you through setup with a guided wizard. It takes about 10 minutes and Twilio costs start around $1/month per number.",
  },
  {
    q: "What property management software does it integrate with?",
    a: "Currently we support CSV and AppFolio exports. More CRM integrations are on the roadmap based on user demand.",
  },
  {
    q: "How does the AI extraction work?",
    a: "When a prospect texts or calls you, MyRentCard reads the conversation using an AI model and automatically fills in fields like move-in date, budget, pets, income, and bedroom preference — no action needed from you.",
  },
  {
    q: "Can I manage multiple properties?",
    a: "Yes. You can add as many properties as you need and assign Twilio numbers to each. Your inbox and analytics can be filtered by property.",
  },
  {
    q: "Is my tenant data private and secure?",
    a: "All data is encrypted in transit and at rest. We never sell your data. You own your prospect data and can export it at any time.",
  },
  {
    q: "What happens after the early access period?",
    a: "Early access members keep their discounted rate for 3 months, then move to standard pricing. We'll give plenty of notice and you can cancel at any time.",
  },
  {
    q: "Does it work for iOS and Android?",
    a: "Yes — MyRentCard is a React Native app that runs on iOS, Android, and in your web browser. Manage your leads from any device.",
  },
  {
    q: "Can my team members also use the app?",
    a: "Absolutely. You can add team members with their own login. They'll see the same leads, inbox, and prospect profiles so everyone stays on the same page.",
  },
];

export function FAQSection() {
  return (
    <SectionWrapper id="faq" background="navy-light" containerClassName="py-24 md:py-28 px-6">
      <div className="mb-14 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">FAQ</p>
        <h2 className="text-4xl font-black tracking-tight text-text-primary md:text-5xl">
          Questions answered.
        </h2>
      </div>

      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border">
              <AccordionTrigger className="text-base md:text-lg">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-base text-text-secondary">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionWrapper>
  );
}
