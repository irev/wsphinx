import { describe, it, expect } from "vitest";
import { maskPhone, maskInApi, maskApiArray } from "../src/lib/utils/mask.js";

describe("maskPhone", () => {
  it("masks all but last 4 digits", () => {
    // "6281111111113" length = 13, so 9 asterisks + "1113"
    expect(maskPhone("6281111111113")).toBe("*********1113");
  });

  it("masks shorter numbers correctly", () => {
    // "08987654321" length = 11, so 7 asterisks + "4321"
    expect(maskPhone("08987654321")).toBe("*******4321");
  });

  it("returns as-is for 4 or fewer chars", () => {
    expect(maskPhone("1234")).toBe("1234");
    expect(maskPhone("abc")).toBe("abc");
  });

  it("handles null and undefined", () => {
    expect(maskPhone(null)).toBe("");
    expect(maskPhone(undefined)).toBe("");
  });

  it("handles empty string", () => {
    expect(maskPhone("")).toBe("");
  });
});

describe("maskInApi", () => {
  it("masks specified phone fields", () => {
    const result = maskInApi({ phone: "6281111111113", name: "Budi" }, ["phone"]);
    expect(result.phone).toBe("*********1113");
    expect(result.name).toBe("Budi");
  });

  it("masks multiple fields", () => {
    const result = maskInApi(
      { phone: "6281111111113", secondaryPhone: "6281234567890", name: "Budi" },
      ["phone", "secondaryPhone"]
    );
    // "6281234567890" length = 13, so 9 asterisks + "7890"
    expect(result.phone).toBe("*********1113");
    expect(result.secondaryPhone).toBe("*********7890");
  });

  it("skips non-string fields", () => {
    const result = maskInApi({ phone: 12345 as unknown as string, name: "Test" }, ["phone"]);
    expect(result.phone).toBe(12345);
  });

  it("handles empty fields array", () => {
    const obj = { phone: "6281111111113" };
    const result = maskInApi(obj, []);
    expect(result.phone).toBe("6281111111113");
  });

  it("does not mutate original", () => {
    const original = { phone: "6281111111113" };
    const result = maskInApi(original, ["phone"]);
    expect(result.phone).toBe("*********1113");
    expect(original.phone).toBe("6281111111113");
  });
});

describe("maskApiArray", () => {
  it("masks field in every item", () => {
    const arr = [
      { phone: "6281111111113", name: "A" },
      { phone: "6281234567890", name: "B" },
    ];
    const result = maskApiArray(arr, ["phone"]);
    expect(result[0].phone).toBe("*********1113");
    expect(result[1].phone).toBe("*********7890");
  });

  it("returns empty array for empty input", () => {
    expect(maskApiArray([], ["phone"])).toEqual([]);
  });
});
