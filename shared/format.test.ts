import { describe, it, expect } from "vitest";
import { isValidSlug, slugify, formatTimeAgo, obfuscate, pickRegion } from "./format";

describe("format", () => {
  describe("isValidSlug", () => {
    it("accepts valid slugs", () => {
      expect(isValidSlug("my-app")).toBe(true);
      expect(isValidSlug("test123")).toBe(true);
      expect(isValidSlug("a-b-c")).toBe(true);
      expect(isValidSlug("app")).toBe(true);
    });

    it("rejects invalid slugs", () => {
      expect(isValidSlug("My_App")).toBe(false);
      expect(isValidSlug("app.test")).toBe(false);
      expect(isValidSlug("app!")).toBe(false);
      expect(isValidSlug("")).toBe(false);
      expect(isValidSlug("a".repeat(49))).toBe(false); // too long
      expect(isValidSlug("a")).toBe(false); // too short
    });
  });

  describe("slugify", () => {
    it("converts to lowercase and replaces spaces with dashes", () => {
      expect(slugify("My App")).toBe("my-app");
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("removes special characters", () => {
      expect(slugify("App!@#$")).toBe("app");
      expect(slugify("test_app")).toBe("test-app");
    });

    it("handles multiple spaces", () => {
      expect(slugify("My  App")).toBe("my-app");
    });
  });

  describe("formatTimeAgo", () => {
    it("formats recent times", () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      expect(formatTimeAgo(oneMinuteAgo.toISOString())).toMatch(/m ago/);
    });

    it("formats older times", () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      expect(formatTimeAgo(oneHourAgo.toISOString())).toMatch(/h ago/);
    });
  });

  describe("obfuscate", () => {
    it("produces different output for same input with different keys", () => {
      const value = "secret";
      const key1 = "app1-user1";
      const key2 = "app2-user2";
      expect(obfuscate(value, key1)).not.toBe(obfuscate(value, key2));
    });

    it("produces same output for same input and key", () => {
      const value = "secret";
      const key = "app1-user1";
      expect(obfuscate(value, key)).toBe(obfuscate(value, key));
    });
  });

  describe("pickRegion", () => {
    it("returns a valid region", () => {
      expect(pickRegion("my-app")).toMatch(/^[a-z]+-[a-z]+-\d+$/);
    });

    it("is deterministic for same slug", () => {
      expect(pickRegion("my-app")).toBe(pickRegion("my-app"));
    });
  });
});
