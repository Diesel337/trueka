"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { sendMessageAction } from "@/app/actions";

import { UserAvatar } from "./user-avatar";

type ChatMessage = {
  id?: string;
  senderId?: string;
  sender: string;
  senderAvatarUrl?: string;
  body: string;
  at: string;
  createdAt?: string;
  mine?: boolean;
  status?: "sending" | "sent" | "failed";
};

const maxMessageLength = 2000;

export function RequestChat({
  requestId,
  initialMessages,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
}: {
  requestId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string;
}) {
  const router = useRouter();
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const messages = mergeMessages(initialMessages, optimisticMessages, currentUserId, currentUserName);
  const trimmedBody = body.trim();
  const isOverLimit = body.length > maxMessageLength;
  const canSubmit = trimmedBody.length > 0 && !isOverLimit && !pending;

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const optimisticId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setOptimisticMessages((currentMessages) => [
      ...currentMessages,
      {
        id: optimisticId,
        senderId: currentUserId,
        sender: currentUserName,
        senderAvatarUrl: currentUserAvatarUrl,
        body: trimmedBody,
        at: new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mine: true,
        status: "sending",
      },
    ]);
    setBody("");
    setStatus(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("tradeRequestId", requestId);
      formData.set("body", trimmedBody);
      const result = await sendMessageAction(formData);

      setOptimisticMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === optimisticId
            ? { ...message, status: result.ok ? "sent" : "failed" }
            : message,
        ),
      );

      if (!result.ok) {
        setStatus(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-4 p-5">
        {messages.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-6 text-stone-600">
            El chat ya está abierto. Escribe el primer mensaje para acordar detalles del trueque sin pagos, envíos gestionados ni entregas mediadas por Trueka.
          </div>
        ) : null}
        {messages.map((message, index) => {
          const isMine = Boolean(message.mine);

          return (
            <div
              key={message.id ?? `${message.sender}-${message.at}-${index}`}
              className={`flex items-end gap-3 ${isMine ? "justify-end" : "justify-start"}`}
            >
              {!isMine ? (
                <UserAvatar src={message.senderAvatarUrl} alt={message.sender} size={36} />
              ) : null}
              <div
                className={`max-w-[82%] rounded-lg px-4 py-3 ${
                  isMine ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-800"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className={`text-sm font-semibold ${isMine ? "text-white" : "text-stone-950"}`}>
                    {message.sender}
                  </p>
                  <p className={`text-xs ${isMine ? "text-emerald-50" : "text-stone-500"}`}>
                    {message.at}
                  </p>
                  {message.status ? (
                    <p className={`text-xs font-medium ${message.status === "failed" ? "text-red-100" : "text-emerald-50"}`}>
                      {message.status === "sending" ? "Enviando" : null}
                      {message.status === "sent" ? "Enviado" : null}
                      {message.status === "failed" ? "No enviado" : null}
                    </p>
                  ) : null}
                </div>
                <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${isMine ? "text-white" : "text-stone-700"}`}>
                  {message.body}
                </p>
              </div>
              {isMine ? (
                <UserAvatar src={message.senderAvatarUrl} alt={message.sender} size={36} />
              ) : null}
            </div>
          );
        })}
      </div>

      <form className="border-t border-stone-200 p-5" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="body">
          Escribir mensaje
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_48px]">
          <textarea
            id="body"
            name="body"
            rows={3}
            maxLength={maxMessageLength + 1}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escribe dentro de esta solicitud..."
            className="rounded-md border border-stone-200 px-3 py-3 outline-none focus:border-emerald-600"
          />
          <button
            aria-label="Enviar mensaje"
            disabled={!canSubmit}
            className="grid min-h-12 place-items-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600"
          >
            <Send aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <p className={isOverLimit ? "text-red-700" : "text-stone-500"}>
            {body.length.toLocaleString("es-MX")} / {maxMessageLength.toLocaleString("es-MX")}
          </p>
          {isOverLimit ? <p className="text-red-700">El mensaje es demasiado largo.</p> : null}
        </div>
        {status ? <p className="mt-3 text-sm text-amber-800">{status}</p> : null}
      </form>
    </>
  );
}

function mergeMessages(
  initialMessages: ChatMessage[],
  optimisticMessages: ChatMessage[],
  currentUserId: string,
  currentUserName: string,
) {
  const serverSignatures = new Set(initialMessages.map(getMessageSignature));
  const visibleOptimisticMessages = optimisticMessages.filter((message) =>
    message.status === "failed" || !serverSignatures.has(getMessageSignature(message)),
  );

  return [
    ...initialMessages.map((message) => ({
      ...message,
      mine: message.mine ?? (message.senderId === currentUserId || message.sender === currentUserName),
    })),
    ...visibleOptimisticMessages,
  ];
}

function getMessageSignature(message: ChatMessage) {
  return `${message.sender.trim()}|${message.body.trim()}`;
}
