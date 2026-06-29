import { useState } from 'react'

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#f5a623' : 'none'}
      stroke={filled ? '#f5a623' : '#cbd2dc'}
      strokeWidth={1.5}
    >
      <polygon points="12,2.5 14.9,9 22,9.5 16.5,14.1 18.3,21 12,17.1 5.7,21 7.5,14.1 2,9.5 9.1,9" />
    </svg>
  )
}

interface Props {
  value: number
  onChange?: (n: number) => void
  size?: number
  readOnly?: boolean
}

/** Interactive 5-star rating. Click a set star again to clear (0). */
export function StarRating({ value, onChange, size = 16, readOnly = false }: Props) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} von 5 Sternen`}
          title={readOnly ? `${value}/5` : `${n} Stern${n > 1 ? 'e' : ''}`}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={(e) => {
            e.stopPropagation()
            onChange?.(value === n ? 0 : n)
          }}
          className={
            readOnly
              ? 'cursor-default'
              : 'cursor-pointer transition-transform hover:scale-110'
          }
        >
          <Star filled={n <= shown} size={size} />
        </button>
      ))}
    </div>
  )
}
