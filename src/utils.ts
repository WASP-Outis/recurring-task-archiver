import { Frontmatter } from "./types";
import * as YAML from "yaml";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    if (!match) {
        return { frontmatter: {}, body: content };
    }
    const frontmatterText = match[1];
    const body = match[2];
    try {
        const frontmatter = YAML.parse(frontmatterText) || {};
        return { frontmatter, body };
    } catch (error) {
        console.error("Error parsing frontmatter:", error);
        return { frontmatter: {}, body: content };
    }
}

export function serializeFrontmatter(frontmatter: Frontmatter, body: string): string {
    try {
        const yamlString = YAML.stringify(frontmatter, {
            defaultStringType: 'QUOTE_DOUBLE',
            defaultKeyType: 'PLAIN'
        });
        return "---\n" + yamlString.trim() + "\n---\n" + body;
    } catch (error) {
        console.error("Error serializing frontmatter:", error);
        return "---\n" + JSON.stringify(frontmatter, null, 2) + "\n---\n" + body;
    }
}

export function copySubtasksAndUncheck(body: string): string {
    const lines = body.split("\n");
    const processedLines: string[] = [];
    for (const line of lines) {
        const checkboxPattern = /^(\s*)-\s(x|X| )\s/;
        if (checkboxPattern.test(line)) {
            const unchecked = line.replace(checkboxPattern, "$1- [ ] ");
            processedLines.push(unchecked);
        } else {
            processedLines.push(line);
        }
    }
    return processedLines.join("\n");
}

export function normalizeString(str: string): string {
    return str.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s\u0600-\u06FF]/g, "");
}

export function parseFlexibleDate(dateString: string, format?: string): dayjs.Dayjs | null {
    if (!dateString || typeof dateString !== "string") {
        return null;
    }
    const dateStr = dateString.trim();
    const formats = [
        format || "YYYY-MM-DD",
        "YYYY/MM/DD",
        "DD-MM-YYYY",
        "DD/MM/YYYY",
        "MM-DD-YYYY",
        "MM/DD/YYYY",
        "YYYY-MM-DD HH:mm",
        "YYYY-MM-DDTHH:mm:ss",
    ];
    for (const fmt of formats) {
        const parsed = dayjs(dateStr, fmt, true);
        if (parsed.isValid()) {
            return parsed;
        }
    }
    const parsed = dayjs(dateStr);
    return parsed.isValid() ? parsed : null;
}

export function generateUniqueFileName(baseName: string, extension: string = "md"): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return baseName + "-" + timestamp + "-" + random + "." + extension;
}

export function sanitizeFileName(fileName: string): string {
    return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, " ").trim();
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return function (this: any, ...args: Parameters<T>) {
        const context = this;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function isValidDate(date: any): boolean {
    if (!date) return false;
    const parsed = dayjs(date);
    return parsed.isValid();
}