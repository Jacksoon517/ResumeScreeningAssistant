// popup.js - logic for the resume screening extension popup

// Compute a simple heuristic score and capture reasons.
// Returns an object { score, matchedKeywords, years, jobMatched }
function computeScoreDetails(resume, job) {
  const keywords = [
    'iot', '边缘计算', 'edge computing', '人工智能', 'ai', 'python',
    '产品经理', 'product manager', '算法', '硬件', '市场', '营销', '分析'
  ];
  let score = 0;
  const lower = resume.toLowerCase();
  const matchedKeywords = [];
  keywords.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) {
      score += 1;
      matchedKeywords.push(kw);
    }
  });
  // Extract years of experience from Chinese or English notation like “6年” or “6 years”
  let years = 0;
  const matchCn = resume.match(/(\d+)\s*年/);
  const matchEn = resume.match(/(\d+)\s*years?/i);
  if (matchCn) {
    years = parseInt(matchCn[1], 10);
  } else if (matchEn) {
    years = parseInt(matchEn[1], 10);
  }
  const yearScore = Math.min(years, 10) / 10;
  score += yearScore;
  // Job description matching: count how many keywords appear in job description
  let jobMatched = [];
  if (job) {
    const jobLower = job.toLowerCase();
    keywords.forEach(kw => {
      if (jobLower.includes(kw.toLowerCase()) && lower.includes(kw.toLowerCase())) {
        jobMatched.push(kw);
      }
    });
  }
  const maxPossible = keywords.length + 1; // plus one for years
  const normalized = Math.min(score / maxPossible, 1);
  return {
    score: parseFloat(normalized.toFixed(3)),
    matchedKeywords,
    years,
    jobMatched
  };
}

// Retrieve configuration values from storage and populate the inputs
function loadConfig() {
  const apiKeyInput = document.getElementById('apiKey');
  const apiUrlInput = document.getElementById('apiUrl');
  const modelInput = document.getElementById('modelId');
  if (!chrome || !chrome.storage || !chrome.storage.local) {
    return;
  }
  chrome.storage.local.get(['modelApiKey', 'modelApiUrl', 'modelId'], items => {
    if (items.modelApiKey) {
      apiKeyInput.value = items.modelApiKey;
    }
    if (items.modelApiUrl) {
      apiUrlInput.value = items.modelApiUrl;
    }
    if (items.modelId) {
      modelInput.value = items.modelId;
    } else {
      modelInput.value = 'general';
    }
  });
  // Load theme
  chrome.storage.local.get(['theme', 'pinned', 'lastResume', 'lastJob'], items => {
    const theme = items.theme || 'dark';
    applyTheme(theme);
    // Update theme switch knob position (via class on body)
    // Set pin icon state
    const pinToggle = document.getElementById('pinToggle');
    if (pinToggle) {
      if (items.pinned) {
        pinToggle.textContent = '📌';
      } else {
        pinToggle.textContent = '📍';
      }
    }
    // Load last inputs
    const resumeInput = document.getElementById('resumeInput');
    const jobInput = document.getElementById('jobInput');
    if (items.lastResume) {
      resumeInput.value = items.lastResume;
    }
    if (items.lastJob) {
      jobInput.value = items.lastJob;
    }

    // If this popup is opened in pinned mode (#pin), adjust UI
    if (window.location.hash === '#pin') {
      document.body.classList.add('pinned');
      // Hide pin toggle button in pinned window
      const pinToggleElem = document.getElementById('pinToggle');
      if (pinToggleElem) {
        pinToggleElem.style.display = 'none';
      }
      // Show Mac controls
      const macControls = document.getElementById('macControls');
      if (macControls) {
        macControls.style.display = 'flex';
      }
    }
  });
}

// Apply the theme class to the body and store preference
function applyTheme(theme) {
  const body = document.body;
  if (theme === 'light') {
    body.classList.add('light');
  } else {
    body.classList.remove('light');
  }
  chrome.storage.local.set({ theme });
}

