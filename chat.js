import fetch from "node-fetch";

let API_KEY = process.env.DASHSCOPE_API_KEY;

const config = (apiKey = API_KEY) => {
  API_KEY = key;
};

const query = async (url, data, apiKey = API_KEY) => {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  return fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  }).then((response) => response.json());
};

const payload = async (url, data, apiKey = API_KEY) => {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  return fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  }).then((response) => response.json());
};


/**
 * https://help.aliyun.com/zh/dashscope/developer-reference/api-details?spm=a2c4g.11186623.4.2.f11a3855r1pizQ&scm=20140722.H_2399481._.ID_2399481-OR_rec-V_1
 *
 */
const GENERATION_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

const chat = async (data) => {
  const { messages, history = [] } = data;
  const requestData = {
    model: "qwen-max",
    input: {
      messages,
      history,
    },
    parameters: {},
  };
  return payload(GENERATION_URL, requestData, 'sk-7db6872ff0634727ac010bc1fded7e48');
};


const messages = {'messages': [{'role': 'system', 'content': '你是一个英文学术论文写作专家，对用户给出的学术文章段落进行翻译为英文，提高语法、清晰度和整体可读性，尽量使用被动语态，更像美国native writer一些，写作风格尽量精简，提高文章的学术性。'}, {'role': 'user', 'content': '以下是需要翻译的学术论文节选:- 尤瑟纳尔的入选不仅标志着她在文学上的杰出成就，也反映了社会文化对女性学者及作家地位提升的历史性转变。'}]}

var output = chat(messages)
console.log(output)