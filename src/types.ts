import { Locale } from "./i18n/i18n";

export interface RecurringTaskSettings {
    // زبان
    locale: Locale;

    // مسیرها
    templateFilePath: string;
    archiveFolderPath: string;
    useDatedArchiveFolders: boolean;
    datedArchiveFormat: string;

    // رفتار
    confirmOnRecur: boolean;
    copySubtasks: boolean;
    enableDebugLog: boolean; // 🆕 لاگ debug

    // نام فیلدهای فرانت‌متر
    completedFieldName: string;
    archivedFieldName: string;
    dueDateFieldName: string;
    recurrenceFieldName: string;
    createdFieldName: string;

    // قوانین تکرار قابل ویرایش
    recurrenceRules: RecurrenceRule[];

    // 🆕 تنظیمات جدید
    dateFormat: string; // فرمت تاریخ قابل تنظیم
    maxConcurrentProcessing: number; // حداکثر تعداد پردازش همزمان
    debounceDelay: number; // تاخیر debounce (ms)
}

export interface RecurrenceRule {
    key: string;
    labelEn: string;
    labelFa: string;
    amount: number;
    unit: "day" | "week" | "month" | "year";
    enabled: boolean;
}

export const DEFAULT_RECURRENCE_RULES: RecurrenceRule[] = [
    {
        key: "none",
        labelEn: "None",
        labelFa: "هیچ",
        amount: 0,
        unit: "day",
        enabled: true
    },
    {
        key: "daily",
        labelEn: "Daily",
        labelFa: "هر روز",
        amount: 1,
        unit: "day",
        enabled: true
    },
    {
        key: "weekly",
        labelEn: "Weekly",
        labelFa: "هر هفته",
        amount: 1,
        unit: "week",
        enabled: true
    },
    {
        key: "biweekly",
        labelEn: "Every 2 Weeks",
        labelFa: "هر 2 هفته",
        amount: 2,
        unit: "week",
        enabled: true
    },
    {
        key: "monthly",
        labelEn: "Monthly",
        labelFa: "هر ماه",
        amount: 1,
        unit: "month",
        enabled: true
    },
    {
        key: "quarterly",
        labelEn: "Every 4 Months",
        labelFa: "هر 4 ماه",
        amount: 4,
        unit: "month",
        enabled: true
    },
    {
        key: "yearly",
        labelEn: "Yearly",
        labelFa: "هر سال",
        amount: 1,
        unit: "year",
        enabled: true
    }
];

export interface Frontmatter {
    [key: string]: any;
}

export interface ConfirmationResult {
    action: "recur" | "archive" | "cancel";
    copySubtasksThisTime?: boolean;
}

// 🆕 برای مدیریت فایل‌های در حال پردازش
export interface ProcessingState {
    filePath: string;
    timestamp: number;
}