import { Plugin, TFile, Notice } from "obsidian";
import { RecurringTaskSettings, DEFAULT_RECURRENCE_RULES } from "./types";
import { RecurringTaskSettingTab } from "./settings";
import { RecurrenceConfirmationModal } from "./modal";
import { TaskManager } from "./task-manager";
import { parseFrontmatter, debounce } from "./utils";
import { I18n, initI18n, Locale } from "./i18n/i18n";

const DEFAULT_SETTINGS: RecurringTaskSettings = {
    locale: "en",
    templateFilePath: "Templates/Task.md",
    archiveFolderPath: "Archive/Tasks",
    useDatedArchiveFolders: true,
    datedArchiveFormat: "YYYY/MM",
    confirmOnRecur: true,
    copySubtasks: true,
    enableDebugLog: false, // 🆕
    completedFieldName: "completed",
    archivedFieldName: "archived",
    dueDateFieldName: "due",
    recurrenceFieldName: "recurrence",
    createdFieldName: "created",
    recurrenceRules: DEFAULT_RECURRENCE_RULES,
    dateFormat: "YYYY-MM-DD", // 🆕
    maxConcurrentProcessing: 3, // 🆕
    debounceDelay: 1000 // 🆕 1 ثانیه
};

export default class RecurringTaskArchiverPlugin extends Plugin {
    settings: RecurringTaskSettings;
    taskManager: TaskManager;
    i18n: I18n;
    private debouncedHandleModify: (file: TFile) => void; // 🔥

    async onload() {
        await this.loadSettings();
        this.i18n = initI18n(this.settings.locale);
        this.taskManager = new TaskManager(this.app, this.settings, this.i18n);

        // 🔥 ساخت debounced handler
        this.debouncedHandleModify = debounce(
            this.handleFileModification.bind(this),
            this.settings.debounceDelay
        );

        this.addSettingTab(new RecurringTaskSettingTab(this.app, this));

        // 🔥 رویداد تغییر فایل با debounce
        this.registerEvent(
            this.app.vault.on("modify", (file) => {
                if (!(file instanceof TFile)) return;
                this.debouncedHandleModify(file);
            })
        );

        // 🆕 پاک کردن قفل‌های منقضی شده هر 60 ثانیه
        this.registerInterval(
            window.setInterval(() => {
                this.taskManager.cleanupExpiredLocks();
            }, 60000)
        );

        // دستورات
        this.addCommand({
            id: "process-current-task",
            name: this.i18n.commands.processTask,
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return false;

                if (!checking) {
                    this.handleFileModification(activeFile);
                }

                return true;
            }
        });

