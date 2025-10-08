import { App, TFile, TFolder, normalizePath, Notice } from "obsidian";
import dayjs from "dayjs";
import Fuse from "fuse.js";
import {
    RecurringTaskSettings,
    RecurrenceRule,
    Frontmatter,
    ProcessingState
} from "./types";
import {
    parseFrontmatter,
    serializeFrontmatter,
    copySubtasksAndUncheck,
    normalizeString,
    parseFlexibleDate,
    sanitizeFileName,
    deepClone
} from "./utils";
import { I18n } from "./i18n/i18n";

export class TaskManager {
    private app: App;
    private settings: RecurringTaskSettings;
    private i18n: I18n;
    private processingFiles: Map<string, ProcessingState>; // 🔥 جلوگیری از race condition
    private fuse: Fuse<RecurrenceRule> | null = null; // 🔥 Fuzzy search

    constructor(app: App, settings: RecurringTaskSettings, i18n: I18n) {
        this.app = app;
        this.settings = settings;
        this.i18n = i18n;
        this.processingFiles = new Map();
        this.initializeFuzzySearch();
    }

    /**
     * 🔥 راه‌اندازی fuzzy search برای قوانین تکرار
     */
    private initializeFuzzySearch(): void {
        const enabledRules = this.settings.recurrenceRules.filter(r => r.enabled);

        this.fuse = new Fuse(enabledRules, {
            keys: ["key", "labelEn", "labelFa"],
            threshold: 0.3, // حساسیت fuzzy matching
            ignoreLocation: true,
            useExtendedSearch: true
        });

        if (this.settings.enableDebugLog) {
            console.log("🔍 Fuzzy search initialized with rules:", enabledRules);
        }
    }

    updateSettings(settings: RecurringTaskSettings): void {
        this.settings = settings;
        this.initializeFuzzySearch(); // بازسازی fuzzy search
    }

    /**
     * 🔥 بررسی اینکه آیا فایل باید پردازش شود
     */
    shouldProcessFile(file: TFile, frontmatter: Frontmatter): boolean {
        // بررسی lock
        if (this.isFileLocked(file.path)) {
            if (this.settings.enableDebugLog) {
                console.log("🔒 فایل در حال پردازش است:", file.path);
            }
            return false;
        }

        const completedField = this.settings.completedFieldName;
        const archivedField = this.settings.archivedFieldName;
        const recurrenceField = this.settings.recurrenceFieldName;

                const isCompleted = frontmatter[completedField] === true;
        const isArchived = frontmatter[archivedField] === true;
        const hasRecurrence = frontmatter[recurrenceField];

        if (this.settings.enableDebugLog) {
            console.log("📋 بررسی فایل:", {
                path: file.path,
                isCompleted,
                isArchived,
                hasRecurrence
            });
        }

        return isCompleted && !isArchived && !!hasRecurrence;
    }

    /**
     * 🔥 قفل کردن فایل برای جلوگیری از race condition
     */
    private lockFile(filePath: string): boolean {
        const now = Date.now();
        const existing = this.processingFiles.get(filePath);

        // اگر فایل قفل شده و هنوز timeout نشده
        if (existing && now - existing.timestamp < 30000) { // 30 ثانیه timeout
            return false;
        }

        // قفل کردن فایل
        this.processingFiles.set(filePath, {
            filePath,
            timestamp: now
        });

        return true;
    }

    /**
     * 🔥 باز کردن قفل فایل
     */
    private unlockFile(filePath: string): void {
        this.processingFiles.delete(filePath);
    }

    /**
     * 🔥 بررسی قفل بودن فایل
     */
    private isFileLocked(filePath: string): boolean {
        const now = Date.now();
        const existing = this.processingFiles.get(filePath);

        if (!existing) return false;

        // اگر timeout شده، unlock کن
        if (now - existing.timestamp > 30000) {
            this.unlockFile(filePath);
            return false;
        }

        return true;
    }

