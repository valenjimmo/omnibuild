export type Row = { id: string; organization_id: string; [key: string]: any };
export type Dataset = {
  organizations: Row[];
  memberships: Row[];
  clients: Row[];
  projects: Row[];
  milestones: Row[];
  updates: Row[];
  documents: Row[];
  messages: Row[];
  templates: Row[];
};
export type Table = keyof Dataset;
export const emptyData: Dataset = {
  organizations: [],
  memberships: [],
  clients: [],
  projects: [],
  milestones: [],
  updates: [],
  documents: [],
  messages: [],
  templates: [],
};
export const DEMO_ORG = "11111111-1111-4111-8111-111111111111";
const org = DEMO_ORG;
export function demoData(): Dataset {
  return {
    organizations: [
      {
        id: org,
        organization_id: org,
        name: "Westwood ADU",
        slug: "westwood-adu",
        contact_email: "owner@westwood.example",
        website_url: "",
        whatsapp_number: "",
      },
    ],
    memberships: [
      {
        id: "membership",
        organization_id: org,
        user_id: "demo-owner",
        role: "owner",
      },
    ],
    clients: [
      {
        id: "c1",
        organization_id: org,
        name: "Sarah & James Miller",
        email: "sarah@example.com",
        phone: "(415) 555-0128",
        archived: false,
      },
      {
        id: "c2",
        organization_id: org,
        name: "David Chen",
        email: "david@example.com",
        phone: "(415) 555-0194",
        archived: false,
      },
      {
        id: "c3",
        organization_id: org,
        name: "Olivia Martinez",
        email: "olivia@example.com",
        phone: "(510) 555-0143",
        archived: false,
      },
      {
        id: "c4",
        organization_id: org,
        name: "Robert & Emma Wilson",
        email: "emma@example.com",
        phone: "(650) 555-0112",
        archived: false,
      },
    ],
    projects: [
      {
        id: "p1",
        organization_id: org,
        client_id: "c1",
        name: "The Miller Backyard Retreat",
        address: "1842 Oak Street, Berkeley, CA",
        description:
          "A thoughtfully designed 650 sq ft backyard home with one bedroom, open living, and a private garden patio.",
        status: "In progress",
        due_date: "2026-11-20",
        style: 0,
      },
      {
        id: "p2",
        organization_id: org,
        client_id: "c2",
        name: "Chen Garden Studio",
        address: "725 Maple Avenue, Oakland, CA",
        description:
          "A light-filled 480 sq ft garden studio, built for work and weekend guests.",
        status: "Permitting",
        due_date: "2027-01-15",
        style: 1,
      },
      {
        id: "p3",
        organization_id: org,
        client_id: "c3",
        name: "Martinez Guest House",
        address: "310 Elm Court, Alameda, CA",
        description:
          "A welcoming two-bedroom guest house that brings family closer.",
        status: "Planning",
        due_date: "2027-02-28",
        style: 2,
      },
      {
        id: "p4",
        organization_id: org,
        client_id: "c4",
        name: "Wilson In-Law Suite",
        address: "96 Laurel Drive, Walnut Creek, CA",
        description:
          "Comfortable independent living with accessible details and a generous front porch.",
        status: "Completed",
        due_date: "2026-09-04",
        style: 3,
      },
    ],
    milestones: [
      ...[
        "Design approved",
        "Permits secured",
        "Foundation complete",
        "Framing & roofing",
        "Interior finishes",
        "Final walkthrough",
      ].map((title, i) => ({
        id: "m" + i,
        organization_id: org,
        project_id: "p1",
        title,
        completed: i < 3,
        due_date: [
          "2026-06-12",
          "2026-07-08",
          "2026-08-21",
          "2026-09-25",
          "2026-10-30",
          "2026-11-20",
        ][i],
      })),
      {
        id: "m8",
        organization_id: org,
        project_id: "p2",
        title: "Submit building permit",
        completed: true,
        due_date: "2026-09-08",
      },
      {
        id: "m9",
        organization_id: org,
        project_id: "p2",
        title: "Permit approval",
        completed: false,
        due_date: "2026-09-18",
      },
      {
        id: "m10",
        organization_id: org,
        project_id: "p3",
        title: "Design consultation",
        completed: false,
        due_date: "2026-09-14",
      },
      {
        id: "m11",
        organization_id: org,
        project_id: "p4",
        title: "Final walkthrough",
        completed: true,
        due_date: "2026-09-04",
      },
    ],
    updates: [
      {
        id: "u1",
        organization_id: org,
        project_id: "p1",
        title: "The framing is taking shape",
        body: "Exterior wall framing is complete! Next up: roof trusses and sheathing. We are right on track for our next milestone.",
        client_visible: true,
        created_at: "2026-09-10T08:30:00Z",
      },
      {
        id: "u2",
        organization_id: org,
        project_id: "p2",
        title: "Permit application submitted",
        body: "The full plan set is with the city for review. We will keep you posted as soon as we hear back.",
        client_visible: true,
        created_at: "2026-09-09T15:00:00Z",
      },
      {
        id: "u3",
        organization_id: org,
        project_id: "p1",
        title: "Crew coordination",
        body: "Confirm delivery window with the framing crew before Friday.",
        client_visible: false,
        created_at: "2026-09-09T09:00:00Z",
      },
    ],
    documents: [],
    messages: [
      {
        id: "msg1",
        organization_id: org,
        project_id: "p1",
        sender_id: "demo-client",
        body: "The progress looks amazing! Would it be possible to stop by the site this Friday?",
        responses: [],
        created_at: "2026-09-10T09:12:00Z",
      },
      {
        id: "msg2",
        organization_id: org,
        project_id: "p2",
        sender_id: "demo-client",
        body: "Thanks for the update. Looking forward to the next steps!",
        responses: [],
        created_at: "2026-09-09T16:30:00Z",
      },
    ],
    templates: [
      {
        id: "t1",
        organization_id: org,
        title: "Schedule a site visit",
        body: "We would love to walk you through the progress. Does this Friday at 10 am work for a site visit?",
        responses: ["Yes, that works!", "Could we find another time?"],
      },
      {
        id: "t2",
        organization_id: org,
        title: "Milestone complete",
        body: "Great news! We have completed the next milestone on your project. Take a look at the latest update in your portal.",
        responses: ["Looks great, thank you!", "I have a question"],
      },
      {
        id: "t3",
        organization_id: org,
        title: "Selection reminder",
        body: "We are ready for your finish selections. Please review the options and let us know your preference.",
        responses: ["I am ready to choose", "I need a little more time"],
      },
    ],
  };
}
