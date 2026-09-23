export type Task3Quiz={question:string;options:string[];answer:string;explanation:string};
export type Task3Match={left:string;right:string};
export type Task3Lesson={
  id:string;title:string;focus:string;learn:string[];memory:string;exam:string[];
  quizzes:Task3Quiz[];matching:Task3Match[];
};

/**
 * Activity 3 teaching is deliberately scenario-led. The exact organisation changes,
 * so learners practise a repeatable design method rather than memorising one diagram.
 */
export const unit14Task3Lessons:Task3Lesson[]=[
  {
    id:"marks",title:"What the 20 marks are really testing",focus:"Build a complete, scenario-specific IT service delivery solution.",
    learn:[
      "A strong Activity 3 answer maps the whole solution, including locations rather than a loose list of devices.",
      "Explain how the solution works. Connections and information movement matter as much as the icons.",
      "Show the data and information needed by the organisation and its staff.",
      "Cover both hardware and software. A network diagram with no software explanation is incomplete.",
      "Keep linking every choice back to the scenario, its rooms, staff, tasks and future requirements."
    ],
    memory:"Use MAP IT: Map locations and links; Apply every choice to the scenario; Processes and data flows; IT hardware and software; Tell how the whole solution works.",
    exam:["Annotate a proposed IT service delivery solution.","Explain how the proposed solution works for the organisation.","Identify missing parts of a weak solution and improve it."],
    quizzes:[
      {question:"Which response is closest to a high-band Activity 3 approach?",options:["A connected map of locations, users, hardware, software and data flows with scenario-specific explanations","A long shopping list of expensive hardware","A diagram made only from computer icons with no labels"],answer:"A connected map of locations, users, hardware, software and data flows with scenario-specific explanations",explanation:"The examiner feedback rewards a fully mapped solution, understanding of how it works, data/information coverage, hardware/software coverage and scenario awareness."},
      {question:"A learner has drawn computers, a switch and a server. What is the biggest next step?",options:["Show and label how the locations, users and services connect and what information moves","Add more colours","Replace every device with a more expensive model"],answer:"Show and label how the locations, users and services connect and what information moves",explanation:"A diagram must explain the service, not simply display hardware."}
    ],
    matching:[{left:"Map",right:"Locations, devices and connections"},{left:"Data",right:"Information users create, store and exchange"},{left:"Implementation",right:"Hardware and software that deliver the service"},{left:"Scenario awareness",right:"Choices linked to the organisation's real needs"}]
  },
  {
    id:"rooms",title:"Rooms first: who works where and what they need",focus:"Turn the scenario into a room-by-room plan before drawing the network.",
    learn:[
      "Copy the location names from the scenario. Do not invent vague labels such as Room 1 when the brief gives General Office or Workshop.",
      "For each location, list who works there and the tasks they perform before placing equipment.",
      "Then add the devices, software and data needed for those tasks.",
      "A room can contain several users, but each device still needs a clear purpose.",
      "Keep server or security equipment in an appropriate secure area if the scenario supports one."
    ],
    memory:"Use ROOMS for every location: Role, Operations, Objects/devices, Movement/connection, Software/data.",
    exam:["Place appropriate IT equipment into each named room.","Explain why a device belongs in a particular location.","Correct a room plan where devices do not match staff responsibilities."],
    quizzes:[
      {question:"A workshop manager monitors vehicle servicing, faults and stock. Which placement best follows the scenario?",options:["A workstation in or beside the workshop with access to servicing, fault and stock information","A graphics tablet in reception only","A printer in a remote building with no network link"],answer:"A workstation in or beside the workshop with access to servicing, fault and stock information",explanation:"The device and software should be close to the role and tasks described in the scenario."},
      {question:"What should decide what goes in a room?",options:["The staff roles and tasks carried out there","The number of icons that fit on the page","Whether the equipment name sounds technical"],answer:"The staff roles and tasks carried out there",explanation:"Location decisions should come from the scenario rather than decoration or brand names."}
    ],
    matching:[{left:"General/management office",right:"Management workstation and access to organisation-wide information"},{left:"Administration/reception",right:"Booking, payment, communication and printing tools"},{left:"Workshop",right:"Servicing, fault, stock and diagnostic access"},{left:"Marketing role",right:"Portable content and website/social media tools where the scenario requires them"}]
  },
  {
    id:"hardware",title:"Know the hardware and connect it logically",focus:"Understand what each network component does and where it belongs.",
    learn:[
      "The internet/ISP link connects the organisation to external services.",
      "A router moves traffic between networks and normally provides the route towards the internet.",
      "A firewall applies security rules to traffic entering or leaving the protected network.",
      "A switch connects wired devices on the local network. A wireless access point connects suitable wireless devices into that network.",
      "Servers provide shared services or store data. Printers and user devices connect through the network rather than floating separately on the diagram.",
      "There is more than one valid physical design. What matters is a complete, labelled and defensible connection path."
    ],
    memory:"Think EDGE → CORE → ACCESS. Edge: internet/router/firewall. Core: switch/servers. Access: wired devices, printers and WAPs for wireless devices.",
    exam:["Label the purpose of router, firewall, switch, WAP and server.","Complete a missing network path.","Explain why a WAP or switch is needed in a location."],
    quizzes:[
      {question:"Which device mainly connects multiple wired devices on the same local network?",options:["Switch","Wireless access point","Printer"],answer:"Switch",explanation:"A switch provides local wired connectivity between networked devices."},
      {question:"A workshop tablet needs Wi-Fi access to the same service used by office desktops. Which component is most directly required in the workshop?",options:["Wireless access point connected to the organisation's network","A second disconnected printer","A standalone monitor"],answer:"Wireless access point connected to the organisation's network",explanation:"The WAP bridges wireless devices into the network so they can reach authorised services."},
      {question:"What is the firewall's main role in the diagram?",options:["Apply security rules to network traffic","Store every customer record","Replace every desktop computer"],answer:"Apply security rules to network traffic",explanation:"A firewall protects the network by controlling traffic according to security rules."}
    ],
    matching:[{left:"Router",right:"Routes traffic between networks"},{left:"Firewall",right:"Applies security rules to traffic"},{left:"Switch",right:"Connects wired LAN devices"},{left:"Wireless access point",right:"Provides wireless access to the LAN"},{left:"Server",right:"Hosts shared services or data"},{left:"Printer",right:"Produces required physical documents"}]
  },
  {
    id:"network-diagram",title:"Draw a network diagram an examiner can follow",focus:"Make the physical/service layout clear, complete and readable.",
    learn:[
      "Put each named room or site inside its own labelled boundary.",
      "Place only the equipment that belongs in that location inside the boundary.",
      "Draw lines between actual network connections. Do not use lines merely to point at labels.",
      "Label important links such as Ethernet, Wi-Fi, internet/VPN or site-to-site connectivity when relevant.",
      "Show the internet connection. The examiner report specifically highlighted missing internet connectivity as a weakness in a low response.",
      "After drawing, trace one user's journey from their device to the service and back. If you cannot trace it, the diagram is incomplete."
    ],
    memory:"Trace TEST: Terminal/device → Edge/access network → Service/server → Then back to the user. If the path breaks, fix the diagram.",
    exam:["Create a network/service solution diagram for several rooms or sites.","Annotate the diagram to explain connections.","Find and correct missing internet, workshop, server or software provision."],
    quizzes:[
      {question:"Which diagram convention most improves clarity?",options:["Use room boundaries and connection lines only for actual network links","Draw every line through the middle of every label","Leave all rooms unnamed"],answer:"Use room boundaries and connection lines only for actual network links",explanation:"The examiner feedback criticised diagrams that were difficult to follow because lines were used as pointers rather than meaningful connections."},
      {question:"A diagram has office PCs and a server but no internet or router/firewall path. What should the learner do?",options:["Add and label the missing connectivity and explain its purpose","Add more desktop icons","Remove the room names"],answer:"Add and label the missing connectivity and explain its purpose",explanation:"A complete solution needs the connectivity that makes the service usable."}
    ],
    matching:[{left:"Room boundary",right:"Shows where equipment and users are physically located"},{left:"Solid connection line",right:"Represents an actual network link"},{left:"Connection label",right:"States Ethernet, Wi-Fi, VPN or another relevant link"},{left:"Annotation",right:"Explains why a component or connection is present"}]
  },
  {
    id:"dfd-symbols",title:"DFD symbols: know exactly what each one means",focus:"Represent how information moves through a service, not where cables run.",
    learn:[
      "An external entity is a person, department or external system that sends or receives data.",
      "A process transforms or uses data. Name it with a verb phrase such as Process booking or Update stock.",
      "A data store holds data for later use. Name it with a noun such as Booking records or Stock records.",
      "A data flow is a labelled arrow showing the information moving between parts of the DFD.",
      "A DFD is not a network diagram. It shows information movement and processing, not switches and Ethernet cables."
    ],
    memory:"EPDF: External entity, Process, Data store, Flow. Ask: who is outside, what happens, what is stored, what moves?",
    exam:["Identify or correct DFD symbols.","Convert a written workflow into a DFD.","Explain the difference between a DFD and a network diagram."],
    quizzes:[
      {question:"In a booking DFD, 'Customer' is most likely what?",options:["External entity","Data store","Network switch"],answer:"External entity",explanation:"The customer sits outside the internal process and sends/receives information."},
      {question:"Which label is best for a process?",options:["Process booking","Booking records","Customer"],answer:"Process booking",explanation:"Processes are actions and are normally named with verb phrases."},
      {question:"Which label is best for a data store?",options:["Booking records","Check availability","Receptionist"],answer:"Booking records",explanation:"A data store is a collection of saved information, so a noun phrase fits."}
    ],
    matching:[{left:"External entity",right:"Customer or outside system"},{left:"Process",right:"Action that uses or changes data"},{left:"Data store",right:"Saved information for later use"},{left:"Data flow",right:"Labelled arrow carrying information"}]
  },
  {
    id:"dfd-levels",title:"Context, Level 0 and Level 1 DFDs",focus:"Move from the whole service to progressively more detail.",
    learn:[
      "A context diagram shows the whole system as one process and the external entities/data flows around it.",
      "A Level 0 DFD breaks that single system into its main internal processes and data stores.",
      "A Level 1 DFD takes one Level 0 process and breaks it into more detailed sub-processes.",
      "The flows should remain logically consistent as you decompose the system. Do not make important inputs or outputs disappear without explanation.",
      "Use the level that best communicates the scenario. More detail is useful only when it remains readable."
    ],
    memory:"Zoom lens: Context = whole system; Level 0 = main processes; Level 1 = one process zoomed in.",
    exam:["Draw a context DFD from a scenario.","Expand the context diagram into Level 0.","Take one process and decompose it into Level 1."],
    quizzes:[
      {question:"Which diagram normally shows the whole service as a single process?",options:["Context diagram","Level 1 DFD","Network topology"],answer:"Context diagram",explanation:"The context view treats the whole system as one process so the external interactions are clear."},
      {question:"What does a Level 1 DFD usually do?",options:["Break one Level 0 process into more detailed sub-processes","Replace all data flows with cables","List only hardware models"],answer:"Break one Level 0 process into more detailed sub-processes",explanation:"Level 1 is a deeper view of one process from the level above."}
    ],
    matching:[{left:"Context",right:"Whole system shown as one process"},{left:"Level 0",right:"Main internal processes and data stores"},{left:"Level 1",right:"Detailed breakdown of one Level 0 process"},{left:"Balancing",right:"Keeping important inputs and outputs logically consistent between levels"}]
  },
  {
    id:"data-model",title:"Optional extension: data models and ERDs",focus:"Use a data model only when showing record structure or relationships adds useful evidence to the solution.",
    learn:[
      "A DFD shows how data moves and is processed and is directly useful when explaining information requirements.",
      "A data model or entity relationship diagram shows how stored records relate to each other. It can support a solution, but Pearson does not prescribe it as one of three compulsory Activity 3 diagrams.",
      "Typical scenario entities might include Customer, Booking, Staff, Vehicle, Repair and Stock, but you must use the actual scenario.",
      "Primary keys identify records. Foreign keys link related records where a relational design is appropriate.",
      "Use meaningful field names. The examiner needs to see that the information supports the organisation's work."
    ],
    memory:"DFD = movement. ERD/data model = structure. Use the ERD only when the relationship between stored records genuinely helps explain your proposed service.",
    exam:["Identify useful records and relationships when the scenario benefits from a data model.","Choose suitable fields for a record.","Explain how a data model could support the service solution without treating it as compulsory evidence."],
    quizzes:[
      {question:"Which diagram best shows that one customer can have several bookings?",options:["Entity relationship/data model diagram","Only a room layout","Only a Wi-Fi coverage map"],answer:"Entity relationship/data model diagram",explanation:"Relationships between stored records belong in a data model rather than a physical network diagram."},
      {question:"What does a DFD add that an ERD does not?",options:["The movement and processing of information","The colour of the server room","The price of each laptop"],answer:"The movement and processing of information",explanation:"A DFD focuses on flows and processes; an ERD focuses on stored data structure."}
    ],
    matching:[{left:"Customer",right:"Person or organisation receiving the service"},{left:"Booking",right:"Reservation linked to a customer and service/resource"},{left:"Staff",right:"Employee details and role information"},{left:"Stock",right:"Items and quantities available"},{left:"Repair/service record",right:"Work completed, date, fault and responsible staff"}]
  },
  {
    id:"software",title:"Hardware alone will not get the job done",focus:"Give every role the software and information needed for its actual tasks.",
    learn:[
      "Pair hardware with the software it needs. A desktop without booking, stock, payroll or communication software may not support the role.",
      "Use generic functions first, then name a product only if it helps explain the solution.",
      "Match access permissions to the role. Staff should see the information needed for their work, not automatically everything.",
      "Include security software or controls where relevant, but explain the risk they address.",
      "Check future requirements from the scenario as well as current requirements."
    ],
    memory:"For every device ask S-A-D: Software, Access, Data. What runs on it, what can the user access, and what information do they need?",
    exam:["Recommend software for each role or department.","Explain role-based access to data.","Find software omissions in a proposed hardware design."],
    quizzes:[
      {question:"An administration assistant processes bookings and payments. Which answer is strongest?",options:["Provide a suitable workstation plus booking/payment software and only the data access required for that role","Provide a powerful gaming PC with no business software","Give access to every database because it is easier"],answer:"Provide a suitable workstation plus booking/payment software and only the data access required for that role",explanation:"The solution needs both appropriate hardware/software and access linked to the user's task."},
      {question:"Why is a hardware-only Activity 3 answer weak?",options:["It does not explain the applications and information users need to perform their jobs","Hardware is never used in IT service delivery","Software is assessed only in Activity 5"],answer:"It does not explain the applications and information users need to perform their jobs",explanation:"The examiner report specifically identified missing software as a weakness in lower responses."}
    ],
    matching:[{left:"Administration",right:"Booking, payment, office and communication software"},{left:"Manager",right:"Management, reporting and monitoring tools"},{left:"Workshop",right:"Servicing, fault, stock and diagnostic tools"},{left:"Marketing",right:"Website/content and communication tools"}]
  },
  {
    id:"mistakes",title:"Fix the mistakes that lose marks",focus:"Use examiner weaknesses as a checklist before submitting.",
    learn:[
      "Do not omit the internet connection or leave equipment unconnected.",
      "Do not forget a whole location such as the workshop when the scenario requires IT there.",
      "Do not discuss hardware without the software needed to deliver the service.",
      "Do not omit key information such as staff details, stock, bookings or operational records when the scenario depends on them.",
      "Do not make the diagram hard to follow by using connection lines as pointers to text labels.",
      "Do not invent roles, rooms or equipment that are not justified by the scenario."
    ],
    memory:"Use MISS before finishing: Missing locations? Internet/connectivity? Software? Stored/flowing data?",
    exam:["Critique a weak solution and identify omissions.","Rewrite an explanation so it links to the scenario.","Repair an unclear network or DFD."],
    quizzes:[
      {question:"Which omission was explicitly identified in a low Activity 3 response?",options:["No internet connection","No decorative title page","No brand logos"],answer:"No internet connection",explanation:"The examiner feedback notes that the weak diagram omitted the internet connection."},
      {question:"Which other weakness was highlighted?",options:["No IT provision in the workshop and no software coverage","Too many justified data items","Too much scenario awareness"],answer:"No IT provision in the workshop and no software coverage",explanation:"The low response missed workshop provision, software and important data items."}
    ],
    matching:[{left:"Missing internet",right:"Users may have no route to external/hosted services"},{left:"Missing workshop IT",right:"Workshop staff cannot perform digital tasks shown in the scenario"},{left:"Missing software",right:"Hardware cannot be tied to the business process"},{left:"Missing data",right:"The design does not show the information the service must manage"}]
  },
  {
    id:"twenty-mark",title:"Build the 20-mark answer in a repeatable order",focus:"Use a reliable routine under exam pressure.",
    learn:[
      "Step 1: underline rooms/sites, roles, tasks, data, current problems and future requirements in the scenario.",
      "Step 2: make a ROOMS list for each location.",
      "Step 3: draw the connected service/network solution and label the major links.",
      "Step 4: add the DFD/data model where information flow or structure needs to be shown.",
      "Step 5: annotate hardware, software and role access with scenario-specific reasons.",
      "Step 6: trace at least two complete user journeys through the design and run the MISS check before finishing."
    ],
    memory:"Read → ROOMS → connect → DFD/data → explain → MISS check.",
    exam:["Produce the complete Activity 3 solution under a time limit.","Explain your diagram in enough detail that a non-specialist can follow it.","Use a final five-minute audit to repair omissions."],
    quizzes:[
      {question:"What should you do before drawing equipment?",options:["Extract rooms, roles, tasks, data and constraints from the scenario","Choose a favourite laptop brand","Start writing a conclusion for Activity 5"],answer:"Extract rooms, roles, tasks, data and constraints from the scenario",explanation:"The design must be driven by the scenario."},
      {question:"What is a good final check?",options:["Trace user journeys and use MISS to find missing locations, connectivity, software and data","Count the number of icons","Change every line to a different colour"],answer:"Trace user journeys and use MISS to find missing locations, connectivity, software and data",explanation:"The final check targets the omissions identified in examiner feedback."}
    ],
    matching:[{left:"Read",right:"Extract scenario facts and requirements"},{left:"ROOMS",right:"Plan each location from role to software/data"},{left:"Connect",right:"Show complete logical network/service paths"},{left:"DFD/data",right:"Show information movement and record structure"},{left:"Explain",right:"Annotate choices with scenario-specific reasoning"},{left:"MISS",right:"Audit for missing locations, internet, software and data"}]
  }
];

