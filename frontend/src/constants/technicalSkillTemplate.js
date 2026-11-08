/** 履歴書テンプレート「技術」セクションのカテゴリ・項目定義 */
export const TECHNICAL_SKILL_TEMPLATE = [
  {
    category: 'OS',
    items: [
      'Windows',
      'UNIX',
      'Linux',
      'HP-UX',
      'Solaris',
      'AIX',
      'Redhat',
      'Mac',
      'Android',
      'IBM/Host',
    ],
  },
  {
    category: '開発言語',
    items: [
      'Java',
      'VB',
      'C/C++',
      'VC/VC++',
      '組込C',
      'Objective-C',
      'swift',
      'C#.net',
      'ASP.net',
      'VB.net',
      'SAP/ABAP',
      'Perl',
      'Ruby/Jruby',
      'python',
      'COBOL',
      'TSO操作/JCL',
      'PHP',
      'VBA（Excel）',
      'VBA（Access）',
      'PLSQL',
      'Pro*C',
      'Salesforce',
      'RPA・BizRobo!',
      'RPA・Uipath',
      'RPA・WinActor',
    ],
  },
  {
    category: 'Script言語',
    items: [
      'WinバッチScript',
      'JavaScript',
      'AJAX/Jquery',
      'AJAX/prototype',
      'VBScript',
      'Shell',
      'PowerShell',
      'NodeJS',
      'Linux/Unixコマンド',
      'AngularJS',
    ],
  },
  {
    category: 'DB',
    items: [
      'Oracle',
      'SQLServer',
      'DB2',
      'HiRDB',
      'SYBASE',
      'MySQL',
      'PostgreSQL',
      'Redis',
      'Hbase',
      'Cassandra',
      'MongoDB',
      'DynamoDB',
      'GoogleCloud',
      'AzureDocumentDB',
      'Neo4j',
    ],
  },
  {
    category: 'フレームワーク/ソリューション',
    items: [
      'Struts',
      'Spring',
      'seasar2',
      'JSF',
      'Hibernate',
      'iBatis',
      'Ruby on Rails',
      'terasoluna',
      'intra-mart',
      'Gprime',
      'Flex System',
      'Notes/Domino',
      'INTARFRM',
      'Redmine',
      'Hive',
      'LAMP',
    ],
  },
  {
    category: 'サーバ/モニター',
    items: [
      'Apache',
      'Tomcat',
      'Weblogic',
      'WebSphere',
      'WebSphere MQ',
      'Interstage',
      'Tuxedo',
      'TPBroker',
      'HULFT',
      'OracleApplicationServer',
      'Jboss',
    ],
  },
  {
    category: 'その他',
    items: [
      'Hadoop',
      'Storm/Spark',
      'OpenStack',
      'Amazon AWS',
      'Microsoft Azure',
      'Dynamics',
      'Office365',
      'SharePoint',
      'Power Apps',
      'DWH',
      'EAI・ETL',
      'BusinessObjects',
      'DataStage',
      'Tableau',
      'PowerCenter',
      'ASTERIA',
      'JP1',
      'kafka',
      'Vmware',
      'KVM',
      'IoT/M2M関連',
      'AI/AR/VR/MR関連',
      'OS・サーバ構築',
      'NWネットワーク構築',
      'セキュリティ設計',
      '構成管理・git等',
      'BSE常駐',
    ],
  },
  {
    category: '業務知識',
    items: [
      '金融業・証券・銀行',
      'クレジットカード',
      '通信・広告',
      '保険',
      '流通・調達',
      '地図・ナビ',
      '販売・購買',
      '医療・福祉・年金',
      'サービス業・他',
    ],
  },
];

export const TECHNICAL_SKILL_COLUMNS = 8;

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

/** 旧テンプレ表記の互換（Linix → Linux など） */
export function canonicalTechnicalItemName(itemName) {
  const raw = String(itemName ?? '');
  if (/^Linix\/Unix/i.test(raw)) {
    return raw.replace(/^Linix/i, 'Linux');
  }
  return raw;
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
