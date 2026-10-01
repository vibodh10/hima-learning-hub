"use client";

import {ChangeEvent, useMemo, useState} from "react";

type AssessmentDraft = {
    title: string;
    purpose: string;
    questions: string[];
};

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".htm"];

export function SowAssessmentGenerator() {
    const [sourceName, setSourceName] = useState("");
    const [sowText, setSowText] = useState("");
    const [error, setError] = useState("");

    const topics = useMemo(() => extractTopics(sowText), [sowText]);
    const assessments = useMemo(() => buildAssessments(topics), [topics]);

    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        setError("");
        if (!file) return;

        const lower = file.name.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.some(extension => lower.endsWith(extension))) {
            setSourceName(file.name);
            setSowText("");
            setError("Please upload a text, CSV, Markdown, JSON or HTML version of the SOW. Word, Excel and PDF files need to be exported to one of these formats first.");
            return;
        }

        try {
            const text = await file.text();
            setSourceName(file.name);
            setSowText(cleanText(text));
        } catch {
            setSourceName(file.name);
            setSowText("");
            setError("This file could not be read. Please export the SOW as text or CSV and try again.");
        }
    }

    function downloadDrafts() {
        if (!assessments.length) return;
        const payload = JSON.stringify({
            source: sourceName || "pasted SOW",
            generatedAt: new Date().toISOString(),
            assessments,
        }, null, 2);
        const blob = new Blob([payload], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "formative-assessment-drafts.json";
        link.click();
        URL.revokeObjectURL(url);
    }

    return <section className="card border-2 border-purple-200 bg-purple-50/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
                <p className="eyebrow">Start here</p>
                <h2 className="mt-2 text-2xl font-bold">Upload your Scheme of Work</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                    The hub will create three formative assessment drafts from your SOW:
                    recall and understanding, application, then exam-style reasoning.
                    Review the questions before giving them to students.
                </p>
            </div>
            {assessments.length > 0 &&
                <button type="button" className="button-secondary" onClick={downloadDrafts}>
                    Download drafts
                </button>}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
                Upload SOW
                <input
                    className="input"
                    type="file"
                    accept=".txt,.md,.csv,.json,.html,.htm,text/plain,text/csv,text/markdown,application/json,text/html"
                    onChange={handleFile}
                />
                <span className="text-xs font-normal text-slate-500">
                    Accepted now: TXT, CSV, Markdown, JSON and HTML.
                </span>
            </label>

            <label className="grid gap-2 text-sm font-semibold">
                Or paste SOW content
                <textarea
                    className="input min-h-36 resize-y"
                    value={sowText}
                    onChange={event => {
                        setSourceName("");
                        setError("");
                        setSowText(event.target.value);
                    }}
                    placeholder="Paste weeks, topics, learning aims, outcomes or lesson headings here..."
                />
            </label>
        </div>

        {sourceName && !error &&
            <p className="mt-3 text-sm text-emerald-800">
                Loaded <strong>{sourceName}</strong>.
            </p>}
        {error &&
            <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-950" role="alert">
                {error}
            </p>}

        {sowText.trim().length > 0 && topics.length === 0 &&
            <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                Add a little more detail to the SOW so the hub can identify teachable topics.
            </p>}

        {assessments.length > 0 &&
            <div className="mt-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="eyebrow">Generated drafts</p>
                        <h3 className="mt-2 text-xl font-bold">Three formative checks</h3>
                    </div>
                    <p className="text-xs text-slate-500">{topics.length} SOW topic{topics.length === 1 ? "" : "s"} identified</p>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    {assessments.map((assessment, index) =>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5" key={assessment.title}>
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-900">
                                Check {index + 1}
                            </span>
                            <h4 className="mt-3 text-lg font-bold">{assessment.title}</h4>
                            <p className="mt-2 text-sm text-slate-600">{assessment.purpose}</p>
                            <ol className="mt-4 space-y-3 text-sm">
                                {assessment.questions.map((question, questionIndex) =>
                                    <li className="rounded-xl bg-slate-50 p-3" key={questionIndex}>
                                        <strong>{questionIndex + 1}.</strong> {question}
                                    </li>)}
                            </ol>
                        </article>)}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                    These are teacher drafts, not automatically assigned assessments. Check wording, level and awarding-body requirements before publishing.
                </p>
            </div>}
    </section>;
}

function buildAssessments(topics: string[]): AssessmentDraft[] {
    if (topics.length === 0) return [];

    const selected = spreadTopics(topics, 6);
    const topic = (index: number) => selected[index % selected.length];

    return [
        {
            title: "Recall and understanding",
            purpose: "Use after the first part of the teaching sequence to identify gaps in core knowledge.",
            questions: [
                `Define or describe the main idea behind “${topic(0)}”.`,
                `Give two important facts, rules or features connected with “${topic(1)}”.`,
                `Explain the difference between “${topic(0)}” and “${topic(2)}”.`,
                `Give one correct example of “${topic(3)}”.`,
                `What common mistake could a learner make when working with “${topic(4)}”?`,
                `In one or two sentences, explain why “${topic(5)}” matters in this unit.`,
            ],
        },
        {
            title: "Application check",
            purpose: "Use midway through the SOW to check whether students can apply knowledge independently.",
            questions: [
                `Apply what you know about “${topic(0)}” to a new classroom or workplace scenario.`,
                `A learner has used “${topic(1)}” incorrectly. Identify the likely error and explain how to correct it.`,
                `Choose an appropriate method or approach for a task involving “${topic(2)}” and justify your choice.`,
                `Create a short worked example, plan, diagram or code fragment that demonstrates “${topic(3)}”.`,
                `What evidence would show that someone understands “${topic(4)}” rather than simply remembering it?`,
                `Connect “${topic(5)}” to another topic in this SOW and explain the relationship.`,
            ],
        },
        {
            title: "Exam-style reasoning",
            purpose: "Use towards the end of the SOW to practise explanation, analysis and justified conclusions.",
            questions: [
                `Explain how “${topic(0)}” could be used to solve a realistic problem. Include a clear chain of reasoning.`,
                `Compare two possible approaches to a task involving “${topic(1)}”. Which factors should be considered?`,
                `Analyse what could go wrong if “${topic(2)}” is misunderstood or implemented badly.`,
                `A student says that “${topic(3)}” is always the best approach. Give a balanced response using evidence or examples.`,
                `Evaluate the importance of “${topic(4)}” within the wider unit. Include strengths, limitations or consequences where relevant.`,
                `Write an exam-style conclusion about “${topic(5)}” that is supported by at least two reasons.`,
            ],
        },
    ];
}

function extractTopics(value: string) {
    const lines = cleanText(value)
        .split(/\r?\n/)
        .map(line => line.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(line => line.length >= 4 && line.length <= 160)
        .filter(line => !/^(week|date|lesson|topic|learning objective|learning outcome|resources?|assessment|homework)\s*[:\-]?$/i.test(line));

    const unique = new Map<string, string>();
    for (const line of lines) {
        const key = line.toLowerCase();
        if (!unique.has(key)) unique.set(key, line);
        if (unique.size >= 30) break;
    }
    return [...unique.values()];
}

function spreadTopics(topics: string[], count: number) {
    if (topics.length <= count) return topics;
    const result: string[] = [];
    for (let index = 0; index < count; index++) {
        const position = Math.round(index * (topics.length - 1) / (count - 1));
        result.push(topics[position]);
    }
    return result;
}

function cleanText(value: string) {
    return value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\u0000/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