export const unit14Task3QuestionFamilies=[
  "Draw and annotate an IT service delivery/network solution for the organisation's named rooms or sites.",
  "Place suitable hardware in each room and explain why each item is needed there.",
  "Complete or correct a network diagram containing missing router, firewall, switch, server, WAP, printer or internet links.",
  "Explain how a user in one location reaches a shared service or data store.",
  "Create a context DFD showing the system, external entities and labelled information flows.",
  "Expand a context diagram into a Level 0 DFD with main processes and data stores.",
  "Break one Level 0 process into a Level 1 DFD.",
  "Identify incorrect DFD symbols, unlabelled flows or illogical direct connections and repair them.",
  "Where useful, identify records/entities required by the scenario and show suitable relationships between them.",
  "Choose useful fields for Customer, Booking, Staff, Stock, Vehicle/Asset, Repair/Service or equivalent scenario records.",
  "Explain the difference between a network/infrastructure diagram and a DFD; recognise a context diagram as the whole-system DFD view, and use a data model/ERD only when record relationships add value.",
  "Recommend software for each role and explain the information that role should be able to access.",
  "Explain how hardware and software work together to support a named member of staff.",
  "Review a weak solution and identify omitted rooms, users, software, data, internet connectivity or future requirements.",
  "Explain how the proposed solution supports both current and future organisational requirements.",
  "Produce a full Activity 3 response for an unfamiliar sector, using diagrams plus concise explanatory annotations."
];

