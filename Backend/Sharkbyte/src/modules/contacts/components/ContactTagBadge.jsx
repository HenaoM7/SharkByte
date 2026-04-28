const COLORS = [
  'bg-sb-primary/15 text-sb-primary',
  'bg-sb-secondary/15 text-sb-secondary',
  'bg-pink-100 text-pink-700',
  'bg-sb-primary/10 text-sb-primary',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
]

function tagColor(tag) {
  let n = 0
  for (const c of String(tag)) n += c.charCodeAt(0)
  return COLORS[n % COLORS.length]
}

export default function ContactTagBadge({ tag }) {
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${tagColor(tag)}`}>
      {tag}
    </span>
  )
}
