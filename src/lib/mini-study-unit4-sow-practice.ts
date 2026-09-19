import {makeStudyPack,type ShortStudyIdea} from "./mini-study-pack";

/**
 * Future Unit 4 reinforcement content. These lessons can exist in the codebase
 * safely because mini-study-sow-release.ts controls when each one becomes
 * available to learners.
 */
const ideas:ShortStudyIdea[]=[
  {id:"file-handling",topic:"A4",title:"Open, read, write and close files",skill:"file-handling",
    lines:["Programs can store data in files so information remains available after the program closes.","Reading gets data from a file; writing changes or adds data in a file.","Use the correct file mode and close the file, or use a context manager that closes it automatically."],
    example:"with open(\"scores.txt\",\"r\") as file: reads existing score data without overwriting it.",help:"Remember R = read existing data, W = write from the start, A = append to the end.",
    question:"Which mode should be used to read an existing text file without replacing it?",answers:["r","w","a"],feedback:"Read mode opens existing data for reading. Write mode can replace existing contents and append adds to the end.",
    pairs:[["Read","Get saved data from a file"],["Write","Store new data in a file"]],analyse:"Saving data in a file lets a program reuse information in a later session instead of losing it when memory is cleared.",evaluate:"Choose the file format and mode to match the data and test what happens when the file is missing or unavailable."},
  {id:"files-functions",topic:"A4",title:"Use files with functions",skill:"file-functions",
    lines:["A function can take a filename or data as a parameter.","Separating file loading from processing keeps responsibilities clearer.","Return values can pass loaded or processed data back to the caller."],
    example:"load_scores(filename) can open a chosen file, read its lines and return the scores to the rest of the program.",help:"Think input → function job → returned result. Keep file access separate from unrelated screen code where possible.",
    question:"Why might load_scores(filename) be better than repeating file-reading code in several places?",answers:["It keeps the file-reading logic reusable in one place","It guarantees every file always exists","It removes the need to test file errors"],feedback:"A focused reusable function reduces duplication. It still needs error handling and testing.",
    pairs:[["Parameter","Lets the caller provide the filename"],["Return value","Sends the loaded result back"]],analyse:"Separating loading and processing makes each part easier to test and change independently.",evaluate:"Keep the function focused and handle failures such as missing files rather than assuming every read will succeed."},
  {id:"tuples-dictionaries",topic:"A4",title:"Choose tuples and dictionaries for structured data",skill:"data-structures",
    lines:["A tuple is an ordered collection commonly used for a fixed group of values.","A dictionary stores key-value pairs and is useful when values need meaningful labels.","Choose a structure based on how the program needs to access and change the data."],
    example:"student={\"name\":\"Aisha\",\"score\":18} lets the program use student[\"score\"] instead of remembering a numeric position.",help:"Use a list when sequence matters, a dictionary when named keys make lookup clearer, and a tuple when a fixed ordered group fits the job.",
    question:"Which structure best stores a learner's name, ID and score using meaningful labels?",answers:["Dictionary","Single Boolean","One floating-point number"],feedback:"Dictionary keys such as name, id and score make the stored values easier to identify.",
    pairs:[["Tuple","Ordered group usually treated as fixed"],["Dictionary","Key-value pairs accessed by meaningful keys"]],analyse:"A dictionary can make code easier to understand because the key explains what each value represents.",evaluate:"Use the simplest structure that supports the required operations; extra complexity is not automatically better."},
  {id:"modular-programming",topic:"A4",title:"Split a program into clear modules",skill:"modularity",
    lines:["Modular programming separates a larger solution into smaller parts with clear responsibilities.","Functions and modules should communicate through deliberate inputs and outputs.","Clear boundaries reduce duplication and make testing easier."],
    example:"A Pony Runner project could keep player movement, score handling and file saving in separate functions or modules instead of one very long block.",help:"Ask what one part of the program is responsible for. If it has several unrelated jobs, split it.",
    question:"What is a main benefit of modular programming?",answers:["Smaller parts can be tested and maintained more independently","Every module must contain the same number of lines","It prevents all bugs automatically"],feedback:"Clear modules reduce unnecessary coupling and make changes easier to isolate and test.",
    pairs:[["Module","A separated part with a clear responsibility"],["Interface","The defined way parts exchange information"]],analyse:"A change to score saving is less likely to disturb movement code when responsibilities are separated cleanly.",evaluate:"Do not split code into tiny modules without purpose; boundaries should make the solution easier to understand and maintain."},
  {id:"pygame-events",topic:"A4",title:"Respond to user events in Pygame",skill:"event-driven",
    lines:["Event-driven programs react to events such as key presses, mouse clicks or window actions.","Pygame places events in an event queue that the program checks repeatedly.","An event handler should trigger the correct action without blocking the rest of the game loop."],
    example:"When a KEYDOWN event for SPACE is received, the game can call jump() rather than jumping continuously every frame.",help:"Think event → condition → action. Identify exactly which event should trigger the function.",
    question:"What should trigger jump() in an event-driven Pygame program if SPACE is the jump key?",answers:["A KEYDOWN event for SPACE","Every frame regardless of input","Only closing the window"],feedback:"The event identifies the user's action, then the handler calls the appropriate function.",
    pairs:[["Event","Something that happens, such as a key press"],["Handler","Code that responds to the event"]],analyse:"Event handling keeps user input separate from other repeated game updates such as drawing and movement.",evaluate:"Test intended and unintended inputs and make sure one event cannot trigger an unrelated action."},
  {id:"csv-data",topic:"B2",title:"Use CSV data in an application",skill:"csv-data",
    lines:["CSV files store tabular data as rows and columns.","A program can load CSV data, select records and use fields in calculations or displays.","The program should validate assumptions about column names, types and missing values."],
    example:"A budget application can load company records from companies.csv, let the user choose a company and then use that company's budget in calculations.",help:"Trace one row from the file into the variables or fields the program actually uses.",
    question:"What should a program check when loading a CSV file?",answers:["That required columns and usable values are present","Only that the filename looks attractive","That every value can be treated as text forever"],feedback:"The program depends on the expected structure and data types, so these assumptions should be checked.",
    pairs:[["CSV row","One record in the table"],["CSV column","One field or attribute across records"]],analyse:"Separating file loading from budget calculations makes it easier to diagnose whether an error comes from the data or from the calculation logic.",evaluate:"Test normal records, missing values and unexpected data before relying on the file in the final application."},
];

export const unit4SowPracticeStudy=makeStudyPack("4",ideas);
