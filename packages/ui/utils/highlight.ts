export function highlightText(text: string, query: string | null | undefined): string {
  if (!query || !query.trim() || !text) {
    return escapeHtml(text)
  }

  const searchQuery = query.trim()
  const escapedText = escapeHtml(text)
  const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi')
  
  return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>')
}

function escapeHtml(text: string): string {
  if (typeof document === 'undefined') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function matchesSearch(text: string, query: string | null | undefined): boolean {
  if (!query || !query.trim() || !text) {
    return false
  }
  return text.toLowerCase().includes(query.trim().toLowerCase())
}
