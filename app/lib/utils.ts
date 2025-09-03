import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function validateFileType(file: File): boolean {
  const allowedTypes = ['application/pdf', 'text/html', 'application/xhtml+xml']
  return allowedTypes.includes(file.type)
}

export function validateFileSize(file: File, maxSizeMB: number = 50): boolean {
  return file.size <= maxSizeMB * 1024 * 1024
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

// Indonesian text processing utilities
export function isIndonesianLegalDocument(text: string): boolean {
  const legalKeywords = ['pasal', 'ayat', 'huruf', 'undang-undang', 'peraturan', 'ketentuan']
  const lowerText = text.toLowerCase()
  return legalKeywords.some(keyword => lowerText.includes(keyword))
}

export function extractLegalReferences(text: string): string[] {
  const patterns = [
    /undang[-\s]undang\s+(?:nomor\s+)?(\d+)\s+tahun\s+(\d{4})/gi,
    /peraturan\s+(?:pemerintah|presiden|menteri)\s+(?:nomor\s+)?(\d+)\s+tahun\s+(\d{4})/gi,
    /pasal\s+(\d+[a-z]*)/gi,
  ]
  
  const references: string[] = []
  patterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      references.push(...matches)
    }
  })
  
  return Array.from(new Set(references)) // Remove duplicates
}