// Save API configuration to storage
function saveConfig() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const modelId = document.getElementById('modelId').value.trim() || 'general';
  const settingsPanel = document.getElementById('settingsPanel');
  chrome.storage.local.set({
    modelApiKey: apiKey,
    modelApiUrl: apiUrl,
    modelId: modelId
  }, () => {
    alert('配置已保存');
    if (settingsPanel) settingsPanel.style.display = 'none';
  });
}

// Use Doubao API to generate a summary for the given resume
async function generateSummary(resume) {
  const summaryElem = document.getElementById('summaryResult');
  summaryElem.textContent = '正在生成摘要，请稍候...';
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const modelId = document.getElementById('modelId').value.trim() || 'general';
  if (!apiKey || !apiUrl) {
    alert('请先配置大模型的 API Key 和接口地址');
    summaryElem.textContent = '';
    return;
  }
  const prompt = `请用中文 30 到 60 字概括候选人的主要经历、技能和优势。简历内容来自网页抓取，可能包含与简历无关的字段，可以忽略这些无关内容。\n候选人简历：${resume}`;
  const body = {
    model: modelId,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    top_p: 0.9
  };
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }
    const data = await response.json();
    let content = '';
    if (data && data.choices && data.choices.length > 0) {
      content = data.choices[0].message?.content || '';
    } else if (data.output) {
      content = data.output;
    }
    summaryElem.textContent = content.trim();
  } catch (err) {
    console.error(err);
    summaryElem.textContent = '调用豆包接口失败，请检查网络或配置。';
  }
}

// Use the configured large language model API to produce a matching score (0–1) and a brief explanation
async function generateScoreWithModel(resume, job) {
  const scoreElem = document.getElementById('scoreResult');
  scoreElem.textContent = '正在请求评分，请稍候...';
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const modelId = document.getElementById('modelId').value.trim() || 'general';
  if (!apiKey || !apiUrl) {
    alert('请先配置大模型的 API Key 和接口地址');
    scoreElem.textContent = '';
    return;
  }
  let prompt;
  if (job) {
    prompt = `你是资深人力资源专家，请根据下面候选人的简历与岗位描述，分析候选人匹配度并给出 0 到 1 之间的评分（保留三位小数），并简要说明理由。简历文本来自网页抓取，可能包含与简历无关的字段，可以忽略这些无关内容。返回格式要求第一行以 score= 打头，然后是分数，第二行起是说明。\n候选人简历：${resume}\n岗位描述：${job}`;
  } else {
    prompt = `你是资深人力资源专家，请根据下面候选人的简历，评估其求职竞争力，并给出 0 到 1 之间的评分（保留三位小数），并简要说明理由。简历文本来自网页抓取，可能包含与简历无关的字段，可以忽略这些无关内容。返回格式要求第一行以 score= 打头，然后是分数，第二行起是说明。\n候选人简历：${resume}`;
  }
  const body = {
    model: modelId,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    top_p: 0.9
  };
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }
    const data = await response.json();
    let content = '';
    if (data && data.choices && data.choices.length > 0) {
      content = data.choices[0].message?.content || '';
    } else if (data.output) {
      content = data.output;
    }
    // Parse content: expect "score=0.xxx\n说明：..."
    let scoreValue = '';
    let explanation = '';
    const lines = content.split(/\n|\\n/);
    for (const line of lines) {
      const m = line.match(/score\s*=\s*([0-9]*\.?[0-9]+)/i);
      if (m) {
        scoreValue = m[1];
      } else if (line.trim()) {
        explanation += line.trim() + '\n';
      }
    }
    scoreElem.textContent = '';
    if (scoreValue) {
      scoreElem.textContent += `豆包评分：${scoreValue}\n`;
    }
    if (explanation) {
      scoreElem.textContent += explanation.trim();
    }
  } catch (err) {
    console.error(err);
    scoreElem.textContent = '调用大模型接口失败，请检查网络或配置。';
  }
}

