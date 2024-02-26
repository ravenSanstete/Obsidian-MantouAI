import { Editor, MarkdownView, Notice, Plugin, Menu, requestUrl } from "obsidian";
import { encode, decode } from "gpt-tokenizer";

import MantouAISettingTab from "./settingTab";
import {
    SUMMARY_SYS,
    SUMMARY_USER_PREFIX,
    SUMMARY_USER_SUFFIX,
    META_ROLE,
    DEFAULT_PROMPTS,
    Prompt,
} from "./model-prompts";

function extractRoleValue(text: string): string {
    const roleRegex = /Role:([\s\S]+?)\n[\s\S]+?---/g;
    const matches = roleRegex.exec(text);

    if (matches && matches.length > 1) {
        const roleValue = matches[1].trim();
        return roleValue;
    }

    return "";
}

async function payload(url: string, data: any, apiKey: string) {
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };

    try {
        console.log(JSON.stringify(data));
        const response = await requestUrl({
            url: url,
            method: "POST",
            headers: headers,
            body: JSON.stringify(data),
        });

        let out = JSON.parse(response.text);
        console.log(out);
        return out["output"]["text"];
    } catch (error) {
        console.error("Error:", error);
        new Notice(`馒头：U•ェ•*U 请求错误: 代号${error}`);
        // throw error;
        return "[请求错误]";
    }
}

function create_newline(editor: Editor) {
    // const curserStart = editor.getCursor("from");
    const curserEnd = editor.getCursor("to");
    const line = editor.getLine(curserEnd.line);
    editor.setLine(curserEnd.line, line + "\n");
    editor.setCursor({
        line: curserEnd.line + 1,
        ch: 0,
    });
}

function operation_on_selection(
    editor: Editor,
    sys: string,
    user_prefix: string,
    user_suffix: string,
    api_key: string,
    post_fn: any = (x: string) => `\n---\n${x}\n`,
    selection_fn = (x: string) => x
) {
    const selection = editor.getSelection();

    editor.replaceSelection(selection_fn(selection));
    create_newline(editor);
    const data = {
        system_prompt: sys,
        user_prompt: user_prefix + selection + user_suffix,
    };

    let notice = new Notice("馒头：U•ェ•*U努力思考中...", 0);
    chat(data["user_prompt"], data["system_prompt"], api_key)
        .then((result) => {
            // update the editor
            result = post_fn(result);
            console.log("Response:", result);
            notice.setMessage("馒头：U•ェ•*U完成啦！");
            editor.replaceRange(result, editor.getCursor());
            notice.hide();
        })
        .catch((error) => {
            console.error("Error:", error);
            notice.hide();
        });
}

function splitTextOnTokens(text: string, tokensPerChunk: number): string[] {
    const splits: string[] = [];
    const inputIds = encode(text);
    let startIdx = 0;
    let curIdx = Math.min(startIdx + tokensPerChunk, inputIds.length);
    let chunkIds = inputIds.slice(startIdx, curIdx);

    while (startIdx < inputIds.length) {
        splits.push(decode(chunkIds));

        if (curIdx === inputIds.length) {
            break;
        }

        startIdx += tokensPerChunk;
        curIdx = Math.min(startIdx + tokensPerChunk, inputIds.length);
        chunkIds = inputIds.slice(startIdx, curIdx);
    }
    return splits;
}

const GENERATION_URL =
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

async function chat(
    user_prompt: string,
    system_prompt: string = "You are a helpful assistant.",
    api_key: string
) {
    const requestData = {
        model: "qwen-max",
        input: {
            //prompt: user_prompt,
            messages: [
                {
                    role: "system",
                    content: system_prompt.replace('"', "'"),
                },
                {
                    role: "user",
                    content: user_prompt.replace('"', "'"),
                },
            ],
        },
    };
    return payload(GENERATION_URL, requestData, api_key);
    // .then((result) => {
    // console.log('Response:', result);
    // return result
    // //editor.replaceRange(result['answer'], editor.getCursor());
    // })
    // .catch((error) => {
    // 	console.error('Error:', error)
    // 	return '[error]'
    // 	});;
}

const URL = "http://127.0.0.1:5200/query";
async function summarize_chunk(chunk: string, api_key: string) {
    const data = {
        system_prompt: SUMMARY_SYS,
        user_prompt: SUMMARY_USER_PREFIX + chunk + SUMMARY_USER_SUFFIX,
    };

    return chat(data["user_prompt"], data["system_prompt"], api_key);
}

function addGreaterThanSign(text: string): string {
    const lines = text.split("\n");
    const modifiedLines = lines.map((line) => `> ${line}`);
    return modifiedLines.join("\n");
}

