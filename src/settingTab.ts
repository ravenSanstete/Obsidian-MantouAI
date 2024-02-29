import { PluginSettingTab, App, Setting, Modal, Notice } from "obsidian";
import MantouAIPlugin from "./main";
import { META_ROLE, Prompt } from "./model-prompts";

export default class MantouAISettingTab extends PluginSettingTab {
    plugin: MantouAIPlugin;

    constructor(app: App, plugin: MantouAIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("DASHSCOPE APIKEY")
            .setDesc("APIKEY: sk-xxxxxx")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your secret")
                    .setValue(this.plugin.settings.api_key)
                    .onChange(async (value) => {
                        this.plugin.settings.api_key = value;
                        await this.plugin.saveSettings();
                    })
            );
        containerEl.createEl("h2", { text: "Prompt 预设" });
        new Setting(containerEl).setHeading().addButton((cb) => {
            cb.setButtonText("添加预设").onClick(() => {
                new PromptModal(
                    {
                        name: "",
                        user_prefix: "",
                        user_suffix: "",
                        role: META_ROLE,
                    },
                    "add",
                    (prompt) => {
                        this.plugin.settings.preset_prompts.push(prompt);
                        this.plugin.saveSettings();
                        this.display();
                    },
                    () => {},
                    this.plugin
                ).open();
            });
        });
        this.plugin.settings.preset_prompts.forEach((prompt) => {
            new Setting(containerEl)
                .setName(prompt.name)
                .addExtraButton((cb) =>
                    cb.setIcon("pencil").onClick(() => {
                        new PromptModal(
                            prompt,
                            "edit",
                            (prompt) => {
                                let index = this.plugin.settings.preset_prompts.findIndex(
                                    (p) => prompt.name === p.name
                                );
                                this.plugin.settings.preset_prompts[index] = prompt;
                                this.plugin.saveSettings();
                                this.display();
                            },
                            () => {},
                            this.plugin
                        ).open();
                    })
                )
                .addExtraButton((cb) => {
                    cb.setIcon("chevron-up").onClick(() => {
                        //上移一位
                        let index = this.plugin.settings.preset_prompts.findIndex(
                            (p) => prompt.name === p.name
                        );
                        if (index > 0) {
                            let temp = this.plugin.settings.preset_prompts[index - 1];
                            this.plugin.settings.preset_prompts[index - 1] = prompt;
                            this.plugin.settings.preset_prompts[index] = temp;
                        }
                        this.plugin.saveSettings();
                        this.display();
                    });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("chevron-down").onClick(() => {
                        //下移一位
                        let index = this.plugin.settings.preset_prompts.findIndex(
                            (p) => prompt.name === p.name
                        );
                        if (index < this.plugin.settings.preset_prompts.length - 1) {
                            let temp = this.plugin.settings.preset_prompts[index + 1];
                            this.plugin.settings.preset_prompts[index + 1] = prompt;
                            this.plugin.settings.preset_prompts[index] = temp;
                        }
                        this.plugin.saveSettings();
                        this.display();
                    });
                })
                .addExtraButton((cb) =>
                    cb.setIcon("trash").onClick(() => {
                        this.plugin.settings.preset_prompts =
                            this.plugin.settings.preset_prompts.filter(
                                (p) => prompt.name !== p.name
                            );
                        this.plugin.saveSettings();
                        this.display();
                    })
                );
        });
    }
}

class PromptModal extends Modal {
    constructor(
        public prompt: Prompt,
        public type: "add" | "edit",
        public save: (prompt: Prompt) => void,
        public cancel: () => void,
        public plugin: MantouAIPlugin
    ) {
        super(plugin.app);
    }
    onOpen(): void {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Prompt 预设" });

        new Setting(contentEl).setName("名称").addText((text) =>
            text
                .setPlaceholder("输入名称")
                .setValue(this.prompt.name)
                .onChange(async (value) => {
                    this.prompt.name = value;
                })
        );
        new Setting(contentEl).setName("Prompt 前缀").addTextArea((text) =>
            text
                .setPlaceholder("Prompt 前缀")
                .setValue(this.prompt.user_prefix)
                .onChange(async (value) => {
                    this.prompt.user_prefix = value;
                })
        );
        new Setting(contentEl).setName("Prompt 后缀").addTextArea((text) =>
            text
                .setPlaceholder("Prompt 后缀")
                .setValue(this.prompt.user_suffix)
                .onChange(async (value) => {
                    this.prompt.user_suffix = value;
                })
        );
        new Setting(contentEl).setName("Prompt 角色").addTextArea((text) =>
            text
                .setPlaceholder("Prompt 角色")
                .setValue(this.prompt.role == "" ? META_ROLE : this.prompt.role)
                .onChange(async (value) => {
                    this.prompt.role = value;
                })
        );
        new Setting(contentEl)
            .addButton((cb) => {
                cb.setButtonText("保存").onClick(() => {
                    if (this.test()) {
                        this.save(this.prompt);
                        this.close();
                    }
                });
            })
            .addButton((cb) => {
                cb.setButtonText("取消").onClick(() => {
                    this.cancel();
                    this.close();
                });
            });
    }
    onClose(): void {}
    test(): boolean {
        if (
            this.type == "add" &&
            this.plugin.settings.preset_prompts.map((p) => p.name).includes(this.prompt.name)
        ) {
            new Notice("Prompt 名称重复，请修改", 2000);
            return false;
        }
        if (this.prompt.name.length == 0 || this.prompt.user_prefix.length == 0) {
            new Notice("Prompt 名称、前缀不能为空", 2000);
            return false;
        }
        return true;
    }
}
