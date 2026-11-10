import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The type scale's names, so a size and a colour on one element don't cancel out.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['meta', 'ui', 'body', 'head', 'title', 'display'] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