    /**
     * 🔥 پردازش تسک با مدیریت خطا بهتر
     */
    async processTask(
        file: TFile,
        shouldRecur: boolean,
        copySubtasks: boolean
    ): Promise<void> {
        // قفل کردن فایل
        if (!this.lockFile(file.path)) {
            new Notice("⚠️ این فایل در حال پردازش است، لطفاً صبر کنید");
            return;
        }

        try {
            const content = await this.app.vault.read(file);
            const { frontmatter, body } = parseFrontmatter(content);

            if (shouldRecur) {
                await this.createNextInstance(file, frontmatter, body, copySubtasks);
            }

            await this.archiveTask(file);

            if (this.settings.enableDebugLog) {
                console.log("✅ تسک با موفقیت پردازش شد:", file.path);
            }
        } catch (error) {
            console.error("❌ خطا در پردازش تسک:", error);
            
            let errorMessage = this.i18n.notifications.error;
            if (error instanceof Error) {
                errorMessage += `: ${error.message}`;
            }
            
            new Notice(errorMessage);
            throw error;
        } finally {
            // باز کردن قفل فایل
            this.unlockFile(file.path);
        }
    }

    /**
     * 🔥 ساخت نسخه بعدی با مدیریت خطا بهتر
     */
    private async createNextInstance(
        originalFile: TFile,
        frontmatter: Frontmatter,
        body: string,
        copySubtasks: boolean
    ): Promise<void> {
        const recurrenceValue = frontmatter[this.settings.recurrenceFieldName];
        const rule = this.findRecurrenceRule(recurrenceValue);

        if (!rule) {
            const msg = `⚠️ قانون تکرار نامعتبر: "${recurrenceValue}"`;
            console.warn(msg);
            new Notice(msg);
            return;
        }

        if (rule.key === "none") {
            if (this.settings.enableDebugLog) {
                console.log("ℹ️ قانون تکرار 'هیچ' است، نسخه جدید ساخته نمی‌شود");
            }
            return;
        }

        // محاسبه تاریخ سررسید جدید
        const currentDue = frontmatter[this.settings.dueDateFieldName];
        const newDueDate = this.calculateNextDueDate(currentDue, rule);

        if (!newDueDate) {
            new Notice("❌ خطا در محاسبه تاریخ سررسید جدید");
            return;
        }

        // ساخت فرانت‌متر جدید با deep clone
        const newFrontmatter: Frontmatter = deepClone(frontmatter);
        newFrontmatter[this.settings.completedFieldName] = false;
        newFrontmatter[this.settings.archivedFieldName] = false;
        newFrontmatter[this.settings.dueDateFieldName] = newDueDate;
        newFrontmatter[this.settings.createdFieldName] = dayjs().format(this.settings.dateFormat);

        // پردازش بدنه
        let newBody = body;
        if (copySubtasks) {
            newBody = copySubtasksAndUncheck(body);
        }

        // ساخت محتوای فایل جدید
        const newContent = serializeFrontmatter(newFrontmatter, newBody);

        // تعیین مسیر فایل جدید
        const originalFolder = originalFile.parent?.path || "";
        const newFileName = this.generateNewFileName(originalFile.basename, newDueDate);
        const sanitizedFileName = sanitizeFileName(newFileName);
        let newFilePath = normalizePath(`${originalFolder}/${sanitizedFileName}.md`);

        // بررسی وجود فایل و ساخت نام یونیک
        if (await this.app.vault.adapter.exists(newFilePath)) {
            newFilePath = await this.getUniqueFilePath(newFilePath);
            new Notice(`ℹ️ فایل با نام یونیک ساخته شد: ${newFilePath}`);
        }

        try {
            await this.app.vault.create(newFilePath, newContent);
            
            if (this.settings.enableDebugLog) {
                console.log("✅ فایل جدید ایجاد شد:", newFilePath);
            }
            
            new Notice(`✅ نسخه جدید ساخته شد: ${sanitizedFileName}`);
        } catch (error) {
            console.error("❌ خطا در ساخت فایل جدید:", error);
            throw new Error(`خطا در ساخت فایل: ${error}`);
        }
    }