interface MantouAIPluginSettings {
    api_key: string;
    preset_prompts: Prompt[];
}

const DEFAULT_SETTINGS: MantouAIPluginSettings = {
    api_key: "sk-xxxxxx",
    preset_prompts: DEFAULT_PROMPTS,
};

export default class MantouAIPlugin extends Plugin {
    settings: MantouAIPluginSettings;
    async appendFile(filePath: string, note: string) {
        let existingContent = await this.app.vault.adapter.read(filePath);
        if (existingContent.length > 0) {
            existingContent = existingContent + "\r\r";
        }
        await this.app.vault.adapter.write(filePath, existingContent + note);
    }

    async saveToFile(filePath: string, mdString: string) {
        const fileExists = await this.app.vault.adapter.exists(filePath);
        if (fileExists) {
            await this.appendFile(filePath, mdString);
        } else {
            await this.app.vault.create(filePath, mdString);
        }
    }

    async onload() {
        await this.loadSettings();
        // This creates an icon in the left ribbon.
        this.addRibbonIcon("paw-print", "Open menu", (event) => {
            const menu = new Menu();

            menu.addItem((item) =>
                item
                    .setTitle("全文摘要")
                    .setIcon("paste")
                    .onClick(async () => {
                        let file = this.app.workspace.getActiveFile();
                        if (file === null) return;
                        if (file.extension !== "md") return;

                        const file_name = "[摘要] " + file.name;
                        let folder: string = file.parent.path;
                        let summary_list: string[] = [];
                        this.app.vault
                            .read(file)
                            .then(async (text: string) => {
                                // console.log(text); // Output: Contents of the file
                                let splits = splitTextOnTokens(text, 1000);

                                for (let index = 0; index < splits.length; index++) {
                                    console.log(splits[index]);
                                    let summary: string = await summarize_chunk(
                                        splits[index],
                                        this.settings.api_key
                                    );
                                    summary_list.push(summary);
                                    await this.saveToFile(`${folder}/${file_name}`, summary);

                                    new Notice(
                                        `馒头：U•ェ•*U努力阅读中 (${index + 1}/${splits.length})`
                                    );
                                }

                                // console.log(splits)
                            })
                            .catch((err: any) => {
                                console.error(err);
                            });

                        await this.app.workspace.openLinkText(`${folder}/${file_name}`, "", true);
                        //new Notice("Pasted");
                    })
            );
            menu.showAtMouseEvent(event);
        });

        this.addCommand({
            id: "question_for_mantou",
            name: "🐶向馒头提问",
            editorCallback: (editor: Editor) => {
                let editorView = this.app.workspace.getActiveViewOfType(MarkdownView);
                let role = META_ROLE;

                if (!editorView) {
                    console.log("...");
                } else {
                    const markdownText = editorView.data;
                    let temp_role = extractRoleValue(markdownText);
                    console.log("TEMP ROLE:", temp_role);
                    if (temp_role.length != 0) {
                        role = temp_role;
                    }
                    console.log("ROLE:", role);
                }

                operation_on_selection(
                    editor,
                    role,
                    "",
                    "",
                    this.settings.api_key,
                    (x: string) => {
                        x = x
                            .replace(/\[/gi, "$$$")
                            .replace(/\]/gi, "$$$")
                            .replace(/\(/gi, "$")
                            .replace(/\)/gi, "$")
                            .replace("$", "$");
                        x = addGreaterThanSign(x);
                        x = x;
                        return x;
                    },
                    (x: string) => {
                        x = `> [!NOTE] ${x}`;
                        return x;
                    }
                );
            },
        });
        for (const prompt of DEFAULT_PROMPTS) {
            this.addCommand({
                id: prompt.name,
                name: prompt.name,
                editorCallback: (editor: Editor) =>
                    operation_on_selection(
                        editor,
                        prompt.role,
                        prompt.user_prefix,
                        prompt.user_suffix,
                        this.settings.api_key
                    ),
            });
        }

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
                menu.addItem((item) => {
                    item.setIcon("paw-print").setTitle("Mantou AI").setSubmenu();

                    for (const prompt of this.settings.preset_prompts) {
                        item.submenu.addItem((subitem) => {
                            subitem.setTitle(prompt.name).onClick(async () => {
                                operation_on_selection(
                                    editor,
                                    prompt.role,
                                    prompt.user_prefix,
                                    prompt.user_suffix,
                                    this.settings.api_key
                                );
                            });
                        });
                    }
                });
            })
        );

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new MantouAISettingTab(this.app, this));
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
