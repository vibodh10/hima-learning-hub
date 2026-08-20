export type Pathway =
  | "digital-support-security"
  | "digital-software-development"
  | "btec-national-diploma-it"
  | "btec-extended-diploma-it";

export type QualificationStatus = "achieved" | "awaiting" | "international" | "alternative_uk";
export type ResultStatus = "achieved" | "awaiting";

export type Qualification = {
  id: string;
  category: "english" | "maths" | "other" | "international";
  subject: string;
  qualificationType: string;
  grade: string;
  predictedGrade: string;
  resultStatus: ResultStatus;
  country: string;
  awardingBody: string;
};

export type Student = {
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  school: string;
  pathway: Pathway;
  qualificationStatus: QualificationStatus;
};

export type EligibilityStatus =
  | "eligible"
  | "provisionally_eligible"
  | "not_eligible"
  | "qualification_verification_required"
  | "entry_criteria_pending";

export type EligibilityDecision = { status: EligibilityStatus; reason: string; ruleUsed: string };

export const COURSE_LABELS: Record<Pathway, string> = {
  "digital-support-security": "T Level – Digital Support & Security",
  "digital-software-development": "T Level – Digital Software Development",
  "btec-national-diploma-it": "Level 3 – BTEC National Diploma in IT",
  "btec-extended-diploma-it": "Level 3 – BTEC National Extended Diploma in IT",
};

function gradeMeets(raw: string, threshold: number) {
  const value = raw.trim().toUpperCase();
  if (/^[1-9]$/.test(value)) return Number(value) >= threshold;
  const legacy: Record<string, number> = { "A*": 8, A: 7, B: 6, C: 4, D: 3, E: 2, F: 1, G: 1 };
  return (legacy[value] ?? 0) >= threshold;
}

