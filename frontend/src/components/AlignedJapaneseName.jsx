/**
 * 姓名とフリガナを「姓」「名」ごとに上下揃えで表示する。
 * 半角/全角スペースで分割し、分割数が一致しない場合は従来どおり一括表示。
 */
export function splitNameParts(name, kana) {
  const nameParts = String(name ?? '')
    .trim()
    .split(/[\s\u3000]+/)
    .filter(Boolean);
  const kanaParts = String(kana ?? '')
    .trim()
    .split(/[\s\u3000]+/)
    .filter(Boolean);

  if (nameParts.length >= 2 && nameParts.length === kanaParts.length) {
    return nameParts.map((part, index) => ({
      name: part,
      kana: kanaParts[index],
    }));
  }

  return null;
}

export default function AlignedJapaneseName({
  name,
  kana,
  nameClassName = 'detail-employee-name',
  kanaClassName = 'detail-employee-kana',
}) {
  const parts = splitNameParts(name, kana);
  const label = `${name ?? ''}${kana ? ` ${kana}` : ''}`.trim();

  if (!parts) {
    return (
      <div className="name-kana-aligned name-kana-aligned--fallback" aria-label={label || undefined}>
        <h2 className={nameClassName}>{name}</h2>
        {kana ? <div className={kanaClassName}>{kana}</div> : null}
      </div>
    );
  }

  return (
    <h2 className="name-kana-aligned" aria-label={label || undefined}>
      {parts.map((part) => (
        <span key={`${part.name}-${part.kana}`} className="name-kana-col">
          <span className={`${nameClassName} name-kana-col-name`}>{part.name}</span>
          <span className={`${kanaClassName} name-kana-col-kana`}>{part.kana}</span>
        </span>
      ))}
    </h2>
  );
}
