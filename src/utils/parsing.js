/**
 * Safely parses the `questions` field of an exercise.
 * Handles both pre-parsed arrays and JSON strings.
 *
 * @param {object} exercise
 * @returns {Array<{ id: string, type: string, text: string }>}
 */
export function parseQuestions(exercise) {
  if (!exercise) return [];
  const raw = exercise.questions;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

/**
 * Safely parses the `answers` field of a response record.
 *
 * Supports two formats:
 *   Legacy:  ["answer1", "answer2", ...]
 *   Current: [{ questionId: "q1", value: "answer1" }, ...]
 *
 * Always normalizes to the current format for internal use.
 * Use `getRawAnswerValues()` when you only need the plain string array.
 *
 * @param {object} responseRecord
 * @returns {Array<{ questionId: string|null, value: string }>}
 */
export function parseAnswers(responseRecord) {
  if (!responseRecord) return [];
  const raw = responseRecord.answers;

  let arr;
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
    } catch (_) {
      return [];
    }
  } else {
    return [];
  }

  return arr.map((item) => {
    if (item && typeof item === "object" && "questionId" in item) {
      // Current format
      return { questionId: item.questionId ?? null, value: item.value ?? "" };
    }
    // Legacy format: plain string
    return { questionId: null, value: String(item ?? "") };
  });
}

/**
 * Matches parsed answers to questions by questionId (current format)
 * or by array index (legacy format), returning a flat map of questionId → value.
 *
 * @param {Array<{ id: string, type: string, text: string }>} questions
 * @param {Array<{ questionId: string|null, value: string }>} answers
 * @returns {Record<string, string>}  questionId → answer value
 */
export function matchAnswersToQuestions(questions, answers) {
  const map = {};

  const isLegacy = answers.every((a) => a.questionId === null);

  if (isLegacy) {
    questions.forEach((q, i) => {
      map[q.id] = answers[i]?.value ?? "";
    });
  } else {
    answers.forEach((a) => {
      if (a.questionId) map[a.questionId] = a.value;
    });
  }

  return map;
}

/**
 * Serializes current-format answers for storage.
 *
 * @param {Array<{ id: string }>} questions
 * @param {Record<string, string>} valuesByQuestionId
 * @returns {string}  JSON string
 */
export function serializeAnswers(questions, valuesByQuestionId) {
  const arr = questions.map((q) => ({
    questionId: q.id,
    value: valuesByQuestionId[q.id] ?? "",
  }));
  return JSON.stringify(arr);
}