import {makeStudyPack,type ShortStudyIdea} from "./mini-study-pack";

/**
 * Small reinforcement lessons that mirror the tutor's confirmed classroom
 * progress. They are deliberately narrower than later qualification content so
 * Hima never becomes the learner's first teacher for a future topic.
 */
const unit4TaughtIdeas:ShortStudyIdea[]=[
  {id:"functions-basics",topic:"A4",title:"Create and call a simple function",skill:"functions",
    lines:["A function groups instructions under a reusable name.","Defining a function creates it; calling the function runs its instructions.","A function can be useful before parameters or return values are introduced."],
    example:"def jump(): groups the instructions for a Pony Runner jump. Writing jump() later calls that function.",
    help:"Look for the function name after def, then find where the same name is followed by brackets to run it.",
    question:"Which line calls a function that was defined as def jump():?",answers:["jump()","def jump():","while jump:"],
    feedback:"The definition starts with def. Writing jump() calls the function and runs its instructions.",
    pairs:[["def jump():","Defines the function"],["jump()","Calls the function"]],
    analyse:"Putting repeated jump behaviour in one function reduces duplicated instructions in the game.",
    evaluate:"A function should have one clear job so it remains easy to test and change."},
];

const unit6TaughtIdeas:ShortStudyIdea[]=[
  {id:"html-page-basics",topic:"B2",title:"Build the basic structure of an HTML page",skill:"html",
    lines:["An HTML page uses html, head and body to organise the document.","The title belongs in the head and visible page content belongs in the body.","Headings, paragraphs, div, section and main organise visible content."],
    example:"A page can place its title in the head, then use main with an h1, paragraph and sections in the body.",
    help:"Ask whether the content describes the page to the browser or is meant to appear on the page itself.",
    question:"Where should the visible h1 and paragraph normally be placed?",answers:["Inside the body","Inside the title element","Outside the html element"],
    feedback:"Visible page content belongs in the body. The title element belongs in the head.",
    pairs:[["head","Page information such as the title"],["body","Visible page content"]],
    analyse:"A clear structure makes the page easier to extend and helps separate document information from visible content.",
    evaluate:"Use semantic elements such as main and section when they describe the content rather than adding them only for appearance."},
  {id:"links-images-folders",topic:"B2",title:"Link pages and add images using the right paths",skill:"html-links",
    lines:["The a element links one page or resource to another using href.","The img element loads an image using src and should have useful alternative text when the image conveys information.","Relative paths depend on where files and folders are stored."],
    example:"If index.html and about.html are in the same folder, href=\"about.html\" links them. An image in an images folder can use src=\"images/logo.png\".",
    help:"Start from the current HTML file and trace the folders needed to reach the target file.",
    question:"index.html and about.html are in the same folder. Which href links to the About page?",answers:["about.html","images/about.html","#about.png"],
    feedback:"Files in the same folder can be linked using the target file name as the relative path.",
    pairs:[["href","Destination used by a link"],["src","Resource path used by an image"]],
    analyse:"Keeping predictable folders and relative paths makes a multi-page website easier to move and maintain.",
    evaluate:"Test every link and image from the actual folder structure rather than assuming a path is correct."},
  {id:"css-methods",topic:"B2",title:"Choose inline, internal or external CSS",skill:"css",
    lines:["Inline CSS is written on an individual HTML element using its style attribute.","Internal CSS is written in a style element in the page head.","External CSS is stored in a separate stylesheet and linked to the HTML page.","A class selector lets the same style be applied to several elements."],
    example:"Several pages can link to styles.css so one class rule changes the same type of content across the site.",
    help:"Ask how many elements or pages need the rule. Repeated site-wide styles are usually easier to maintain in an external stylesheet.",
    question:"Which approach best shares the same styles across several HTML pages?",answers:["Link the pages to an external CSS file","Repeat every rule as inline CSS","Put a different style attribute on every element"],
    feedback:"An external stylesheet can be linked by several pages, reducing repeated presentation rules.",
    pairs:[["Internal CSS","Rules in a style element in the page head"],["External CSS","Rules in a separate linked stylesheet"]],
    analyse:"A shared stylesheet reduces duplication because the same class rule can control presentation on several pages.",
    evaluate:"Inline CSS can be useful for a very isolated case, but repeated site styling is usually easier to maintain when rules are separated and reused."},
];

export const unit4TaughtProgressStudy=makeStudyPack("4",unit4TaughtIdeas);
export const unit6TaughtProgressStudy=makeStudyPack("6",unit6TaughtIdeas);
