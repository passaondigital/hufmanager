import { describe, expect, it } from "vitest";
import { correlationId } from "./correlation-id";

const generatedId = "generated-correlation-id";
const generateId = () => generatedId;

describe("correlationId", () => {
  it("keeps a valid correlation ID unchanged", () => {
    expect(correlationId("Request-123-abc", generateId)).toBe("Request-123-abc");
  });

  it("replaces an empty correlation ID", () => {
    expect(correlationId("", generateId)).toBe(generatedId);
  });

  it("replaces a missing correlation ID", () => {
    expect(correlationId(null, generateId)).toBe(generatedId);
  });

  it("replaces an overlong correlation ID", () => {
    expect(correlationId("a".repeat(65), generateId)).toBe(generatedId);
  });

  it("replaces a correlation ID containing special characters", () => {
    expect(correlationId("request_id!", generateId)).toBe(generatedId);
  });
});