    /**
     * 🔥 ساخت نام فایل جدید با بهبودهای امنیتی
     */
    private generateNewFileName(originalBasename: string, newDueDate: string): string {
        // Regex برای تشخیص تاریخ‌های مختلف
        const datePatterns = [
            /\d{4}-\d{2}-\d{2}/g,     // YYYY-MM-DD
            /\d{4}\/\d{2}\/\d{2}/g,   // YYYY/MM/DD
            /\d{2}-\d{2}-\d{4}/g,     // DD-MM-YYYY
            /\d{2}\/\d{2}\/\d{4}/g    // DD/MM/YYYY
        ];

        let result = originalBasename;
        let replaced = false;

        // تلاش برای جایگزینی تاریخ موجود
        for (const pattern of datePatterns) {
            if (pattern.test(result)) {
                result = result.replace(pattern, newDueDate);
                replaced = true;
                break;
            }
        }

        // اگر تاریخی پیدا نشد، اضافه کن
        if (!replaced) {
            result = `${result} ${newDueDate}`;
        }

        return result;
    }

    /**
     * 🔥 ساخت مسیر فایل یونیک
     */
    private async getUniqueFilePath(originalPath: string): Promise<string> {
        let counter = 1;
        let testPath = originalPath;
        const basePath = originalPath.replace(/\.md$/, "");

        while (await this.app.vault.adapter.exists(testPath)) {
            testPath = `${basePath} (${counter}).md`;
            counter++;

            // جلوگیری از infinite loop
            if (counter > 1000) {
                throw new Error("خطا: نمی‌توان نام فایل یونیک ایجاد کرد");
            }
        }

        return testPath;
    }

    /**
     * 🔥 پیدا کردن قانون تکرار با fuzzy matching
     */
    private findRecurrenceRule(value: string): RecurrenceRule | null {
        if (!value || typeof value !== "string") {
            return null;
        }

        const normalized = normalizeString(value);

        if (this.settings.enableDebugLog) {
            console.log("🔍 جستجوی قانون تکرار:", { original: value, normalized });
        }

        // اول exact match را امتحان کن
        const exactMatch = this.settings.recurrenceRules.find((rule) => {
            if (!rule.enabled) return false;

            const labelEn = normalizeString(rule.labelEn);
            const labelFa = normalizeString(rule.labelFa);
            const key = normalizeString(rule.key);

            return normalized === labelEn || normalized === labelFa || normalized === key;
        });

        if (exactMatch) {
            if (this.settings.enableDebugLog) {
                console.log("✅ Exact match یافت شد:", exactMatch.key);
            }
            return exactMatch;
        }

        // اگر exact match نبود، fuzzy search استفاده کن
        if (this.fuse) {
            const results = this.fuse.search(normalized);
            
            if (results.length > 0) {
                const bestMatch = results[0].item;
                
                if (this.settings.enableDebugLog) {
                    console.log("⚠️ Fuzzy match یافت شد:", bestMatch.key, "score:", results[0].score);
                }

                new Notice(`ℹ️ تکرار "${value}" به "${bestMatch.labelFa}" تفسیر شد`);
                return bestMatch;
            }
        }

        console.warn("❌ قانون تکرار پیدا نشد:", value);
        new Notice(`⚠️ قانون تکرار نامعتبر: "${value}"`);
        return null;
    }

