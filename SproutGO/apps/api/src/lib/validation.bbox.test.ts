import { describe, it, expect } from "vitest";
import { parseBbox } from "./validation";

// parseBbox turns a `bbox=minLng,minLat,maxLng,maxLat` query string into validated
// numbers, or null on any malformed/out-of-range input so the route can 400
// (API_CONTRACT §observations, input hardening). It must never throw.

describe("parseBbox", () => {
  it("returns the parsed object for a valid bbox string", () => {
    expect(parseBbox("-74.1,40.6,-73.9,40.8")).toEqual({
      minLng: -74.1,
      minLat: 40.6,
      maxLng: -73.9,
      maxLat: 40.8,
    });
  });

  it("accepts the full-globe extent at the range boundaries", () => {
    expect(parseBbox("-180,-90,180,90")).toEqual({
      minLng: -180,
      minLat: -90,
      maxLng: 180,
      maxLat: 90,
    });
  });

  it("returns null for null input", () => {
    expect(parseBbox(null)).toBeNull();
  });

  it("returns null for wrong arity (3 or 5 parts)", () => {
    expect(parseBbox("-74.1,40.6,-73.9")).toBeNull();
    expect(parseBbox("-74.1,40.6,-73.9,40.8,1")).toBeNull();
    expect(parseBbox("")).toBeNull();
  });

  it("returns null for non-numeric parts", () => {
    expect(parseBbox("-74.1,40.6,foo,40.8")).toBeNull();
    expect(parseBbox("a,b,c,d")).toBeNull();
  });

  it("returns null for out-of-range latitude/longitude", () => {
    expect(parseBbox("-181,40.6,-73.9,40.8")).toBeNull(); // minLng < -180
    expect(parseBbox("-74.1,-91,-73.9,40.8")).toBeNull(); // minLat < -90
    expect(parseBbox("-74.1,40.6,181,40.8")).toBeNull(); // maxLng > 180
    expect(parseBbox("-74.1,40.6,-73.9,91")).toBeNull(); // maxLat > 90
  });

  it("returns null for an inverted box (min > max)", () => {
    expect(parseBbox("10,40.6,-10,40.8")).toBeNull(); // minLng > maxLng
    expect(parseBbox("-74.1,41,-73.9,40")).toBeNull(); // minLat > maxLat
  });
});
