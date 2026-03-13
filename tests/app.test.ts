import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("App", () => {
  it("GET / returns hello message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Hello from the backend!" });
  });
});
