/** 技術者履歴書テンプレート「技術」セクションのカテゴリ・項目定義（新テンプレ準拠） */
export const TECHNICAL_SKILL_TEMPLATE = [
  {
    category: 'OS',
    items: [
      'Windows',
      'Linux',
      'Ubuntu',
      'RHEL',
      'Rocky Linux',
      'macOS',
      'Windows Server',
      'Unix',
      'FreeBSD',
    ],
  },
  {
    category: '開発言語',
    items: [
      'Java',
      'Kotlin',
      'C',
      'C++',
      'C#',
      'Go',
      'Swift',
      'Python',
      'PHP',
      'Ruby',
      'Rust',
      'COBOL',
      'VB.NET',
      'SQL',
      'PL/SQL',
      'ABAP',
      'Apex',
    ],
  },
  {
    category: 'Script言語',
    items: [
      'JavaScript',
      'TypeScript',
      'PowerShell',
      'Bash',
      'Windowsバッチ',
      'Python',
      'Perl',
      'Groovy',
      'VBA',
    ],
  },
  {
    category: 'DB',
    items: [
      'Oracle Database',
      'SQL Server',
      'DB2',
      'PostgreSQL',
      'MySQL',
      'MariaDB',
      'SQLite',
      'MongoDB',
      'Redis',
      'DynamoDB',
      'Amazon Aurora',
      'Azure Cosmos DB',
      'Snowflake',
      'BigQuery',
    ],
  },
  {
    category: 'フレームワーク',
    items: [
      'Spring Boot',
      'Spring Framework',
      'ASP.NET Core',
      'React',
      'Next.js',
      'Vue.js',
      'Angular',
      'Django',
      'Flask',
      'Laravel',
      'Node.js / Express',
      'FastAPI',
    ],
  },
  {
    category: '業務ソリューション',
    items: [
      'SAP S/4HANA',
      'SAP BTP',
      'Oracle Fusion ERP',
      'Salesforce',
      'ServiceNow',
      'Dynamics 365',
      'Pega',
      'OutSystems',
      'Mendix',
      'kintone',
      'intra-mart',
      'Workday',
      'Power Platform',
      'UiPath',
    ],
  },
  {
    category: 'WEB',
    items: [
      'HTML5',
      'CSS3',
      'REST API',
      'GraphQL',
      'gRPC',
      'WebSocket',
      'OAuth 2.0',
      'OpenAPI',
    ],
  },
  {
    category: 'APサーバ',
    items: [
      'Apache Tomcat',
      'WildFly',
      'WebLogic',
      'WebSphere',
      'IIS',
      'JBoss EAP',
    ],
  },
  {
    category: 'ミドルウェア',
    items: [
      'Nginx',
      'Apache HTTP Server',
      'Kafka',
      'RabbitMQ',
      'HULFT',
      'API Gateway',
      'Elasticsearch',
    ],
  },
  {
    category: 'クラウド',
    items: [
      'AWS',
      'Microsoft Azure',
      'Google Cloud',
      'OCI',
      'Azure OpenAI Service',
    ],
  },
  {
    category: 'DevOps',
    items: [
      'Docker',
      'Kubernetes',
      'Terraform',
      'Ansible',
      'Git',
      'GitHub Actions',
      'GitLab CI/CD',
      'Jenkins',
    ],
  },
  {
    category: 'AIツール',
    items: [
      'ChatGPT',
      'GitHub Copilot',
      'Microsoft Copilot',
      'Copilot Studio',
      'Azure AI Foundry',
      'LangChain',
      'LlamaIndex',
      'RAG',
      'AIエージェント',
    ],
  },
  {
    category: '業務知識',
    items: [
      '銀行',
      '保険',
      '決済',
      '流通',
      '物流',
      '通信',
      '製造',
      '医療・公共',
      'サービス',
    ],
  },
];

/** 新テンプレの項目列数に合わせる */
export const TECHNICAL_SKILL_COLUMNS = 9;

export function technicalSkillKey(category, itemName) {
  return `${category}::${itemName}`;
}

/** カテゴリ名表示用（「/」で折り返し） */
export function technicalCategoryLabelParts(category) {
  const text = String(category ?? '');
  if (text.includes('/')) {
    return text.split('/').map((part, index, arr) =>
      index < arr.length - 1 ? `${part}/` : part
    );
  }
  return [text];
}

/** 旧テンプレ表記の互換 */
export function canonicalTechnicalItemName(itemName) {
  const raw = String(itemName ?? '').trim();
  if (/^Linix\/Unix/i.test(raw)) {
    return raw.replace(/^Linix/i, 'Linux');
  }
  const aliases = {
    UNIX: 'Unix',
    Mac: 'macOS',
    Redhat: 'RHEL',
    'C#.net': 'C#',
    'VB.net': 'VB.NET',
    python: 'Python',
    swift: 'Swift',
    PLSQL: 'PL/SQL',
    'SAP/ABAP': 'ABAP',
    Oracle: 'Oracle Database',
    SQLServer: 'SQL Server',
    Spring: 'Spring Framework',
    Tomcat: 'Apache Tomcat',
    Weblogic: 'WebLogic',
    Jboss: 'JBoss EAP',
    'Amazon AWS': 'AWS',
    kafka: 'Kafka',
    NodeJS: 'Node.js / Express',
    'WinバッチScript': 'Windowsバッチ',
    AngularJS: 'Angular',
    'RPA・Uipath': 'UiPath',
    Dynamics: 'Dynamics 365',
  };
  return aliases[raw] || raw;
}

export function chunkItems(items, size = TECHNICAL_SKILL_COLUMNS) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks.length ? chunks : [[]];
}

export function technicalSkillsToMap(list) {
  const map = {};
  (list || []).forEach(({ category, itemName, level }) => {
    if (category && itemName && level) {
      const canonical = canonicalTechnicalItemName(itemName);
      map[technicalSkillKey(category, canonical)] = level;
      if (canonical !== itemName) {
        map[technicalSkillKey(category, itemName)] = level;
      }
    }
  });
  return map;
}

export function mapToTechnicalSkills(map) {
  if (!map) return [];
  return Object.entries(map)
    .filter(([, level]) => level)
    .map(([key, level]) => {
      const sep = key.indexOf('::');
      return {
        category: key.slice(0, sep),
        itemName: key.slice(sep + 2),
        level,
      };
    });
}