// Use Doubao API to generate key interview questions based on resume and job description
async function generateQuestions(resume, job) {
  const questionElem = document.getElementById('questionResult');
  questionElem.textContent = '正在生成问题，请稍候...';
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const modelId = document.getElementById('modelId').value.trim() || 'general';
  if (!apiKey || !apiUrl) {
    alert('请先配置大模型的 API Key 和接口地址');
    questionElem.textContent = '';
    return;
  }
  // Compose a prompt instructing the model to generate key questions
  let prompt = '';
  if (job) {
    prompt = `你是资深人力资源专家，请根据下面候选人的简历与岗位描述，列出 5 个与候选人沟通时应重点关注的问题。这些问题应围绕候选人的经历、技能、岗位匹配度等方面，避免与工作无关的内容。简历文本来自网页抓取，可能包含无关字段，可忽略这些内容。\n候选人简历：${resume}\n岗位描述：${job}`;
  } else {
    prompt = `你是资深人力资源专家，请根据下面候选人的简历，列出 5 个与候选人沟通时应重点关注的问题。这些问题应围绕候选人的经历、技能、岗位匹配度等方面，避免与工作无关的内容。简历文本来自网页抓取，可能包含无关字段，可忽略这些内容。\n候选人简历：${resume}`;
  }
  const body = {
    model: modelId,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    top_p: 0.9
  };
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }
    const data = await response.json();
    let content = '';
    if (data && data.choices && data.choices.length > 0) {
      content = data.choices[0].message?.content || '';
    } else if (data.output) {
      content = data.output;
    }
    // Display the generated questions as-is
    questionElem.textContent = content.trim();
  } catch (err) {
    console.error(err);
    questionElem.textContent = '生成沟通问题失败，请检查网络或配置。';
  }
}