export const unit14Task3ScenarioDrills=[
  "A two-site dental practice needs shared appointments, patient contact details and daily treatment schedules. Reception works at both sites; dentists need only their own schedules. Draw the connected service and a context DFD.",
  "A hotel has reception, a manager's office, housekeeping and a small events team. Bookings are duplicated between spreadsheets. Map the rooms, hardware, software and booking information flow.",
  "A vehicle repair business has reception, workshop manager, mechanics and parts storage. Staff need customer bookings, repair jobs and stock levels. Produce a network diagram and a Level 0 DFD.",
  "A charity has a main office and two outreach locations. Volunteers need current stock levels while managers need donor and distribution reports. Show how the sites connect and who can access which data.",
  "A leisure centre has reception, manager, instructors and a second site. Class places are sometimes overbooked. Draw the service solution, then show the booking flow from customer request to confirmation.",
  "A small warehouse has an office, picking area and loading bay. Orders, stock and dispatch data are currently separated. Design the room layout and data flow, then identify the records that should relate.",
  "A school support team has an IT office, classrooms and a server room. Staff log faults by email and tickets are lost. Create a context DFD, Level 0 DFD and a physical network/service diagram.",
  "A veterinary practice has reception, consultation rooms, pharmacy/stock and management. Appointments and medicine stock must stay accurate. Map devices, software and data flows without giving every user access to every record."
];

export const unit14Task3FinalChecklist=[
  "Every room/site from the scenario is named.",
  "Every important role can perform its stated job using the proposed solution.",
  "Internet/external connectivity is shown where required.",
  "Router/firewall/switch/WAP/server/printer/endpoints are connected logically where needed.",
  "Hardware has matching software and a clear purpose.",
  "Important data/information is named and its movement or storage is shown.",
  "DFD symbols and levels are used consistently.",
  "A DFD is not being used as a network diagram, and an ERD/data model is not being confused with a DFD.",
  "Current and future scenario requirements are covered.",
  "Annotations explain how the solution works rather than merely naming products.",
  "At least two user journeys can be traced from user → service/data → result.",
  "The MISS check found no missing locations, internet/connectivity, software or essential data."
];
