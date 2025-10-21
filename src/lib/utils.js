import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Generate a random URL token for judges
export function generateToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Calculate average scores per contestant with weighted categories
export function calculateAverages(scores, judgeCount) {
  if (!scores.length || !judgeCount) return {};

  const totals = {
    cat1_total: 0,
    cat2_total: 0,
    cat3_total: 0,
    weighted_total: 0,
  };

  scores.forEach((score) => {
    totals.cat1_total += parseFloat(score.cat1_total || 0);
    totals.cat2_total += parseFloat(score.cat2_total || 0);
    totals.cat3_total += parseFloat(score.cat3_total || 0);
    totals.weighted_total += parseFloat(score.weighted_total || 0);
  });

  return {
    cat1_total: (totals.cat1_total / judgeCount).toFixed(2),
    cat2_total: (totals.cat2_total / judgeCount).toFixed(2),
    cat3_total: (totals.cat3_total / judgeCount).toFixed(2),
    weighted_total: (totals.weighted_total / judgeCount).toFixed(2),
    total: (totals.weighted_total / judgeCount).toFixed(2), // Alias for backward compatibility
  };
}
