export type DictationInsertion = {
  value: string;
  caret: number;
};

export function insertDictation(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  transcript: string,
): DictationInsertion {
  const spokenText = transcript.trim();
  if (!spokenText) return { value, caret: selectionEnd };

  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const leadingSpace = before && !/\s$/.test(before) ? " " : "";
  const trailingSpace =
    after && !/^[\s.,!?;:]/.test(after) ? " " : "";
  const inserted = `${leadingSpace}${spokenText}${trailingSpace}`;

  return {
    value: `${before}${inserted}${after}`,
    caret: before.length + inserted.length,
  };
}
