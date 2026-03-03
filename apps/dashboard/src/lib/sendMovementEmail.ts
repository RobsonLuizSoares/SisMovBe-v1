'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Invoca a Edge Function sendMovementEmail.
 * Retorna { success, recipients, error } para registrar em movement_events.
 * Usa service role para invocação server-side.
 */
export async function invokeSendMovementEmail(
  type: 'REQUESTED_CREATED' | 'PICKED_UP' | 'RECEIVED' | 'DELIVERED',
  movementId: string
): Promise<
  | { success: true; recipients: string[]; skipped?: boolean }
  | { success: false; error: string; recipients?: string[] }
> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.functions.invoke('sendMovementEmail', {
      body: { type, movement_id: movementId },
    });

    if (error) {
      return { success: false, error: error.message, recipients: [] };
    }

    const parsed = data as {
      success?: boolean;
      recipients?: string[];
      message?: string;
      skipped?: boolean;
    } | null;
    const recipients: string[] = parsed?.recipients ?? [];
    const success = parsed?.success === true;
    const skipped = parsed?.skipped === true;

    if (skipped) {
      return { success: true, recipients: [], skipped: true };
    }
    return success
      ? { success: true, recipients }
      : { success: false, error: parsed?.message ?? 'E-mail não enviado', recipients };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { success: false, error: err, recipients: [] };
  }
}
