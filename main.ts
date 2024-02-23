import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, moment, Menu, requestUrl, RequestUrlParam} from 'obsidian';
// Remember to rename these classes and interfaces!

import {
	encode,
	encodeChat,
	decode,
	isWithinTokenLimit,
	encodeGenerator,
	decodeGenerator,
	decodeAsyncGenerator,
  } from 'gpt-tokenizer'


function extractRoleValue(text: string): string {
	const roleRegex = /Role:([\s\S]+?)\n[\s\S]+?---/g;
	const matches = roleRegex.exec(text);

	if (matches && matches.length > 1) {
		const roleValue = matches[1].trim();
		return roleValue;
	}

	return '';
}

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
		new Notice(`馒头：U•ェ•*U 请求错误: 代号${error}`)
		// throw error;
		return '[请求错误]'
	  }

  };

function create_newline(editor: Editor){
	// const curserStart = editor.getCursor("from");
	const curserEnd = editor.getCursor("to");
	const line = editor.getLine(curserEnd.line);
	editor.setLine(curserEnd.line, (line + "\n"));
	editor.setCursor({
		line: curserEnd.line+1,
		ch:0
	});
}



interface MyPluginSettings {
	api_key: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	api_key: 'sk-xxxxxx'
}

function operation_on_selection(editor: Editor, sys: string, user_prefix: string, user_suffix:string, api_key:string, post_fn:any=(x:string)=>`\n---\n${x}\n`, selection_fn=(x:string)=>(x)){
	const selection = editor.getSelection();
	
	editor.replaceSelection(selection_fn(selection))
	create_newline(editor)
	const data = {
		'system_prompt': sys,
		'user_prompt': user_prefix + selection + user_suffix
		};
	
	var notice = new Notice('馒头：U•ェ•*U努力思考中...', 0)
	chat(data['user_prompt'], data['system_prompt'], api_key)
		.then((result) => {
			// update the editor
		result = post_fn(result)
		console.log('Response:', result);
		notice.setMessage('馒头：U•ェ•*U完成啦！')
		editor.replaceRange(result, editor.getCursor());
		notice.hide()
	}).catch((error) => {
			console.error('Error:', error)
			notice.hide()
		});
	}





