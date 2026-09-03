import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const sections = [
  {
    section_title: "Do's",
    content: `- Respect participants, mentors, judges, and volunteers.
- Maintain professional behaviour.
- Use resources responsibly.
- Keep the venue clean.
- Carry ID/registration proof.
- Report technical or safety issues.
- Follow venue and institutional policies.`,
  },
  {
    section_title: "Don'ts",
    content: `- No plagiarism.
- No unauthorized hacking.
- No illegal activities.
- No disturbances or excessive noise.
- No inappropriate behaviour or harassment.
- No property damage.
- No alcohol, tobacco, or prohibited substances.
- Do not leave without informing organizers. Log entry will be maintained.
- Do not violate safety/security instructions.`,
  },
  {
    section_title: "Additional Rules",
    content: `- Teams must consist only of registered members.
- No swapping of team members is allowed.
- All code must be developed during the event unless otherwise permitted.
- Prompts and project details must be submitted within 24 hours.
- Serious misconduct may be reported to the respective institution for disciplinary action.
- API Keys will be evaluated.
- Participants are not allowed to go out of the venue between 9 PM to 6 AM.

**Note:** If any rule is violated, the team will be disqualified from the hackathon immediately.`,
  },
  {
    section_title: "Requirements",
    content: `### Infrastructure Requirements
- Stable high-speed internet connectivity.
- Uninterrupted power supply and suitable backup arrangements.
- Projector/display screen for announcements and leaderboard display.

### Technical Requirements
- Network monitoring/support, if required.

### Human Resources
- Student Organizing Team.
- Technical Support Volunteers.

### Miscellaneous Requirements
- Drinking water and basic refreshments and goodies for the participants.`,
  },
];

let order = 1;
for (const s of sections) {
  const { error } = await supabase.from("rules").insert({ ...s, order_index: order++ });
  if (error) console.log(`✗ ${s.section_title}: ${error.message}`);
  else console.log(`✓ ${s.section_title}`);
}
