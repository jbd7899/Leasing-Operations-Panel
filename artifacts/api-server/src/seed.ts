import { db } from "@workspace/db";
import {
  accountUsersTable,
  interactionsTable,
  propertiesTable,
  prospectsTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { computeCompletenessScore } from "./lib/completenessScore";

const DEMO_AGENT_EMAIL = "jordan.rivera@myrentcard.demo";

const PROPERTIES = [
  {
    name: "Maple Court Apartments",
    address1: "1420 Maple Court",
    city: "Portland",
    state: "OR",
    zip: "97201",
    status: "active",
  },
  {
    name: "The Lofts at Pine",
    address1: "835 Pine Street",
    address2: "Suite 100",
    city: "Portland",
    state: "OR",
    zip: "97209",
    status: "active",
  },
  {
    name: "Riverside Commons",
    address1: "2250 Riverside Drive",
    city: "Portland",
    state: "OR",
    zip: "97214",
    status: "active",
  },
];

type ProspectSeed = {
  firstName: string;
  lastName: string;
  phonePrimary: string;
  email?: string;
  desiredBedrooms?: string;
  budgetMin?: string;
  budgetMax?: string;
  pets?: string;
  voucherType?: string;
  employmentStatus?: string;
  monthlyIncome?: string;
  desiredMoveInDate?: string;
  languagePreference?: string;
  status: "new" | "contacted" | "qualified" | "disqualified";
  exportStatus: "pending" | "not_ready" | "exported";
  propertyIndex: number;
};

const PROSPECTS: ProspectSeed[] = [
  {
    firstName: "James",
    lastName: "Okafor",
    phonePrimary: "+15035551001",
    email: "james.okafor@email.com",
    desiredBedrooms: "2",
    budgetMin: "1400",
    budgetMax: "1800",
    employmentStatus: "employed",
    monthlyIncome: "4200",
    desiredMoveInDate: "2026-05-01",
    status: "qualified",
    exportStatus: "pending",
    propertyIndex: 0,
  },
  {
    firstName: "Maria",
    lastName: "Delgado",
    phonePrimary: "+15035551002",
    email: "mdelgado@outlook.com",
    desiredBedrooms: "1",
    budgetMin: "900",
    budgetMax: "1200",
    pets: "1 cat",
    employmentStatus: "employed",
    monthlyIncome: "3100",
    desiredMoveInDate: "2026-04-15",
    status: "contacted",
    exportStatus: "pending",
    propertyIndex: 1,
  },
  {
    firstName: "Darnell",
    lastName: "Williams",
    phonePrimary: "+15035551003",
    desiredBedrooms: "3",
    budgetMin: "2000",
    budgetMax: "2500",
    voucherType: "Section 8",
    employmentStatus: "part-time",
    monthlyIncome: "2200",
    desiredMoveInDate: "2026-06-01",
    status: "new",
    exportStatus: "not_ready",
    propertyIndex: 2,
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    phonePrimary: "+15035551004",
    email: "priya.sharma@gmail.com",
    desiredBedrooms: "2",
    budgetMin: "1600",
    budgetMax: "2000",
    employmentStatus: "employed",
    monthlyIncome: "5500",
    desiredMoveInDate: "2026-04-01",
    languagePreference: "English",
    status: "qualified",
    exportStatus: "pending",
    propertyIndex: 1,
  },
  {
    firstName: "Tyler",
    lastName: "Bennett",
    phonePrimary: "+15035551005",
    email: "tyler.b@yahoo.com",
    desiredBedrooms: "Studio",
    budgetMin: "800",
    budgetMax: "1100",
    employmentStatus: "student",
    desiredMoveInDate: "2026-05-15",
    status: "new",
    exportStatus: "not_ready",
    propertyIndex: 0,
  },
  {
    firstName: "Keiko",
    lastName: "Nakamura",
    phonePrimary: "+15035551006",
    email: "keiko.nakamura@proton.me",
    desiredBedrooms: "1",
    budgetMin: "1100",
    budgetMax: "1400",
    employmentStatus: "employed",
    monthlyIncome: "3800",
    desiredMoveInDate: "2026-04-01",
    languagePreference: "Japanese",
    status: "contacted",
    exportStatus: "not_ready",
    propertyIndex: 2,
  },
  {
    firstName: "Reggie",
    lastName: "Carter",
    phonePrimary: "+15035551007",
    desiredBedrooms: "2",
    budgetMin: "1300",
    budgetMax: "1700",
    pets: "1 dog (25 lbs)",
    employmentStatus: "self-employed",
    monthlyIncome: "4800",
    desiredMoveInDate: "2026-07-01",
    status: "disqualified",
    exportStatus: "not_ready",
    propertyIndex: 0,
  },
  {
    firstName: "Sophie",
    lastName: "Laurent",
    phonePrimary: "+15035551008",
    email: "slaurent@example.com",
    desiredBedrooms: "1",
    budgetMin: "1200",
    budgetMax: "1500",
    employmentStatus: "employed",
    monthlyIncome: "4000",
    desiredMoveInDate: "2026-05-01",
    languagePreference: "French",
    status: "qualified",
    exportStatus: "exported",
    propertyIndex: 1,
  },
  {
    firstName: "Marcus",
    lastName: "Thompson",
    phonePrimary: "+15035551009",
    desiredBedrooms: "2",
    budgetMin: "1500",
    budgetMax: "1900",
    voucherType: "HUD-VASH",
    employmentStatus: "veteran",
    desiredMoveInDate: "2026-04-15",
    status: "contacted",
    exportStatus: "not_ready",
    propertyIndex: 2,
  },
  {
    firstName: "Aaliyah",
    lastName: "Jenkins",
    phonePrimary: "+15035551010",
    email: "aaliyah.j@email.com",
    desiredBedrooms: "3",
    budgetMin: "2100",
    budgetMax: "2600",
    pets: "2 cats",
    employmentStatus: "employed",
    monthlyIncome: "6200",
    desiredMoveInDate: "2026-06-01",
    status: "qualified",
    exportStatus: "pending",
    propertyIndex: 0,
  },
  {
    firstName: "Devon",
    lastName: "Park",
    phonePrimary: "+15035551011",
    email: "devon.park@gmail.com",
    desiredBedrooms: "Studio",
    budgetMin: "850",
    budgetMax: "1050",
    employmentStatus: "student",
    desiredMoveInDate: "2026-08-01",
    status: "new",
    exportStatus: "not_ready",
    propertyIndex: 1,
  },
  {
    firstName: "Fatima",
    lastName: "Hassan",
    phonePrimary: "+15035551012",
    desiredBedrooms: "2",
    budgetMin: "1400",
    budgetMax: "1750",
    voucherType: "TBRA",
    employmentStatus: "employed",
    monthlyIncome: "3200",
    desiredMoveInDate: "2026-05-15",
    languagePreference: "Arabic",
    status: "new",
    exportStatus: "not_ready",
    propertyIndex: 2,
  },
  {
    firstName: "Brandon",
    lastName: "Mitchell",
    phonePrimary: "+15035551013",
    email: "bmitchell@hotmail.com",
    desiredBedrooms: "1",
    budgetMin: "1000",
    budgetMax: "1350",
    employmentStatus: "employed",
    monthlyIncome: "3500",
    desiredMoveInDate: "2026-04-01",
    status: "disqualified",
    exportStatus: "not_ready",
    propertyIndex: 0,
  },
  {
    firstName: "Rosa",
    lastName: "Gutierrez",
    phonePrimary: "+15035551014",
    email: "rosa.gutierrez@icloud.com",
    desiredBedrooms: "2",
    budgetMin: "1350",
    budgetMax: "1700",
    employmentStatus: "employed",
    monthlyIncome: "4100",
    desiredMoveInDate: "2026-05-01",
    languagePreference: "Spanish",
    status: "contacted",
    exportStatus: "not_ready",
    propertyIndex: 1,
  },
  {
    firstName: "Anthony",
    lastName: "Russo",
    phonePrimary: "+15035551015",
    email: "anthony.russo@gmail.com",
    desiredBedrooms: "3",
    budgetMin: "2300",
    budgetMax: "2800",
    pets: "1 dog",
    employmentStatus: "employed",
    monthlyIncome: "7000",
    desiredMoveInDate: "2026-06-15",
    status: "qualified",
    exportStatus: "pending",
    propertyIndex: 2,
  },
  {
    firstName: "Destiny",
    lastName: "Brown",
    phonePrimary: "+15035551016",
    desiredBedrooms: "1",
    budgetMin: "950",
    budgetMax: "1200",
    voucherType: "Section 8",
    employmentStatus: "unemployed",
    desiredMoveInDate: "2026-04-15",
    status: "new",
    exportStatus: "not_ready",
    propertyIndex: 0,
  },
  {
    firstName: "Jin",
    lastName: "Lee",
    phonePrimary: "+15035551017",
    email: "jin.lee@proton.me",
    desiredBedrooms: "2",
    budgetMin: "1500",
    budgetMax: "1900",
    employmentStatus: "employed",
    monthlyIncome: "5200",
    desiredMoveInDate: "2026-05-01",
    languagePreference: "Korean",
    status: "contacted",
    exportStatus: "not_ready",
    propertyIndex: 1,
  },
  {
    firstName: "Isabelle",
    lastName: "Moreau",
    phonePrimary: "+15035551018",
    email: "imoreau@example.com",
    desiredBedrooms: "Studio",
    budgetMin: "800",
    budgetMax: "1000",
    employmentStatus: "student",
    desiredMoveInDate: "2026-09-01",
    status: "new",
    exportStatus: "not_ready",
    propertyIndex: 2,
  },
];

type InteractionSeed = {
  sourceType: "sms" | "voice" | "voicemail";
  rawText?: string;
  transcript?: string;
  summary: string;
  category: string;
  urgency: "low" | "medium" | "high";
  sentiment: "positive" | "neutral" | "negative";
  daysAgo: number;
};

function interactionsFor(prospect: ProspectSeed): InteractionSeed[] {
  const name = prospect.firstName;
  const bed = prospect.desiredBedrooms ?? "a unit";
  const budget = prospect.budgetMax ? `$${prospect.budgetMax}/mo` : "their budget";

  const base: InteractionSeed[] = [
    {
      sourceType: "sms",
      rawText: `Hi I'm interested in renting a ${bed} bedroom apartment. My budget is around ${budget}. Can you tell me about availability?`,
      summary: `${name} inquired about ${bed}BR availability within ${budget} budget.`,
      category: "inquiry",
      urgency: "medium",
      sentiment: "positive",
      daysAgo: 18,
    },
  ];

  if (prospect.status !== "new") {
    base.push({
      sourceType: "voicemail",
      transcript: `Hey this is ${name}, I called earlier about the apartment listing. I was hoping to schedule a tour sometime this week if possible. My move-in would be ${prospect.desiredMoveInDate ?? "soon"}. Please call me back. Thanks!`,
      summary: `${name} left voicemail requesting a tour, move-in target ${prospect.desiredMoveInDate ?? "TBD"}.`,
      category: "tour_request",
      urgency: "high",
      sentiment: "positive",
      daysAgo: 10,
    });
  }

  if (prospect.status === "qualified" || prospect.status === "contacted") {
    base.push({
      sourceType: "sms",
      rawText: `Just following up — I toured yesterday and I'm very interested. When can I get the application?`,
      summary: `${name} followed up post-tour, requesting application materials.`,
      category: "follow_up",
      urgency: "high",
      sentiment: "positive",
      daysAgo: 3,
    });
  }

  if (prospect.status === "disqualified") {
    base.push({
      sourceType: "sms",
      rawText: `Actually I found a different place. Not interested anymore, sorry.`,
      summary: `${name} withdrew interest — found alternate housing.`,
      category: "cancellation",
      urgency: "low",
      sentiment: "neutral",
      daysAgo: 5,
    });
  }

  return base;
}

async function main() {
  const ownerEmailEnv = process.env["SEED_OWNER_EMAIL"];

  let targetOwner;
  if (ownerEmailEnv) {
    const matches = await db
      .select()
      .from(accountUsersTable)
      .where(eq(accountUsersTable.email, ownerEmailEnv))
      .limit(1);
    targetOwner = matches[0];
    if (!targetOwner) {
      console.error(`❌ No account user found with email "${ownerEmailEnv}". Check the SEED_OWNER_EMAIL value.`);
      process.exit(1);
    }
  } else {
    const owners = await db
      .select()
      .from(accountUsersTable)
      .where(eq(accountUsersTable.role, "owner"))
      .limit(1);
    targetOwner = owners[0];
    if (!targetOwner) {
      console.error(
        "❌ No owner accounts found. Sign in to the app first to create your account, then run the seed script.",
      );
      process.exit(1);
    }
  }

  const accountId = targetOwner.accountId;
  console.log(`\n🌱 Seeding account: ${accountId} (owner: ${targetOwner.email ?? targetOwner.name})`);

  const [{ total }] = await db
    .select({ total: count() })
    .from(prospectsTable)
    .where(eq(prospectsTable.accountId, accountId));

  if (Number(total) > 0) {
    console.log(`✅ Account already has ${total} prospect(s) — skipping seed to avoid duplicates.`);
    console.log("   To re-seed, delete existing prospects first or use a fresh account.");
    process.exit(0);
  }

  console.log("   Creating properties...");
  const createdProperties = await db
    .insert(propertiesTable)
    .values(PROPERTIES.map((p) => ({ ...p, accountId })))
    .returning();

  console.log(`   ✓ ${createdProperties.length} properties created`);

  let prospectsCreated = 0;
  let interactionsCreated = 0;

  for (const prospectSeed of PROSPECTS) {
    const property = createdProperties[prospectSeed.propertyIndex % createdProperties.length];

    const fullName = `${prospectSeed.firstName} ${prospectSeed.lastName}`;

    const [prospect] = await db
      .insert(prospectsTable)
      .values({
        accountId,
        assignedPropertyId: property?.id,
        firstName: prospectSeed.firstName,
        lastName: prospectSeed.lastName,
        fullName,
        phonePrimary: prospectSeed.phonePrimary,
        email: prospectSeed.email,
        desiredBedrooms: prospectSeed.desiredBedrooms,
        budgetMin: prospectSeed.budgetMin,
        budgetMax: prospectSeed.budgetMax,
        pets: prospectSeed.pets,
        voucherType: prospectSeed.voucherType,
        employmentStatus: prospectSeed.employmentStatus,
        monthlyIncome: prospectSeed.monthlyIncome,
        desiredMoveInDate: prospectSeed.desiredMoveInDate,
        languagePreference: prospectSeed.languagePreference,
        latestSummary: `${fullName} is looking for a ${prospectSeed.desiredBedrooms ?? "?"} BR unit. Budget: $${prospectSeed.budgetMin ?? "?"}-$${prospectSeed.budgetMax ?? "?"}/mo.`,
        latestSentiment: "positive",
        completenessScore: computeCompletenessScore(prospectSeed),
        status: prospectSeed.status,
        exportStatus: prospectSeed.exportStatus,
      })
      .returning();

    prospectsCreated++;

    if (!prospect) continue;

    const interactions = interactionsFor(prospectSeed);
    const now = Date.now();

    for (const ix of interactions) {
      const occurredAt = new Date(now - ix.daysAgo * 24 * 60 * 60 * 1000);

      await db.insert(interactionsTable).values({
        accountId,
        prospectId: prospect.id,
        propertyId: property?.id,
        sourceType: ix.sourceType,
        direction: "inbound",
        fromNumber: prospectSeed.phonePrimary,
        toNumber: "+15035550000",
        rawText: ix.rawText,
        transcript: ix.transcript,
        summary: ix.summary,
        category: ix.category,
        urgency: ix.urgency,
        sentiment: ix.sentiment,
        extractionStatus: "done",
        extractionConfidence: "0.9200",
        occurredAt,
      });

      interactionsCreated++;
    }
  }

  console.log(`   ✓ ${prospectsCreated} prospects created`);
  console.log(`   ✓ ${interactionsCreated} interactions created`);

  const existingDemoAgent = await db
    .select()
    .from(accountUsersTable)
    .where(eq(accountUsersTable.email, DEMO_AGENT_EMAIL))
    .limit(1);

  if (existingDemoAgent.length === 0) {
    await db.insert(accountUsersTable).values({
      accountId,
      name: "Jordan Rivera (Demo Agent)",
      email: DEMO_AGENT_EMAIL,
      role: "agent",
    });
    console.log("   ✓ 1 demo team member created");
  }

  const pendingCount = PROSPECTS.filter((p) => p.exportStatus === "pending").length;
  console.log(`\n✅ Seed complete!`);
  console.log(`   Properties: ${createdProperties.length}`);
  console.log(`   Prospects: ${prospectsCreated} (${pendingCount} in Export Queue)`);
  console.log(`   Interactions: ${interactionsCreated}`);
  console.log(`   Team members: 1 demo agent added\n`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
