import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

export function formatFansignFilename(orderId: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `fansign-${orderId}-${timestamp}.jpg`;
}

export function formatCryptoAmount(amount: number, decimals: number = 8): string {
  return amount.toFixed(decimals);
}

export function formatEurAmount(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
