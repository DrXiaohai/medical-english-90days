# 读懂一个医学词

以下 lesson-json 块为本课唯一维护数据；阅读版由构建脚本生成。

```lesson-json
{
  "day": 1,
  "title": "读懂一个医学词",
  "chapter": "Ch.1 · Basic Word Structure",
  "pages": "电子书导航起始页 23",
  "objectives": [
    "区分词根、连接元音、前缀与后缀",
    "保留 may 与 suggests 的不确定性",
    "独立写出一个完整的主谓句"
  ],
  "vocabulary": [
    {
      "id": "cardi-o",
      "english": "cardi/o",
      "chinese": "心",
      "pos": "combining form",
      "system": "基础",
      "morphology": "cardi（词根）+ o（连接元音）",
      "example": "Cardiology is the study of the heart.",
      "translation": "心脏病学研究心脏。",
      "difficulty": 1
    },
    {
      "id": "gastr-o",
      "english": "gastr/o",
      "chinese": "胃",
      "pos": "combining form",
      "system": "基础",
      "morphology": "gastr + o",
      "example": "Gastritis means inflammation of the stomach.",
      "translation": "Gastritis 指胃的炎症。",
      "difficulty": 1
    },
    {
      "id": "nephr-o",
      "english": "nephr/o",
      "chinese": "肾",
      "pos": "combining form",
      "system": "基础",
      "morphology": "nephr + o",
      "example": "Nephrology focuses on kidney disease.",
      "translation": "肾脏病学关注肾脏疾病。",
      "difficulty": 1
    },
    {
      "id": "hepat-o",
      "english": "hepat/o",
      "chinese": "肝",
      "pos": "combining form",
      "system": "基础",
      "morphology": "hepat + o",
      "example": "Hepatitis involves inflammation of the liver.",
      "translation": "肝炎涉及肝脏的炎症。",
      "difficulty": 1
    },
    {
      "id": "-itis",
      "english": "-itis",
      "chinese": "炎症",
      "pos": "suffix",
      "system": "基础",
      "morphology": "后缀",
      "example": "Arthritis affects the joints.",
      "translation": "关节炎累及关节。",
      "difficulty": 1
    },
    {
      "id": "-logy",
      "english": "-logy",
      "chinese": "学科；研究",
      "pos": "suffix",
      "system": "基础",
      "morphology": "后缀",
      "example": "Biology is the study of life.",
      "translation": "生物学研究生命。",
      "difficulty": 1
    },
    {
      "id": "hyper-",
      "english": "hyper-",
      "chinese": "过高；过多",
      "pos": "prefix",
      "system": "基础",
      "morphology": "前缀",
      "example": "Hyperglycemia means high blood glucose.",
      "translation": "高血糖指血糖水平升高。",
      "difficulty": 1
    },
    {
      "id": "hypo-",
      "english": "hypo-",
      "chinese": "过低；不足",
      "pos": "prefix",
      "system": "基础",
      "morphology": "前缀",
      "example": "Hypoglycemia may cause sweating.",
      "translation": "低血糖可能引起出汗。",
      "difficulty": 1
    },
    {
      "id": "tachy-",
      "english": "tachy-",
      "chinese": "快",
      "pos": "prefix",
      "system": "基础",
      "morphology": "前缀",
      "example": "Tachycardia means a fast heart rate.",
      "translation": "心动过速指心率过快。",
      "difficulty": 1
    },
    {
      "id": "brady-",
      "english": "brady-",
      "chinese": "慢",
      "pos": "prefix",
      "system": "基础",
      "morphology": "前缀",
      "example": "Bradycardia means a slow heart rate.",
      "translation": "心动过缓指心率过慢。",
      "difficulty": 1
    },
    {
      "id": "-emia",
      "english": "-emia",
      "chinese": "血液状态",
      "pos": "suffix",
      "system": "基础",
      "morphology": "后缀",
      "example": "Anemia is a clinical condition.",
      "translation": "贫血是一种临床状态。",
      "difficulty": 1
    },
    {
      "id": "-pathy",
      "english": "-pathy",
      "chinese": "疾病",
      "pos": "suffix",
      "system": "基础",
      "morphology": "后缀",
      "example": "Neuropathy affects nerves.",
      "translation": "神经病变累及神经。",
      "difficulty": 1
    },
    {
      "id": "symptom",
      "english": "symptom",
      "chinese": "症状",
      "pos": "noun",
      "system": "基础",
      "morphology": "不强行拆词",
      "example": "Pain is a symptom.",
      "translation": "疼痛是一种症状。",
      "difficulty": 1
    },
    {
      "id": "sign",
      "english": "sign",
      "chinese": "体征",
      "pos": "noun",
      "system": "基础",
      "morphology": "不强行拆词",
      "example": "A rash can be a clinical sign.",
      "translation": "皮疹可是一种临床体征。",
      "difficulty": 1
    },
    {
      "id": "diagnosis",
      "english": "diagnosis",
      "chinese": "诊断",
      "pos": "noun",
      "system": "基础",
      "morphology": "复数 diagnoses",
      "example": "The diagnosis remains uncertain.",
      "translation": "诊断仍不确定。",
      "difficulty": 1
    }
  ],
  "expressions": [
    [
      "may indicate",
      "可能提示，不能译成证实"
    ],
    [
      "is characterized by",
      "以……为特征"
    ],
    [
      "is associated with",
      "与……相关，不直接表示因果"
    ],
    [
      "is diagnosed based on",
      "根据……诊断"
    ]
  ],
  "core": "医学术语常由词根、连接元音、前缀和后缀组成，但并非每个词都有全部成分。cardi/o 是结合形式，cardi 是词根，o 为连接元音。gastritis 可拆为 gastr + -itis，接以元音开头的后缀时连接元音常省略。不能将这一规律机械套用到所有术语。先识别后缀含义，再结合词根和上下文理解。symptom 常指患者主观感受，sign 常指观察或检查发现。翻译时先找主语和谓语，再处理修饰语，最后检查 may、not、some 等限定词。构词知识不能代替临床诊断。",
  "reading": "A student reads a note about a patient with abdominal pain. The patient reports nausea, but the cause is not yet known. The student recognizes gastr/o as a combining form related to the stomach. However, abdominal pain alone does not establish a diagnosis of gastritis. The tutor explains that symptoms should be interpreted together with the history and examination. The phrase “may indicate” expresses a possibility. It does not mean that a disease has been confirmed. The student rewrites the note using a complete subject and verb and keeps the uncertainty in the original sentence.",
  "questions": [
    {
      "stem": "In gastritis, which element means inflammation?",
      "options": [
        "gastr",
        "-itis",
        "o",
        "hyper-"
      ],
      "answer": 1,
      "explanation": "-itis 表示炎症。gastr 表示胃，o 是连接元音，hyper- 表示过高。",
      "tag": "构词",
      "id": "d1-q1"
    },
    {
      "stem": "Which prefix means below normal?",
      "options": [
        "hyper-",
        "tachy-",
        "hypo-",
        "brady-"
      ],
      "answer": 2,
      "explanation": "hypo- 表示低于正常；brady- 表示速度慢。",
      "tag": "构词",
      "id": "d1-q2"
    },
    {
      "stem": "Which item is a subjective symptom?",
      "options": [
        "A measured temperature",
        "A visible rash",
        "An observed swelling",
        "Nausea reported by the patient"
      ],
      "answer": 3,
      "explanation": "患者报告的恶心是主观症状，其余是观察或测量所得。",
      "tag": "术语",
      "id": "d1-q3"
    },
    {
      "stem": "What does “may indicate” express in the passage?",
      "options": [
        "Certainty",
        "Possibility",
        "Exclusion",
        "A treatment order"
      ],
      "answer": 1,
      "explanation": "may 表示可能性，不能译成已证实或必然。",
      "tag": "不确定性",
      "id": "d1-q4"
    },
    {
      "stem": "What can be concluded from abdominal pain alone?",
      "options": [
        "Gastritis is confirmed",
        "The cause is bacterial",
        "A definite cause is not established",
        "Treatment has failed"
      ],
      "answer": 2,
      "explanation": "原文明确单独腹痛不能确诊胃炎，也未提供病原体或治疗信息。",
      "tag": "阅读",
      "id": "d1-q5"
    }
  ],
  "translations": [
    {
      "direction": "en-zh",
      "source": "These symptoms may indicate inflammation of the stomach.",
      "reference": "这些症状可能提示胃部炎症。",
      "terms": [
        "symptoms 症状",
        "inflammation 炎症"
      ],
      "grammar": "These symptoms 是主语；may indicate 是情态动词加谓语。",
      "commonError": "漏译 these 或将 may 译为一定。",
      "rubric": [
        "主语完整 2分",
        "may 的可能性 2分",
        "医学含义 2分"
      ],
      "id": "d1-t1"
    },
    {
      "direction": "en-zh",
      "source": "A diagnosis is made based on the history and physical examination.",
      "reference": "根据病史和体格检查作出诊断。",
      "terms": [
        "diagnosis 诊断",
        "physical examination 体格检查"
      ],
      "grammar": "is made 为被动语态；based on 引出依据。",
      "commonError": "把 history 译为历史，或漏译检查。",
      "rubric": [
        "诊断 2分",
        "两项依据 2分",
        "被动逻辑 2分"
      ],
      "id": "d1-t2"
    },
    {
      "direction": "en-zh",
      "source": "Although the patient reports pain, the cause remains uncertain.",
      "reference": "虽然患者诉疼痛，但病因仍不确定。",
      "terms": [
        "reports 诉",
        "cause 病因"
      ],
      "grammar": "Although 引导让步从句；主句为 the cause remains uncertain。",
      "commonError": "只翻译疼痛而遗漏诊断的不确定性。",
      "rubric": [
        "让步关系 2分",
        "症状 2分",
        "不确定性 2分"
      ],
      "id": "d1-t3"
    },
    {
      "direction": "zh-en",
      "source": "胃炎以胃部炎症为特征。",
      "reference": "Gastritis is characterized by inflammation of the stomach.",
      "terms": [
        "gastritis 胃炎",
        "inflammation 炎症"
      ],
      "grammar": "X is characterized by + 名词短语。",
      "commonError": "漏掉 is 或 by。",
      "rubric": [
        "主语 2分",
        "句式 2分",
        "术语 2分"
      ],
      "id": "d1-t4"
    },
    {
      "direction": "zh-en",
      "source": "这些症状可能与炎症有关。",
      "reference": "These symptoms may be associated with inflammation.",
      "terms": [
        "symptoms 症状",
        "associated with 与……相关"
      ],
      "grammar": "may 后接 be，保留关联强度。",
      "commonError": "使用 caused by 将相关升级为因果。",
      "rubric": [
        "主语 2分",
        "may be 2分",
        "关联及术语 2分"
      ],
      "id": "d1-t5"
    }
  ],
  "checklist": [
    "能拆解 gastritis 与 cardiology",
    "能区分 symptom 与 sign",
    "翻译时保留可能性和否定",
    "完成5道选择题与5道翻译",
    "完成教材精读与原书练习，记下有效阅读页数、实际用时及待查问题"
  ],
  "id": "day-01",
  "minutes": [
    60,
    90
  ],
  "sourceNote": "原创配套材料。仅依据用户提供的教材目录定位章节，未查阅或复述教材正文。电子书导航页码不等于纸书页码。内容用于医学英语学习。",
  "textbookStudy": {
    "book": "The Language of Medicine, 10th Edition — Davi-Ellen Chabner",
    "chapter": "Ch.1 · Basic Word Structure",
    "startPage": 23,
    "focus": "先读第1章中词根、连接元音和结合形式的相关内容。Ch.2–4分散在第1–3周推进。",
    "steps": [
      "从电子书导航第23页进入Ch.1，利用章内标题定位 basic word structure、word root、combining vowel、combining form 等概念。",
      "阅读与上述概念相关的说明和例词，尝试解释词根和结合形式的区别；用45分钟进行教材精读，在笔记中记下实际停止页。",
      "从自己读到的教材内容中选3个例词，记录原词、拆分、中文含义及实际页码；再与本课词汇卡对照。"
    ],
    "output": "用自己的话写出 word root、combining vowel、combining form 的区别，并完成3个词的拆解。",
    "review": "合上教材，解释 cardi/o 中 cardi 和 o 的作用，再对照原书核查。",
    "note": "以上仅根据已知目录设计阅读任务，具体内容位置需在你持有的教材中定位。导航页是章节起点，不代表本日必读页数。原书练习只做你实际找到且对应已读内容的题目，题号及答案需依据原书。 每次先用45分钟精读，再用15分钟做对应原书练习与合书回忆。初次按4–6页或1–2个小节试学，记录实际速度；后续按每周计划校准。"
  },
  "schedule": {
    "short": "60分钟减量方案：教材精读30、原书练习10、术语5、翻译10、记录5分钟；当天缺口记录到缓冲安排。",
    "standard": "90分钟标准方案：教材精读45、原书练习与回忆15、术语10、翻译15、记录5分钟。",
    "workload": "本课材料分次使用。当天先选8–12个词、1道英译汉和1道汉译英，其余题目安排在同章后续日或周复习日。"
  }
}
```