function splitTextOnTokens(text: string, tokensPerChunk: number): string[] {
	const splits: string[] = [];
	const inputIds = encode(text);
	let startIdx = 0;
	let curIdx = Math.min(startIdx + tokensPerChunk, inputIds.length);
	var chunkIds = inputIds.slice(startIdx, curIdx);
  
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

async function chat(user_prompt:string, system_prompt:string="You are a helpful assistant.", api_key:string){
	const requestData = {
		model: "qwen-max",
		input: {
		//prompt: user_prompt,
		messages: [
			{
			"role": "system",	
			"content": system_prompt.replace('"', "'")
			},
			{			
			"role": "user",
			"content": user_prompt.replace('"', "'")
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
const SUMMARY_SYS = 'You are a reading assistant who are good at reading and summarizing key points from text.'

const SUMMARY_USER_PREFIX = '对以下内容进行总结归纳，从中提取关键论点，并明确、具体地提取对应的支撑论据（包括实验数据、相关文献、理论结果等），保留原文中markdown图片链接(![text](url)):'

const SUMMARY_USER_SUFFIX =  `\n以Markdown格式输出
## 关键论点: [论点表述]
- [支撑论据]
- [支撑论据]
- [支撑论据]  
- ...
										
---
																		
## 关键论点:[论点表述]
- [支撑论据]
- [支撑论据]
- [支撑论据]  
- ...
										
---
...`
const META_ROLE = `You are an AI assistant whose name is MantouAI.
- MantouAI is a conversational language model that is developed by Fudan University. It is designed to be helpful, honest, and harmless.
- Its responses must not be vague, accusatory, rude, controversial, off-topic, or defensive.
- MantouAI can understand and communicate fluently in the language chosen by the user such as English and 中文. MantouAI can perform any language-based tasks.
- MantouAI is an expert at reading, understanding and writing. 
- It can provide additional relevant details to answer in-depth and comprehensively covering mutiple aspects.
- All the equations should be output in MathJAX format.
- It apologizes and accepts the user's suggestion if the user corrects the incorrect answer generated by MantouAI.
`

async function summarize_chunk(chunk:string, api_key:string){
	const data = {
		'system_prompt': SUMMARY_SYS,
		'user_prompt': SUMMARY_USER_PREFIX + chunk + SUMMARY_USER_SUFFIX
		};

	return chat(data['user_prompt'], data['system_prompt'], api_key)
}

function addGreaterThanSign(text: string): string {
	const lines = text.split('\n');
	const modifiedLines = lines.map(line => `> ${line}`);
	return modifiedLines.join('\n');
  }

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	// util codes
	async appendFile(filePath: string, note: string) {
		let existingContent = await this.app.vault.adapter.read(filePath);
		if(existingContent.length > 0) {
			existingContent = existingContent + '\r\r';
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
					if(file === null) return;
					if(file.extension !== 'md') return;
					
					const file_name = '[摘要] ' + file.name;
					var folder:string = file.parent.path
					var summary_list:string[] = []
					this.app.vault.read(file)
					.then(async (text: string) => {
					// console.log(text); // Output: Contents of the file
					var splits = splitTextOnTokens(text, 1000)
					
					for (let index = 0; index < splits.length; index++){
						console.log(splits[index])
						var summary:string = await summarize_chunk(splits[index], this.settings.api_key)
						summary_list.push(summary)
						await this.saveToFile(`${folder}/${file_name}`,  summary);
						
						new Notice(`馒头：U•ェ•*U努力阅读中 (${index+1}/${splits.length})`)
					}
					
					// console.log(splits)
					})
					.catch((err: any) => {
					console.error(err);
					});
										
					await this.app.workspace.openLinkText(`${folder}/${file_name}`, '', true);
				  //new Notice("Pasted");
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
			name: "🐶英译中",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				META_ROLE,
				'作为经验丰富的翻译，充分考虑中文的语法、清晰、简洁和整体可读性，必要时，你可以修改整个句子的顺序以确保翻译后的段落符合中文的语言习惯，任务是把给定的学术文章段落翻译成中文。你需要翻译的文本如下：',
				'', this.settings.api_key)
		}
		)


		
		// TODO: 中译英
		this.addCommand({
			id: "translate_zh",
			name: "🐶中译英",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				META_ROLE,
				'作为英文学术论文写作专家，对用户给出的学术文章段落进行翻译为英文，提高语法、清晰度和整体可读性，尽量使用被动语态，更像美国native writer一些，写作风格尽量精简，提高文章的学术性。以下是需要翻译的学术论文节选:',
				'', this.settings.api_key)
		}
		)

		// TODO: 中译英
		this.addCommand({
			id: "question_for_mantou",
			name: "🐶向馒头提问",
			editorCallback: (editor: Editor) => {
				var editorView = this.app.workspace.getActiveViewOfType(MarkdownView);
				var role = META_ROLE

				if (!editorView) {
					console.log('...')
				}else{
					const markdownText = editorView.data;
					var temp_role = extractRoleValue(markdownText)
					console.log('TEMP ROLE:', temp_role)
					if(temp_role.length != 0){
						role = temp_role
					} 
					console.log('ROLE:', role)
				}
				
				operation_on_selection(
				editor, 
				role,
				'',
				'', this.settings.api_key,
				(x:string)=> {
					x = x.replace( /\[/gi, "$$$").replace( /\]/gi, "$$$").replace( /\(/gi, "$").replace( /\)/gi, "$").replace("\$", "$");  
					x = addGreaterThanSign(x)
					x = x
					return x
				},
				(x:string)=>{
					x = `> [!NOTE] ${x}`
					return x
				});
			}
		}
		)

		this.addCommand({
			id: "summarize_general",
			name: "🐶要点归纳",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				META_ROLE,
				'以Markdown要点的形式总结以下内容：',
				'', this.settings.api_key)
		}
		)

		// TODO: 摘要
		this.addCommand({
			id: "summarize_ppt",
			name: "🐶段落精读（PPT）",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				META_ROLE,
				'对以下内容进行总结归纳，从中提取关键论点，并明确、具体地提取对应的支撑论据（包括实验数据、相关文献、理论结果等）:',
				`\n以Markdown格式输出
				## 关键论点1: [论点表述]
				- [支撑论据1]
				- [支撑论据2]
				- [支撑论据3]  
				- ...
														
				---
																						
				## 关键论点2:[论点表述]
				- [支撑论据1]
				- [支撑论据2]
				- [支撑论据3]  
				- ...
														
				---
				...`, this.settings.api_key)
		}
		)

		// TODO: 英文润色
		this.addCommand({
			id: "polish_en",
			name: "🐶英文润色",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				'You are a helpful assistant who are good at academic English.',
				"I'm a researcher working in artificial intelligence. I want you to act as an English translator, spelling corrector, and improver. Please polish my text to meet the academic standard in my research area, your goal is to improve the spelling, grammar, clarity, concision, and overall readability. When necessary, rewrite the whole sentence. Furthermore, list all modifications and explain the reasons to do so in a markdown table. Now please polish the following text:",
				'', this.settings.api_key)
		}
		)

		this.addCommand({
			id: "polish_cn",
			name: "🐶中文润色",
			editorCallback: (editor: Editor) => operation_on_selection(
				editor, 
				'You are a helpful assistant who are good at writing',
				"请充分理解下面文本的含义，重新表述，要求用词严谨、正确、简洁精炼，不得擅自修改其中的专业术语，表述符合中文表达习惯和中文语序，且符合学术写作要求：",
				'', this.settings.api_key)
		}
		)

		
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
