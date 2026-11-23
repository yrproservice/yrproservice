import test from "node:test";
import assert from "node:assert/strict";
import { teamCmsTemplate, getTeamCmsContent } from "../src/data/teamCmsTemplate.js";

test("Team template does not publish a stock or unverified hero photograph", () => {
  const hero = teamCmsTemplate.sections[0].content.hero;
  assert.equal(hero.imageUrl, "");
  assert.equal(hero.imageApproved, false);
  assert.equal(hero.approvedImageUrl, "");
});

test("legacy Team hero photos remain unapproved until the exact image is reviewed", () => {
  const content = getTeamCmsContent({
    sections: [{
      type: "team-page",
      content: { hero: { imageUrl: "/assets/about-team.jpg" } },
    }],
  });
  assert.equal(content.hero.imageUrl, "/assets/about-team.jpg");
  assert.equal(content.hero.imageApproved, false);
  assert.equal(content.hero.approvedImageUrl, "");
});

test("Team role cards remain hidden until their exact images are approved", () => {
  const people = teamCmsTemplate.sections[0].content.people.items;
  assert.equal(people.length, 4);
  assert.ok(people.every((item) => item.approvedForPublication === false));
  assert.ok(people.every((item) => item.approvedImageUrl === ""));
});
