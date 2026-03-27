// Zod schemas (runtime validators)
export * from "./generated/api";

// Re-export TypeScript interfaces that don't conflict with zod schema const names.
// The generated types barrel and api.ts share some names (e.g. CreateExportBody exists
// as both a zod const and a TS interface). We keep the zod consts as the canonical
// export and selectively re-export the pure-type interfaces that have no zod counterpart.
export type {
  AccountSettings,
  AccountUser,
  AddNoteBody,
  AuthorizationSessionHeaderParameter,
  AuthUser,
  AuthUserEnvelope,
  BeginBrowserLoginParams,
  CreateExportBodyFormat,
  DownloadExport200Two,
  ErrorEnvelope,
  ExportBatch,
  ExportBatchList,
  GetInboxParams,
  HandleBrowserLoginCallbackParams,
  HealthStatus,
  InboxItem,
  InboxResponse,
  Interaction,
  InteractionStructuredExtractionJson,
  ListProspectsParams,
  LogoutSuccess,
  MobileTokenExchangeRequest,
  MobileTokenExchangeSuccess,
  Note,
  Property,
  PropertyList,
  Prospect,
  ProspectDetail,
  ProspectList,
  ReviewInteractionBodyStructuredExtractionJson,
  SetTagsBody,
  Tag,
  TagList,
  TestTwilioBody,
  TestTwilioResult,
  TwilioNumber,
  TwilioNumberList,
  UserList,
} from "./generated/types";
