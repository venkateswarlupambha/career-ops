import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCvAts } from "../../../src/lib/core/ats-audit.mjs";

test("ATS audit identifies itself as a local heuristic", () => {
  const result = evaluateCvAts("# CV\n\n## Summary\nEngineer");
  assert.equal(result.methodology, "local-markdown-heuristic");
  assert.equal(result.externallyVerified, false);
});

test("empty CVs do not receive fabricated role-match baselines", () => {
  const result = evaluateCvAts("");
  assert.deepEqual(result.roleMatches, {
    itSupport: 0,
    helpdesk: 0,
    sysAdmin: 0,
    cloudSupport: 0,
  });
});

test("role matches are derived from matched terms", () => {
  const result = evaluateCvAts("Active Directory, Jira, helpdesk and password reset");
  assert.equal(result.roleMatches.itSupport, 50);
  assert.equal(result.roleMatches.helpdesk, 25);
  assert.equal(result.roleMatches.sysAdmin, 0);
  assert.equal(result.roleMatches.cloudSupport, 0);
});

test("location scoring is not tied to UK-specific terms", () => {
  const result = evaluateCvAts("## Experience\nEmail: person@example.com\n+1 555 555 5555\nLinkedIn: linkedin.com/in/person");
  assert.equal(result.breakdown.contact.score, 9);
  assert.equal(result.breakdown.contact.passed, true);
});
