import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, moment, Menu, requestUrl, RequestUrlParam} from 'obsidian';
// Remember to rename these classes and interfaces!

async function payload(url:string, data:any, apiKey:string){
	const headers = {
	  Authorization: `Bearer ${apiKey}`,
	  "Content-Type": "application/json"
	};

	try {
		console.log(JSON.stringify(data))
		const response = await requestUrl({url:url, method:'POST', headers:headers, body:JSON.stringify(data)});
		
		var out = JSON.parse(response.text)
		console.log(out)
		return out['output']['text']
	  } catch (error) {
		console.error('Error:', error);
		throw error;
	  }

  };

function create_newline(editor: Editor){
	const pos = editor.getCursor();
	const line = editor.getLine(pos.line);
	editor.setLine(pos.line, (line + "\n"));
	editor.setCursor({
		line: pos.line+1,
		ch:0
	});
}



interface MyPluginSettings {
	api_key: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	api_key: 'sk-xxxxxx'
}

function operation_on_selection(editor: Editor, sys: string, user_prefix: string, user_suffix:string, api_key:string){
	const selection = editor.getSelection();
	create_newline(editor)
	const data = {
		'system_prompt': sys,
		'user_prompt': user_prefix + selection + user_suffix
		};

	chat(user_prefix + selection + user_suffix, sys, api_key)
		.then((result) => {
		console.log('Response:', result);
		// update the editor
		editor.replaceRange(result, editor.getCursor());
	})
		.catch((error) => console.error('Error:', error));
}

									
const GENERATION_URL =
"https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

async function chat(user_prompt:string, system_prompt:string="You are a helpful assistant.", api_key:string){
	const requestData = {
		model: "qwen-max",
		input: {
		//prompt: user_prompt,
		messages: [

			{
			"role": "system",	
			"content": system_prompt
			},
			{			
			"role": "user",
			"content": user_prompt
			}]
		}
	};
	return payload(GENERATION_URL, requestData, api_key)
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

const URL = 'http://127.0.0.1:5200/query';
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	

	async onload() {
		await this.loadSettings();
		// This creates an icon in the left ribbon.
		this.addRibbonIcon("dice", "Open menu", (event) => {
			const menu = new Menu();
	  
			menu.addItem((item) =>
			  item
				.setTitle("英翻中")
				.setIcon("documents")
				.onClick(async () => {					
					var output = await chat('以下是需要翻译的学术论文节选:- 尤瑟纳尔的入选不仅标志着她在文学上的杰出成就，也反映了社会文化对女性学者及作家地位提升的历史性转变。', '你是一个英文学术论文写作专家，对用户给出的学术文章段落进行翻译为英文，提高语法、清晰度和整体可读性，尽量使用被动语态，更像美国native writer一些，写作风格尽量精简，提高文章的学术性。', this.settings.api_key)
					console.log(output)
					new Notice(output)
				})
			);
	  
			menu.addItem((item) =>
			  item
				.setTitle("中翻英")
				.setIcon("paste")
				.onClick(() => {
				  new Notice("Pasted");
				})
			);
	  
			menu.showAtMouseEvent(event);
		  });

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});


		// TODO: 英译中
		this.addCommand({
			id: "translate_en",
			name: "英译中",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				'你是经验丰富的翻译，充分考虑中文的语法、清晰、简洁和整体可读性，必要时，你可以修改整个句子的顺序以确保翻译后的段落符合中文的语言习惯，任务是把给定的学术文章段落翻译成中文。',
				'你需要翻译的文本如下：',
				'', this.settings.api_key)
		}
		)

		// TODO: 中译英
		this.addCommand({
			id: "translate_zh",
			name: "中译英",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				'你是一个英文学术论文写作专家，对用户给出的学术文章段落进行翻译为英文，提高语法、清晰度和整体可读性，尽量使用被动语态，更像美国native writer一些，写作风格尽量精简，提高文章的学术性。',
				'以下是需要翻译的学术论文节选:',
				'', this.settings.api_key)
		}
		)

		// TODO: 摘要
		this.addCommand({
			id: "summarize",
			name: "段落精读",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				'You are a reading assistant who are good at reading and summarizing key points from text.',
				'对以下内容进行总结归纳，从中提取关键论点，并明确、具体地提取对应的支撑性素材（包括实验数据、相关文献、理论结果等）:',
				`\n以Markdown格式输出
				## 关键论点1: [论点表述]
				- [支撑性素材1]
				- [支撑性素材2]
				- [支撑性素材3]  
				- ...
														
				---
																						
				## 关键论点2:[论点表述]
				- [支撑性素材1]
				- [支撑性素材2]
				- [支撑性素材3]  
				- ...
														
				---
				...`, this.settings.api_key)
		}
		)

		// TODO: 英文润色
		this.addCommand({
			id: "polish_en",
			name: "英文润色",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				'You are a helpful assistant who are good at academic English.',
				"I'm a researcher working in artificial intelligence. I want you to act as an English translator, spelling corrector, and improver. Please polish my text to meet the academic standard in my research area, your goal is to improve the spelling, grammar, clarity, concision, and overall readability. When necessary, rewrite the whole sentence. Furthermore, list all modifications and explain the reasons to do so in a markdown table. Now please polish the following text:",
				'', this.settings.api_key)
		}
		)

		

		// my plugin
		this.addCommand({
			id: "magic",
			name: "Magic Operation",
			editorCallback: (editor: Editor) => {
			  const selection = editor.getSelection();
			  editor.replaceSelection(selection.toUpperCase());
			  const pos = editor.getCursor();
			  const line = editor.getLine(pos.line);

			  editor.setLine(pos.line, (line + "\n"));
			  editor.setCursor({
				  line: pos.line+1,
				  ch:0
			  });
			const data = {
			  'system_prompt': 'You are a helpful assistant',
			  'user_prompt': '番茄炒蛋怎么做？'
			};
			postData(URL, data)
			  .then((result) => {
				console.log('Response:', result);
				editor.replaceRange(result['answer'], editor.getCursor());
			})
			  .catch((error) => console.error('Error:', error));
			
			},
				});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('DASHSCOPE APIKEY')
			.setDesc('APIKEY: sk-xxxxxx')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.api_key)
				.onChange(async (value) => {
					this.plugin.settings.api_key = value;
					await this.plugin.saveSettings();
				}));
	}
}