    /**
     * 🔥 محاسبه تاریخ سررسید بعدی با validation
     */
    private calculateNextDueDate(currentDue: string, rule: RecurrenceRule): string | null {
        let baseDate: dayjs.Dayjs;

        if (!currentDue) {
            // اگر تاریخ سررسید نداریم، از امروز شروع کن
            baseDate = dayjs();
        } else {
            const parsed = parseFlexibleDate(currentDue, this.settings.dateFormat);
            
            if (!parsed) {
                console.error("❌ تاریخ سررسید نامعتبر:", currentDue);
                new Notice(`⚠️ تاریخ نامعتبر: ${currentDue}`);
                return null;
            }

            baseDate = parsed;
        }

        try {
            const nextDate = baseDate.add(rule.amount, rule.unit);
            
            if (!nextDate.isValid()) {
                throw new Error("تاریخ محاسبه شده نامعتبر است");
            }

            const formatted = nextDate.format(this.settings.dateFormat);

            if (this.settings.enableDebugLog) {
                console.log("📅 تاریخ جدید محاسبه شد:", {
                    base: baseDate.format(this.settings.dateFormat),
                    rule: `+${rule.amount} ${rule.unit}`,
                    result: formatted
                });
            }

            return formatted;
        } catch (error) {
            console.error("❌ خطا در محاسبه تاریخ:", error);
            return null;
        }
    }

    /**
     * 🔥 آرشیو کردن تسک با مدیریت خطا بهتر
     */
    async archiveTask(file: TFile): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const { frontmatter, body } = parseFrontmatter(content);

            // علامت‌گذاری به عنوان آرشیو شده
            frontmatter[this.settings.archivedFieldName] = true;
            const updatedContent = serializeFrontmatter(frontmatter, body);
            
            await this.app.vault.modify(file, updatedContent);

            // محاسبه مسیر آرشیو
            let archivePath = this.settings.archiveFolderPath;

            if (this.settings.useDatedArchiveFolders) {
                const dateFolder = dayjs().format(this.settings.datedArchiveFormat);
                archivePath = normalizePath(`${archivePath}/${dateFolder}`);
            }

            // اطمینان از وجود پوشه
            await this.ensureFolderExists(archivePath);

            // محاسبه مسیر جدید
            const newPath = normalizePath(`${archivePath}/${file.name}`);

            // بررسی وجود فایل
            if (await this.app.vault.adapter.exists(newPath)) {
                const uniquePath = await this.getUniqueFilePath(newPath);
                await this.app.fileManager.renameFile(file, uniquePath);
                
                if (this.settings.enableDebugLog) {
                    console.log("📦 فایل با نام یونیک آرشیو شد:", uniquePath);
                }
            } else {
                await this.app.fileManager.renameFile(file, newPath);
                
                if (this.settings.enableDebugLog) {
                    console.log("📦 فایل آرشیو شد:", newPath);
                }
            }

        } catch (error) {
            console.error("❌ خطا در آرشیو کردن فایل:", error);
            throw new Error(`خطا در آرشیو: ${error}`);
        }
    }

    /**
     * 🔥 اطمینان از وجود پوشه
     */
    private async ensureFolderExists(folderPath: string): Promise<void> {
        const normalizedPath = normalizePath(folderPath);
        const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

        if (!folder) {
            try {
                                await this.app.vault.createFolder(normalizedPath);
                
                if (this.settings.enableDebugLog) {
                    console.log("📁 پوشه ایجاد شد:", normalizedPath);
                }
            } catch (error) {
                // اگر پوشه از قبل وجود داشت، خطا نده
                if (!error.message?.includes("already exists")) {
                    throw error;
                }
            }
        } else if (!(folder instanceof TFolder)) {
            throw new Error(`مسیر ${normalizedPath} یک پوشه نیست!`);
        }
    }

    /**
     * 🆕 پاک کردن قفل‌های منقضی شده
     */
    cleanupExpiredLocks(): void {
        const now = Date.now();
        const expired: string[] = [];

        this.processingFiles.forEach((state, path) => {
            if (now - state.timestamp > 30000) {
                expired.push(path);
            }
        });

        expired.forEach(path => this.unlockFile(path));

        if (expired.length > 0 && this.settings.enableDebugLog) {
            console.log("🧹 قفل‌های منقضی شده پاک شدند:", expired.length);
        }
    }
}