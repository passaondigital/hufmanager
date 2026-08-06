export function resolveInvoiceDelivery({ invoice, actorId, recipient }) {
  if (!invoice || !actorId) {
    return { ok: false, status: 403, code: "invoice-not-available" };
  }

  if (actorId !== invoice.provider_id && actorId !== invoice.client_id) {
    return { ok: false, status: 403, code: "invoice-not-available" };
  }

  const email = recipient?.email?.trim();
  if (!email) {
    return { ok: false, status: 400, code: "recipient-email-missing" };
  }

  return {
    ok: true,
    recipient: {
      email,
      name: recipient.full_name?.trim() || "Kunde",
    },
  };
}

export function isAcceptedEmailProviderResponse(response) {
  return Boolean(!response?.error && response?.data?.id);
}
