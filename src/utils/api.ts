// utils/api.ts

interface FileContext {
    name: string;
    rowCount: number;
    colCount: number;
    preview: string;
    raw: unknown[][];     // array of rows from SheetJS
}

interface UploadResponse {
    filename: string;
    size: number;
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
            session_id: "abc123",
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

/** Upload a file to FastAPI */
export const uploadFile = async (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
        method: "POST",
        body: form,                                    // no Content-Type header — browser sets it
    });

    if (!res.ok) throw new Error("Upload failed");
    return res.json();
};