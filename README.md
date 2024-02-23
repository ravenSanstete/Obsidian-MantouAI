# MantouAI—— 让Obsidian变身智能助手
<p align="center">
  <img src="imgs/logo.png" width=300 height=300 alt="MantouGPT Logo"/>
</p>
<p align="center">
  <em>*MantouAI*是为每个人设计的开放个人助手（生活在Obsidian之中），它能协助办公学习、聊天、（未来：上网、写报告、规划旅行...） </em>
</p>


## 1. 什么是MantouAI🐶？
* MantouAI = **馒头AI**（PS：我们家有一只不会动的柴犬馒头，老婆想让它动起来）
* 一款集成AI大模型的Obsidian插件
* Obsidian + MantouAI = X书助手、X钉魔法棒、NotionAI
* 开源 + 定制（有需要什么功能，请给我issues！）
* ”万事不决、问问馒头“ (Command+Shift+P/Command+P)

---


## 2. 功能介绍🥰 （喜欢的话，务必Star⭐哦，拜托了）
---
### 2.1 万能提问
* 任意选中文字，向馒头提问吧
* ”万事不决、问问馒头“
<p align="center">
  <img src="imgs/Pasted image 20240223202357.png" width=800/>
</p>

### 2.2 内置常见学术功能
* **对任意选中文字**（1000字以内较好）：中译英、英译中、中文润色、要点归纳、段落精读 ...
<p align="center">
  <img src="imgs/Pasted image 20240223201921.png" width=800/>
</p>


<p align="center">
  <img src="imgs/Pasted image 20240223202150.png" width=800/>
</p>



### 2.3 角色扮演
* 在properties中加入键值对”role“，”<角色描述>“（角色描述务必用”“开合，定位用）
* role下方加入随意的key-value一对
<p align="center">
  <img src="imgs/Pasted image 20240223203053.png" width=800/>
</p>

### 2.4 全文观点提炼
<p align="center">
  <img src="imgs/image.png" width=800/>
</p>

<p align="center">
  <img src="imgs/image2.png" width=800/>
</p>

---
## 3. 开始使用吧👐!
### 3.1 开箱即用
1. Releases下载MantouAI-v0.1.zip
2. 放到Obsidian Vault的plugins文件夹，解压缩
3. 重新打开Obsidian，加载MantouAI
<p align="center">
  <img src="imgs/Pasted image 20240223201340.png" width=800/>
</p>

4. 根据[教程](https://help.aliyun.com/zh/dashscope/developer-reference/api-details)，免费申请阿里Dashscope账号和api key 
5. 配置你的key
<p align="center">
  <img src="imgs/Pasted image 20240223201706.png" width=800/>
</p>

### 3.2 面向开发者
1. git clone this repository 
2. npm install esbuild
3. 目录下执行 npm run dev (持续编译)
4. 开始魔改 main.ts 吧


## 4. 开发路线图 🗺︎
- [ ] 本地化大模型（数据隐私）：
	- [ ] Gemma-2b-it（魔改ing，正在接入）
- [ ] 个性化助手
	- [ ] 与当前文档对话
	- [ ] 与Obsidian知识库对话
	- [ ] 连接Obsidian其他插件，自主Agent
	- [ ] ...

## 5. 注意事项⚠︎
* 当前版本接入通义大模型，需联网（过于敏感的数据请勿使用）
* 请遵守负责任使用AI的原则，任何滥用与本代码库无关
* ...

## 6. 为什么开发MantouAI？All-in-Obsidian! ❓
* A: 使用网页版大模型各种复制文档，好麻烦...
* B: 写一个webui界面，大家还得命令行开启，不如obsidian插件自然...
* 你觉得呢？

## 7. 搭配以下插件食用更加
* Better Command Palette
* Marp Slides （馒头精读内容，直接生成PPT啦！）
* ... （等你发现

