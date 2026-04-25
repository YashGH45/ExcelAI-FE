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

/** Send a message to FastAPI and return the bot reply */
export const sendMessage = async (
    message: string,
    fileContext: FileContext | null
): Promise<string> => {
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
    return data.reply;
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