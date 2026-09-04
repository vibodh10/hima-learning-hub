import { describe, expect, it } from "vitest";
import { selectTeacherNextAction } from "./teacher-next-action";

const readyClass = {
  id: "class-1",
  name: "Group 1",
  published: true,
  activeUnitCount: 2,
  studentCount: 12,
  pendingInvitationCount: 0,
};

describe("selectTeacherNextAction", () => {
  it("starts a new teacher with group creation", () => {
    expect(selectTeacherNextAction({ classes: [], attention: [] })).toMatchObject({
      kind: "create_group", href: "#groups",
    });
  });

  it("does not ask an ordinary teacher to create or configure groups", () => {
    expect(selectTeacherNextAction({ classes: [], attention: [], canManageGroupSetup: false })).toMatchObject({
      kind: "await_group", href: "#groups",
    });
    expect(selectTeacherNextAction({
      classes: [{ ...readyClass, activeUnitCount: 0, published: false, studentCount: 0 }],
      attention: [],
      canManageGroupSetup: false,
    })).toMatchObject({ kind: "await_group", title: "Group 1 is being prepared" });
  });

  it("requires units before publication or invitation", () => {
    const action = selectTeacherNextAction({
      classes: [{ ...readyClass, activeUnitCount: 0, published: false, studentCount: 0 }],
      attention: [],
    });
    expect(action).toMatchObject({ kind: "choose_units", href: "/teacher/classes/class-1#unit-settings" });
  });

  it("requires selected units to be published before invitation", () => {
    const action = selectTeacherNextAction({
      classes: [{ ...readyClass, published: false, studentCount: 0 }],
      attention: [],
    });
    expect(action).toMatchObject({ kind: "publish_units" });
  });

  it("opens controlled student registration only after units are selected and published", () => {
    const action = selectTeacherNextAction({
      classes: [{ ...readyClass, studentCount: 0 }],
      attention: [],
    });
    expect(action).toMatchObject({
      kind: "invite_students",
      title: "Add students to Group 1",
      href: "/teacher/classes/class-1#registration-link",
      label: "Open student registration",
    });
  });

  it("tracks sent invitations instead of asking the teacher to resend them", () => {
    const action = selectTeacherNextAction({
      classes: [{ ...readyClass, studentCount: 0, pendingInvitationCount: 3 }],
      attention: [],
    });
    expect(action).toMatchObject({
      kind: "track_invitations", href: "/teacher/classes/class-1#invitation-status", meta: "3 awaiting response",
    });
  });

  it("puts a genuine learner need before unfinished setup in another group", () => {
    const action = selectTeacherNextAction({
      classes: [readyClass, { ...readyClass, id: "draft", name: "Draft", activeUnitCount: 0, studentCount: 0 }],
      attention: [{ learnerId: "learner-1", displayName: "Alex", status: "intervention_required", reason: "Repeated unsuccessful attempts." }],
    });
    expect(action).toMatchObject({
      kind: "attention", title: "Review Alex", href: "/teacher/learners/learner-1",
    });
  });

  it("puts intervention before lower-priority attention signals", () => {
    const action = selectTeacherNextAction({
      classes: [readyClass],
      attention: [
        { learnerId: "catch-up", displayName: "Casey", status: "catch_up_required", reason: "Missed learning." },
        { learnerId: "intervention", displayName: "Jordan", status: "intervention_required", reason: "Repeated unsuccessful attempts." },
      ],
    });
    expect(action).toMatchObject({ kind: "attention", href: "/teacher/learners/intervention" });
  });

  it("opens the largest active group when no learner needs attention", () => {
    const action = selectTeacherNextAction({
      classes: [readyClass, { ...readyClass, id: "class-2", name: "Group 2", studentCount: 18 }],
      attention: [{ learnerId: "learner-1", displayName: "Alex", status: "on_track", reason: "On track." }],
    });
    expect(action).toMatchObject({ kind: "monitor", href: "/teacher/classes/class-2", meta: "18 learners" });
  });
});
