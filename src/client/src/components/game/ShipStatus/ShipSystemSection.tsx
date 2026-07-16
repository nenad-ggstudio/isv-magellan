import { useState, type ReactNode } from 'react'

export function ShipSystemSection({
  children,
  initiallyOpen = false,
  summary,
  title,
}: {
  children: ReactNode
  initiallyOpen?: boolean
  summary: ReactNode
  title: string
}) {
  const [open, setOpen] = useState(initiallyOpen)

  return (
    <details
      className="group grid rounded border border-[#142840] bg-[rgb(3_8_14_/_60%)]"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium uppercase tracking-[0.1em] text-[#6a9aac] transition-colors hover:text-[#b4d4e4] [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex min-w-0 items-center gap-2">
          <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em] text-[#3a5c6e] tabular-nums">
            {summary}
          </strong>
          <span className="text-sm leading-none text-[#3a5c6e] group-open:hidden">
            +
          </span>
          <span className="hidden text-sm leading-none text-[#3a5c6e] group-open:inline">
            −
          </span>
        </span>
      </summary>
      <div className="grid gap-2.5 border-t border-[#0c1c2c] p-3">
        {children}
      </div>
    </details>
  )
}

export function ShipSystemMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 border-b border-[#0c1c2c] pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[10px] uppercase tracking-[0.1em] text-[#3a5c6e]">
        {label}
      </dt>
      <dd className="m-0 min-w-0 text-right text-[11px] text-[#c8dfe8] tabular-nums">
        {value}
      </dd>
    </div>
  )
}
