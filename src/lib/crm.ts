import type { CrmRecordInput } from '@/types';

export interface CrmSaveResult {
  ok: boolean;
  mode: 'rest' | 'mcp' | 'noop';
  externalId?: string;
  message: string;
}

/**
 * Saves a structured quote record to the external CRM.
 *
 * Mode is chosen via env var CRM_MODE:
 *  - "rest": POSTs to CRM_API_URL with a Bearer token (CRM_API_KEY)
 *  - "mcp":  calls an MCP tool endpoint (CRM_MCP_ENDPOINT) — wire this up to
 *            whichever MCP server/tool your CRM connector exposes
 *  - unset:  no-op, logs only — lets the rest of the app run before the CRM
 *            integration is configured
 */
export async function saveToCrm(record: CrmRecordInput): Promise<CrmSaveResult> {
  const mode = process.env.CRM_MODE;

  if (mode === 'rest') {
    const url = process.env.CRM_API_URL;
    const apiKey = process.env.CRM_API_KEY;
    if (!url) {
      return { ok: false, mode: 'rest', message: 'CRM_API_URL is not set' };
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(toCrmPayload(record)),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, mode: 'rest', message: `CRM responded ${res.status}: ${text}` };
      }
      const data = await res.json().catch(() => ({}));
      return { ok: true, mode: 'rest', externalId: data?.id, message: 'Saved via REST API' };
    } catch (err) {
      return { ok: false, mode: 'rest', message: `Request failed: ${(err as Error).message}` };
    }
  }

  if (mode === 'mcp') {
    const endpoint = process.env.CRM_MCP_ENDPOINT;
    if (!endpoint) {
      return { ok: false, mode: 'mcp', message: 'CRM_MCP_ENDPOINT is not set' };
    }
    try {
      // Replace this with the actual MCP tool-call contract for your connector
      // (e.g. an internal MCP client, or a bridge service that exposes an
      // HTTP endpoint in front of the MCP tool call).
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'crm.create_record', input: toCrmPayload(record) }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, mode: 'mcp', message: `MCP call responded ${res.status}: ${text}` };
      }
      const data = await res.json().catch(() => ({}));
      return { ok: true, mode: 'mcp', externalId: data?.id, message: 'Saved via MCP' };
    } catch (err) {
      return { ok: false, mode: 'mcp', message: `MCP call failed: ${(err as Error).message}` };
    }
  }

  return {
    ok: true,
    mode: 'noop',
    message: 'CRM_MODE is not configured (rest|mcp) — record was stored in Supabase only.',
  };
}

function toCrmPayload(record: CrmRecordInput) {
  return {
    external_session_id: record.sessionId,
    source_file: record.sourceFile,
    customer_name: record.customer,
    email: record.email,
    phone: record.phone,
    owner: record.owner,
    stage: record.stage,
    material_no: record.materialNo,
    quantity: record.quantity,
    grand_total: record.grandTotal,
    line_item_count: record.sections.reduce((n, s) => n + s.items.length, 0),
    sections: record.sections,
    summary: record.summary,
  };
}