        this.addCommand({
            id: "archive-current-task",
            name: this.i18n.commands.archiveTask,
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return false;

                if (!checking) {
                    this.archiveCurrentTask(activeFile);
                }

                return true;
            }
        });

        // 🆕 دستور debug
        this.addCommand({
            id: "toggle-debug-log",
            name: "Toggle Debug Logging",
            callback: async () => {
                this.settings.enableDebugLog = !this.settings.enableDebugLog;
                await this.saveSettings();
                new Notice(
                    this.settings.enableDebugLog
                        ? "🐛 Debug logging enabled"
                        : "✅ Debug logging disabled"
                );
            }
        });
    }

    /**
     * 🔥 هندلر اصلاح‌شده با try-catch بهتر
     */
    async handleFileModification(file: TFile) {
        try {
            const content = await this.app.vault.read(file);
            const { frontmatter } = parseFrontmatter(content);

            if (!this.taskManager.shouldProcessFile(file, frontmatter)) {
                return;
            }

            if (this.settings.confirmOnRecur) {
                new RecurrenceConfirmationModal(
                    this.app,
                    this.i18n,
                    this.settings.copySubtasks,
                    async (result) => {
                        if (result.action === "recur") {
                            await this.processTaskWithNotification(
                                file,
                                true,
                                result.copySubtasksThisTime || false
                            );
                        } else if (result.action === "archive") {
                            await this.archiveCurrentTask(file);
                        }
                    }
                ).open();
            } else {
                await this.processTaskWithNotification(
                    file,
                    true,
                    this.settings.copySubtasks
                );
            }
        } catch (error) {
            console.error("❌ خطا در پردازش فایل:", error);
            
            let errorMsg = this.i18n.notifications.error;
            if (error instanceof Error) {
                errorMsg += `\n${error.message}`;
            }
            
            new Notice(errorMsg, 5000);
        }
    }

    /**
     * 🆕 پردازش تسک با notification
     */
    private async processTaskWithNotification(
        file: TFile,
        shouldRecur: boolean,
        copySubtasks: boolean
    ): Promise<void> {
        try {
            await this.taskManager.processTask(file, shouldRecur, copySubtasks);
            new Notice(this.i18n.notifications.taskProcessed);
        } catch (error) {
            // خطا در taskManager handle شده
            throw error;
        }
    }

    /**
     * 🆕 آرشیو کردن تسک فعلی
     */
    private async archiveCurrentTask(file: TFile): Promise<void> {
        try {
            await this.taskManager.archiveTask(file);
            new Notice(this.i18n.notifications.taskArchived);
        } catch (error) {
            console.error("❌ خطا در آرشیو:", error);
            new Notice(this.i18n.notifications.error);
        }
    }

    async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

        // 🔥 Migration: اطمینان از وجود تنظیمات جدید
        if (!this.settings.recurrenceRules || this.settings.recurrenceRules.length === 0) {
            this.settings.recurrenceRules = DEFAULT_RECURRENCE_RULES;
        }

        if (!this.settings.dateFormat) {
            this.settings.dateFormat = "YYYY-MM-DD";
        }

        if (this.settings.enableDebugLog === undefined) {
            this.settings.enableDebugLog = false;
        }

        if (!this.settings.maxConcurrentProcessing) {
            this.settings.maxConcurrentProcessing = 3;
        }

        if (!this.settings.debounceDelay) {
            this.settings.debounceDelay = 1000;
        }

        // 🔥 اعتبارسنجی تنظیمات
        this.validateSettings();
    }

    /**
     * 🆕 اعتبارسنجی تنظیمات
     */
    private validateSettings(): void {
        const errors: string[] = [];

        // بررسی مسیرها
        if (!this.settings.archiveFolderPath || this.settings.archiveFolderPath.trim() === "") {
            errors.push("❌ مسیر پوشه آرشیو نمی‌تواند خالی باشد");
        }

        // بررسی نام فیلدها
        const fields = [
            this.settings.completedFieldName,
            this.settings.archivedFieldName,
            this.settings.dueDateFieldName,
            this.settings.recurrenceFieldName,
            this.settings.createdFieldName
        ];

        fields.forEach(field => {
            if (!field || field.trim() === "") {
                errors.push(`❌ نام فیلد نمی‌تواند خالی باشد`);
            }
        });

        // بررسی قوانین تکرار
        if (this.settings.recurrenceRules.length === 0) {
            errors.push("⚠️ هیچ قانون تکراری تعریف نشده است");
        }

        // نمایش خطاها
        if (errors.length > 0) {
            console.warn("⚠️ مشکلات در تنظیمات:", errors);
            
            if (this.settings.enableDebugLog) {
                new Notice(errors.join("\n"), 10000);
            }
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.taskManager.updateSettings(this.settings);
        
        // به‌روزرسانی debounce delay
        this.debouncedHandleModify = debounce(
            this.handleFileModification.bind(this),
            this.settings.debounceDelay
        );

        if (this.settings.enableDebugLog) {
            console.log("💾 Settings saved!", this.settings);
        }
    }

    onunload() {
        // پاک کردن تمام قفل‌ها
        this.taskManager.cleanupExpiredLocks();
    }
}
