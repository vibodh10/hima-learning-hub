import "server-only";

export type Difficulty = "easy" | "medium" | "hard";

export type Question = { id: string; pathway: string; category: string; difficulty: Difficulty; question: string; options: string[]; correct: number; explanation: string; };

export const QUESTION_BANK: Question[] = [
  {
    "id": "DSS-001",
    "pathway": "digital-support-security",
    "category": "Troubleshooting",
    "difficulty": "easy",
    "question": "A user can open files on their laptop but cannot reach any websites. Other staff on the same network are online. What is the best first check?",
    "options": [
      "Replace the laptop battery",
      "Check the laptop’s network connection and airplane mode",
      "Reset every office password",
      "Reinstall the operating system"
    ],
    "correct": 1,
    "explanation": "The symptoms point to a local connectivity issue, so checking the device connection is the quickest proportionate first step.",
    
  },
  {
    "id": "DSS-002",
    "pathway": "digital-support-security",
    "category": "Authentication",
    "difficulty": "easy",
    "question": "A service contains sensitive staff records and currently uses passwords only. Which change most directly reduces the risk from a stolen password?",
    "options": [
      "Require a longer username",
      "Rename the login page",
      "Enable multi-factor authentication",
      "Hide the service shortcut"
    ],
    "correct": 2,
    "explanation": "Multi-factor authentication requires another proof of identity, so a stolen password alone is insufficient.",
    
  },
  {
    "id": "DSS-003",
    "pathway": "digital-support-security",
    "category": "User support",
    "difficulty": "easy",
    "question": "A caller asks the help desk to reset a colleague’s password because the colleague is busy. What should the technician do?",
    "options": [
      "Follow the identity-verification and authorisation process before any reset",
      "Reset it and tell the caller the new password",
      "Ask the caller to guess the old password",
      "Disable password expiry for the account"
    ],
    "correct": 0,
    "explanation": "Password resets require verified identity and authority; urgency does not justify bypassing the process.",
    
  },
  {
    "id": "DSS-004",
    "pathway": "digital-support-security",
    "category": "Data protection",
    "difficulty": "easy",
    "question": "A spreadsheet containing learner addresses must be sent to an authorised manager. Which option is most appropriate?",
    "options": [
      "Post it in a public team channel",
      "Send it from a personal email account",
      "Remove the filename so it is less noticeable",
      "Use the organisation’s approved protected sharing method and limit access"
    ],
    "correct": 3,
    "explanation": "Approved protected sharing with restricted access reduces disclosure risk and supports accountability.",
    
  },
  {
    "id": "DSS-005",
    "pathway": "digital-support-security",
    "category": "Networking",
    "difficulty": "easy",
    "question": "One network printer shows “offline” for every user, while internet access still works. Which observation would be most useful first?",
    "options": [
      "Whether the printer has power and a network connection",
      "The colour of the printer case",
      "How many browser tabs users have open",
      "Whether staff changed their email signatures"
    ],
    "correct": 0,
    "explanation": "A shared device failure calls for checking the device and its network link before changing individual computers.",
    
  },
  {
    "id": "DSS-006",
    "pathway": "digital-support-security",
    "category": "Incident response",
    "difficulty": "medium",
    "question": "A staff computer became very slow immediately after an unexpected attachment was opened, and unfamiliar processes appeared. What should support do first?",
    "options": [
      "Continue using it to collect more symptoms",
      "Disconnect it from the network and begin the incident process",
      "Delete random files until it speeds up",
      "Email the attachment to another computer for testing"
    ],
    "correct": 1,
    "explanation": "Isolation limits possible spread or data loss while preserving the system for controlled investigation.",
    
  },
  {
    "id": "DSS-007",
    "pathway": "digital-support-security",
    "category": "Phishing",
    "difficulty": "medium",
    "question": "An email that appears to be from payroll asks an employee to sign in through a new link. The domain contains one substituted letter. What is the safest response?",
    "options": [
      "Reply asking whether the message is genuine",
      "Open the link in a private browser window",
      "Report it through the phishing process and contact payroll through a known channel",
      "Forward it to all colleagues as a warning"
    ],
    "correct": 2,
    "explanation": "The altered domain is a strong phishing sign; reporting and independent verification avoid interacting with the attacker.",
    
  },
  {
    "id": "DSS-008",
    "pathway": "digital-support-security",
    "category": "Access control",
    "difficulty": "medium",
    "question": "A temporary contractor needs to read project documents for two weeks but must not edit or see other departments’ files. Which account setup is best?",
    "options": [
      "A time-limited account with read-only access to the project folder",
      "A shared administrator account",
      "A permanent standard account with access to all folders",
      "The project manager’s account credentials"
    ],
    "correct": 0,
    "explanation": "Least privilege, a limited scope and an expiry date match the contractor’s actual need.",
    
  },
  {
    "id": "DSS-009",
    "pathway": "digital-support-security",
    "category": "Troubleshooting",
    "difficulty": "medium",
    "question": "After a software update, one application closes at startup for every user, while other applications work. What is the most useful next action?",
    "options": [
      "Replace all monitors",
      "Check the application logs and update compatibility information",
      "Reset the building router",
      "Create new email accounts"
    ],
    "correct": 1,
    "explanation": "A shared failure beginning after an update points to application compatibility or configuration, which logs can confirm.",
    
  },
  {
    "id": "DSS-010",
    "pathway": "digital-support-security",
    "category": "Networking",
    "difficulty": "medium",
    "question": "A desktop shows a valid Wi-Fi connection but receives an address beginning 169.254 and cannot access internal services. What is the most likely area to investigate?",
    "options": [
      "Screen resolution settings",
      "The user’s keyboard layout",
      "DHCP address assignment or the path to the DHCP service",
      "The web browser home page"
    ],
    "correct": 2,
    "explanation": "A 169.254 address usually indicates that the device did not receive a usable address from DHCP.",
    
  },
  {
    "id": "DSS-011",
    "pathway": "digital-support-security",
    "category": "Backups",
    "difficulty": "medium",
    "question": "A team discovers that a shared document was overwritten yesterday. Which action best tests whether the backup process is useful?",
    "options": [
      "Confirm that backup software is installed",
      "Check that a backup icon is green",
      "Buy a larger storage device",
      "Restore the required version to a safe location and verify it opens"
    ],
    "correct": 3,
    "explanation": "A successful, verified restore demonstrates recoverability; a backup status alone does not.",
    
  },
  {
    "id": "DSS-012",
    "pathway": "digital-support-security",
    "category": "Security judgement",
    "difficulty": "medium",
    "question": "A public-facing server has a critical security update, but installing it requires a restart. What is the best approach?",
    "options": [
      "Ignore the update because restarts are inconvenient",
      "Assess urgency, test where possible, schedule controlled downtime, patch, and verify service",
      "Install unrelated software first",
      "Wait until an attacker is detected"
    ],
    "correct": 1,
    "explanation": "A controlled, risk-based patch process balances vulnerability exposure with service availability.",
    
  },
  {
    "id": "DSS-013",
    "pathway": "digital-support-security",
    "category": "User support",
    "difficulty": "medium",
    "question": "A user says, “The internet is broken.” Which question best narrows the fault without assuming a cause?",
    "options": [
      "Why did you break it?",
      "Have you tried buying a new laptop?",
      "Which services fail, and do they fail on another device or connection?",
      "What is your favourite browser?"
    ],
    "correct": 2,
    "explanation": "Testing scope across services, devices and connections distinguishes a device, application, network or wider outage.",
    
  },
  {
    "id": "DSS-014",
    "pathway": "digital-support-security",
    "category": "Data protection",
    "difficulty": "medium",
    "question": "A staff member accidentally emails a learner report to the wrong external recipient. What should happen first?",
    "options": [
      "Follow the data-breach process immediately and report the facts to the responsible team",
      "Delete the sent email and say nothing",
      "Send more learner data so the first email looks incomplete",
      "Wait a week to see whether anyone complains"
    ],
    "correct": 0,
    "explanation": "Prompt reporting enables containment, risk assessment and any required notification.",
    
  },
  {
    "id": "DSS-015",
    "pathway": "digital-support-security",
    "category": "Authentication",
    "difficulty": "medium",
    "question": "Several failed logins are followed by a successful login from an unfamiliar country minutes later. What is the most appropriate immediate response?",
    "options": [
      "Assume the user is travelling",
      "Increase the monitor brightness",
      "Publish the username so colleagues can check it",
      "Secure the account, revoke active sessions, and investigate the event"
    ],
    "correct": 3,
    "explanation": "The pattern suggests account compromise; containment should precede broader investigation.",
    
  },
  {
    "id": "DSS-016",
    "pathway": "digital-support-security",
    "category": "System diagnosis",
    "difficulty": "medium",
    "question": "A laptop overheats and shuts down only during video calls. Its vents are blocked by dust and CPU use is high during calls. Which action best addresses the evidence?",
    "options": [
      "Clean the vents safely, confirm cooling operation, and retest under load",
      "Change the desktop wallpaper",
      "Disable all user passwords",
      "Replace the office network switch"
    ],
    "correct": 0,
    "explanation": "The shutdown correlates with load and restricted cooling, so cooling maintenance and a controlled retest target the likely cause.",
    
  },
  {
    "id": "DSS-017",
    "pathway": "digital-support-security",
    "category": "Malware prevention",
    "difficulty": "medium",
    "question": "A legitimate document uses macros, but macros are blocked by policy. A user asks support to enable all macros permanently. What is the best response?",
    "options": [
      "Enable every macro for every user",
      "Verify the business need and source, then use the approved restricted exception if justified",
      "Rename the file extension",
      "Turn off antivirus while the document is open"
    ],
    "correct": 1,
    "explanation": "A narrowly controlled exception preserves protection while addressing a verified business requirement.",
    
  },
  {
    "id": "DSS-018",
    "pathway": "digital-support-security",
    "category": "Incident response",
    "difficulty": "hard",
    "question": "Monitoring shows one workstation sending large encrypted uploads at 02:00. The user normally works daytime and denies starting them. What sequence is best?",
    "options": [
      "Delete the monitoring logs, then ask the user again",
      "Publicly accuse the user, then switch off every server",
      "Contain the workstation, preserve relevant evidence, assess account activity, and follow escalation procedures",
      "Wait for the upload to finish before recording anything"
    ],
    "correct": 2,
    "explanation": "Containment limits harm, evidence preservation supports investigation, and formal escalation keeps the response controlled.",
    
  },
  {
    "id": "DSS-019",
    "pathway": "digital-support-security",
    "category": "Networking",
    "difficulty": "hard",
    "question": "Users can reach a service by IP address but not by its hostname. Other websites work normally. Which test best targets the likely fault?",
    "options": [
      "Check DNS resolution for that hostname and compare it with the expected record",
      "Replace every network cable",
      "Reset the users’ document permissions",
      "Increase server storage capacity"
    ],
    "correct": 0,
    "explanation": "Successful IP access with failed name access isolates the likely problem to name resolution or the DNS record.",
    
  },
  {
    "id": "DSS-020",
    "pathway": "digital-support-security",
    "category": "Access control",
    "difficulty": "hard",
    "question": "A finance employee changes department but keeps access to finance folders and gains access to marketing. Which control would most directly prevent this access accumulation?",
    "options": [
      "Allow users to choose their own folders",
      "Use role-based access with joiner-mover-leaver reviews and removal of old permissions",
      "Create one shared account for both teams",
      "Make all folders read-only to everyone"
    ],
    "correct": 1,
    "explanation": "Role-based provisioning plus mover reviews removes access that no longer matches the employee’s duties.",
    
  },
  {
    "id": "DSS-021",
    "pathway": "digital-support-security",
    "category": "Security design",
    "difficulty": "hard",
    "question": "Remote staff need access to an internal system from personal networks. Which combination gives the strongest proportionate improvement?",
    "options": [
      "A longer public URL and no login timeout",
      "Shared passwords and email confirmation",
      "VPN or zero-trust access, multi-factor authentication, managed devices, and least privilege",
      "A hidden bookmark on each browser"
    ],
    "correct": 2,
    "explanation": "Layered controls protect the connection, identity, device and authorisation rather than relying on obscurity.",
    
  },
  {
    "id": "DSS-022",
    "pathway": "digital-support-security",
    "category": "Troubleshooting",
    "difficulty": "hard",
    "question": "After an office move, voice calls break up but file downloads remain fast. Switch statistics show no errors, yet links are heavily used at call times. What is the best next change to test?",
    "options": [
      "Give all users administrator access",
      "Disable backups permanently",
      "Replace the email system",
      "Prioritise voice traffic with appropriate quality-of-service settings and monitor results"
    ],
    "correct": 3,
    "explanation": "Real-time voice is sensitive to delay and congestion; QoS is a targeted test when bandwidth is saturated without physical errors.",
    
  },
  {
    "id": "DSS-023",
    "pathway": "digital-support-security",
    "category": "Risk assessment",
    "difficulty": "hard",
    "question": "A vulnerability scan reports a severe issue on a test server that is isolated from the internet, and a medium issue on an internet-facing customer server. What should determine patch priority?",
    "options": [
      "Severity alone, without considering exposure",
      "Business impact, exposure, exploitability and existing controls as well as severity",
      "The alphabetical order of server names",
      "Whichever server is physically nearer"
    ],
    "correct": 1,
    "explanation": "Risk depends on likelihood and impact in context; scanner severity is important but not sufficient by itself.",
    
  },
  {
    "id": "DSS-024",
    "pathway": "digital-support-security",
    "category": "Incident analysis",
    "difficulty": "hard",
    "question": "Many accounts lock simultaneously after staff receive a convincing login email. Logs show repeated attempts from one external source. Which conclusion and action are best supported?",
    "options": [
      "Likely credential attack; block or rate-limit the source, reset exposed credentials, preserve logs, and investigate recipients",
      "The keyboards are faulty; replace them",
      "The email server needs more storage",
      "Nothing is wrong because lockout worked"
    ],
    "correct": 0,
    "explanation": "The correlated phishing and login pattern supports a credential attack, requiring containment and credential protection.",
    
  },
  {
    "id": "DSS-025",
    "pathway": "digital-support-security",
    "category": "Availability",
    "difficulty": "hard",
    "question": "A critical service runs on one server and must remain available during hardware failure. Which proposal best addresses the single point of failure?",
    "options": [
      "Take screenshots of the service each day",
      "Use a stronger password on the existing server",
      "Add tested redundancy or failover, monitored backups, and a recovery procedure",
      "Ask users not to access it during busy periods"
    ],
    "correct": 2,
    "explanation": "Redundancy supports continuity, while tested backups and recovery procedures cover failures that failover alone cannot.",
    
  },
  {
    "id": "DSD-001",
    "pathway": "digital-software-development",
    "category": "Code tracing",
    "difficulty": "easy",
    "question": "score = 5\nIF score > 5\n  PRINT 'Pass'\nELSE\n  PRINT 'Try again'\nWhat is displayed?",
    "options": [
      "Pass, because 5 is positive",
      "Nothing, because score is not text",
      "Try again, because 5 is not greater than 5",
      "Both messages"
    ],
    "correct": 2,
    "explanation": "The condition uses greater than, not greater than or equal to, so it is false when score equals 5.",
    
  },
  {
    "id": "DSD-002",
    "pathway": "digital-software-development",
    "category": "Variables",
    "difficulty": "easy",
    "question": "A program stores the number of items currently in a basket and changes it when items are added. Which data item is most suitable?",
    "options": [
      "A variable containing an integer",
      "A fixed image file",
      "A printed heading",
      "A permanent constant with value 0"
    ],
    "correct": 0,
    "explanation": "A changing whole-number count should be stored in an integer variable.",
    
  },
  {
    "id": "DSD-003",
    "pathway": "digital-software-development",
    "category": "Algorithms",
    "difficulty": "easy",
    "question": "Which algorithm correctly calculates the average of five scores?",
    "options": [
      "Multiply the first score by five",
      "Add the five scores and divide the total by five",
      "Choose the largest score and divide by two",
      "Divide each score by the next score"
    ],
    "correct": 1,
    "explanation": "An arithmetic mean is the sum of all values divided by the number of values.",
    
  },
  {
    "id": "DSD-004",
    "pathway": "digital-software-development",
    "category": "Conditions",
    "difficulty": "easy",
    "question": "A cinema offers a child price when age is below 16. Which condition matches the requirement?",
    "options": [
      "age = 16",
      "age > 16",
      "age != 16",
      "age < 16"
    ],
    "correct": 3,
    "explanation": "“Below 16” translates directly to a strict less-than comparison.",
    
  },
  {
    "id": "DSD-005",
    "pathway": "digital-software-development",
    "category": "Decomposition",
    "difficulty": "easy",
    "question": "A team must build an online booking system. Which action is an example of decomposition?",
    "options": [
      "Split the work into searching, availability, booking, payment and confirmation parts",
      "Write all code in one unplanned block",
      "Ignore the payment requirement",
      "Copy an unrelated program"
    ],
    "correct": 0,
    "explanation": "Decomposition breaks a large problem into smaller, manageable components with clear responsibilities.",
    
  },
  {
    "id": "DSD-006",
    "pathway": "digital-software-development",
    "category": "Loops",
    "difficulty": "medium",
    "question": "total = 0\nFOR number FROM 1 TO 4\n  total = total + number\nPRINT total\nWhat is printed?",
    "options": [
      "4",
      "6",
      "10",
      "11"
    ],
    "correct": 2,
    "explanation": "The loop adds 1 + 2 + 3 + 4, producing 10.",
    
  },
  {
    "id": "DSD-007",
    "pathway": "digital-software-development",
    "category": "Debugging",
    "difficulty": "medium",
    "question": "A login check accepts a correct username even when the password is wrong. The condition is usernameCorrect OR passwordCorrect. What is the best correction?",
    "options": [
      "Use usernameCorrect AND passwordCorrect",
      "Remove the password check",
      "Set both values to true",
      "Repeat the OR condition twice"
    ],
    "correct": 0,
    "explanation": "Both credentials must be correct, so the condition must require both Boolean values to be true.",
    
  },
  {
    "id": "DSD-008",
    "pathway": "digital-software-development",
    "category": "Requirements",
    "difficulty": "medium",
    "question": "A requirement says, “Search results should appear quickly.” What should the developer ask for before testing it?",
    "options": [
      "The manager’s favourite colour",
      "A measurable response-time target and expected load",
      "Permission to skip testing",
      "A list of unrelated websites"
    ],
    "correct": 1,
    "explanation": "A measurable time and load turn a vague statement into a testable non-functional requirement.",
    
  },
  {
    "id": "DSD-009",
    "pathway": "digital-software-development",
    "category": "Functions",
    "difficulty": "medium",
    "question": "FUNCTION double(x)\n  RETURN x * 2\nEND\nresult = double(3) + double(2)\nWhat is result?",
    "options": [
      "5",
      "7",
      "10",
      "12"
    ],
    "correct": 2,
    "explanation": "The two calls return 6 and 4, which are then added to give 10.",
    
  },
  {
    "id": "DSD-010",
    "pathway": "digital-software-development",
    "category": "Validation",
    "difficulty": "medium",
    "question": "A form requires a quantity from 1 to 20 inclusive. Which check is correct?",
    "options": [
      "quantity > 1 OR quantity < 20",
      "quantity = 1 AND quantity = 20",
      "quantity < 1 AND quantity > 20",
      "quantity >= 1 AND quantity <= 20"
    ],
    "correct": 3,
    "explanation": "Both lower and upper bounds must be satisfied, and “inclusive” requires >= and <=.",
    
  },
  {
    "id": "DSD-011",
    "pathway": "digital-software-development",
    "category": "Pattern recognition",
    "difficulty": "medium",
    "question": "A report produces the sequence 3, 6, 12, 24. Which rule best predicts the next value?",
    "options": [
      "Add 3 each time",
      "Multiply by 2 each time",
      "Subtract 3 each time",
      "Square every value"
    ],
    "correct": 1,
    "explanation": "Each value is twice the previous value, so the next would be 48.",
    
  },
  {
    "id": "DSD-012",
    "pathway": "digital-software-development",
    "category": "Data structures",
    "difficulty": "medium",
    "question": "A program must store the names of 30 students and process each name in turn. Which approach is most suitable?",
    "options": [
      "Store the names in a list and loop through it",
      "Create 30 unrelated print statements only",
      "Store every name in the same single value",
      "Use one Boolean variable"
    ],
    "correct": 0,
    "explanation": "A list groups similar values and supports consistent iteration.",
    
  },
  {
    "id": "DSD-013",
    "pathway": "digital-software-development",
    "category": "Code tracing",
    "difficulty": "medium",
    "question": "count = 1\nWHILE count < 4\n  PRINT count\n  count = count + 1\nEND\nWhich output is produced?",
    "options": [
      "1, 2, 3",
      "1, 2, 3, 4",
      "0, 1, 2, 3",
      "The loop never ends"
    ],
    "correct": 0,
    "explanation": "The values 1, 2 and 3 are printed; when count becomes 4 the condition is false.",
    
  },
  {
    "id": "DSD-014",
    "pathway": "digital-software-development",
    "category": "Testing",
    "difficulty": "medium",
    "question": "A function should accept ages 16 through 19. Which set best tests the boundaries?",
    "options": [
      "17 and 18 only",
      "0 and 100 only",
      "15, 16, 19 and 20",
      "16 four times"
    ],
    "correct": 2,
    "explanation": "Values just outside and exactly on both boundaries reveal common comparison errors.",
    
  },
  {
    "id": "DSD-015",
    "pathway": "digital-software-development",
    "category": "Algorithms",
    "difficulty": "medium",
    "question": "A program must find the largest number in a non-empty list. Which method works?",
    "options": [
      "Set largest to the first item, compare each remaining item, and replace largest when a bigger one is found",
      "Always return the final item",
      "Add every item and return the total",
      "Sort the item names alphabetically"
    ],
    "correct": 0,
    "explanation": "Maintaining the largest value seen so far correctly handles any ordering of the input.",
    
  },
  {
    "id": "DSD-016",
    "pathway": "digital-software-development",
    "category": "Debugging",
    "difficulty": "medium",
    "question": "price = '10'\nquantity = 3\ntotal = price + quantity\nThe program gives a type error. What is the best fix?",
    "options": [
      "Convert price to a number before arithmetic",
      "Convert quantity to a picture",
      "Remove total",
      "Use an unrelated loop"
    ],
    "correct": 0,
    "explanation": "The text value must be validated and converted to a numeric type before it can be added or multiplied as a number.",
    
  },
  {
    "id": "DSD-017",
    "pathway": "digital-software-development",
    "category": "Logic",
    "difficulty": "medium",
    "question": "A user may enter when they are a staff member OR they have a valid visitor pass, but nobody may enter when the site is closed. Which expression matches?",
    "options": [
      "staff OR (visitor AND closed)",
      "(staff OR validVisitor) AND NOT closed",
      "staff AND visitor AND closed",
      "NOT staff OR NOT visitor"
    ],
    "correct": 1,
    "explanation": "Either valid role is acceptable, but the result must also require the site not to be closed.",
    
  },
  {
    "id": "DSD-018",
    "pathway": "digital-software-development",
    "category": "Code tracing",
    "difficulty": "hard",
    "question": "values = [2, 5, 8, 11]\ncount = 0\nFOR value IN values\n  IF value MOD 2 = 0\n    count = count + 1\n  END\nEND\nPRINT count\nWhat is printed?",
    "options": [
      "1",
      "2",
      "3",
      "26"
    ],
    "correct": 1,
    "explanation": "Only 2 and 8 have a remainder of zero when divided by two, so count becomes 2.",
    
  },
  {
    "id": "DSD-019",
    "pathway": "digital-software-development",
    "category": "Algorithm design",
    "difficulty": "hard",
    "question": "A booking system must prevent two users taking the final seat at the same time. Which design idea most directly addresses this?",
    "options": [
      "Check and reserve the seat as one controlled operation before confirming",
      "Make the confirmation text larger",
      "Ask both users to refresh repeatedly",
      "Store the seat count only in each user’s browser"
    ],
    "correct": 0,
    "explanation": "The availability check and reservation must be treated atomically so another request cannot take the seat between them.",
    
  },
  {
    "id": "DSD-020",
    "pathway": "digital-software-development",
    "category": "Debugging",
    "difficulty": "hard",
    "question": "FUNCTION average(numbers)\n  total = 0\n  FOR n IN numbers\n    total = total + n\n  END\n  RETURN total / 5\nEND\nWhy can this function be wrong?",
    "options": [
      "Loops cannot add numbers",
      "It always divides by 5 instead of the actual list length",
      "Functions cannot return decimals",
      "total should begin at 5"
    ],
    "correct": 1,
    "explanation": "The function should divide by the number of supplied values, otherwise lists of any other length produce the wrong result.",
    
  },
  {
    "id": "DSD-021",
    "pathway": "digital-software-development",
    "category": "Requirements",
    "difficulty": "hard",
    "question": "A client asks for a “secure contact form.” Which refinement is the most useful starting set of acceptance criteria?",
    "options": [
      "It should look modern",
      "Use any framework the developer likes",
      "Validate inputs, protect transmission, restrict stored data, prevent automated abuse, and define retention",
      "Put the word secure in the page title"
    ],
    "correct": 2,
    "explanation": "These criteria translate the broad goal into observable controls across input, transport, storage, abuse and lifecycle.",
    
  },
  {
    "id": "DSD-022",
    "pathway": "digital-software-development",
    "category": "Nested logic",
    "difficulty": "hard",
    "question": "points = 7\nIF points >= 5\n  IF points >= 8\n    PRINT 'Gold'\n  ELSE\n    PRINT 'Silver'\n  END\nELSE\n  PRINT 'Bronze'\nEND\nWhat is printed?",
    "options": [
      "Gold",
      "Silver",
      "Bronze",
      "Nothing"
    ],
    "correct": 1,
    "explanation": "Seven passes the outer test but fails the inner >= 8 test, so the inner ELSE prints Silver.",
    
  },
  {
    "id": "DSD-023",
    "pathway": "digital-software-development",
    "category": "Efficiency",
    "difficulty": "hard",
    "question": "A program repeatedly searches 50,000 customer records by unique customer ID. Which change is most likely to improve lookup performance?",
    "options": [
      "Store records in an indexed structure keyed by customer ID",
      "Add more comments to the search button",
      "Repeat a full linear search twice",
      "Convert all IDs into one long paragraph"
    ],
    "correct": 0,
    "explanation": "An indexed or keyed structure avoids scanning every record for each exact-ID lookup.",
    
  },
  {
    "id": "DSD-024",
    "pathway": "digital-software-development",
    "category": "Testing and debugging",
    "difficulty": "hard",
    "question": "A calculation fails only for an empty list. What is the best next step?",
    "options": [
      "Ignore empty input because it is inconvenient",
      "Change every numeric value to text",
      "Add a defined empty-list case and a test that confirms the required behaviour",
      "Delete tests for non-empty lists"
    ],
    "correct": 2,
    "explanation": "The boundary case needs an explicit requirement and handling, such as validation or a defined result, backed by a regression test.",
    
  },
  {
    "id": "DSD-025",
    "pathway": "digital-software-development",
    "category": "State and flow",
    "difficulty": "hard",
    "question": "balance = 20\namount = 25\nIF amount <= balance\n  balance = balance - amount\n  PRINT 'Approved'\nELSE\n  PRINT 'Declined'\nEND\nPRINT balance\nWhich output is correct?",
    "options": [
      "Approved, then -5",
      "Declined, then 20",
      "Declined, then 25",
      "Approved, then 20"
    ],
    "correct": 1,
    "explanation": "The withdrawal exceeds the balance, so the ELSE branch runs and the balance is not changed.",
    
  },
  {
    "id": "BIT-001",
    "pathway": "btec-national-diploma-it",
    "category": "Data",
    "difficulty": "easy",
    "question": "A small business keeps customer details in separate spreadsheets. Duplicate and conflicting records are common. Which solution best improves data management?",
    "options": [
      "A shared database with validation and controlled access",
      "More copies of each spreadsheet",
      "A different font in every file",
      "Printing all records weekly"
    ],
    "correct": 0,
    "explanation": "A shared database provides a single controlled source with validation to reduce duplicates and inconsistent values.",
    
  },
  {
    "id": "BIT-002",
    "pathway": "btec-national-diploma-it",
    "category": "Troubleshooting",
    "difficulty": "easy",
    "question": "A monitor says “No signal,” but the computer has power. What is the most sensible first check?",
    "options": [
      "Delete the user’s documents",
      "Check the display cable, input selection and connection",
      "Replace the internet router",
      "Reset every password"
    ],
    "correct": 1,
    "explanation": "The message points to the display signal path, so physical connection and selected input are proportionate first checks.",
    
  },
  {
    "id": "BIT-003",
    "pathway": "btec-national-diploma-it",
    "category": "Cybersecurity",
    "difficulty": "easy",
    "question": "A user receives an unexpected invoice attachment from an unknown sender. What should they do?",
    "options": [
      "Open it to discover who sent it",
      "Upload it to a public forum",
      "Report it using the organisation’s process without opening it",
      "Rename it and send it to colleagues"
    ],
    "correct": 2,
    "explanation": "Unexpected attachments can be malicious; reporting without opening reduces risk and enables investigation.",
    
  },
  {
    "id": "BIT-004",
    "pathway": "btec-national-diploma-it",
    "category": "Web technology",
    "difficulty": "easy",
    "question": "A shop wants its website to work comfortably on phones and desktops. Which requirement is most relevant?",
    "options": [
      "Responsive layout and testing at different screen sizes",
      "A fixed width wider than every phone",
      "Images containing all page text",
      "A separate password for each screen size"
    ],
    "correct": 0,
    "explanation": "Responsive design adapts layout and controls to different viewports and should be verified on representative devices.",
    
  },
  {
    "id": "BIT-005",
    "pathway": "btec-national-diploma-it",
    "category": "Business IT",
    "difficulty": "easy",
    "question": "A receptionist needs to create letters from one template using names and addresses from a list. Which approach is most suitable?",
    "options": [
      "Video editing",
      "Disk formatting",
      "Mail merge using a structured data source",
      "Drawing each letter as an image"
    ],
    "correct": 2,
    "explanation": "Mail merge combines a reusable document template with structured recipient data accurately and efficiently.",
    
  },
  {
    "id": "BIT-006",
    "pathway": "btec-national-diploma-it",
    "category": "Databases",
    "difficulty": "medium",
    "question": "In a student table, which field is the best primary key?",
    "options": [
      "Surname",
      "Date of birth",
      "A unique student ID",
      "Course name"
    ],
    "correct": 2,
    "explanation": "A primary key must uniquely and reliably identify each record; names, dates and courses can repeat.",
    
  },
  {
    "id": "BIT-007",
    "pathway": "btec-national-diploma-it",
    "category": "Programming logic",
    "difficulty": "medium",
    "question": "temperature = 18\nIF temperature < 16\n  PRINT 'Heating on'\nELSE\n  PRINT 'Heating off'\nWhat is displayed?",
    "options": [
      "Heating on",
      "Heating off",
      "18",
      "Nothing"
    ],
    "correct": 1,
    "explanation": "Eighteen is not below sixteen, so the ELSE branch is selected.",
    
  },
  {
    "id": "BIT-008",
    "pathway": "btec-national-diploma-it",
    "category": "Requirements",
    "difficulty": "medium",
    "question": "A manager asks for “a fast report.” Which follow-up makes the requirement testable?",
    "options": [
      "Which colours should the report use?",
      "Should it contain a logo?",
      "What maximum generation time and data volume are acceptable?",
      "Who first suggested reports?"
    ],
    "correct": 2,
    "explanation": "A stated time under a defined volume creates a measurable performance target.",
    
  },
  {
    "id": "BIT-009",
    "pathway": "btec-national-diploma-it",
    "category": "Computer systems",
    "difficulty": "medium",
    "question": "A design team’s computers become slow only when editing large video files. Memory use reaches nearly 100% and storage is not full. Which upgrade is most directly supported by the evidence?",
    "options": [
      "More suitable RAM capacity",
      "A quieter keyboard",
      "A smaller monitor",
      "A second email address"
    ],
    "correct": 0,
    "explanation": "High memory use during the affected workload indicates insufficient RAM is the likely bottleneck.",
    
  },
  {
    "id": "BIT-010",
    "pathway": "btec-national-diploma-it",
    "category": "Data quality",
    "difficulty": "medium",
    "question": "A date field contains “12/08/26”, “August 12”, and “yesterday”. Which control most improves consistency at entry?",
    "options": [
      "Let every user invent a format",
      "Use date validation and a date-picker storing one standard format",
      "Convert dates into images",
      "Remove the field label"
    ],
    "correct": 1,
    "explanation": "Validation and a controlled input format produce consistent values that systems can sort and compare.",
    
  },
  {
    "id": "BIT-011",
    "pathway": "btec-national-diploma-it",
    "category": "Cybersecurity",
    "difficulty": "medium",
    "question": "An employee needs access to one payroll report but not the rest of the payroll folder. Which principle should guide the permission?",
    "options": [
      "Give full access in case it is useful later",
      "Use a shared administrator account",
      "Grant the minimum access needed to the specific report",
      "Publish the report internally"
    ],
    "correct": 2,
    "explanation": "Least privilege limits access to the smallest scope required for the task.",
    
  },
  {
    "id": "BIT-012",
    "pathway": "btec-national-diploma-it",
    "category": "Web technology",
    "difficulty": "medium",
    "question": "Users abandon a form because errors appear only after every field is submitted and the messages do not identify the problem. What improvement is best?",
    "options": [
      "Remove all validation",
      "Provide clear field-level validation while preserving entered data",
      "Make the form longer",
      "Hide required-field labels"
    ],
    "correct": 1,
    "explanation": "Specific, timely feedback helps users correct mistakes without repeating work.",
    
  },
  {
    "id": "BIT-013",
    "pathway": "btec-national-diploma-it",
    "category": "Networking",
    "difficulty": "medium",
    "question": "All devices in one room lose network access, but other rooms remain connected. What is the best first area to investigate?",
    "options": [
      "The local switch or connection serving that room",
      "Every user’s spreadsheet software",
      "The organisation’s logo",
      "The payroll database schema"
    ],
    "correct": 0,
    "explanation": "A location-specific outage suggests shared local network equipment or cabling rather than every device independently.",
    
  },
  {
    "id": "BIT-014",
    "pathway": "btec-national-diploma-it",
    "category": "Data interpretation",
    "difficulty": "medium",
    "question": "Monthly visits rose from 1,000 to 1,500, but purchases stayed at 100. What happened to the conversion rate?",
    "options": [
      "It increased from 10% to 15%",
      "It stayed at 10%",
      "It decreased from 10% to about 6.7%",
      "It cannot be calculated"
    ],
    "correct": 2,
    "explanation": "Conversion changed from 100/1,000 = 10% to 100/1,500 ≈ 6.7%.",
    
  },
  {
    "id": "BIT-015",
    "pathway": "btec-national-diploma-it",
    "category": "Business solutions",
    "difficulty": "medium",
    "question": "A field team must update job status where mobile coverage is unreliable. Which requirement is most important?",
    "options": [
      "Offline entry with safe synchronisation when a connection returns",
      "A desktop-only interface",
      "Continuous streaming video",
      "A different app for every employee"
    ],
    "correct": 0,
    "explanation": "Offline capability allows work to continue, while controlled synchronisation reconciles updates later.",
    
  },
  {
    "id": "BIT-016",
    "pathway": "btec-national-diploma-it",
    "category": "Testing",
    "difficulty": "medium",
    "question": "A password field should accept 12 to 64 characters. Which values best test its length boundaries?",
    "options": [
      "20 and 30 only",
      "11, 12, 64 and 65 characters",
      "One 12-character value four times",
      "0 and 1 only"
    ],
    "correct": 1,
    "explanation": "Testing just outside and exactly on both limits reveals typical boundary comparison mistakes.",
    
  },
  {
    "id": "BIT-017",
    "pathway": "btec-national-diploma-it",
    "category": "Backup and recovery",
    "difficulty": "medium",
    "question": "A company says it has backups but has never restored one. What is the main unresolved risk?",
    "options": [
      "The backup colour may be unpopular",
      "Employees may learn too much",
      "The data may not be recoverable when needed",
      "Files may be sorted alphabetically"
    ],
    "correct": 2,
    "explanation": "Only a verified restore demonstrates that backups are complete, usable and supported by a workable process.",
    
  },
  {
    "id": "BIT-018",
    "pathway": "btec-national-diploma-it",
    "category": "Databases",
    "difficulty": "hard",
    "question": "An orders table repeats customer address details in every order. Address corrections leave old rows inconsistent. Which redesign is best?",
    "options": [
      "Put customer data in a customer table and link orders using customer ID",
      "Add more address columns to orders",
      "Store all orders in one text field",
      "Delete customer identifiers"
    ],
    "correct": 0,
    "explanation": "Separating customers from orders reduces repeated data and allows one controlled customer update.",
    
  },
  {
    "id": "BIT-019",
    "pathway": "btec-national-diploma-it",
    "category": "Systems analysis",
    "difficulty": "hard",
    "question": "A new attendance system is technically correct but staff avoid it because recording one learner takes twice as long. What was most likely missed?",
    "options": [
      "A larger server name",
      "User workflow and usability requirements",
      "An animated login screen",
      "More file extensions"
    ],
    "correct": 1,
    "explanation": "A system can satisfy calculations yet fail if real user tasks and efficiency were not understood and tested.",
    
  },
  {
    "id": "BIT-020",
    "pathway": "btec-national-diploma-it",
    "category": "Cybersecurity",
    "difficulty": "hard",
    "question": "A website stores passwords as readable text. Which change is most appropriate?",
    "options": [
      "Compress the password file",
      "Rename the password column",
      "Store salted password hashes using a suitable password-hashing function",
      "Email users a copy each month"
    ],
    "correct": 2,
    "explanation": "Password hashing with a unique salt limits exposure and avoids storing recoverable plaintext passwords.",
    
  },
  {
    "id": "BIT-021",
    "pathway": "btec-national-diploma-it",
    "category": "Programming logic",
    "difficulty": "hard",
    "question": "total = 0\nFOR value IN [4, 7, 2]\n  IF value > 3\n    total = total + value\n  END\nEND\nWhat is total?",
    "options": [
      "4",
      "7",
      "11",
      "13"
    ],
    "correct": 2,
    "explanation": "Only 4 and 7 meet the condition, so they are added to produce 11.",
    
  },
  {
    "id": "BIT-022",
    "pathway": "btec-national-diploma-it",
    "category": "Data interpretation",
    "difficulty": "hard",
    "question": "A dashboard shows 95% system uptime for the month. The agreed target is 99.9%. What is the best conclusion?",
    "options": [
      "The target was met because 95 is a high number",
      "The target was missed; investigate downtime duration, timing and causes",
      "Delete the target",
      "No conclusion can ever be drawn from uptime"
    ],
    "correct": 1,
    "explanation": "The measured value is below the agreed target; detailed outage evidence is needed to decide corrective action.",
    
  },
  {
    "id": "BIT-023",
    "pathway": "btec-national-diploma-it",
    "category": "Solution selection",
    "difficulty": "hard",
    "question": "A charity needs a donor system. Budget is limited, requirements are standard, and staff cannot maintain custom code. Which option deserves strongest initial consideration?",
    "options": [
      "A supported configurable service assessed for cost, security and data needs",
      "A bespoke system with no support plan",
      "A spreadsheet emailed between all volunteers",
      "No backups to reduce cost"
    ],
    "correct": 0,
    "explanation": "A supported configurable service can meet common needs with lower maintenance, subject to proper security and cost evaluation.",
    
  },
  {
    "id": "BIT-024",
    "pathway": "btec-national-diploma-it",
    "category": "Networking",
    "difficulty": "hard",
    "question": "Video meetings become unstable at 09:00 when cloud backups start. Which evidence and change best test the suspected cause?",
    "options": [
      "Measure link use and delay, then reschedule or limit backup traffic",
      "Replace office chairs",
      "Change every username",
      "Disable meeting audio"
    ],
    "correct": 0,
    "explanation": "The timing suggests contention; measuring utilisation and controlling backup traffic directly tests that hypothesis.",
    
  },
  {
    "id": "BIT-025",
    "pathway": "btec-national-diploma-it",
    "category": "Project reasoning",
    "difficulty": "hard",
    "question": "A project has a fixed launch date. A late request adds a large optional feature. What is the most responsible response?",
    "options": [
      "Promise it without estimating",
      "Assess effort, risk and priority, then agree a scope, time or resource trade-off",
      "Quietly remove testing",
      "Add the feature after launch without approval"
    ],
    "correct": 1,
    "explanation": "Change control makes the impact visible and lets stakeholders choose an informed trade-off.",
    
  },
  {
    "id": "EIT-001",
    "pathway": "btec-extended-diploma-it",
    "category": "Systems",
    "difficulty": "easy",
    "question": "A computer is slow when many applications are open, and memory use is consistently near 100%. Which resource is the clearest current constraint?",
    "options": [
      "RAM",
      "Screen size",
      "Keyboard layout",
      "Printer toner"
    ],
    "correct": 0,
    "explanation": "The observed high memory use under the failing workload directly indicates RAM pressure.",
    
  },
  {
    "id": "EIT-002",
    "pathway": "btec-extended-diploma-it",
    "category": "Data",
    "difficulty": "easy",
    "question": "A table must identify each product even when two products share the same name. Which field is best?",
    "options": [
      "Product colour",
      "A unique product ID",
      "Supplier town",
      "Description length"
    ],
    "correct": 1,
    "explanation": "A stable unique identifier distinguishes records when descriptive values repeat.",
    
  },
  {
    "id": "EIT-003",
    "pathway": "btec-extended-diploma-it",
    "category": "Cybersecurity",
    "difficulty": "easy",
    "question": "A staff member receives a multi-factor prompt when they are not signing in. What should they do?",
    "options": [
      "Approve it to stop the prompt",
      "Ignore it forever",
      "Deny it and report a possible account compromise",
      "Send the prompt to a colleague"
    ],
    "correct": 2,
    "explanation": "An unexpected prompt can indicate stolen credentials; denial and prompt reporting support containment.",
    
  },
  {
    "id": "EIT-004",
    "pathway": "btec-extended-diploma-it",
    "category": "Programming",
    "difficulty": "easy",
    "question": "value = 4\nvalue = value + 3\nPRINT value\nWhat is printed?",
    "options": [
      "1",
      "4",
      "3",
      "7"
    ],
    "correct": 3,
    "explanation": "The second statement replaces value with 4 + 3, so 7 is printed.",
    
  },
  {
    "id": "EIT-005",
    "pathway": "btec-extended-diploma-it",
    "category": "Web",
    "difficulty": "easy",
    "question": "A website’s important text is placed inside images, making it hard for screen-reader users. What is the best improvement?",
    "options": [
      "Use real structured text and meaningful alternative text where images remain",
      "Add more text images",
      "Remove all headings",
      "Require a larger monitor"
    ],
    "correct": 0,
    "explanation": "Structured text can be resized, searched and read by assistive technology; meaningful alt text covers informative images.",
    
  },
  {
    "id": "EIT-006",
    "pathway": "btec-extended-diploma-it",
    "category": "Systems reasoning",
    "difficulty": "medium",
    "question": "A service slows every Friday when a full report and backup run together. Which action best tests resource contention?",
    "options": [
      "Change the company logo",
      "Monitor CPU, memory, disk and network during the overlap, then separate the jobs",
      "Delete old user accounts at random",
      "Replace every workstation"
    ],
    "correct": 1,
    "explanation": "Resource monitoring during the known window provides evidence, and separating jobs tests whether overlap is causal.",
    
  },
  {
    "id": "EIT-007",
    "pathway": "btec-extended-diploma-it",
    "category": "Databases",
    "difficulty": "medium",
    "question": "A form allows an order to reference a customer ID that does not exist. Which database control most directly prevents this?",
    "options": [
      "A foreign-key relationship",
      "A larger text box",
      "Alphabetical sorting",
      "A darker page background"
    ],
    "correct": 0,
    "explanation": "Referential integrity through a foreign key prevents an order from pointing to a missing customer.",
    
  },
  {
    "id": "EIT-008",
    "pathway": "btec-extended-diploma-it",
    "category": "Programming logic",
    "difficulty": "medium",
    "question": "result = 1\nFOR i FROM 1 TO 3\n  result = result * 2\nEND\nWhat is result?",
    "options": [
      "3",
      "6",
      "8",
      "9"
    ],
    "correct": 2,
    "explanation": "Starting at 1 and multiplying by 2 three times gives 2, 4, then 8.",
    
  },
  {
    "id": "EIT-009",
    "pathway": "btec-extended-diploma-it",
    "category": "Requirements",
    "difficulty": "medium",
    "question": "A school asks for an app that is “easy to use.” Which evidence would best test this?",
    "options": [
      "The developer likes the design",
      "Representative users complete defined tasks with agreed success and time measures",
      "The code contains many files",
      "The home page uses three colours"
    ],
    "correct": 1,
    "explanation": "Usability needs task-based measures with representative users rather than personal opinion.",
    
  },
  {
    "id": "EIT-010",
    "pathway": "btec-extended-diploma-it",
    "category": "Cybersecurity",
    "difficulty": "medium",
    "question": "A database needs to accept connections only from one application server. Which control is most relevant?",
    "options": [
      "A firewall or network rule limited to that server and required port",
      "A public database address",
      "A shared guest account",
      "A longer database filename"
    ],
    "correct": 0,
    "explanation": "Restricting source and port reduces the network attack surface to the required connection.",
    
  },
  {
    "id": "EIT-011",
    "pathway": "btec-extended-diploma-it",
    "category": "Data analysis",
    "difficulty": "medium",
    "question": "A chart of support tickets doubles from 50 to 100, while active users grow from 500 to 2,000. What additional measure gives a fairer comparison?",
    "options": [
      "Tickets per active user",
      "The longest ticket title",
      "The number of chart colours",
      "The first user’s postcode"
    ],
    "correct": 0,
    "explanation": "Normalising tickets by active users distinguishes service quality from simple growth in the user base.",
    
  },
  {
    "id": "EIT-012",
    "pathway": "btec-extended-diploma-it",
    "category": "Web applications",
    "difficulty": "medium",
    "question": "A checkout page creates a second order whenever a user refreshes after payment. Which behaviour is needed?",
    "options": [
      "A new order on every page load",
      "An idempotent confirmation process that recognises the completed payment",
      "A hidden refresh button only",
      "Longer product names"
    ],
    "correct": 1,
    "explanation": "An idempotent process safely handles repeated requests without duplicating the completed transaction.",
    
  },
  {
    "id": "EIT-013",
    "pathway": "btec-extended-diploma-it",
    "category": "Testing",
    "difficulty": "medium",
    "question": "A search function should return no results, one result or many results correctly. Which test set is strongest?",
    "options": [
      "Only a query with one result",
      "Only the most common query",
      "Queries designed to produce zero, one and multiple matches",
      "The same query repeated three times"
    ],
    "correct": 2,
    "explanation": "The three outcome classes cover distinct behaviours and common edge cases.",
    
  },
  {
    "id": "EIT-014",
    "pathway": "btec-extended-diploma-it",
    "category": "Business IT",
    "difficulty": "medium",
    "question": "Two departments need the same customer status but define “active” differently. What should happen before development?",
    "options": [
      "Choose one definition secretly",
      "Store both meanings in the same unlabeled field",
      "Clarify ownership and agree definitions or explicitly separate the concepts",
      "Allow each screen to guess"
    ],
    "correct": 2,
    "explanation": "Shared data needs governed definitions; if meanings truly differ they should be represented explicitly.",
    
  },
  {
    "id": "EIT-015",
    "pathway": "btec-extended-diploma-it",
    "category": "Networks",
    "difficulty": "medium",
    "question": "A service works inside the office but not from the internet. It is intended for staff only through a VPN. What should be checked first for a remote user?",
    "options": [
      "Whether the VPN connection and authorised route are active",
      "The office printer paper level",
      "The website font",
      "The user’s spreadsheet formulas"
    ],
    "correct": 0,
    "explanation": "The expected remote path is the VPN, so its connection, authentication and routing are the relevant first checks.",
    
  },
  {
    "id": "EIT-016",
    "pathway": "btec-extended-diploma-it",
    "category": "Data protection",
    "difficulty": "medium",
    "question": "An analytics team asks for full customer records but only needs regional totals. What is the best data approach?",
    "options": [
      "Provide every personal field",
      "Provide minimised, aggregated data suitable for the analysis",
      "Publish the raw database",
      "Copy records to personal devices"
    ],
    "correct": 1,
    "explanation": "Data minimisation reduces privacy risk while still meeting the stated analytical purpose.",
    
  },
  {
    "id": "EIT-017",
    "pathway": "btec-extended-diploma-it",
    "category": "Programming",
    "difficulty": "medium",
    "question": "A function is copied into five places, and bug fixes must be repeated. What refactoring is most suitable?",
    "options": [
      "Create one reusable function and call it where needed",
      "Create five more copies",
      "Remove all input validation",
      "Turn the code into an image"
    ],
    "correct": 0,
    "explanation": "One reusable function reduces duplication and makes behaviour easier to test and update consistently.",
    
  },
  {
    "id": "EIT-018",
    "pathway": "btec-extended-diploma-it",
    "category": "Systems design",
    "difficulty": "hard",
    "question": "An online application must remain available if one web server fails. Sessions currently exist only in that server’s memory. Which design is strongest?",
    "options": [
      "Add another server but keep unrelated local sessions",
      "Use multiple servers behind a load balancer and store session state in a shared resilient service",
      "Ask users not to log in during failure",
      "Back up the home page once a month"
    ],
    "correct": 1,
    "explanation": "Multiple servers remove the compute single point of failure, while shared resilient state lets requests move safely between them.",
    
  },
  {
    "id": "EIT-019",
    "pathway": "btec-extended-diploma-it",
    "category": "Database reasoning",
    "difficulty": "hard",
    "question": "A query joining orders and order_items returns one row per item. A report counts rows to show number of orders and overstates the result. What should change?",
    "options": [
      "Count distinct order IDs",
      "Count product descriptions instead",
      "Remove the join and invent totals",
      "Multiply the row count by item price"
    ],
    "correct": 0,
    "explanation": "Because the join expands each order into item rows, distinct order identifiers are required for an order count.",
    
  },
  {
    "id": "EIT-020",
    "pathway": "btec-extended-diploma-it",
    "category": "Cybersecurity",
    "difficulty": "hard",
    "question": "Logs show a valid account downloading far more data than usual from a new device. What is the best response?",
    "options": [
      "Assume valid credentials prove the activity is safe",
      "Delete the logs",
      "Risk-assess the event, verify the user independently, contain access if necessary, and preserve evidence",
      "Publicly post the user’s details"
    ],
    "correct": 2,
    "explanation": "Valid credentials can be compromised; context, verification, containment and evidence are all needed.",
    
  },
  {
    "id": "EIT-021",
    "pathway": "btec-extended-diploma-it",
    "category": "Algorithm reasoning",
    "difficulty": "hard",
    "question": "numbers = [6, 1, 6, 3]\nseen = []\nFOR n IN numbers\n  IF n NOT IN seen\n    ADD n TO seen\n  END\nEND\nWhat does seen contain?",
    "options": [
      "[6, 1, 6, 3]",
      "[1, 3]",
      "[6, 1, 3]",
      "[3, 6, 1]"
    ],
    "correct": 2,
    "explanation": "Each value is added only on its first occurrence, preserving first-seen order and removing the duplicate 6.",
    
  },
  {
    "id": "EIT-022",
    "pathway": "btec-extended-diploma-it",
    "category": "Solution architecture",
    "difficulty": "hard",
    "question": "A mobile app must show recently viewed records without a connection but data may change elsewhere. Which design issue is most important?",
    "options": [
      "Choosing an icon before defining behaviour",
      "Caching records with a clear synchronisation and conflict strategy",
      "Disabling all server updates",
      "Storing unlimited copies forever"
    ],
    "correct": 1,
    "explanation": "Offline caching needs rules for freshness, synchronisation and conflicting changes to avoid silent data loss.",
    
  },
  {
    "id": "EIT-023",
    "pathway": "btec-extended-diploma-it",
    "category": "Testing and risk",
    "difficulty": "hard",
    "question": "A critical calculation is being replaced. The new version passes new examples but there are no tests for old edge cases. What is the safest next step?",
    "options": [
      "Release immediately because new tests pass",
      "Remove the old code and its documentation",
      "Build regression tests from known behaviour and edge cases, then compare results before release",
      "Test only the user interface colour"
    ],
    "correct": 2,
    "explanation": "Regression comparison protects established behaviour while the replacement is evaluated against edge cases.",
    
  },
  {
    "id": "EIT-024",
    "pathway": "btec-extended-diploma-it",
    "category": "Data modelling",
    "difficulty": "hard",
    "question": "Students can join many clubs, and each club has many students. Which model best represents this?",
    "options": [
      "A student table with 30 club columns",
      "A club name copied into the student surname",
      "Student and club tables linked by a membership table",
      "One text document containing every relationship"
    ],
    "correct": 2,
    "explanation": "A linking table represents the many-to-many relationship cleanly and can also store membership details.",
    
  },
  {
    "id": "EIT-025",
    "pathway": "btec-extended-diploma-it",
    "category": "Analytical thinking",
    "difficulty": "hard",
    "question": "After a release, errors rise only for users uploading files larger than 10 MB. What is the most useful hypothesis to test first?",
    "options": [
      "A size limit differs between the application, proxy or server configuration",
      "All user passwords expired together",
      "The database has too many short names",
      "The website needs a new colour scheme"
    ],
    "correct": 0,
    "explanation": "The sharp size boundary suggests an inconsistent configured upload or request limit along the request path.",
    
  }
] as Question[];
