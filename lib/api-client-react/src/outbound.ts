import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";
import type { Interaction } from "./generated/api.schemas";

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
