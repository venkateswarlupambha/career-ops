const ACTION_VERBS = [
  "provided", "administered", "managed", "resolved", "diagnosed", "troubleshot",
  "engineered", "built", "developed", "logged", "escalated", "authored",
  "implemented", "configured", "deployed", "monitored", "automated", "supported",
  "maintained", "designed", "created", "evaluated", "verified", "conducted",
  "analyzed", "reduced", "improved", "delivered", "coordinated", "collaborated",
];

const TECHNICAL_KEYWORDS = [
  "active directory", "rbac", "jira", "helpdesk", "1st line", "2nd line", "it support",
  "tcp/ip", "dns", "dhcp", "wireshark", "windows", "ubuntu", "linux", "virtualbox",
  "systemd", "azure", "python", "bash", "powershell", "hardware", "software", "network",
  "ssh", "http", "https", "firewall", "ufw", "password reset", "user provisioning", "sla",
  "sop", "ping", "traceroute", "remote desktop", "rdp", "mysql", "api",
];

const ROLE_TERMS = Object.freeze({
  itSupport: ["active directory", "jira", "hardware", "software", "troubleshooting", "helpdesk", "1st line", "password reset"],
  helpdesk: ["helpdesk", "jira", "sla", "sop", "ticket", "user provisioning", "remote desktop", "rdp"],
  sysAdmin: ["linux", "ubuntu", "systemd", "windows", "tcp/ip", "dns", "dhcp", "virtualbox", "wireshark"],
  cloudSupport: ["azure", "python", "bash", "virtualbox", "api", "rbac"],
});

function ratioScore(text, terms) {
  const matched = terms.filter((term) => text.includes(term));
  return { score: Math.round((matched.length / terms.length) * 100), matched };
}

/**
 * Evaluate Markdown using local parsing heuristics only.
 * This is not verification by an external ATS product.
 * @param {string} markdown
 * @returns {object}
 */
export function evaluateCvAts(markdown) {
  const rawText = String(markdown ?? "");
  const text = rawText.toLowerCase();
  const suggestions = [];
  const hasSummary = /##\s*(professional\s+summary|summary|profile|about)/i.test(rawText);
  const hasSkills = /##\s*(core\s+skills|skills|competencies|technical\s+skills)/i.test(rawText);
  const hasExperience = /##\s*(professional\s+experience|work\s+experience|experience|employment)/i.test(rawText);
  const hasEducation = /##\s*(education|academic|qualifications)/i.test(rawText);
  const hasProjectsOrCerts = /##\s*(projects|certifications|achievements|awards)/i.test(rawText);

  const structureScore = [hasSummary, hasSkills, hasExperience, hasEducation, hasProjectsOrCerts]
    .reduce((score, present) => score + (present ? 4 : 0), 0);
  if (!hasSummary) suggestions.push("Add a clear summary section.");
  if (!hasSkills) suggestions.push("Add a skills section.");
  if (!hasExperience) suggestions.push("Add an experience section.");
  if (!hasEducation) suggestions.push("Add an education section.");

  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(rawText);
  const hasPhone = /\+?[0-9][0-9\s().-]{8,}/.test(rawText);
  const hasLinkedIn = /linkedin\.com/i.test(rawText);
  const hasWorkRights = /right to work|work authorization|work authorisation|visa|sponsorship/i.test(rawText);
  const contactScore = (hasEmail ? 3 : 0) + (hasPhone ? 3 : 0) + (hasLinkedIn ? 3 : 0) + (hasWorkRights ? 3 : 0);
  if (!hasEmail) suggestions.push("Include a clear email address.");
  if (!hasPhone) suggestions.push("Include a reachable phone number.");

  const detectedKeywords = TECHNICAL_KEYWORDS.filter((keyword) => text.includes(keyword));
  const keywordScore = Math.min(25, Math.round((detectedKeywords.length / 16) * 25));
  const detectedActionVerbs = ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(rawText));
  const actionVerbsScore = Math.min(20, Math.round((detectedActionVerbs.length / 10) * 20));
  const metricsScore = (/%\s*|\bpercent\b/i.test(rawText) ? 4 : 0)
    + (/\b\d{2,}\b|\b\d+\s*(?:tickets|users|staff|devices|hours|days|reduction|participants|out of)\b/i.test(rawText) ? 3 : 0)
    + (/\b(?:distinction|award|ranked|first-class)\b/i.test(rawText) ? 3 : 0);
  if (metricsScore < 7) suggestions.push("Add more quantified metrics.");

  let layoutScore = 10;
  if (rawText.includes("<table") && !rawText.includes("###")) layoutScore -= 3;
  if (rawText.length < 500) {
    layoutScore -= 4;
    suggestions.push("Expand CV content with more detailed bullet points.");
  }

  const totalScore = Math.min(100, Math.max(0, structureScore + contactScore + keywordScore + actionVerbsScore + metricsScore + layoutScore));
  const roleMatches = Object.fromEntries(Object.entries(ROLE_TERMS).map(([role, terms]) => [role, ratioScore(text, terms).score]));

  return {
    methodology: "local-markdown-heuristic",
    externallyVerified: false,
    totalScore,
    breakdown: {
      structure: { score: structureScore, max: 20, passed: structureScore >= 16 },
      contact: { score: contactScore, max: 12, passed: contactScore >= 9 },
      keywords: { score: keywordScore, max: 25, passed: keywordScore >= 20, count: detectedKeywords.length },
      actionVerbs: { score: actionVerbsScore, max: 20, passed: actionVerbsScore >= 16, count: detectedActionVerbs.length },
      metrics: { score: metricsScore, max: 10, passed: metricsScore >= 7 },
      layout: { score: layoutScore, max: 10, passed: layoutScore >= 8 },
    },
    roleMatches,
    detectedKeywords: detectedKeywords.slice(0, 15),
    detectedActionVerbs: detectedActionVerbs.slice(0, 12),
    suggestions,
  };
}
