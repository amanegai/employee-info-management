export default function StarRating({ level = 0, max = 5 }) {
  return (
    <span className="star-rating" aria-label={`レベル ${level}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={`bi ${i < level ? 'bi-star-fill' : 'bi-star'}`} />
      ))}
    </span>
  );
}
