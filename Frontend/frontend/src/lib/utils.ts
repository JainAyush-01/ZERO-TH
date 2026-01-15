import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: any): string {
    // If it's a cancellation error from Next.js/Axios, return a silent flag
    if (error?.type === "cancelation" || error?.name === "CanceledError") {
        return "CANCELED";
    }
    if (typeof error === 'string') return error;
    
    const message = error.response?.data?.message || error.response?.data || error.message || "An unknown error occurred";
    return typeof message === 'string' ? message : JSON.stringify(message);
}