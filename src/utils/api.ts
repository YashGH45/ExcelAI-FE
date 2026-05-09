// utils/api.ts

// Single source of truth for the session identifier sent to every endpoint.
// The backend uses this to associate uploaded files with chat requests.
const SESSION_ID = "abc123";

interface FileContext {
    name: string;
    rowCount: number;
    colCount: number;
    preview: string;
    raw: unknown[][];     // array of rows from SheetJS
}

export interface UploadResponse {
    filename:   string;
    rows?:      number;
    col_count?: number;
}

/** Structured response from the backend chat endpoint */
export interface ChatResponse {
    reply: string;
    /** Vega-Lite spec — present when the backend generated a chart */
    vega_spec?: Record<string, unknown>;
    /** Key insights extracted from the analysis */
    insights?: string[];
    /** Download URL for a file returned by the backend, e.g. "/api/download/result.csv" */
    download_url?: string;
}

/** Send a message to FastAPI and return the full chat response */
export const sendMessage = async (
    message: string,
    fileContext: FileContext | null
): Promise<ChatResponse> => {
    const res = await fetch("/api/chat", {           // Vite proxies this to :8000
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            session_id:   fileContext ? SESSION_ID : null,
            file_preview: fileContext?.preview ?? null,
            file_name:    fileContext?.name    ?? null
        }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    return {
        reply:        data.reply,
        vega_spec:    data.vega_spec    ?? undefined,
        insights:     data.insights     ?? undefined,
        download_url: data.download_url ?? undefined,
    };
};

/** Upload a file to FastAPI.
 *  Pass smartParser:true when Smart Parser mode is active.
 *  Answers are submitted separately via submitSmartParserAnswers. */
export const uploadFile = async (
    file: File,
    options: { smartParser?: boolean } = {},
): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    form.append("session_id", SESSION_ID);
    form.append("smart_parser", options.smartParser ? "true" : "false");

    const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
    });

    if (!res.ok) throw new Error("Upload failed");
    return res.json();
};

/** A single question returned by the Smart Parser questions endpoint */
export interface SmartParserQuestion {
    id: string;
    label: string;
    placeholder?: string;
    required?: boolean;
}

/** One answer entry — preserves question identity and response order */
export interface SmartParserAnswer {
    id: string;
    answer: string;
}

/** Fetch the list of questions from the backend */
export const fetchSmartParserQuestions = async (): Promise<SmartParserQuestion[]> => {
    const res = await fetch(`/api/smart-parser/questions?session_id=${SESSION_ID}`);
    if (!res.ok) throw new Error("Failed to load questions");
    return res.json();
};

/** Submit smart parser answers — triggers metadata generation on the backend */
export const submitSmartParserAnswers = async (
    answers: SmartParserAnswer[],
): Promise<{ status: string }> => {
    const res = await fetch("/api/smart-parser/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID, answers }),
    });
    if (!res.ok) throw new Error("Failed to submit answers");
    return res.json();
};

