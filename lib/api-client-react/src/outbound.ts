import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";
import type { Interaction, Prospect } from "./generated/api.schemas";

export interface SendSmsBody {
  prospectId: string;
  body: string;
  fromTwilioNumberId?: string;
}

export const sendSms = async (sendSmsBody: SendSmsBody): Promise<Interaction> => {
  return customFetch<Interaction>("/api/interactions/send-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sendSmsBody),
  });
};

export const useSendSms = <TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendSms>>, TError, SendSmsBody, TContext>;
}): UseMutationResult<Awaited<ReturnType<typeof sendSms>>, TError, SendSmsBody, TContext> => {
  const { mutation: mutationOptions } = options ?? {};
  return useMutation<Awaited<ReturnType<typeof sendSms>>, TError, SendSmsBody, TContext>({
    mutationFn: (vars: SendSmsBody) => sendSms(vars),
    ...mutationOptions,
  });
};

export interface InitiateSmsBody {
  toPhone: string;
  body: string;
  fromTwilioNumberId?: string;
}

export interface InitiateSmsResponse {
  interaction: Interaction;
  prospect: Prospect;
}

export const initiateNewSms = async (initiateBody: InitiateSmsBody): Promise<InitiateSmsResponse> => {
  return customFetch<InitiateSmsResponse>("/api/interactions/initiate-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(initiateBody),
  });
};

export const useInitiateNewSms = <TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof initiateNewSms>>, TError, InitiateSmsBody, TContext>;
}): UseMutationResult<Awaited<ReturnType<typeof initiateNewSms>>, TError, InitiateSmsBody, TContext> => {
  const { mutation: mutationOptions } = options ?? {};
  return useMutation<Awaited<ReturnType<typeof initiateNewSms>>, TError, InitiateSmsBody, TContext>({
    mutationFn: (vars: InitiateSmsBody) => initiateNewSms(vars),
    ...mutationOptions,
  });
};

export interface ProspectConflict {
  id: string;
  accountId: string;
  prospectId: string;
  fieldName: string;
  existingValue: string | null;
  extractedValue: string;
  chosenValue: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetConflictsResponse {
  conflicts: ProspectConflict[];
}

export interface ResolveConflictBody {
  chosenValue: string;
}

export interface ResolveConflictResponse {
  conflict: ProspectConflict;
}

export const getProspectConflicts = async (prospectId: string): Promise<GetConflictsResponse> => {
  return customFetch<GetConflictsResponse>(`/api/prospects/${prospectId}/conflicts`);
};

export const getProspectConflictsQueryKey = (prospectId: string) =>
  ["prospects", prospectId, "conflicts"] as const;

export const useGetProspectConflicts = <TData = GetConflictsResponse, TError = ErrorType<unknown>>(
  prospectId: string,
  options?: { query?: UseQueryOptions<GetConflictsResponse, TError, TData> },
): UseQueryResult<TData, TError> => {
  const { query: queryOptions } = options ?? {};
  return useQuery<GetConflictsResponse, TError, TData>({
    queryKey: getProspectConflictsQueryKey(prospectId),
    queryFn: () => getProspectConflicts(prospectId),
    enabled: !!prospectId,
    ...queryOptions,
  });
};

export const resolveProspectConflict = async (
  prospectId: string,
  fieldName: string,
  body: ResolveConflictBody,
): Promise<ResolveConflictResponse> => {
  return customFetch<ResolveConflictResponse>(
    `/api/prospects/${prospectId}/conflicts/${fieldName}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
};

export const useResolveProspectConflict = <TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    ResolveConflictResponse,
    TError,
    { prospectId: string; fieldName: string; chosenValue: string },
    TContext
  >;
}): UseMutationResult<
  ResolveConflictResponse,
  TError,
  { prospectId: string; fieldName: string; chosenValue: string },
  TContext
> => {
  const { mutation: mutationOptions } = options ?? {};
  return useMutation({
    mutationFn: ({ prospectId, fieldName, chosenValue }) =>
      resolveProspectConflict(prospectId, fieldName, { chosenValue }),
    ...mutationOptions,
  });
};

export interface WeeklyTrendEntry {
  week: string;
  count: number;
}

export interface PropertyLeadCount {
  propertyId: string;
  propertyName: string;
  count: number;
}

export interface AnalyticsOverview {
  period: string;
  leadVolume: {
    total: number;
    periodCount: number;
    last7d: number;
    last30d: number;
    weeklyTrend: WeeklyTrendEntry[];
  };
  sourceMix: {
    sms: number;
    voice: number;
    voicemail: number;
  };
  statusFunnel: {
    new: number;
    contacted: number;
    qualified: number;
    disqualified: number;
  };
  qualificationRate: number;
  qualificationRateDelta: number | null;
  propertiesRanked: PropertyLeadCount[];
  exportPipeline: {
    pending: number;
    exportedLast30d: number;
  };
}

export const getAnalyticsOverview = async (period: string): Promise<AnalyticsOverview> => {
  return customFetch<AnalyticsOverview>(`/api/analytics/overview?period=${encodeURIComponent(period)}`);
};

export const getAnalyticsOverviewQueryKey = (period: string) =>
  ["analytics", "overview", period] as const;

export const useGetAnalyticsOverview = <TData = AnalyticsOverview, TError = ErrorType<unknown>>(
  period: string,
  options?: { query?: UseQueryOptions<AnalyticsOverview, TError, TData> },
): UseQueryResult<TData, TError> => {
  const { query: queryOptions } = options ?? {};
  return useQuery<AnalyticsOverview, TError, TData>({
    queryKey: getAnalyticsOverviewQueryKey(period),
    queryFn: () => getAnalyticsOverview(period),
    staleTime: 60_000,
    ...queryOptions,
  });
};
