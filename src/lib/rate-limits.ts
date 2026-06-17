export const rateLimitRules = {
  tradeRequestCreate: {
    action: "trade_request_create",
    windowSeconds: 60 * 60,
    maxEvents: 12,
    message: "Has enviado varias solicitudes en poco tiempo. Intenta de nuevo mas tarde.",
  },
  tradeRequestCreateForItem: {
    action: "trade_request_create_for_item",
    windowSeconds: 60 * 60,
    maxEvents: 3,
    message: "Ya enviaste varias solicitudes para esta publicacion. Intenta mas tarde.",
  },
  messageSend: {
    action: "message_send",
    windowSeconds: 60,
    maxEvents: 30,
    message: "Estas enviando mensajes muy rapido. Espera un momento.",
  },
  messageSendInThread: {
    action: "message_send_in_thread",
    windowSeconds: 60,
    maxEvents: 20,
    message: "Estas enviando demasiados mensajes en esta solicitud. Espera un momento.",
  },
  reportCreate: {
    action: "report_create",
    windowSeconds: 60 * 60,
    maxEvents: 10,
    message: "Ya recibimos varios reportes tuyos recientemente. Intenta mas tarde.",
  },
  reportCreateForTarget: {
    action: "report_create_for_target",
    windowSeconds: 24 * 60 * 60,
    maxEvents: 2,
    message: "Ya recibimos reportes tuyos sobre este caso. Gracias por avisar.",
  },
} as const;

export type RateLimitRuleKey = keyof typeof rateLimitRules;

export function getRateLimitExceededMessage(ruleKey: RateLimitRuleKey) {
  return rateLimitRules[ruleKey].message;
}

export function getRateLimitRpcArgs(ruleKey: RateLimitRuleKey, targetKey?: string) {
  const rule = rateLimitRules[ruleKey];
  const normalizedTargetKey = targetKey?.trim() || null;

  return {
    p_action: rule.action,
    p_window_seconds: rule.windowSeconds,
    p_max_events: rule.maxEvents,
    p_target_key: normalizedTargetKey,
  };
}
