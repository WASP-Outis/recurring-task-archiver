import en from "./locales/en.json";
import fa from "./locales/fa.json";
import dayjs from "dayjs";

export type Locale = "en" | "fa";

export interface LocaleMessages {
	settings: {
		title: string;
		language: {
			name: string;
			desc: string;
		};
		paths: {
			header: string;
			template: { name: string; desc: string };
			archive: { name: string; desc: string };
			useDatedFolders: { name: string; desc: string };
			dateFormat: { name: string; desc: string };
		};
		behavior: {
			header: string;
			confirmRecur: { name: string; desc: string };
			copySubtasks: { name: string; desc: string };
		};
		frontmatter: {
			header: string;
			completed: { name: string; desc: string };
			archived: { name: string; desc: string };
			dueDate: { name: string; desc: string };
			recurrence: { name: string; desc: string };
			created: { name: string; desc: string };
		};
	};
	modal: {
		title: string;
		prompt: string;
		yesRecur: string;
		noArchive: string;
		cancel: string;
		copySubtasks: string;
	};
	commands: {
		processTask: string;
		archiveTask: string;
	};
	recurrence: {
		daily: string;
		weekly: string;
		biweekly: string;
		monthly: string;
		quarterly: string;
		yearly: string;
		weekdays: string;
		weekends: string;
		none: string;
	};
	notifications: {
		taskProcessed: string;
		taskArchived: string;
		error: string;
		templateNotFound: string;
		archiveFolderCreated: string;
	};
}

const messages: Record<Locale, LocaleMessages> = {
	en,
	fa
};

export class I18n {
	private currentLocale: Locale;
	private messages: LocaleMessages;
	private fallbackMessages: LocaleMessages;

	constructor(locale: Locale = "en") {
		this.currentLocale = locale;
		this.messages = messages[locale];
		this.fallbackMessages = messages["en"]; // همیشه انگلیسی به عنوان fallback
	}

	setLocale(locale: Locale): void {
		this.currentLocale = locale;
		this.messages = messages[locale];
	}

	getLocale(): Locale {
		return this.currentLocale;
	}

	/**
	 * ترجمه با پشتیبانی از variables
	 * مثال: t("notifications.taskCreated", { name: "Task 1" })
	 */
	t(key: string, variables?: Record<string, string | number>): string {
		let text = this.getTranslation(key);
		
		if (variables) {
			Object.entries(variables).forEach(([k, v]) => {
				text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
			});
		}
		
		return text;
	}

	/**
	 * دریافت ترجمه با fallback به انگلیسی
	 */
	private getTranslation(key: string): string {
		const keys = key.split(".");
		
		// تلاش برای دریافت از زبان فعلی
		let value: any = this.messages;
		for (const k of keys) {
			if (value && typeof value === "object" && k in value) {
				value = value[k];
			} else {
				value = null;
				break;
			}
		}
		
		if (typeof value === "string") return value;
		
		// Fallback به انگلیسی
		if (this.currentLocale !== "en") {
			console.warn(`Translation missing for ${this.currentLocale}: ${key}, using English fallback`);
			
			let fallbackValue: any = this.fallbackMessages;
			for (const k of keys) {
				if (fallbackValue && typeof fallbackValue === "object" && k in fallbackValue) {
					fallbackValue = fallbackValue[k];
				} else {
					fallbackValue = null;
					break;
				}
			}
			
			if (typeof fallbackValue === "string") return fallbackValue;
		}
		
		// اگر حتی در انگلیسی هم نبود، کلید را برگردان
		console.error(`Translation not found: ${key}`);
		return key;
	}

	/**
	 * دریافت جهت متن (RTL/LTR)
	 */
	getDirection(): "ltr" | "rtl" {
		return this.currentLocale === "fa" ? "rtl" : "ltr";
	}

	/**
	 * فرمت کردن تاریخ بر اساس locale
	 */
	formatDate(date: string | Date, format: string = "YYYY-MM-DD"): string {
		const d = dayjs(date);
		
		if (!d.isValid()) {
			console.warn(`Invalid date: ${date}`);
			return String(date);
		}
		
		// برای فارسی می‌توانیم از تاریخ شمسی استفاده کنیم
		// ولی فعلاً همان میلادی را نگه می‌داریم
		// اگر بخواهید تاریخ شمسی، باید dayjs-plugin-jalali نصب کنید
		
		return d.format(format);
	}

	/**
	 * فرمت کردن عدد بر اساس locale
	 */
	formatNumber(num: number): string {
		try {
			return new Intl.NumberFormat(
				this.currentLocale === "fa" ? "fa-IR" : "en-US"
			).format(num);
		} catch (error) {
			console.error("Error formatting number:", error);
			return String(num);
		}
	}

	/**
	 * تبدیل اعداد انگلیسی به فارسی
	 */
	toLocalDigits(num: number | string): string {
		const str = String(num);
		
		if (this.currentLocale === "fa") {
			const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
			return str.replace(/\d/g, d => persianDigits[parseInt(d)]);
		}
		
		return str;
	}

	// Helper برای دسترسی راحت‌تر
	get settings() {
		return this.messages.settings;
	}

	get modal() {
		return this.messages.modal;
	}

	get commands() {
		return this.messages.commands;
	}

	get recurrence() {
		return this.messages.recurrence;
	}

	get notifications() {
		return this.messages.notifications;
	}
}

// Singleton instance
let i18nInstance: I18n;

export function getI18n(): I18n {
	if (!i18nInstance) {
		i18nInstance = new I18n();
	}
	return i18nInstance;
}

export function initI18n(locale: Locale): I18n {
	i18nInstance = new I18n(locale);
	return i18nInstance;
}