export interface Prospect {
  id: string;
  accountId: string;
  assignedPropertyId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phonePrimary: string;
  phoneSecondary?: string | null;
  email?: string | null;
  desiredMoveInDate?: string | null;
  desiredBedrooms?: string | null;
  budgetMin?: string | null;
  budgetMax?: string | null;
  pets?: string | null;
  voucherType?: string | null;
  employmentStatus?: string | null;
  monthlyIncome?: string | null;
  languagePreference?: string | null;
  latestSummary?: string | null;
  latestSentiment?: string | null;
  qualificationScore?: string | null;
  status: string;
  exportStatus: string;
  crmExternalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  accountId: string;
  prospectId?: string | null;
  propertyId?: string | null;
  sourceType: string;
  direction: string;
  twilioMessageSid?: string | null;
  twilioCallSid?: string | null;
  fromNumber: string;
  toNumber: string;
  rawText?: string | null;
  transcript?: string | null;
  summary?: string | null;
  category?: string | null;
  urgency?: string | null;
  sentiment?: string | null;
  extractionStatus?: string | null;
  structuredExtractionJson?: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  accountId: string;
  name: string;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TwilioNumber {
  id: string;
  accountId: string;
  phoneNumber: string;
  friendlyName?: string | null;
  propertyId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
  createdAt?: string;
}

export interface Tag {
  id: string;
  accountId: string;
  name: string;
  color?: string | null;
}

export interface Note {
  id: string;
  accountId: string;
  prospectId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface ExportBatch {
  id: string;
  accountId: string;
  createdByUserId: string;
  format: string;
  targetSystem?: string | null;
  recordCount: number;
  status: string;
  createdAt: string;
}

export interface InboxItem {
  interaction: Interaction;
  prospect: Prospect | null;
  property: Property | null;
}

export type ProspectStatus = "new" | "contacted" | "qualified" | "disqualified" | "archived";
export type ExportStatus = "pending" | "exported" | "excluded";
export type SentimentType = "positive" | "neutral" | "negative" | "mixed";
