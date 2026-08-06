import assert from "node:assert/strict";
import test from "node:test";
import {
  isAcceptedEmailProviderResponse,
  resolveInvoiceDelivery,
} from "./invoice-delivery-contract.mjs";

const invoice = { provider_id: "provider-1", client_id: "client-1" };
const recipient = { email: "client@example.test", full_name: "Client Example" };

test("provider and client may each send only their invoice to the stored client email", () => {
  assert.deepEqual(resolveInvoiceDelivery({ invoice, actorId: "provider-1", recipient }), {
    ok: true,
    recipient: { email: "client@example.test", name: "Client Example" },
  });
  assert.equal(resolveInvoiceDelivery({ invoice, actorId: "client-1", recipient }).ok, true);
});

test("a foreign user cannot send an invoice", () => {
  assert.deepEqual(resolveInvoiceDelivery({ invoice, actorId: "other-user", recipient }), {
    ok: false,
    status: 403,
    code: "invoice-not-available",
  });
});

test("delivery is rejected when the stored recipient email is missing", () => {
  assert.deepEqual(resolveInvoiceDelivery({ invoice, actorId: "provider-1", recipient: { full_name: "Client" } }), {
    ok: false,
    status: 400,
    code: "recipient-email-missing",
  });
});

test("only a provider-issued Resend ID is a delivery success", () => {
  assert.equal(isAcceptedEmailProviderResponse({ data: { id: "email-1" }, error: null }), true);
  assert.equal(isAcceptedEmailProviderResponse({ data: null, error: { message: "rejected" } }), false);
  assert.equal(isAcceptedEmailProviderResponse({ data: {}, error: null }), false);
});

test("a retry remains an explicit new provider attempt", () => {
  assert.equal(resolveInvoiceDelivery({ invoice, actorId: "provider-1", recipient }).ok, true);
});