function ageFromDob(dob: string) {
  if (!dob) return null;
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function completionPass(value: string) {
  return /pass|merit|distinction|complete|achieved|yes|level\s*2/i.test(value);
}

export function evaluateEligibility(student: Student, qualifications: Qualification[]): EligibilityDecision {
  const age = ageFromDob(student.dob);
  if (age === null) return { status: "entry_criteria_pending", reason: "A valid date of birth is required.", ruleUsed: "Age validation" };

  if (student.pathway === "digital-support-security" || student.pathway === "digital-software-development") {
    if (age < 16 || age > 18) return { status: "not_eligible", reason: `This T Level route is available to learners aged 16–18. Your recorded age is ${age}.`, ruleUsed: "T Level age 16–18" };
  } else if (age < 16) {
    return { status: "not_eligible", reason: `This Level 3 route is available from age 16. Your recorded age is ${age}.`, ruleUsed: "Level 3 age 16+" };
  }

  if (student.qualificationStatus === "international" || qualifications.some((q) => q.category === "international" || q.country.trim())) {
    return { status: "qualification_verification_required", reason: "Your qualifications may meet the course entry requirements, but their UK equivalence needs to be confirmed.", ruleUsed: "International qualification equivalence" };
  }

  const rows = qualifications.filter((q) => q.subject.trim() || q.qualificationType.trim());
  let confirmed3 = 0, effective3 = 0, confirmed4 = 0, effective4 = 0;
  let englishConfirmed4 = false, englishEffective4 = false, mathsConfirmed4 = false, mathsEffective4 = false;
  let hasPending = false;

  for (const row of rows) {
    const awaiting = row.resultStatus === "awaiting";
    if (awaiting) hasPending = true;
    const effective = awaiting ? row.predictedGrade : row.grade;
    if (!awaiting && gradeMeets(row.grade, 3)) confirmed3++;
    if (gradeMeets(effective, 3)) effective3++;
    if (!awaiting && gradeMeets(row.grade, 4)) confirmed4++;
    if (gradeMeets(effective, 4)) effective4++;
    const subject = row.subject.toLowerCase();
    if (row.category === "english" || subject.includes("english")) {
      if (!awaiting && gradeMeets(row.grade, 4)) englishConfirmed4 = true;
      if (gradeMeets(effective, 4)) englishEffective4 = true;
    }
    if (row.category === "maths" || subject.includes("math")) {
      if (!awaiting && gradeMeets(row.grade, 4)) mathsConfirmed4 = true;
      if (gradeMeets(effective, 4)) mathsEffective4 = true;
    }
  }

  if (student.pathway === "btec-national-diploma-it") {
    const altConfirmed = rows.find((q) => q.resultStatus === "achieved" && ((/functional skills level 2/i.test(q.qualificationType) && completionPass(q.grade)) || (/level 2 btec/i.test(q.qualificationType) && completionPass(q.grade)) || (/level 2 digital diploma/i.test(q.qualificationType) && completionPass(q.grade))));
    const altPredicted = rows.find((q) => q.resultStatus === "awaiting" && ((/functional skills level 2/i.test(q.qualificationType) && completionPass(q.predictedGrade)) || (/level 2 btec/i.test(q.qualificationType) && completionPass(q.predictedGrade)) || (/level 2 digital diploma/i.test(q.qualificationType) && completionPass(q.predictedGrade))));
    if (altConfirmed) return { status: "eligible", reason: "You meet the initial entry criteria for this course.", ruleUsed: "Accepted Level 2 route" };
    if (confirmed3 >= 4 && (englishConfirmed4 || mathsConfirmed4)) return { status: "eligible", reason: "You meet the initial entry criteria for this course.", ruleUsed: "Route A – GCSE route" };
    if (altPredicted || (effective3 >= 4 && (englishEffective4 || mathsEffective4))) return { status: "provisionally_eligible", reason: "Based on your predicted grades, you appear to meet the entry criteria. Final eligibility is subject to confirmation of your official results.", ruleUsed: altPredicted ? "Predicted Level 2 route" : "Route A – GCSE route" };
    if (hasPending) return { status: "entry_criteria_pending", reason: "Final eligibility cannot be confirmed until outstanding results are available.", ruleUsed: "BTEC Diploma routes" };
    return { status: "not_eligible", reason: effective3 < 4 ? `You currently have ${effective3} GCSEs at Grade 3 or above. The GCSE route requires 4, or you must meet one of the accepted Level 2 routes.` : "The GCSE route requires Grade 4 or above in either English or Maths, or completion of one of the accepted Level 2 routes.", ruleUsed: "BTEC Diploma routes" };
  }

  if (confirmed4 >= 4 && englishConfirmed4 && mathsConfirmed4) return { status: "eligible", reason: "You meet the initial entry criteria for this course.", ruleUsed: student.pathway === "btec-extended-diploma-it" ? "Extended Diploma GCSE route" : "T Level GCSE route" };
  if (effective4 >= 4 && englishEffective4 && mathsEffective4) return { status: "provisionally_eligible", reason: "Based on your predicted grades, you appear to meet the entry criteria. Final eligibility is subject to confirmation of your official results.", ruleUsed: student.pathway === "btec-extended-diploma-it" ? "Extended Diploma GCSE route" : "T Level GCSE route" };
  if (hasPending) return { status: "entry_criteria_pending", reason: "Final eligibility cannot be confirmed until outstanding results are available.", ruleUsed: "GCSE route" };
  if (effective4 < 4) return { status: "not_eligible", reason: `You currently have ${effective4} GCSEs at Grade 4 or above. This course requires 4.`, ruleUsed: "GCSE route" };
  if (!englishEffective4 && !mathsEffective4) return { status: "not_eligible", reason: "This course requires Grade 4 or above in both English and Maths.", ruleUsed: "GCSE route" };
  if (!englishEffective4) return { status: "not_eligible", reason: "This course requires Grade 4 or above in English.", ruleUsed: "GCSE route" };
  return { status: "not_eligible", reason: "This course requires Grade 4 or above in Maths.", ruleUsed: "GCSE route" };
}
