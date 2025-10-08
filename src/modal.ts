import { App, Modal, Setting } from "obsidian";
import { ConfirmationResult } from "./types";
import { I18n } from "./i18n/i18n";

export class RecurrenceConfirmationModal extends Modal {
    private result: ConfirmationResult;
    private onSubmit: (result: ConfirmationResult) => void;
    private copySubtasksDefault: boolean;
    private i18n: I18n;

    constructor(
        app: App,
        i18n: I18n,
        copySubtasksDefault: boolean,
        onSubmit: (result: ConfirmationResult) => void
    ) {
        super(app);
        this.i18n = i18n;
        this.copySubtasksDefault = copySubtasksDefault;
        this.onSubmit = onSubmit;
        this.result = {
            action: "cancel",
            copySubtasksThisTime: copySubtasksDefault
        };
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: this.i18n.modal.title });
        contentEl.createEl("p", { 
            text: this.i18n.modal.prompt,
            cls: "modal-prompt"
        });

        // چک‌باکس کپی زیروظایف
        new Setting(contentEl)
            .setName(this.i18n.modal.copySubtasks)
            .addToggle((toggle) =>
                toggle
                    .setValue(this.copySubtasksDefault)
                                    .onChange((value) => {
                        this.result.copySubtasksThisTime = value;
                    })
            );

        // دکمه‌ها
        const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "10px";
        buttonContainer.style.marginTop = "20px";
        buttonContainer.style.justifyContent = "flex-end";

        // دکمه تکرار و آرشیو
        const recurButton = buttonContainer.createEl("button", {
            text: this.i18n.modal.yesRecur,
            cls: "mod-cta"
        });
        recurButton.style.flex = "1";
        recurButton.addEventListener("click", () => {
            this.result.action = "recur";
            this.close();
            this.onSubmit(this.result);
        });

        // دکمه فقط آرشیو
        const archiveButton = buttonContainer.createEl("button", {
            text: this.i18n.modal.noArchive
        });
        archiveButton.style.flex = "1";
        archiveButton.addEventListener("click", () => {
            this.result.action = "archive";
            this.close();
            this.onSubmit(this.result);
        });

        // دکمه انصراف
        const cancelButton = buttonContainer.createEl("button", {
            text: this.i18n.modal.cancel
        });
        cancelButton.style.flex = "1";
        cancelButton.addEventListener("click", () => {
            this.result.action = "cancel";
            this.close();
        });

        // 🆕 کلید میانبر ESC برای بستن
        this.scope.register([], "Escape", () => {
            this.result.action = "cancel";
            this.close();
        });

        // 🆕 کلید میانبر Enter برای تایید
        this.scope.register([], "Enter", () => {
            this.result.action = "recur";
            this.close();
            this.onSubmit(this.result);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}