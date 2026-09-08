/* Graphique à barres SVG minimal (aucune dépendance), rendu serveur ou client.
 * data : [{ label: 'lun. 12/05', value: 3 }] — max-width fluide, accessible. */
export default function BarChart({ data, color = '#db2777', height = 140, ariaLabel = 'Graphique' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / data.length;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label={ariaLabel}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 3 - 4);
          return (
            <g key={i}>
              <rect x={i * barW + barW * 0.15} y={height / 3 - h} width={barW * 0.7} height={h} rx="0.8" fill={color}>
                <title>{`${d.label} : ${d.value}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}
