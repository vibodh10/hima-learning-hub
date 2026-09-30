/** Based on Hima's six Assignment 1 documents supplied 30 September 2026.
 * Instructions support independent investigation; examples are fictional, not findings.
 * The supplied brief has no populated deadline. Do not infer one from lesson dates.
 */
export type WorkshopStep = {
  id: string; phase: string; title: string; section: string;
  explain: string; actions: string[]; evidence: string; check: string;
  starter?: string; help?: string; links?: {title: string; url: string}[];
};

export const assignmentWebsites = [
  {title: "Game Smart Yardley", url: "https://gamesmartyardley.co.uk/"},
  {title: "8BitBeyond", url: "https://www.8bitbeyond.com/"},
  {title: "Entertainment World", url: "https://www.entertainmentworld.co.uk/"},
  {title: "Crazy Thumbs", url: "https://crazythumbs.co.uk/"},
  {title: "Geeky Blinders", url: "https://www.geeky-blinders.co.uk/shop"},
  {title: "Super Retro Video Games", url: "https://www.superretrovideogames.co.uk/"},
  {title: "Console Cove", url: "https://consolecove.co.uk/"},
];

export const workshopSteps: WorkshopStep[] = [
  {
    id: "start", phase: "Get ready", title: "Start here: open your assignment", section: "Your existing assignment document",
    explain: "Your task is to compare, analyse and evaluate two websites. Today you will collect evidence and explain what it means. You are not building a website for Assignment 1.",
    actions: ["Open the assignment brief and your saved copy of ‘assignment1_Template with links’. Keep your document beside this guide.", "Save it in your Unit 6 folder with your name. If you have started, keep your existing writing and use the step selector to find the part you need."],
    evidence: "Your own saved document, ready to edit. Keep screenshots in a separate evidence folder.", check: "I have opened and saved my own assignment document.",
    help: "Learning goal: support comparisons and judgements with your own evidence. Work independently and write in your own words. Do not use AI to write the assignment. Your template contains research links; those links are starting points, not completed answers. Confirm the deadline and submission location with Hima."
  },
  {
    id: "template-links", phase: "Get ready", title: "Replace the template links with your writing", section: "Each template subheading, then References",
    explain: "The links under each heading help you research that principle. They are not the text you submit under the heading. Keep the heading, but replace its list of links with your own explanation and comparison.",
    actions: ["Open a link under the heading you are working on. Read the relevant information, then explain the idea in your own words and apply it to both websites using your evidence.", "Move each source link you actually used into References at the end. Add its author or organisation, date, title and access date to form a Harvard reference. Put a matching author–date citation beside the borrowed idea in your paragraph."],
    evidence: "A heading containing your own writing, with the source recorded under References rather than left as a list under that heading.", check: "I replaced the research links under this heading with my own text and referenced the sources I used.",
    starter: "Under ‘White space’: explain the principle in your own words with a citation, then compare your two examples. Under ‘References’: give the full details and link for the source you read.",
    help: "Repeat this process for every subheading. Keep a separate untouched copy of the original template if you want to retain all its research links. Do not copy sentences from the linked page. Only list sources you actually consulted; a bare URL is not a complete Harvard reference."
  },
  {
    id: "brief", phase: "Get ready", title: "Understand the client and the outcome", section: "Introduction — add this before the template headings",
    explain: "You are a junior web developer researching for Retro Rewind Games. It serves experienced gamers and new enthusiasts, and supports community activities and student placements.",
    actions: ["Note the five planned areas: retro consoles; classic games; events and tournaments; collectibles and merchandise; student work placements.", "Write one sentence explaining that your investigation will inform this future website. For each website you investigate, also consider its own owner’s goals."],
    evidence: "A short introduction explaining your role, task and client.", check: "I can distinguish Retro Rewind Games from the owners of my two chosen websites.",
    help: "The five areas are context for recommendations, not five pages you must build now. A.P1 compares design principles and audience/purpose suitability. A.M1 explains how design affects creativity, performance and client needs. A.D1 weighs evidence to justify an evaluation. Description alone does not meet the comparison requirement."
  },
  {
    id: "websites", phase: "Get ready", title: "Choose two websites from the brief", section: "Introduction",
    explain: "Use two different websites from the approved list below. These links come from your brief; investigate them yourself.",
    actions: ["Open two websites from the list. Write their names and home page URLs in your document.", "Choose one comparable task, such as finding a console and checking its condition. Use that same task on both websites."],
    evidence: "Two named websites and one shared task.", check: "My two websites are from the brief and my task is possible to investigate on both.", links: assignmentWebsites,
    help: "If a website is unavailable or blocks your tool, record this and ask Hima about another approved choice. Do not substitute restaurant examples from older support notes."
  },
  {
    id: "audience", phase: "Get ready", title: "Identify purpose and audience", section: "Introduction",
    explain: "Purpose means what a site is for. Audience means who it is intended to help. The client is the organisation that owns or commissions it.",
    actions: ["For website A, use its content to identify a purpose, audience and likely owner goal. Repeat for B.", "Explain one similarity or difference. Support your audience inference with products, language or services you actually saw."],
    evidence: "A short paragraph for each site and a direct comparison.", check: "I explained audience and purpose for both sites using evidence.",
    starter: "Website A appears to target … because its … . Website B … . Both …; however … .",
    help: "Do not claim private business targets or visitor demographics as facts. Mark an inferred goal as likely, and explain why you inferred it."
  },
  {
    id: "evidence", phase: "Get ready", title: "Capture one useful piece of evidence", section: "Evidence folder and relevant template heading",
    explain: "Evidence is something you observed or measured. A screenshot needs a caption and an explanation.",
    actions: ["On website A, capture the feature you want to discuss using the Snipping Tool. Save it as A01_navigation, or another clear name. Repeat on B as B01_navigation.", "Under each image in your document, record the page URL, capture date and what it shows. For a test, also record the method and result."],
    evidence: "Two labelled screenshots. Use identifiers such as A01 and B01 in your writing.", check: "A reader can identify the feature, page and date behind my evidence.",
    help: "Crop to the relevant feature but keep enough context. Do not include personal account information. Record browser, viewport and settings for measurements. ‘Not tested’ is more accurate than guessing."
  },
  {
    id: "compare", phase: "Learn the writing pattern", title: "Compare: put both websites together", section: "Use this pattern under every relevant template heading",
    explain: "Compare means identify a similarity and a difference using evidence from both websites.",
    actions: ["Choose one feature you have evidence for on both sites. Write what each site does.", "Connect the observations using ‘both’, ‘whereas’ or ‘however’. Explain whether each approach suits its audience and purpose."],
    evidence: "One comparison paragraph supported by your two evidence identifiers.", check: "My paragraph compares both sites and explains suitability, rather than only describing one.",
    starter: "Both websites … . In A01, website A …, whereas website B … (B01). This suits … because … .",
    help: "Fictional technique example: ‘Both library sites have search. Site A puts it on the home page; site B requires opening a menu. A makes the first search easier to find.’ This is not a finding about your gaming websites."
  },
  {
    id: "analyse", phase: "Learn the writing pattern", title: "Analyse: explain the effect", section: "Continue the same comparison paragraph",
    explain: "Analyse means explain how a design choice affects the user’s task and the owner’s goals. Include a drawback where your evidence supports one.",
    actions: ["Take your comparison and explain how the feature helps or hinders a particular user.", "Link that effect to a likely owner goal, such as helping visitors find products or event information."],
    evidence: "An explanation connecting feature → user effect → owner goal.", check: "I explained a consequence, with evidence, instead of only saying ‘it is good’.",
    starter: "This helps … to … because … . It may support the owner’s aim of … . However, … .",
    help: "Fictional technique example: ‘Visible library search reduces the steps needed to find a book, helping visitors reach the catalogue. A prominent search box also uses space that could promote events.’ Do not invent sales figures or timings."
  },
  {
    id: "evaluate-method", phase: "Learn the writing pattern", title: "Evaluate: justify a judgement", section: "End of a principle discussion or final evaluation",
    explain: "Evaluate means weigh strengths and weaknesses, then make a judgement supported by evidence. The best choice can depend on the user or task.",
    actions: ["Decide which approach is more effective for your chosen task, explaining why the strongest evidence matters.", "Acknowledge a limitation or trade-off and suggest a specific improvement."],
    evidence: "A justified judgement with a limitation and recommendation.", check: "My judgement follows from findings, not appearance or preference alone.",
    starter: "For …, A’s approach is more effective because … . However, … . I recommend … because … .",
    help: "Fictional technique example: ‘For visitors looking for a known book, visible search is stronger. This conclusion covers the catalogue task only; I did not test event bookings.’ You do not need three separate reports for Pass, Merit and Distinction. Develop your own connected discussion."
  },
  {
    id: "usability", phase: "Investigate the template headings", title: "Usability: try the shared task", section: "Usability",
    explain: "Usability is how easily people can achieve their goal. A good-looking home page is not enough evidence.",
    actions: ["Complete your shared task on A. Note the route, a helpful feature and any point of confusion. Repeat on B.", "Compare the routes and explain the effect on a new enthusiast or an experienced gamer."],
    evidence: "A route or step count for each site, screenshots and a comparison paragraph.", check: "I tried the same task on both sites and explained what helped or hindered it.",
    starter: "To find …, I used … on A and … on B. This made … easier/harder because … ."
  },
  {
    id: "space", phase: "Investigate the template headings", title: "White space: inspect one content area", section: "White space",
    explain: "White space is empty space around content. It can be any colour. It separates items and can reduce visual crowding.",
    actions: ["Capture a comparable product or information area on each website. Look at the gaps between text, images and controls.", "Explain whether the spacing helps users group information or creates too much separation."],
    evidence: "Two labelled examples and their effects on reading or finding a control.", check: "I linked spacing to a user task instead of only describing empty areas.",
    starter: "The space between … helps users distinguish … . Compared with B, A … ."
  },
  {
    id: "layout", phase: "Investigate the template headings", title: "Site layout: identify the reading order", section: "Site layout",
    explain: "Layout is how the page arranges information. Visual hierarchy makes some items more noticeable than others.",
    actions: ["Identify what you notice first on each site and where the shared task starts. Compare headings, columns and important controls.", "Explain whether the order supports the audience’s priorities. Use the screenshots you collected."],
    evidence: "A comparison of layout and hierarchy linked to audience and purpose.", check: "I explained why the arrangement helps or obstructs the intended task."
  },
  {
    id: "type", phase: "Investigate the template headings", title: "Typography: check readability", section: "Typographical",
    explain: "Typography includes font choice, size, line spacing and line length. A retro style can support branding but must remain readable.",
    actions: ["Compare a heading and a paragraph on both sites. Read the text at the same zoom level, then enlarge it.", "Explain how the font and spacing affect readability and how the style supports or limits the brand."],
    evidence: "Specific text examples and a balanced comparison of readability and creativity.", check: "I considered both readability and visual style.",
    help: "Avoid claiming one font is suitable for every person with dyslexia. Describe observable features and qualify possible effects."
  },
  {
    id: "pour", phase: "Accessibility: one check at a time", title: "Understand WCAG and POUR", section: "Accessibility — short introduction",
    explain: "WCAG is guidance for accessible web content. POUR groups it into Perceivable, Operable, Understandable and Robust.",
    actions: ["In your own words, explain: can users perceive the content, operate the controls, understand the information, and use it with assistive technologies?", "Use the next steps to collect evidence. Cross-reference observations already under other headings instead of copying the same paragraphs."],
    evidence: "A short explanation of POUR and a cited source.", check: "I know which observations I will use for each POUR principle.",
    help: "Robust concerns reliable interpretation by user agents, including assistive technologies. Responsive layout alone does not prove Robust. WCAG accessibility and general design principles overlap but are not identical.",
    links: [{title: "W3C: the four accessibility principles", url: "https://www.w3.org/WAI/WCAG22/Understanding/intro"}]
  },
  {
    id: "alt", phase: "Accessibility: one check at a time", title: "Perceivable: inspect one image", section: "Accessibility — Perceivable; cross-reference Media",
    explain: "Alternative text communicates an image’s purpose when the image cannot be seen. Context matters.",
    actions: ["Right-click a meaningful product image and choose Inspect. Find its img element and alt attribute, or use WAVE. Repeat on B.", "Record the actual alternative text and explain whether it communicates the image’s purpose in that context."],
    evidence: "Image context and the actual alt value for each tested image.", check: "I examined the text’s usefulness, not just whether alt exists.",
    help: "Decorative images can correctly use alt="+'""'+". A missing alt attribute and an intentionally empty one are different. Inspecting one image does not establish accessibility for every image."
  },
  {
    id: "contrast", phase: "Accessibility: one check at a time", title: "Perceivable: check a text contrast pair", section: "Accessibility — Perceivable",
    explain: "Contrast is the difference between foreground and background colours. Use a checker rather than judging the colours by eye.",
    actions: ["Inspect a text element to identify its text and actual background colours. Enter them into WebAIM Contrast Checker. Repeat for comparable text on B.", "Record the colour values, reported ratio and the checker’s relevant result. Explain what that means for reading the text."],
    evidence: "Two colour pairs, checker results and a comparison.", check: "My recorded result matches the text and background I actually tested.",
    help: "Do not assume a transparent background is white. If a gradient or image prevents a reliable check, record the limitation. A passing colour pair does not establish whole-site conformance.",
    links: [{title: "WebAIM Contrast Checker", url: "https://webaim.org/resources/contrastchecker/"}]
  },
  {
    id: "keyboard", phase: "Accessibility: one check at a time", title: "Operable: put the mouse aside", section: "Accessibility — Operable; cross-reference Navigation",
    explain: "Keyboard users need to reach controls, see the current focus and activate them.",
    actions: ["Use Tab and Shift+Tab to move through your shared task on A. Use Enter for links and Enter or Space for buttons where appropriate. Note focus visibility and any trap. Repeat on B.", "Record whether the important menu, search and relevant controls could be reached and used."],
    evidence: "The tested route, keys used, results and any specific barrier.", check: "I actually used the keyboard and recorded the result for both sites.",
    help: "A mouse click cannot prove keyboard access. A screenshot can show focus, but describe the actions too. If an overlay blocks your test, record it."
  },
  {
    id: "understandable", phase: "Accessibility: one check at a time", title: "Understandable: inspect instructions", section: "Accessibility — Understandable; cross-reference Accuracy and understanding",
    explain: "Users need clear language, predictable controls and helpful instructions when something goes wrong.",
    actions: ["Compare a product description, instruction or form label on each site. Look for jargon, unclear wording or unexpected behaviour.", "If a suitable form is present, examine required-field instructions and visible error messages without sending an enquiry, creating an account or placing an order."],
    evidence: "A real wording or interaction example from each site and its likely effect.", check: "I explained how the information or behaviour affects understanding.",
    help: "If you cannot safely observe validation without sending data, write ‘not tested’. Do not enter personal information or invent a form error."
  },
  {
    id: "robust", phase: "Accessibility: one check at a time", title: "Robust: inspect a control’s meaning", section: "Accessibility — Robust",
    explain: "Assistive technologies need to identify what a control is and what it does. For example, a search button needs a meaningful accessible name.",
    actions: ["Inspect a search or menu control. In the browser’s Accessibility pane, look for its computed name and role. Repeat on B and record what is available.", "If you already have an approved screen reader and know how to use it, compare the announcement. Otherwise state that screen-reader testing was not carried out."],
    evidence: "Observed name and role, or a clearly stated testing limitation.", check: "I distinguished an inspection result from a screen-reader test.",
    help: "An accessible name can come from visible text or other valid labelling. Missing aria-label alone is not proof of an error. Do not install old ChromeVox Classic from the support sheet. Ask Hima about approved assistive technology if needed."
  },
  {
    id: "wave", phase: "Accessibility: one check at a time", title: "Use WAVE to investigate one finding", section: "Accessibility — relevant POUR subsection",
    explain: "WAVE flags possible accessibility issues and supports human checking. Its output is evidence to investigate, not a grade.",
    actions: ["Enter a public page URL into WAVE, or use the extension if already available. Open the details of one finding and locate the feature. Repeat on B.", "Save the report context and explain the finding in your own words, including who could be affected."],
    evidence: "Page URL, test date, tool finding and your interpretation for each page.", check: "I explained a finding and did not claim that zero errors proves full accessibility.",
    help: "If the website or college network blocks the tool, keep your manual checks and record the limitation. Do not copy example findings or scores from the support notes.",
    links: [{title: "WAVE website checker", url: "https://wave.webaim.org/"}]
  },
  {
    id: "navigation", phase: "Investigate the template headings", title: "Navigation: compare routes and labels", section: "Navigation",
    explain: "Navigation helps users know where they are and where they can go next.",
    actions: ["Compare the main menu, a category link and the route back to the home page. Check the destinations and whether menus stay consistent across pages.", "Explain whether a beginner and an experienced collector would understand the labels. Link to your keyboard findings."],
    evidence: "A direct comparison of real navigation features and audience suitability.", check: "I tested links and explained the effect of their labels and organisation."
  },
  {
    id: "alignment", phase: "Investigate the template headings", title: "Alignment: inspect a group of items", section: "Alignment",
    explain: "Alignment places related content on consistent lines or edges. It can help users scan and compare information.",
    actions: ["Look at a row of products or a text-and-image area on each site. Compare the position of names, prices and controls.", "Explain whether the alignment helps users match the right details to the right item."],
    evidence: "Two specific examples with an explanation of scanning or reading.", check: "I linked alignment to a practical user effect."
  },
  {
    id: "consistency", phase: "Investigate the template headings", title: "Clarity and consistency: predict an action", section: "Clarity, consistency/intuitiveness",
    explain: "Intuitive design uses understandable cues. Consistent labels and controls help users predict what will happen.",
    actions: ["Compare the same type of control across two pages on each website: for example, search or product details.", "Explain whether labels, placement and behaviour are consistent, and how that affects learning to use the site."],
    evidence: "An observed consistency or inconsistency on each site and a comparison.", check: "I used examples from more than one page when judging consistency."
  },
  {
    id: "accuracy", phase: "Investigate the template headings", title: "Accuracy and understanding: verify a detail", section: "Accuracy and understanding",
    explain: "Useful content should be clear and reliable. An unsupported claim that all information is accurate is not evidence.",
    actions: ["Inspect a factual detail such as product condition, compatibility, opening hours or an event date on each site.", "Look for internal contradictions or clarity problems. If you cannot verify the detail, explain that limit rather than labelling it accurate."],
    evidence: "The exact detail, what you checked and its effect on user decisions.", check: "My accuracy claim is limited to what I could verify."
  },
  {
    id: "content", phase: "Investigate the template headings", title: "Content: judge relevance and feedback", section: "Content",
    explain: "Content includes written information and feedback from the interface. It should help people complete their task.",
    actions: ["Compare whether both sites provide the details needed for your task, such as price, condition or delivery information.", "Observe a safe interaction such as a search. Is an empty result or status message clear? Explain the effect of missing or useful information."],
    evidence: "A comparison of content relevance and a real interface message where available.", check: "I linked the information to what the intended user needs.",
    help: "Privacy and copyright may be discussed where relevant, but do not assume a legal breach from an absent symbol or one page. Distinguish an observation from an unverified concern."
  },
  {
    id: "media", phase: "Investigate the template headings", title: "Media: balance usefulness and cost", section: "Media",
    explain: "Product photos and video can explain details and create a nostalgic brand. They can also introduce loading and accessibility problems.",
    actions: ["Compare the purpose and usefulness of media on both sites. Link to alt-text evidence. If video has speech, inspect the availability and usefulness of captions.", "Explain a creative benefit and any observed drawback. If a site has no video, say so; do not invent a caption test."],
    evidence: "A balanced comparison of actual media, with evidence and limitations.", check: "I discussed why the media is useful and checked any claimed drawback.",
    help: "Do not assume a large-looking image has a large file size. Use a measurement before making a file-size claim."
  },
  {
    id: "simplicity", phase: "Investigate the template headings", title: "Simplicity: find an avoidable obstacle", section: "Simplicity",
    explain: "Simplicity means reducing unnecessary effort while keeping the information and choices users need.",
    actions: ["Review the shared task for distracting pop-ups, confusing choices or unnecessary actions on each site.", "Compare one helpful simplification or obstacle, then explain the trade-off. Fewer options are not always better."],
    evidence: "A specific comparison of user effort and relevant choice.", check: "I explained simplicity in relation to a task, not just a plain appearance."
  },
  {
    id: "responsive", phase: "Check performance and creativity", title: "Responsive design: resize the page", section: "Performance and creativity — add after the template headings",
    explain: "Responsive design adapts a page to the available screen space. Browser simulation is useful but is not a real-device test.",
    actions: ["Open Inspect, toggle the device toolbar and use the same narrow width on both sites. Also inspect a wider view. Record the widths.", "Compare overflow, text readability, images, menu changes and usable buttons. Explain the effect on your shared task."],
    evidence: "Labelled narrow and wide screenshots, viewport widths and findings.", check: "I tested both sites at comparable sizes and described whether I used simulation or a real device.",
    help: "If another browser is available, try the same task there and record its name and version. A page looking fine in two browsers does not prove compatibility with every browser or assistive technology."
  },
  {
    id: "speed", phase: "Check performance and creativity", title: "Performance: run comparable reports", section: "Performance and creativity",
    explain: "Performance concerns how quickly and smoothly users can access and use a page. A score describes particular test conditions.",
    actions: ["Use PageSpeed Insights on a relevant page from A and B. Select the same device setting and save the URL, date, score and one labelled measurement from each report.", "Read one diagnostic finding. Explain a possible user effect and a sensible improvement, keeping measured results separate from possible causes."],
    evidence: "Comparable reports and an explanation of a finding for each site.", check: "My device settings match and my conclusions do not go beyond the measurements.",
    help: "You can alternatively use Chrome Inspect → Lighthouse → a page-load report. Compare the same settings. Lab results are simulated; field data reflects real users and may be unavailable. Scores can vary. Do not reuse the invented restaurant scores in the support sheet.",
    links: [{title: "PageSpeed Insights", url: "https://pagespeed.web.dev/"}, {title: "Chrome: Lighthouse instructions", url: "https://developer.chrome.com/docs/lighthouse/overview"}]
  },
  {
    id: "creativity", phase: "Check performance and creativity", title: "Creativity: explain the design trade-off", section: "Performance and creativity",
    explain: "Creative choices can help a brand stand out. Judge their usefulness as well as their originality.",
    actions: ["Compare a distinctive colour, visual theme, image or interaction from each site. Explain how it suits the audience and owner’s goals.", "Weigh that benefit against your readability, accessibility or performance findings. Recommend retaining or adapting one choice."],
    evidence: "An evidence-based discussion linking creative design to performance and client requirements.", check: "I linked creativity and performance rather than treating them as unrelated scores."
  },
  {
    id: "technical", phase: "Supporting investigation", title: "Inspect code or validation where useful", section: "Relevant principle heading — supporting evidence",
    explain: "Your Assignment Guide suggests HTML, semantic structure, CSS and validation checks. Use them to support a relevant point; you do not need to build code.",
    actions: ["Inspect one relevant element on each site: a heading, navigation landmark, form label or table heading. In Styles, identify a rule and its source where available.", "If using HTML or CSS validation, save the tested URL and one explained finding. Link it to structure, consistency or accessibility without assuming every warning causes a visible fault."],
    evidence: "A small code or validation example, its meaning and a linked design point.", check: "I explained why the technical evidence matters to my comparison.",
    help: "External stylesheets can support consistent maintenance; inline styles are not automatically invalid. Semantic HTML conveys meaning. Data tables need meaningful structure; if no table or form is present, say it was not applicable. Validation is not an accessibility or usability verdict.",
    links: [{title: "W3C markup validator", url: "https://validator.w3.org/"}, {title: "W3C CSS validator", url: "https://jigsaw.w3.org/css-validator/"}]
  },
  {
    id: "seo", phase: "Supporting investigation", title: "SEO: inspect a visible clue", section: "Content or Performance and creativity — supporting evidence",
    explain: "Search engine optimisation helps search engines discover and understand content. It does not guarantee a position in search results.",
    actions: ["Compare a page title, heading structure or meaningful URL from each website. You may inspect its meta description if present.", "Explain how the observed feature communicates the page’s topic and could support the owner’s aim of being found."],
    evidence: "A specific comparison with the page URL and source evidence.", check: "I described observed SEO features without inventing rankings or visitor numbers."
  },
  {
    id: "conclusion", phase: "Finish your own report", title: "Bring the evidence together", section: "Evaluation and conclusion — add after your investigations",
    explain: "Make a balanced overall judgement for the audience and purpose. Consider usability, accessibility, creativity and performance together.",
    actions: ["Identify the most important strengths and weaknesses of both sites. Decide which approach best serves your task and justify it with evidence identifiers.", "Explain a limitation of your investigation and recommend specific improvements. Then identify lessons for Retro Rewind Games and its five planned areas."],
    evidence: "An independent conclusion supported by findings, trade-offs and recommendations.", check: "My conclusion considers both site owners and clearly labels recommendations for Retro Rewind Games.",
    starter: "For …, the strongest approach is …, supported by … . However, … . Retro Rewind Games could adapt … because … .",
    help: "Do not treat all audiences as identical or declare a universal winner from one score. A recommendation needs a feature to change, an intended benefit and a reason grounded in your investigation."
  },
  {
    id: "references", phase: "Finish your own report", title: "Add and check Harvard references", section: "Throughout your writing and References at the end",
    explain: "Cite borrowed ideas beside the relevant sentence and include matching source details in your reference list. Your brief requires Harvard referencing.",
    actions: ["Move the template’s research links you actually used to References and complete their Harvard details: author or organisation, year if supplied, page title, URL and your access date. Match each in-text citation to a reference.", "Check that every template heading now contains your own text instead of its original list of links. Credit screenshots with site, page URL and capture date. Remove sources you did not use."],
    evidence: "A reference list matching your citations and screenshot captions.", check: "My source details are real and every borrowed idea has an appropriate citation.",
    starter: "Organisation (Year) Page title. Available at: URL (Accessed: day month year).",
    help: "Use ‘no date’ if the page gives no date. Do not copy access dates or publication years from the support examples without checking the source. Paraphrasing still needs a citation. Follow Hima’s preferred Harvard format consistently."
  },
  {
    id: "review", phase: "Finish your own report", title: "Check the actual writing before submission", section: "Your full document and Assignment1_Checklist_Guide",
    explain: "Check your document against the brief. Reading this guide or ticking boxes does not prove that an assessment criterion has been achieved.",
    actions: ["Use the checklist below to locate evidence in your actual document. Fix any missing comparisons, unsupported claims or unreadable screenshots.", "Open the final saved file. Use Hima’s confirmed submission route and deadline, then check the receipt identifies the correct file."],
    evidence: "A checked document and, once submitted, the receipt from the submission system.", check: "I checked my actual file and know where and when to submit it.",
    help: "If you are stuck, show Hima the exact heading, your attempted paragraph and the evidence you collected. Record any permitted feedback, the improvement you made and one remaining target. Do not mark yourself as submitted until the real system confirms receipt."
  }
];

export const submissionChecks = [
  "A.P1: I directly compared principles in both websites, including suitability for audience and purpose.",
  "A.M1: I analysed how design decisions affect creativity, performance and the website owner’s requirements.",
  "A.D1: I evaluated strengths, weaknesses and outcomes, using evidence to justify my judgements.",
  "I used my own observations for POUR, design principles and performance, and stated testing limitations.",
  "I linked recommendations for Retro Rewind Games to its audience, community purpose and planned content.",
  "My screenshots are labelled, tool results have context, and Harvard citations match my references.",
  "I replaced the links beneath each template heading with my own writing and placed the sources I used under References as full Harvard entries.",
  "I removed placeholders and example claims, saved my final file and checked Hima’s submission instructions."
];
