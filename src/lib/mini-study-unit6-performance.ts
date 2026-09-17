import {makeStudyPack} from "./mini-study-pack";
import type {ShortStudyIdea} from "./mini-study-pack";

const unit6PerformanceIdeas: ShortStudyIdea[] = [
  {id:"client-server",topic:"A2",title:"Know where website code is running",skill:"performance",
    lines:["Client-side code runs in the user's browser.","Server-side code runs on a server before or while a response is produced.","Where work happens can affect response time, security and how much data must travel."],
    example:"A browser can show or hide a menu immediately with client-side JavaScript, while a server may retrieve protected account data before sending a response.",
    help:"Ask whether the work needs trusted server data or can safely happen in the browser.",
    question:"Where does client-side JavaScript normally execute?",answers:["In the user's browser","Only inside the database server","Inside an image file"],feedback:"Client-side JavaScript normally runs in the browser. Server-side code runs on the server and can handle trusted processing or data access.",
    pairs:[["Client-side script","Runs in the browser"],["Server-side script","Runs on the server"]],
    analyse:"Moving suitable interaction to the browser can avoid a server round trip, while protected operations still need trusted server processing.",
    evaluate:"Choose where code runs from the task, security and performance requirements rather than assuming one side is always faster."},
  {id:"browser-compatibility",topic:"A2",title:"Check browser and device compatibility",skill:"compatibility",
    lines:["Browsers can differ in their support or interpretation of web features.","A page that works in one browser is not automatically proven compatible everywhere.","Progressive enhancement keeps essential content and tasks usable when optional features are unavailable."],
    example:"A course-search control works in one desktop browser but fails in a second browser because an unsupported feature has no fallback.",
    help:"Repeat the same important task in the browsers and devices named in the requirements.",
    question:"What is the strongest evidence of browser compatibility?",answers:["The required tasks pass in the target browsers","The page worked once in the developer's browser","The HTML file has many lines"],feedback:"Compatibility needs testing in the environments that matter to the intended users.",
    pairs:[["Compatibility test","Repeats required behaviour in a target environment"],["Progressive enhancement","Keeps core content usable while adding supported enhancements"]],
    analyse:"A cross-browser failure can block the user's task even when the same code works perfectly in another browser.",
    evaluate:"Prioritise the browsers and devices required by the audience, then record any unsupported environments as limitations."},
  {id:"bandwidth-cache-assets",topic:"A2",title:"Reduce the work needed to load a page",skill:"performance",
    lines:["Large files take longer to transfer on limited connections.","Caching can reuse suitable previously downloaded resources instead of fetching them again.","Image format, compression, scripts and other assets all contribute to page weight and processing."],
    example:"A 5 MB photograph used as a small card image is resized and compressed. A repeat visit can also reuse a cached stylesheet when the caching rules allow it.",
    help:"Measure transfer size and loading behaviour before deciding which asset to optimise.",
    question:"Which change most directly reduces unnecessary image transfer for a small card?",answers:["Resize and compress the image appropriately","Increase the image dimensions","Duplicate the image file several times"],feedback:"Appropriate dimensions and compression can reduce transfer size while preserving enough visual quality for the task.",
    pairs:[["Bandwidth","Amount of data a connection can transfer in a period"],["Cache","Stored reusable resource data that can reduce repeat downloads"]],
    analyse:"Smaller suitable assets can improve loading most noticeably for users on slower connections or limited devices.",
    evaluate:"Compare measured loading and visual quality before and after optimisation; the smallest file is not automatically the best result."},
];

export const unit6PerformanceStudy = makeStudyPack("6",unit6PerformanceIdeas);
