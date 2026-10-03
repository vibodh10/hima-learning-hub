export type Task3Model = {
  id:string; title:string; drillIndex:number; assumptions:string; opening:string;
  rooms:{place:string;provision:string;reason:string}[];
  network:string; networkExplanation:string;
  data:{record:string;fields:string;use:string}[];
  dfd:string; flowExplanation:string;
  operation:string[]; journeys:string[]; future:string; commentary:string[];
};

export const task3ModelSources = [
  {title:"Pearson Activity 3 task requirements (June 2022)",url:"https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/External-assessments/20161k-unit14-que-20220817.pdf"},
  {title:"Pearson examiner feedback on Activity 3 (January 2022)",url:"https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/External-assessments/20161k-unit14-pef-20220323.pdf"},
];

// Original teaching examples for the hub's fictional drills, not Pearson scripts.
export const unit14Task3Models:Task3Model[] = [
  {
    id:"dental",title:"Two-site dental practice",drillIndex:0,
    assumptions:"The brief does not give staffing numbers, a floor plan or a budget. I assume both sites have broadband and can use a managed hosted appointment service. Device quantities follow the actual number of simultaneous users. This design covers appointments and contact details, not an invented clinical-record system.",
    opening:"I propose one shared appointment service used by both reception teams, with a restricted schedule view for each dentist. Keeping one authoritative booking database removes the need to reconcile separate site diaries. Each appointment records its site and dentist, so a receptionist can book the correct location and a dentist sees only their own work. The following design maps the access path, information and responsibilities needed to make this work.",
    rooms:[
      {place:"Reception — Site A",provision:"A wired workstation per active receptionist; supported browser and appointment application; network printing only if paper schedules are needed.",reason:"Reception can find patient contact details, check availability at either site, amend bookings and send confirmations from the same record."},
      {place:"Reception — Site B",provision:"The same workstation/application provision, connected through Site B's own network.",reason:"Site B is not dependent on an office PC at Site A being switched on. Both teams see committed booking changes."},
      {place:"Dentist work areas — both sites",provision:"An existing suitable desktop, or a managed tablet where mobility is needed; restricted schedule interface.",reason:"An individual login filters the schedule by dentist ID. Dentists do not receive reception's unrestricted contact-list or appointment-editing permissions."},
      {place:"Secure network area — each site",provision:"Business router/firewall, managed switch, and a connected staff access point if tablets are used.",reason:"Wired reception devices have stable connections; managed wireless devices can reach the same hosted service. Network equipment is kept away from public access."},
    ],
    network:`SITE A                                      SITE B
Reception PCs -- Ethernet -- Switch A       Reception PCs -- Ethernet -- Switch B
Dentist tablets -- staff Wi-Fi -- AP A      Dentist tablets -- staff Wi-Fi -- AP B
                                  |                                          |
                       AP A -- Switch A                            AP B -- Switch B
                                  |                                          |
                         Router/firewall A                         Router/firewall B
                                  |                                          |
                              ISP / Internet ----------------------- ISP / Internet
                                                   |
                                            HTTPS / authenticated access
                                                   |
                                    Hosted appointment application
                                                   |
                                  Private appointment/contact database
                                                   |
                                   Encrypted, access-controlled backup`,
    networkExplanation:"Each switch connects to its site's router/firewall; each access point connects to that switch. Requests travel over the site's internet connection using HTTPS to the hosted application. Only the application accesses the database: reception PCs and tablets are not given direct database access. A private link between the two offices is not necessary for this hosted design. Guest Wi-Fi, if offered, is separated from staff devices and cannot reach staff network services.",
    data:[
      {record:"Patient contact",fields:"PatientID, name, contact method, telephone/email",use:"Reception selects the correct person and sends the appointment details. Use the unique ID rather than assuming two people cannot share a name."},
      {record:"Appointment",fields:"AppointmentID, PatientID, DentistID, SiteID, start/end time, status",use:"Links a person to one dentist and location; cancellation changes the status and frees the slot through the booking service."},
      {record:"Dentist availability and site",fields:"DentistID, available times; SiteID, site name/address",use:"The application validates where and when a dentist is available and produces the dentist's own daily schedule."},
    ],
    dfd:`CONTEXT DFD — [entities] outside; (whole system) inside
[Patient] -- contact details / appointment request --> (Appointment service)
(Appointment service) -- confirmation / amendment / available times --> [Patient]
[Reception A and B] -- booking search / changes --> (Appointment service)
(Appointment service) -- availability / booking result --> [Reception A and B]
[Dentist] -- own-schedule request --> (Appointment service)
(Appointment service) -- authorised daily schedule --> [Dentist]`,
    flowExplanation:"This is a context view, so the database is deliberately inside the single system boundary rather than drawn as an external entity. A telephone request is entered by reception on the patient's behalf. Internally, the service reads dentist availability, validates the selected site and time, commits the booking, then returns confirmation. Availability checking and booking must be one controlled transaction so two receptionists cannot both reserve the same slot. The confirmation is information produced from the stored appointment and site records, not a separate diary.",
    operation:[
      "Each employee has a named account. Reception permissions allow booking work; the dentist role is restricted on the server to that dentist's schedule. Hiding a button alone is not access control. Staff use MFA where supported, lock unattended devices and cannot share a generic account.",
      "The supplier maintains the hosted service, while the practice's nominated administrator manages staff access and an IT provider patches endpoints and network devices. Changes to appointments are logged with the account and time so mistaken amendments can be investigated.",
      "Agree backup frequency and an acceptable recovery time with the practice; restore a sample booking set periodically. For an internet outage, use an approved, minimal contingency schedule or managed backup connection. Record temporary changes securely and reconcile them before normal booking resumes, rather than maintaining a second permanent spreadsheet.",
    ],
    journeys:[
      "A patient phones Site A asking for a Site B appointment. Reception searches the shared availability, selects the patient and dentist, and commits the booking. Site B can now retrieve it, and the confirmation includes Site B's address. A simultaneous request for that occupied slot is rejected and offered another time.",
      "A dentist signs in at Site B. The application uses the account's dentist ID to return that person's daily schedule. An attempt to request another dentist's schedule is refused; changing the URL must not bypass the restriction.",
    ],
    future:"If a third site is added, register its site and staff, provide its local network and internet access, then extend licences and capacity after checking demand. The shared records and site IDs already support this expansion. A pilot must test simultaneous booking, own-schedule permissions, confirmation details and recovery before either site depends on the system.",
    commentary:["The two sites have explicit, complete access paths rather than an unexplained line between buildings.","The data fields explain how shared bookings and restricted dentist schedules work.","The answer traces a real cross-site booking and resolves the brief's access constraint. The assumptions are stated rather than presented as supplied facts."],
  },
  {
    id:"hotel",title:"Hotel booking and housekeeping",drillIndex:1,
    assumptions:"The scenario supplies roles but no floor plan, room count or existing equipment specification. I propose a hosted property-management service, reusing supported devices after checking suitability. Separate areas below are a proposed functional placement, not an invented measured building plan.",
    opening:"I would replace the separate booking spreadsheets with a single property-management service for reservations, room availability and room status. Reception, housekeeping, the manager and events staff would use different views of the same information. This tackles duplicate bookings while allowing each role to update the part of the service it is responsible for. A diagram alone would not demonstrate the solution: the role mapping and workflows below explain how it operates.",
    rooms:[
      {place:"Reception",provision:"Wired reception workstations; reservation/check-in application, email and document printing where required.",reason:"Reception can search dates, allocate rooms, record arrival/departure and issue confirmations without editing independent spreadsheets."},
      {place:"Manager's office",provision:"Wired workstation or managed laptop; management dashboard and reporting tools.",reason:"The manager receives occupancy, room-readiness and booking summaries from current records rather than manually combining files."},
      {place:"Housekeeping work areas",provision:"Managed mobile devices, staff Wi-Fi coverage and the room-status view.",reason:"Staff see room number and cleaning task, update clean/dirty/out-of-service status and do not need guest contact information."},
      {place:"Events team work area",provision:"Managed laptop/workstation; event-space calendar and reservation tools.",reason:"The team records event dates, spaces and associated room requests. It can check capacity without accessing unrelated guest records."},
    ],
    network:`RECEPTION PCs -- Ethernet --+
MANAGER PC ---- Ethernet ---+--> Managed switch --> Router/firewall --> ISP / Internet
EVENTS PC ------ Ethernet --+           |                                    |
                                       |                                  HTTPS
                                Staff access points                        |
                                       |                         Hosted property-management app
                                    Staff Wi-Fi                            |
                                       |                         Private shared hotel database
                              HOUSEKEEPING devices                         |
                                                              Protected backup / restore service

Guest Wi-Fi (if provided) --> separate guest network --> Internet only`,
    networkExplanation:"The switch provides wired access for fixed office users and connects the staff access points. Position access points following a coverage check in housekeeping work areas, rather than assuming one in reception covers the building. The router/firewall controls the internet path. The hosted application handles database reads and updates over authenticated HTTPS sessions. Guest traffic is isolated from staff services and cannot be used to access a reception printer or administrative device.",
    data:[
      {record:"Guest and reservation",fields:"GuestID, name, contact; ReservationID, GuestID, arrival/departure dates, status",use:"A reservation refers to one guest record. The same booking identifier is used in reception and reports, so a copied spreadsheet row is not treated as another reservation."},
      {record:"Room and room allocation",fields:"RoomID, room type/capacity, readiness status; ReservationID, RoomID, stay dates",use:"The service checks overlapping allocations before confirming a room. Cleaning status is distinct from whether a room is reserved."},
      {record:"Event and housekeeping task",fields:"EventID, space, time interval, organiser contact; TaskID, RoomID, assigned team/status",use:"Events staff check space availability; housekeeping receives a work list without receiving unnecessary guest data."},
    ],
    dfd:`MAIN-PROCESS DFD — [entity], (process), ||data store||
[Guest] -- dates / room request --> (1.0 Make reservation)
||Rooms and allocations|| -- availability --> (1.0 Make reservation)
(1.0 Make reservation) -- confirmed allocation --> ||Rooms and allocations||
(1.0 Make reservation) -- reservation details --> ||Reservations||
(1.0 Make reservation) -- confirmation --> [Guest]
[Reception] -- departure / room number --> (2.0 Manage room turnaround)
(2.0 Manage room turnaround) -- cleaning task --> [Housekeeping]
[Housekeeping] -- room-ready update --> (2.0 Manage room turnaround)
(2.0 Manage room turnaround) -- room status --> ||Rooms and allocations||
[Events team] -- space / dates / organiser --> (3.0 Manage event)
||Event spaces and bookings|| -- availability --> (3.0 Manage event)
(3.0 Manage event) -- event booking --> ||Event spaces and bookings||
(3.0 Manage event) -- confirmation / clash result --> [Events team]
||Reservations|| -- booking totals --> (4.0 Produce management reports)
||Rooms and allocations|| -- room usage / status --> (4.0 Produce management reports)
||Event spaces and bookings|| -- event usage --> (4.0 Produce management reports)
(4.0 Produce management reports) -- occupancy / readiness / event summary --> [Manager]`,
    flowExplanation:"Reservation creation checks capacity and writes the allocation atomically: two staff cannot confirm the same room for overlapping dates. At check-out, the room becomes dirty, not automatically ready for the next guest. Housekeeping's confirmed update makes it ready. Event spaces have their own allocation check; accommodation linked to an event must still pass the normal room-booking check. These are information flows, not Ethernet connections. Reception can enter guest requests on the guest's behalf.",
    operation:[
      "Use named accounts with reception, housekeeping, events and management roles. Authorise these roles within the service, not merely on the menu. Housekeeping devices should lock automatically and be remotely disabled if lost. Restrict exporting guest lists to authorised staff.",
      "Before switching over, identify duplicate spreadsheet bookings, confirm the correct entries with reception and import a checked dataset. Staff then use the shared service as the master; leaving the old spreadsheets editable would recreate conflicting records. This is a proposed transition control, not a claim that the supplier automatically cleans data.",
      "Monitor service availability and staff Wi-Fi; assign account management and endpoint updates to named responsible staff/providers. Back up the hosted records, agree recovery targets and test restoration. During an outage, use a controlled temporary log and verified availability process; do not promise rooms using an unverified old list. Reconcile changes when access returns.",
    ],
    journeys:[
      "Reception receives a booking request, checks dates and room capacity, and confirms one allocation. Another receptionist checking the same dates sees the changed availability. The manager's occupancy summary uses that saved allocation rather than a separately typed total.",
      "A guest leaves. Reception records check-out, and housekeeping receives the room-cleaning task. A team member marks the room ready from the staff device. Reception sees the new status before allocating an arriving guest; an out-of-service room remains unavailable even if it is not reserved.",
    ],
    future:"For more rooms or additional event spaces, add uniquely identified resources and update licences, wireless capacity and staff permissions. Test simultaneous bookings, event clashes, room-status changes and every role's access before launch. Online booking could later call the same allocation service rather than create another disconnected diary; it is a proposed option, not a requirement invented from the brief.",
    commentary:["The main problem—duplicate spreadsheets—is solved through one controlled allocation service, not just by buying new PCs.","Every named role is represented, including housekeeping and events; data and resulting management information are distinguished.","The diagrams, records and journeys agree with one another. Capacity checks and room readiness explain how the service actually prevents mistakes."],
  },
  {
    id:"repair",title:"Vehicle repair business",drillIndex:2,
    assumptions:"I assume a single premises with the reception, workshop and parts storage named in the brief. Staff/device numbers and budget must be taken from the real task. I propose a managed hosted garage service and workshop Wi-Fi following a coverage survey; no second site is assumed.",
    opening:"I propose a shared garage-management service connecting customer bookings, repair jobs and parts stock. Reception creates bookings, the workshop manager allocates work, mechanics update assigned jobs and parts staff record stock movements. Linking these records means the workshop can see what was booked and reception can communicate accurate job status without repeatedly telephoning the workshop. The design provides both the network access and the business software needed by each role.",
    rooms:[
      {place:"Reception",provision:"Wired workstation; booking/customer application, email and a network printer if customers need printed job summaries.",reason:"Reception records customer and vehicle details, creates bookings and retrieves repair status. It does not need permissions to adjust stock balances."},
      {place:"Workshop manager's position",provision:"Suitable workstation with job-allocation, progress and parts-availability views.",reason:"The manager assigns a booked job to a mechanic, checks progress and identifies parts-related delays from the shared records."},
      {place:"Mechanics' work area",provision:"Managed, workshop-suitable tablets or shared supported workstations; staff Wi-Fi for mobile devices; assigned-job interface.",reason:"Mechanics can read the reported fault and record findings, work completed and parts used near the vehicle. Specialist diagnostic equipment would be added only if the actual brief requires it."},
      {place:"Parts storage",provision:"Workstation or managed handheld; stock application, with scanner support where parts are barcoded.",reason:"Parts staff check quantities, record receipts and reserve/issue parts against a job. A scanner reduces retyping but does not replace the stock software."},
    ],
    network:`RECEPTION PC / printer -- Ethernet --+
WORKSHOP MANAGER PC ----- Ethernet --+--> Managed switch --> Router/firewall --> Internet
PARTS workstation ------- Ethernet --+           |                                  |
                                                |                                HTTPS
                                      Workshop access point                        |
                                                |                          Hosted garage application
                                            Staff Wi-Fi                            |
                                                |                          Private garage database
                                      MECHANICS' managed devices                    |
                                                                          Protected off-site backup`,
    networkExplanation:"All fixed devices connect through the switch; mobile workshop devices use an access point connected to that same network. Check workshop coverage and interference before accepting the design. Each authorised client accesses the hosted application over HTTPS through the router/firewall. The application, not a tablet, connects directly to the private database. Network equipment is secured, guest devices are separated, and the printer is reachable only by the roles that need it.",
    data:[
      {record:"Customer, vehicle and booking",fields:"CustomerID, contact details; VehicleID, registration, CustomerID; BookingID, VehicleID, date/time, reported fault",use:"Unique IDs link each booking to the right vehicle and contact. The registration is useful for finding a vehicle, but repair history is linked through its stable record ID."},
      {record:"Repair job and staff",fields:"JobID, BookingID, assigned mechanic ID, findings, work done, status, timestamps; StaffID and role",use:"A mechanic updates the assigned job. The manager sees outstanding work, and reception can use a completed status to contact the customer."},
      {record:"Part and stock movement",fields:"PartID, description, quantity on hand, reserved quantity; MovementID, PartID, JobID where applicable, quantity, type/date",use:"Available stock is on-hand less reserved stock. Recording the movement connects an issued part to a specific repair instead of silently overwriting a number."},
    ],
    dfd:`LEVEL 0 DFD — [entity], (process), ||data store||
[Customer / reception] -- contact / vehicle / booking request --> (1.0 Book repair)
||Customers and vehicles|| -- existing contact / vehicle details --> (1.0 Book repair)
(1.0 Book repair) -- validated contact / vehicle details --> ||Customers and vehicles||
||Bookings|| -- occupied slots --> (1.0 Book repair)
(1.0 Book repair) -- booking / vehicle reference --> ||Bookings||
(1.0 Book repair) -- confirmation --> [Customer / reception]
||Bookings|| -- booked work --> (2.0 Allocate and update job)
[Workshop manager] -- mechanic assignment --> (2.0 Allocate and update job)
(2.0 Allocate and update job) -- assigned work --> [Mechanic]
[Mechanic] -- findings / progress / completion --> (2.0 Allocate and update job)
(2.0 Allocate and update job) -- job record --> ||Repair jobs||
||Repair jobs|| -- current job status --> (2.0 Allocate and update job)
(2.0 Allocate and update job) -- progress / completion information --> [Reception]
[Parts staff] -- delivery / reservation / issue details --> (3.0 Control parts)
||Parts and stock movements|| -- quantities / reservations --> (3.0 Control parts)
||Repair jobs|| -- valid job reference --> (3.0 Control parts)
(3.0 Control parts) -- stock movement / updated reservation --> ||Parts and stock movements||
(3.0 Control parts) -- availability / issue confirmation --> [Parts staff]
(3.0 Control parts) -- part issue linked to job --> ||Repair jobs||
||Repair jobs|| -- work status --> (4.0 Produce workshop overview)
||Parts and stock movements|| -- low stock / usage --> (4.0 Produce workshop overview)
(4.0 Produce workshop overview) -- workload / parts shortages --> [Workshop manager]`,
    flowExplanation:"Reception enters a request and receives a confirmed booking after a slot check. The workshop manager creates and allocates the linked job. Parts staff reserve a needed part: it remains physically on hand but is unavailable to other jobs. When issued, the service reduces both the on-hand and reserved quantities and records the movement against JobID. Each update is validated and committed together so simultaneous requests cannot issue the same final item twice. The DFD uses processes between people and stores: no user writes directly into a database symbol.",
    operation:[
      "Mechanics can update their assigned work but cannot change customer contact exports or stock balances directly. Parts staff manage stock operations; the manager can allocate jobs and review exceptions. Use named accounts, server-enforced permissions, logged changes and prompt removal of access when staff leave.",
      "The IT provider maintains network devices and endpoints; the application supplier maintains the hosted application. Keep devices patched, protected and locked when unattended. Review failed backups and restore sample records, including linked jobs and stock movements, to verify that recovery preserves the relationships.",
      "If the network fails, use controlled numbered job sheets and a temporary parts-issue log approved by the manager. Avoid recording the same part issue twice when synchronising later. Restore the service, reconcile stock and work updates, then close the temporary log. Recovery targets and backup frequency must be agreed from the actual operational constraints, not guessed as exam facts.",
    ],
    journeys:[
      "Reception books a vehicle and records the reported fault. The workshop manager retrieves that booking, creates the job and assigns a mechanic. The mechanic reads the job on a workshop device, records findings and completes the work. Reception retrieves the resulting completion information and contacts the customer linked to that vehicle.",
      "A mechanic needs a replacement part. Parts staff check availability and reserve it against the job; the manager can see whether work must wait. On issue, one authorised transaction updates stock and records the job's part use. A competing request cannot consume a part already reserved for another repair.",
    ],
    future:"Additional mechanics or bays need suitable devices, user accounts, licences and a coverage/capacity review, not separate copies of the database. If a new branch is later required, a SiteID can distinguish bookings and stock locations, with tested permissions before rollout. Acceptance checks should trace a complete booking-to-completion journey, a competing stock issue, restricted mechanic access and a restore of linked records.",
    commentary:["Reception, workshop management, mechanics and parts storage all have appropriate provision—no workshop omission.","Hardware is paired with business software, permissions and named records, so the answer is more than a shopping list.","The stock example explains an actual processing rule and its information outputs. The network and Level 0 DFD answer different questions and use consistent roles."],
  },
];
