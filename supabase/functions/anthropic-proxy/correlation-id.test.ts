import { describe, expect, it } from "vitest";
import { correlationId } from "./correlation-id";

const generatedId = "generated-correlation-id";
const generateId = () => generatedId;

describe("correlationId", () => {
  it("keeps a valid correlation ID unchanged", () => {
    expect(correlationId("Request-123-abc", generateId)).toBe("Request-123-abc");
  });

  it("keeps a single valid character unchanged", () => {
    expect(correlationId("A", generateId)).toBe("A");
  });

  it("keeps exactly 64 valid characters unchanged", () => {
    const value = "a".repeat(64);
    expect(correlationId(value, generateId)).toBe(value);
  });

  it("replaces an empty correlation ID", () => {
    expect(correlationId("", generateId)).toBe(generatedId);
  });

  it("replaces a missing correlation ID", () => {
    expect(correlationId(null, generateId)).toBe(generatedId);
  });

  it("replaces an overlong correlation ID", () => {
    expect(correlationId("a".repeat(66), generateId)).toBe(generatedId);
  });

  it("replaces exactly 65 valid characters", () => {
    expect(correlationId("a".repeat(65), generateId)).toBe(generatedId);
  });

  it("replaces a correlation ID containing special characters", () => {
    expect(correlationId("request_id!", generateId)).toBe(generatedId);
  });

  it("replaces a correlation ID containing a space", () => {
    expect(correlationId("request id", generateId)).toBe(generatedId);
  });

  it("replaces a correlation ID containing an underscore", () => {
    expect(correlationId("request_id", generateId)).toBe(generatedId);
  });

  it("replaces a correlation ID containing Unicode characters", () => {
    expect(correlationId("request-ä", generateId)).toBe(generatedId);
  });
});
