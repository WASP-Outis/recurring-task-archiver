import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import RecurringTaskArchiverPlugin from "./main";
import { Locale } from "./i18n/i18n";
import { RecurrenceRule } from "./types";

export class RecurringTaskSettingTab extends PluginSettingTab {
	plugin: RecurringTaskArchiverPlugin;

	constructor(app: App, plugin: RecurringTaskArchiverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const i18n = this.plugin.i18n;

		containerEl.empty();

		try {
			const headerEl = containerEl.createEl("div", { cls: "setting-item-heading" });
			headerEl.createEl("h2", { text: i18n.settings.title });
			headerEl.createEl("p", {
				text: "Version 1.0.0 | By Shahryar Sahebekhtiari",
				cls: "setting-item-description"
			});
		} catch (error) {
			console.error("❌ Error in header:", error);
		}

		try {
			new Setting(containerEl)
				.setName(i18n.settings.language.name)
				.setDesc(i18n.settings.language.desc)
				.addDropdown((dropdown) =>
					dropdown
						.addOption("en", "English")
						.addOption("fa", "فارسی")
						.setValue(this.plugin.settings.locale)
						.onChange(async (value: Locale) => {
							this.plugin.settings.locale = value;
							this.plugin.i18n.setLocale(value);
							await this.plugin.saveSettings();
							this.display();
						})
				);
		} catch (error) {
			console.error("❌ Error in language setting:", error);
		}

		try {
			containerEl.createEl("h3", { text: "🐛 Debug Settings" });

			new Setting(containerEl)
				.setName("Enable Debug Logging")
				.setDesc("Show detailed logs in console for troubleshooting")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.enableDebugLog)
						.onChange(async (value) => {
							this.plugin.settings.enableDebugLog = value;
							await this.plugin.saveSettings();
						})
				);
		} catch (error) {
			console.error("❌ Error in debug settings:", error);
		}

		try {
			containerEl.createEl("h3", { text: "🔄 Recurrence Rules / قوانین تکرار" });

			new Setting(containerEl)
				.setName("Reset to Default Rules")
				.setDesc("Restore default recurrence rules")
				.addButton((button) =>
					button
						.setButtonText("Reset")
						.setWarning()
						.onClick(async () => {
							const { DEFAULT_RECURRENCE_RULES } = await import("./types");
							this.plugin.settings.recurrenceRules = DEFAULT_RECURRENCE_RULES;
							await this.plugin.saveSettings();
							new Notice("✅ Rules reset to default");
							this.display();
						})
				);

			if (!this.plugin.settings.recurrenceRules || this.plugin.settings.recurrenceRules.length === 0) {
				containerEl.createEl("p", {
					text: "⚠️ No recurrence rules found. Click Reset to restore defaults.",
					cls: "setting-item-description"
				});
			} else {
				this.plugin.settings.recurrenceRules.forEach((rule, index) => {
					try {
						this.displayRecurrenceRule(containerEl, rule, index);
					} catch (error) {
						console.error(`❌ Error displaying rule ${index}:`, error);
					}
				});
			}
		} catch (error) {
			console.error("❌ Error in recurrence rules section:", error);
		}

		try {
			containerEl.createEl("h3", { text: i18n.settings.paths.header });

			new Setting(containerEl)
				.setName(i18n.settings.paths.template.name)
				.setDesc(i18n.settings.paths.template.desc)
				.addText((text) =>
					text
						.setPlaceholder("Templates/Task.md")
						.setValue(this.plugin.settings.templateFilePath)
						.onChange(async (value) => {
							this.plugin.settings.templateFilePath = value.trim();
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.paths.archive.name)
				.setDesc(i18n.settings.paths.archive.desc)
				.addText((text) =>
					text
						.setPlaceholder("Archive/Tasks")
						.setValue(this.plugin.settings.archiveFolderPath)
						.onChange(async (value) => {
							if (!value.trim()) {
								new Notice("⚠️ Archive path cannot be empty");
								return;
							}
							this.plugin.settings.archiveFolderPath = value.trim();
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.paths.useDatedFolders.name)
				.setDesc(i18n.settings.paths.useDatedFolders.desc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.useDatedArchiveFolders)
						.onChange(async (value) => {
							this.plugin.settings.useDatedArchiveFolders = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.paths.dateFormat.name)
				.setDesc(i18n.settings.paths.dateFormat.desc)
				.addText((text) =>
					text
						.setPlaceholder("YYYY/MM")
						.setValue(this.plugin.settings.datedArchiveFormat)
						.onChange(async (value) => {
							this.plugin.settings.datedArchiveFormat = value.trim();
							await this.plugin.saveSettings();
						})
				);
		} catch (error) {
			console.error("❌ Error in paths section:", error);
		}

		try {
			containerEl.createEl("h3", { text: i18n.settings.behavior.header });

			new Setting(containerEl)
				.setName(i18n.settings.behavior.confirmRecur.name)
				.setDesc(i18n.settings.behavior.confirmRecur.desc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.confirmOnRecur)
						.onChange(async (value) => {
							this.plugin.settings.confirmOnRecur = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.behavior.copySubtasks.name)
				.setDesc(i18n.settings.behavior.copySubtasks.desc)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.copySubtasks)
						.onChange(async (value) => {
							this.plugin.settings.copySubtasks = value;
							await this.plugin.saveSettings();
						})
				);
		} catch (error) {
			console.error("❌ Error in behavior section:", error);
		}

		try {
			containerEl.createEl("h3", { text: "⚙️ Advanced Settings" });

			new Setting(containerEl)
				.setName("Date Format")
				.setDesc("Format for dates (e.g., YYYY-MM-DD, DD/MM/YYYY)")
				.addText((text) =>
					text
						.setPlaceholder("YYYY-MM-DD")
						.setValue(this.plugin.settings.dateFormat)
						.onChange(async (value) => {
							this.plugin.settings.dateFormat = value.trim() || "YYYY-MM-DD";
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Debounce Delay (ms)")
				.setDesc("Delay before processing file changes")
				.addText((text) =>
					text
						.setPlaceholder("1000")
						.setValue(String(this.plugin.settings.debounceDelay))
						.onChange(async (value) => {
							const num = parseInt(value);
							if (!isNaN(num) && num >= 0) {
								this.plugin.settings.debounceDelay = num;
								await this.plugin.saveSettings();
							}
						})
				);

			new Setting(containerEl)
				.setName("Max Concurrent Processing")
				.setDesc("Maximum simultaneous tasks")
				.addText((text) =>
					text
						.setPlaceholder("3")
						.setValue(String(this.plugin.settings.maxConcurrentProcessing))
						.onChange(async (value) => {
							const num = parseInt(value);
							if (!isNaN(num) && num > 0 && num <= 10) {
								this.plugin.settings.maxConcurrentProcessing = num;
								await this.plugin.saveSettings();
							}
						})
				);
		} catch (error) {
			console.error("❌ Error in advanced settings:", error);
		}

		try {
			containerEl.createEl("h3", { text: i18n.settings.frontmatter.header });

			new Setting(containerEl)
				.setName(i18n.settings.frontmatter.completed.name)
				.setDesc(i18n.settings.frontmatter.completed.desc)
				.addText((text) =>
					text.setPlaceholder("completed")
						.setValue(this.plugin.settings.completedFieldName)
						.onChange(async (value) => {
							if (value.trim()) {
								this.plugin.settings.completedFieldName = value.trim();
								await this.plugin.saveSettings();
							}
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.frontmatter.archived.name)
				.setDesc(i18n.settings.frontmatter.archived.desc)
				.addText((text) =>
					text.setPlaceholder("archived")
						.setValue(this.plugin.settings.archivedFieldName)
						.onChange(async (value) => {
							if (value.trim()) {
								this.plugin.settings.archivedFieldName = value.trim();
								await this.plugin.saveSettings();
							}
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.frontmatter.dueDate.name)
				.setDesc(i18n.settings.frontmatter.dueDate.desc)
				.addText((text) =>
					text.setPlaceholder("due")
						.setValue(this.plugin.settings.dueDateFieldName)
						.onChange(async (value) => {
							if (value.trim()) {
								this.plugin.settings.dueDateFieldName = value.trim();
								await this.plugin.saveSettings();
							}
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.frontmatter.recurrence.name)
				.setDesc(i18n.settings.frontmatter.recurrence.desc)
				.addText((text) =>
					text.setPlaceholder("recurrence")
						.setValue(this.plugin.settings.recurrenceFieldName)
						.onChange(async (value) => {
							if (value.trim()) {
								this.plugin.settings.recurrenceFieldName = value.trim();
								await this.plugin.saveSettings();
							}
						})
				);

			new Setting(containerEl)
				.setName(i18n.settings.frontmatter.created.name)
				.setDesc(i18n.settings.frontmatter.created.desc)
				.addText((text) =>
					text.setPlaceholder("created")
						.setValue(this.plugin.settings.createdFieldName)
						.onChange(async (value) => {
							if (value.trim()) {
								this.plugin.settings.createdFieldName = value.trim();
								await this.plugin.saveSettings();
							}
						})
				);
		} catch (error) {
			console.error("❌ Error in frontmatter section:", error);
		}
	}

	private displayRecurrenceRule(containerEl: HTMLElement, rule: RecurrenceRule, index: number): void {
		const setting = new Setting(containerEl)
			.setName(rule.labelEn + " / " + rule.labelFa)
			.setClass(rule.enabled ? "" : "setting-item-disabled");

		setting.addText((text) => {
			text
				.setPlaceholder("Amount")
				.setValue(String(rule.amount))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.recurrenceRules[index].amount = num;
						await this.plugin.saveSettings();
						this.updateRuleDescription(setting.descEl, rule);
					} else if (value !== "") {
						new Notice("⚠️ Value must be a positive number");
					}
				});
			text.inputEl.addClass('recurrence-rule-amount-input');
			return text;
		});

		setting.addDropdown((dropdown) =>
			dropdown
				.addOption("day", "Day(s)")
				.addOption("week", "Week(s)")
				.addOption("month", "Month(s)")
				.addOption("year", "Year(s)")
				.setValue(rule.unit)
				.onChange(async (value: "day" | "week" | "month" | "year") => {
					this.plugin.settings.recurrenceRules[index].unit = value;
					await this.plugin.saveSettings();
					this.updateRuleDescription(setting.descEl, rule);
				})
		);

		setting.addToggle((toggle) =>
			toggle
				.setValue(rule.enabled)
				.setTooltip("Enable/Disable")
				.onChange(async (value) => {
					this.plugin.settings.recurrenceRules[index].enabled = value;
					await this.plugin.saveSettings();
					this.display();
				})
		);

		if (!["none", "daily", "weekly", "monthly", "yearly"].includes(rule.key)) {
			setting.addButton((button) =>
				button
					.setButtonText("Delete")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.recurrenceRules.splice(index, 1);
						await this.plugin.saveSettings();
						new Notice("✅ Rule deleted");
						this.display();
					})
			);
		}

		this.updateRuleDescription(setting.descEl, rule);
	}

	private updateRuleDescription(descEl: HTMLElement, rule: RecurrenceRule): void {
		const formula = "add(" + rule.amount + ", '" + rule.unit + "')";
		const example = this.getExampleForRule(rule);

		descEl.empty();
		descEl.createSpan({
			text: "Formula: " + formula,
			cls: "setting-item-description"
		});
		descEl.createEl("br");
		descEl.createSpan({
			text: "Example: " + example,
			cls: "setting-item-description"
		});
	}

	private getExampleForRule(rule: RecurrenceRule): string {
		try {
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			const today = `${year}-${month}-${day}`;

			// محاسبه ساده تاریخ
			let futureDate = new Date(now);

			switch (rule.unit) {
				case 'day':
					futureDate.setDate(futureDate.getDate() + rule.amount);
					break;
				case 'week':
					futureDate.setDate(futureDate.getDate() + (rule.amount * 7));
					break;
				case 'month':
					futureDate.setMonth(futureDate.getMonth() + rule.amount);
					break;
				case 'year':
					futureDate.setFullYear(futureDate.getFullYear() + rule.amount);
					break;
			}

			const fYear = futureDate.getFullYear();
			const fMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
			const fDay = String(futureDate.getDate()).padStart(2, '0');
			const future = `${fYear}-${fMonth}-${fDay}`;

			return `${today} → ${future}`;
		} catch (error) {
			console.error('Error generating example:', error);
			return "N/A";
		}
	}
}
