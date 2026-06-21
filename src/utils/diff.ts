export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Computes a beautiful line-by-line diff between oldContent and newContent
 * using a standard Longest Common Subsequence (LCS) dynamic programming algorithm.
 */
export function computeLineDiff(oldContent: string, newContent: string): DiffLine[] {
  // Normalize line endings and split
  const oldLines = oldContent.replace(/\r\n/g, '\n').split('\n');
  const newLines = newContent.replace(/\r\n/g, '\n').split('\n');

  const oldLen = oldLines.length;
  const newLen = newLines.length;

  // Initialize DP table
  const dp: number[][] = Array(oldLen + 1)
    .fill(null)
    .map(() => Array(newLen + 1).fill(0));

  // Compute lengths
  for (let i = 1; i <= oldLen; i++) {
    for (let j = 1; j <= newLen; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = oldLen;
  let j = newLen;

  // Walk back elements
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({ type: 'unchanged', value: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', value: newLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'removed', value: oldLines[i - 1] });
      i--;
    }
  }

  return diff;
}
