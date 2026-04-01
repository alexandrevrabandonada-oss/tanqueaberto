"use server";

import { headers } from "next/headers";

import { clearStationEditorSessionCookie, setStationEditorSessionCookie } from "@/lib/auth/station-editor-session";
import { recordOperationalEvent } from "@/lib/ops/logs";
import { acceptStationEditorInvite } from "@/lib/ops/station-editor-invites";

export interface StationEditorInviteAcceptState {
  success: boolean;
  error: string | null;
}

const INITIAL_ERROR = "Nao foi possivel aceitar este convite agora.";

function readBoolean(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function mapAcceptReason(reason: string | null) {
  if (reason === "missing_display_name") return "Informe um nome operacional curto.";
  if (reason === "invite_not_found") return "Codigo ou link nao encontrado. Confira e tente novamente.";
  if (reason === "invite_revoked") return "Esse convite foi revogado pelo admin.";
  if (reason === "invite_expired") return "Esse convite expirou. Peça um novo convite.";
  if (reason === "invite_exhausted") return "Esse convite ja foi usado no limite.";
  if (reason === "session_create_failed") return "Nao foi possivel criar sua sessao neste aparelho agora. Tente novamente em instantes.";
  if (reason === "invite_claim_failed") return "Seu codigo foi reconhecido, mas a ativacao nao concluiu. Tente de novo para finalizar a sessao.";
  return INITIAL_ERROR;
}

export async function acceptStationEditorInviteAction(_prevState: StationEditorInviteAcceptState, formData: FormData): Promise<StationEditorInviteAcceptState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  const keepOnDevice = readBoolean(formData.get("keepOnDevice"));
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? null;

  if (!displayName) {
    return { success: false, error: "Informe um nome operacional curto." };
  }

  const accepted = await acceptStationEditorInvite({
    inviteToken: inviteToken || null,
    inviteCode: inviteCode || null,
    displayName,
    userAgent,
    keepOnDevice
  });

  if (!accepted.ok || !accepted.session || !accepted.sessionToken) {
    await clearStationEditorSessionCookie();
    await recordOperationalEvent({
      eventType: "station_editor_invite_accept_failed",
      severity: "warning",
      scopeType: "station_editor_invite",
      scopeId: accepted.invite?.id ?? null,
      actorEmail: null,
      reason: accepted.reason,
      payload: {
        inviteCode: accepted.invite?.inviteCode ?? (inviteCode || null)
      }
    });
    return { success: false, error: mapAcceptReason(accepted.reason) };
  }

  await setStationEditorSessionCookie(accepted.sessionToken, accepted.session.expiresAt);

  await recordOperationalEvent({
    eventType: "station_editor_invite_accepted",
    severity: "info",
    scopeType: "station_editor_invite",
    scopeId: accepted.invite.id,
    actorId: accepted.session.id,
    actorEmail: `station-editor:${accepted.session.displayName}`,
    reason: "invite_accepted",
    payload: {
      inviteCode: accepted.invite.inviteCode,
      displayName: accepted.session.displayName,
      expiresAt: accepted.session.expiresAt
    }
  });

  return { success: true, error: null };
}
