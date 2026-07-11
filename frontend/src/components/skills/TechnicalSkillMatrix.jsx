import { Fragment } from 'react';
import {
  TECHNICAL_SKILL_TEMPLATE,
  TECHNICAL_SKILL_COLUMNS,
  technicalSkillKey,
  chunkItems,
  technicalCategoryLabelParts,
} from '../../constants/technicalSkillTemplate';
import { TECHNICAL_SKILL_MARK_OPTIONS, EMPTY_DISPLAY } from '../../utils';

const EMPTY_LEVEL_LABEL = EMPTY_DISPLAY;

function CategoryLabel({ category }) {
  const parts = technicalCategoryLabelParts(category);
  if (parts.length === 1) return category;
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {part}
    </Fragment>
  ));
}

function LevelSelect({ value, onChange, readOnly }) {
  if (readOnly) {
    return (
      <span className={`technical-skill-level${value ? '' : ' is-empty'}`}>{value || EMPTY_LEVEL_LABEL}</span>
    );
  }
  return (
    <select
      className="form-select form-select-sm technical-skill-select"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{EMPTY_LEVEL_LABEL}</option>
      {TECHNICAL_SKILL_MARK_OPTIONS.map((mark) => (
        <option key={mark} value={mark}>
          {mark}
        </option>
      ))}
    </select>
  );
}

export default function TechnicalSkillMatrix({ values = {}, onChange, readOnly = false }) {
  function setLevel(category, itemName, level) {
    if (!onChange) return;
    const key = technicalSkillKey(category, itemName);
    onChange({ ...values, [key]: level });
  }

  return (
    <div className="technical-skill-matrix">
      <p className="technical-skill-legend mb-3">【◎：豊富な経験あり、〇：実務経験あり、△：知識あり】</p>
      {TECHNICAL_SKILL_TEMPLATE.map(({ category, items }) => {
        const chunks = chunkItems(items, TECHNICAL_SKILL_COLUMNS);
        const filledCount = items.filter((item) => values[technicalSkillKey(category, item)]).length;

        return (
          <div key={category} className="technical-skill-category mb-3">
            <div className="technical-skill-category-title">
              <CategoryLabel category={category} />
              {!readOnly && filledCount > 0 && (
                <span className="badge text-bg-secondary ms-2">{filledCount}</span>
              )}
            </div>
            <div className="technical-skill-table-wrap">
              <table className="table table-bordered table-sm technical-skill-table mb-0">
                <colgroup>
                  {Array.from({ length: TECHNICAL_SKILL_COLUMNS }).map((_, i) => (
                    <col key={i} className="technical-skill-col" />
                  ))}
                </colgroup>
                <tbody>
                  {chunks.map((chunk, chunkIndex) => (
                    <Fragment key={`${category}-chunk-${chunkIndex}`}>
                      <tr>
                        {chunk.map((item) => (
                          <th key={item} className="technical-skill-item-name">
                            {item}
                          </th>
                        ))}
                        {chunk.length < TECHNICAL_SKILL_COLUMNS &&
                          Array.from({ length: TECHNICAL_SKILL_COLUMNS - chunk.length }).map((_, i) => (
                            <th key={`empty-name-${i}`} className="technical-skill-empty" />
                          ))}
                      </tr>
                      <tr>
                        {chunk.map((item) => {
                          const key = technicalSkillKey(category, item);
                          const level = values[key] || '';
                          return (
                            <td key={item} className="text-center">
                              <LevelSelect
                                value={level}
                                readOnly={readOnly}
                                onChange={(next) => setLevel(category, item, next)}
                              />
                            </td>
                          );
                        })}
                        {chunk.length < TECHNICAL_SKILL_COLUMNS &&
                          Array.from({ length: TECHNICAL_SKILL_COLUMNS - chunk.length }).map((_, i) => (
                            <td key={`empty-level-${i}`} className="technical-skill-empty" />
                          ))}
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