// Initialise handlers once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
  document.getElementById('jsScoreBtn').addEventListener('click', () => {
    const resume = document.getElementById('resumeInput').value.trim();
    const job = document.getElementById('jobInput').value.trim();
    if (!resume) {
      alert('请先输入候选人的简历内容');
      return;
    }
    const result = computeScoreDetails(resume, job);
    const scoreElem = document.getElementById('scoreResult');
    // Build explanation
    let explanation = `JS 评分：${result.score}\n`;
    if (result.matchedKeywords.length > 0) {
      explanation += `匹配关键词：${result.matchedKeywords.join('，')}\n`;
    } else {
      explanation += '未匹配到预定义的关键技能\n';
    }
    if (result.years > 0) {
      explanation += `工作年限：${result.years} 年\n`;
    }
    if (result.jobMatched && result.jobMatched.length > 0) {
      explanation += `与岗位匹配关键词：${result.jobMatched.join('，')}\n`;
    }
    scoreElem.textContent = explanation.trim();
    // save last inputs for memory
    chrome.storage.local.set({ lastResume: resume, lastJob: job });
  });

  // Summary and score buttons updated IDs
  document.getElementById('summaryBtn').addEventListener('click', () => {
    const resume = document.getElementById('resumeInput').value.trim();
    if (!resume) {
      alert('请先输入候选人的简历内容');
      return;
    }
    generateSummary(resume);
    // save current inputs for memory
    const job = document.getElementById('jobInput').value.trim();
    chrome.storage.local.set({ lastResume: resume, lastJob: job });
  });
  document.getElementById('scoreBtn').addEventListener('click', () => {
    const resume = document.getElementById('resumeInput').value.trim();
    if (!resume) {
      alert('请先输入候选人的简历内容');
      return;
    }
    const job = document.getElementById('jobInput').value.trim();
    generateScoreWithModel(resume, job);
    chrome.storage.local.set({ lastResume: resume, lastJob: job });
  });

  // Generate key interview questions
  const questionBtn = document.getElementById('questionBtn');
  if (questionBtn) {
    questionBtn.addEventListener('click', () => {
      const resume = document.getElementById('resumeInput').value.trim();
      if (!resume) {
        alert('请先输入候选人的简历内容');
        return;
      }
      const job = document.getElementById('jobInput').value.trim();
      generateQuestions(resume, job);
      // Save last inputs for memory
      chrome.storage.local.set({ lastResume: resume, lastJob: job });
    });
  }
  // Extract resume from current page or last focused normal window
  document.getElementById('extractBtn').addEventListener('click', () => {
    // Query the active tab in the last focused normal window to avoid picking the extension's own tab
    chrome.tabs.query({ active: true, windowType: 'normal', lastFocusedWindow: true }, tabs => {
      if (!tabs || tabs.length === 0) {
        alert('无法读取该页面的内容');
        return;
      }
      const tab = tabs[0];
      if (!tab || !tab.id) {
        alert('无法读取该页面的内容');
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            // Prefer user-selected text when available
            const selection = window.getSelection && window.getSelection();
            if (selection && selection.toString().trim()) {
              return selection.toString();
            }
            // Attempt to extract from common resume container selectors
            const selectors = [
              '.resume-body',
              '.resume-content',
              '#resumeContent',
              '[data-hook="resume"]',
              '.job-intro + div'
            ];
            for (const css of selectors) {
              const elem = document.querySelector(css);
              if (elem) {
                const text = (elem.innerText || elem.textContent || '').trim();
                if (text) {
                  return text;
                }
              }
            }
            // Fallback to whole page text
            const body = document.body;
            if (body) {
              return (body.innerText || body.textContent || '').trim();
            }
            return '';
          } catch (e) {
            return '';
          }
        }
      }, results => {
        const text = results && results[0] && results[0].result ? results[0].result : '';
        if (text) {
          const resumeInput = document.getElementById('resumeInput');
          resumeInput.value = text.trim();
          chrome.storage.local.set({ lastResume: resumeInput.value });
        } else {
          alert('无法读取该页面的内容，请尝试手动选择简历文本后再点击读取');
        }
      });
    });
  });

  // Persist resume and job inputs on change to storage for memory
  const resumeInputElem = document.getElementById('resumeInput');
  const jobInputElem = document.getElementById('jobInput');
  resumeInputElem.addEventListener('input', () => {
    const value = resumeInputElem.value;
    chrome.storage.local.set({ lastResume: value });
  });
  jobInputElem.addEventListener('input', () => {
    const value = jobInputElem.value;
    chrome.storage.local.set({ lastJob: value });
  });

  // Persist API configuration inputs as the user types to avoid losing them when closing the popup
  const apiKeyInput = document.getElementById('apiKey');
  const apiUrlInput = document.getElementById('apiUrl');
  const modelIdInput = document.getElementById('modelId');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', () => {
      chrome.storage.local.set({ modelApiKey: apiKeyInput.value.trim() });
    });
  }
  if (apiUrlInput) {
    apiUrlInput.addEventListener('input', () => {
      chrome.storage.local.set({ modelApiUrl: apiUrlInput.value.trim() });
    });
  }
  if (modelIdInput) {
    modelIdInput.addEventListener('input', () => {
      const val = modelIdInput.value.trim() || 'general';
      chrome.storage.local.set({ modelId: val });
    });
  }

  // Handle resume file upload via drag-and-drop or click
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  if (uploadArea && fileInput) {
    // Highlight on drag over
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleResumeFile(files[0]);
      }
    });
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', () => {
      const files = fileInput.files;
      if (files && files.length > 0) {
        handleResumeFile(files[0]);
        // Reset file input so same file can be selected again
        fileInput.value = '';
      }
    });
  }

  /**
   * Read the uploaded resume file and populate the resume input.
   * Supports text-like files (.txt, .md, .json, .csv, .log).
   * Updates memory storage accordingly.
   * @param {File} file
   */
  function handleResumeFile(file) {
    if (!file) return;
    // Determine file extension to handle different formats separately
    const name = file.name || '';
    const ext = name.split('.').pop().toLowerCase();
    // Handle PDF files: show a friendly message that this format is not yet supported
    if (ext === 'pdf') {
      alert('当前版本暂不支持解析 PDF 文件，请将 PDF 转换为文本或 DOCX 格式后再上传');
      return;
    }
    // Handle legacy Word documents (.doc) which use a binary format
    if (ext === 'doc') {
      alert('旧版 Word（.doc）格式由于解析复杂暂不支持，请转换为 .docx 或文本格式再上传');
      return;
    }
    // Handle modern Word documents (.docx) using JSZip to unzip and extract XML
    if (ext === 'docx') {
      const reader = new FileReader();
      reader.onload = function() {
        const arrayBuffer = reader.result;
        // Ensure JSZip is available (loaded via popup.html)
        if (typeof JSZip === 'undefined') {
          alert('JSZip 库未加载，无法解析 DOCX 文件');
          return;
        }
        JSZip.loadAsync(arrayBuffer).then(zip => {
          // DOCX files store text in the word/document.xml entry
          const docFile = zip.file('word/document.xml');
          if (!docFile) {
            throw new Error('无法找到 DOCX 文档内容');
          }
          return docFile.async('string');
        }).then(xmlString => {
          // Parse the XML and extract text nodes (w:t elements)
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
          const textEls = Array.from(xmlDoc.getElementsByTagName('w:t'));
          const text = textEls.map(el => el.textContent).join('\n');
          resumeInputElem.value = text.trim();
          chrome.storage.local.set({ lastResume: resumeInputElem.value });
        }).catch(err => {
          console.error(err);
          alert('解析 DOCX 文件失败');
        });
      };
      reader.onerror = function() {
        alert('无法读取文件内容');
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    // Default: treat as text-like file
    const reader = new FileReader();
    reader.onload = function() {
      const text = reader.result;
      if (typeof text === 'string') {
        resumeInputElem.value = text.trim();
        chrome.storage.local.set({ lastResume: resumeInputElem.value });
      }
    };
    reader.onerror = function() {
      alert('无法读取文件内容');
    };
    reader.readAsText(file, 'utf-8');
  }

  // Theme switch slider
  const themeSwitch = document.getElementById('themeSwitch');
  themeSwitch.addEventListener('click', () => {
    chrome.storage.local.get('theme', items => {
      const current = items.theme || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });

  // Pin toggle button - in popup context, toggles the global floating panel via background
  const pinToggle = document.getElementById('pinToggle');
  if (pinToggle) {
    pinToggle.addEventListener('click', () => {
      chrome.storage.local.get('pinned', items => {
        const pinned = !!items.pinned;
        const newState = !pinned;
        chrome.runtime.sendMessage({ type: 'togglePin', value: newState }, () => {
          // Update icon immediately
          pinToggle.textContent = newState ? '📌' : '📍';
          // Close the popup if we just pinned to avoid duplicate UI
          if (newState) {
            window.close();
          }
        });
      });
    });
  }

  // Open side panel on demand (for users who cannot rely on toolbar click)
  const openSidePanelBtn = document.getElementById('openSidePanel');
  if (openSidePanelBtn && chrome.sidePanel && chrome.sidePanel.open) {
    openSidePanelBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, windowType: 'normal', lastFocusedWindow: true }, tabs => {
        if (!tabs || tabs.length === 0) return;
        const tab = tabs[0];
        // Ensure side panel is enabled and set to our panel.html for this tab
        if (chrome.sidePanel.setOptions) {
          chrome.sidePanel.setOptions({ tabId: tab.id, path: 'panel.html', enabled: true }).then(() => {
            chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
          }).catch(() => {
            // fallback to open without setting options
            chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
          });
        } else {
          chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
        }
      });
    });
  }

  // Mac-style controls events (only in pinned window)
  if (window.location.hash === '#pin') {
    const closeBtn = document.querySelector('.mac-btn.close');
    const minimizeBtn = document.querySelector('.mac-btn.minimize');
    const zoomBtn = document.querySelector('.mac-btn.zoom');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        // Update storage and close window
        chrome.storage.local.set({ pinned: false, pinnedWindowId: null }, () => {
          window.close();
        });
      });
    }
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        chrome.windows.getCurrent(win => {
          if (win && win.id) {
            chrome.windows.update(win.id, { state: 'minimized' });
          }
        });
      });
    }
    if (zoomBtn) {
      zoomBtn.addEventListener('click', () => {
        chrome.windows.getCurrent(win => {
          if (win && win.id) {
            // toggle between maximized and normal
            const newState = win.state === 'maximized' ? 'normal' : 'maximized';
            chrome.windows.update(win.id, { state: newState });
          }
        });
      });
    }
  }

  // Toggle settings panel visibility
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');

  settingsToggle.addEventListener('click', () => {
    // Toggle display style
    if (settingsPanel.style.display === 'block') {
      settingsPanel.style.display = 'none';
    } else {
      loadConfig();
      settingsPanel.style.display = 'block';
    }
  });
  cancelSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
  });
});